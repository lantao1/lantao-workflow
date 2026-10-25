#!/usr/bin/env python3
"""Claims gate: bind every number and every ruled claim in a manuscript to its source.

A claims gate is a short Python file, one per project, that reads the
manuscript the way a reader sees it and checks it against the machine output.
Each check names the text it binds and the value it must equal. A FAIL means
the text and the output have drifted apart: a stale number, a retired
sentence back in, a ruling undone.

This module holds the reusable layer. Write the project's gate as a separate
file that imports it. examples/numbers/example_gate.py is a complete,
runnable example on a toy paper.

Usage
-----
    # in your gate file (resolve every path from the gate's own folder, never
    # from an absolute path: a gate that reads the main checkout passes every
    # mirror self-test because it never reads the mirror)
    import os, sys
    HERE = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.environ.get("GATES_DIR") or "path/to/scripts/gates")
    from claims_gate_template import Gate, Table, fmt

    g = Gate(root=HERE)
    g.load("en", "paper.tex")                     # comments out, \\input spliced in
    g.load("zh", "paper_zh.tex", cjk=True)        # whitespace-blind matching
    est = Table(g.path("results/current/estimates.csv"))
    b = g.get(est, "coef", {"spec": "baseline", "est": "OLS"})   # a lost row is a FAIL, not a crash
    g.number("en", "baseline coefficient", fmt(b, ".3f", minus="$-$"))
    g.sentence("en", "baseline in its sentence",
               "The baseline coefficient is {b}.", b=fmt(b, ".3f", minus="$-$"))
    g.absence("en", "retired wording", "Smaller classes raise test scores.")
    sys.exit(g.report())                          # "N checks, M failed"; exit 1 on any fail

    # the bundled example
    python3 claims_gate_template.py --demo

The checks
----------
presence / absence  a phrase is in the text, or is not (retired wording).
                    absence() reads the text as it typesets, so the obvious
                    variants of a retired phrase are caught too (see below).
                    absence() also takes a regex.
count               a phrase occurs exactly n times, read as absence() reads
                    it. A sentence pasted twice passes every presence test;
                    only a count catches it.
number              a printed number, with digit boundaries: 416 does not match
                    inside 1,416 or 416.5, and a sentence-final period is not
                    read as a decimal point. With n=, it must occur exactly n
                    times (a value re-stated elsewhere is caught).
value               a CSV cell, looked up by its key columns, formatted at the
                    printed precision, then checked as number().
sentence            a whole sentence built from a template and output values.
                    The strongest binding: the number cannot drift away from
                    the claim it supports.
in_sentence         the number inside the one sentence that holds an anchor
                    phrase, when the rest of the sentence may change.
closed_paragraph    the paragraph that opens with a given sentence is exactly
                    that sentence plus the listed ones, in order: nothing can
                    be inserted into it, dropped or reordered. Without
                    followed_by= a sentence placed behind a blank line, right
                    after the paragraph, is a new paragraph and passes; give
                    followed_by= (the start of the next paragraph or heading)
                    to close that gap too.
footnote_only       a detail lives in a footnote and not in the body.
stars               the printed significance stars follow the p value the
                    table note names, and no other star string is printed for
                    this value beyond those excused with also_printed= (two
                    estimates can print the same three decimals with
                    different stars).
check               any custom test: check(where, label, shown, ok). ok must
                    be computed from the text (see below).

What this module's code does, and why (each one cost a round of work)
---------------------------------------------------------------------
* Read what the reader reads. \\input fragments are spliced in; without that,
  every number in a generated table is invisible to the gate.
* Normalise whitespace. A phrase check that breaks when a paragraph is
  re-wrapped is a false red every time someone edits nearby. In CJK text all
  whitespace goes, except one space between two digits, so "0.215 1.08"
  does not fuse into one number.
* An escaped percent (10\\%) is not a comment; a percent after a line break
  (\\\\% note) is. A full-line comment does not split a paragraph; a trailing
  comment does not join two paragraphs.
* A bare number is a substring test, and a substring test passes on a
  coincidence: 416 is inside 1,416. number() refuses a digit or a point on
  either side, and a comma only where it could be a thousands separator, so
  both ends of [0.12,0.34] (the CJK form of [0.12, 0.34]) still match.
* Retired wording comes back in trivial variants. absence() and count() read
  ties (~), control and thin spaces (\\ , \\,) and \\nobreakspace{} as
  spaces, drop empty groups ({}), and fold case in English; in CJK text they
  also drop the commas and enumeration commas (，,、).
* A lookup that matches zero rows or two rows, or an output file that cannot
  be read, fails loudly: get() and value() record a FAIL with the reason and
  the run goes on. A crash would hide every other check's result.
* One language never matches the other. Load each language file under its
  own name and check each one; a CJK mirror is compared whitespace-blind.
* A check can pass vacuously. Every check's ok must read the text: a check
  that tests only the data is green whatever the text says, and a comparison
  of two derived booleans passes when both are False. Build ok from the text,
  and show in "shown" what was looked for.

The policy behind the gates (bind whole sentences, gate retired wording as
the new wording present AND the old absent, diff the gate file when the text
changed, self-test every new or retargeted check with gate_selftest.py) is
in .claude/rules/working-rules.md, section Gates, and docs/WORKING_METHOD.md.

Python 3 standard library only.
"""
import csv
import os
import re
import sys

STAR_CUTS = ((0.01, "***"), (0.05, "**"), (0.10, "*"))
ABBREV = ("e.g.", "i.e.", "et al.", "U.S.", "U.K.", "Fig.", "Eq.", "No.", "vs.", "St.", "cf.", "Dr.", "Mr.", "Ms.")


# ---------------------------------------------------------------- text loading
def strip_comments(s):
    """Remove LaTeX comments the way paragraphs survive them.

    A full-line comment goes with its newline, so it neither splits nor opens a
    paragraph. A trailing comment is dropped and its newline kept, so a blank
    line after it still ends the paragraph. A percent is escaped only after an
    odd number of backslashes: 10\\% is text, a\\\\% note is a comment after a
    line break."""
    s = re.sub(r"(?m)^[ \t]*%.*\n?", "", s)
    return re.sub(r"(?m)((?<!\\)(?:\\\\)*)%.*$", r"\1", s)


def expand_inputs(s, base, depth=0):
    """Splice in every \\input{} fragment, recursively (five levels at most).

    A fragment that cannot be read is left as the \\input command, so a gate
    that needs its numbers fails instead of passing on an empty table."""
    if depth > 5:
        return s

    def sub(m):
        p = os.path.normpath(os.path.join(base, m.group(1)))
        if not p.endswith(".tex"):
            p += ".tex"
        try:
            with open(p, encoding="utf-8") as fh:
                return expand_inputs(strip_comments(fh.read()), os.path.dirname(p), depth + 1)
        except OSError:
            return m.group(0)
    return re.sub(r"\\input\{([^}]+)\}", sub, s)


def body_of(s):
    """The document body; a fragment without \\begin{document} is read whole."""
    if r"\begin{document}" in s:
        s = s.split(r"\begin{document}", 1)[1]
    return s.split(r"\end{document}", 1)[0]


def normalise(s):
    """Collapse whitespace; read a fragment's thin-spaced "[2.4,\\, 8.9]" as "[2.4, 8.9]"."""
    return re.sub(r"\s+", " ", s.replace(r",\,", ",")).strip()


def _between_digits(m):
    s, i, j = m.string, m.start(), m.end()
    return i > 0 and j < len(s) and s[i - 1].isdigit() and s[j].isdigit()


def nows(s):
    """Whitespace-blind form, for CJK text. One space survives between two
    digits, so two numbers set side by side do not fuse into one."""
    return re.sub(r"\s+", lambda m: " " if _between_digits(m) else "", s)


def typeset(s, cjk=False, fold=True):
    """The text as it typesets, for absence() and count(): ties, control and
    thin spaces and \\nobreakspace{} read as spaces, empty groups dropped,
    English case folded; in CJK text whitespace and the commas ，,、 dropped."""
    t = re.sub(r"\\nobreakspace\{\}|\\[,;:! ]|~", " ", normalise(s)).replace("{}", "")
    if cjk:
        return re.sub(r"[，,、]", "", nows(t))
    t = re.sub(r"\s+", " ", t).strip()
    return t.casefold() if fold else t


def _brace_end(s, k):
    """Index just past the brace that closes the group opened before k."""
    depth = 1
    while depth and k < len(s):
        c = s[k]
        if c == "\\":
            k += 2
            continue
        depth += {"{": 1, "}": -1}.get(c, 0)
        k += 1
    return k


def footnotes(s):
    """The contents of every \\footnote{...}, brace-matched."""
    out, i = [], 0
    while True:
        j = s.find("\\footnote{", i)
        if j < 0:
            return out
        k = _brace_end(s, j + len("\\footnote{"))
        out.append(s[j + len("\\footnote{"):k - 1])
        i = k


def without_footnotes(s):
    """The text with every \\footnote{...} removed, brace-matched."""
    out, i = [], 0
    while True:
        j = s.find("\\footnote{", i)
        if j < 0:
            out.append(s[i:])
            return "".join(out)
        out.append(s[i:j])
        i = _brace_end(s, j + len("\\footnote{"))


def split_sentences(s, cjk=False):
    """A plain sentence splitter. Good enough to bind a number to its sentence.

    English: a break after . ! or ? (or after one of them closing a brace)
    followed by space and a capital, a digit, a backslash, $ or an opening
    bracket; common abbreviations are protected. CJK: a break after 。！？.
    A footnote stays inside the sentence it hangs on."""
    if cjk:
        return [p for p in re.split(r"(?<=[。！？])", s) if p.strip()]
    t = s
    for a in ABBREV:
        t = t.replace(a, a.replace(".", "\x01"))
    parts = re.split(r"(?:(?<=[.!?])|(?<=[.!?]\}))\s+(?=[A-Z0-9\\$(\[])", t)
    return [p.replace("\x01", ".").strip() for p in parts if p.strip()]


# ---------------------------------------------------------------- values
def fmt(x, spec=".3f", minus="-"):
    """Format a value the way the text prints it; minus="$-$" for LaTeX.
    A failed lookup (NaN) prints as "nan", which no text contains."""
    s = format(abs(x), spec)
    return (minus + s) if x < 0 and float(s.replace(",", "")) != 0 else s


def stars(p, cuts=STAR_CUTS):
    p = float(p)
    for cut, st in cuts:
        if p < cut:
            return st
    return ""


def num_pattern(s):
    """A printed string with digit boundaries on both sides.

    Nothing that continues a number may touch it: no digit or decimal point
    before it, no digit or .digit after it. A comma is read as a thousands
    separator only where it can be one: a digit-comma before the string is
    refused when the string opens with exactly three digits (416 in 1,416),
    and a comma-digit after it is refused when the string has no decimal
    point (416 in 416,480). A list or interval comma ([0.12,0.34], the CJK
    form of [0.12, 0.34]) is allowed on both ends."""
    head = r"(?<![\d.])"
    if re.match(r"\d{3}(?!\d)", s):
        head += r"(?<!\d,)"
    tail = ""
    if s[-1:].isdigit():
        tail = r"(?!\d)(?!\.\d)" + ("" if "." in s else r"(?!,\d)")
    return re.compile(head + re.escape(s) + tail)


class Table:
    """A CSV of machine output, looked up by key columns.

    A file that cannot be read gives an empty table whose every lookup fails
    with the reason, so a lost output file is a FAIL, not a crash."""

    def __init__(self, path):
        self.path, self.error, self.rows = path, None, []
        try:
            with open(path, newline="", encoding="utf-8") as fh:
                self.rows = list(csv.DictReader(fh))
        except (OSError, UnicodeDecodeError, csv.Error) as e:
            self.error = "cannot read %s: %s" % (os.path.basename(path), getattr(e, "strerror", None) or e)

    def where(self, **match):
        return [r for r in self.rows if all(r.get(k) == str(v) for k, v in match.items())]

    def raw(self, col, **match):
        """The cell as a string. Exactly one row must match, or the lookup fails loudly."""
        if self.error:
            raise LookupError(self.error)
        hit = self.where(**match)
        if len(hit) != 1:
            raise LookupError("%s: %d rows match %s (need exactly 1)" % (os.path.basename(self.path), len(hit), match))
        if col not in hit[0]:
            raise LookupError("%s: no column %r" % (os.path.basename(self.path), col))
        return hit[0][col]

    def get(self, col, **match):
        cell = self.raw(col, **match)
        try:
            return float(cell)
        except ValueError:
            raise LookupError("%s: %s %s is %r, not a number" % (os.path.basename(self.path), col, match, cell))


# ---------------------------------------------------------------- documents
class Doc:
    def __init__(self, path, cjk=False, follow_inputs=True):
        self.path, self.cjk = path, cjk
        with open(path, encoding="utf-8") as fh:
            s = strip_comments(fh.read())
        s = body_of(s)
        if follow_inputs:
            s = expand_inputs(s, os.path.dirname(os.path.abspath(path)))
        self.raw = s
        self.flat = normalise(s)
        self._typeset = {}

    def norm(self, s):
        return nows(normalise(s)) if self.cjk else normalise(s)

    def text(self, footnotes_in=True):
        t = self.flat if footnotes_in else normalise(without_footnotes(self.raw))
        return nows(t) if self.cjk else t

    def typeset_text(self, fold=True):
        if fold not in self._typeset:
            self._typeset[fold] = typeset(self.raw, self.cjk, fold)
        return self._typeset[fold]

    def has(self, phrase):
        return self.norm(phrase) in self.text()

    def count(self, phrase):
        """Occurrences of the phrase, both read as they typeset (see typeset())."""
        return self.typeset_text().count(typeset(phrase, self.cjk))

    def sentences(self):
        return split_sentences(self.flat, self.cjk)

    def paragraphs(self):
        """Blank-line blocks, normalised. A leading \\noindent or \\indent is
        dropped, never the block: a check that skips command-led blocks makes
        \\noindent prose invisible."""
        out = []
        for block in re.split(r"\n[ \t]*\n", self.raw):
            b = normalise(block)
            b = re.sub(r"^\\(?:noindent|indent)\b\s*", "", b)
            if b:
                out.append(b)
        return out


# ---------------------------------------------------------------- the gate
class Gate:
    def __init__(self, root="."):
        self.root = os.path.abspath(root)
        self.docs = {}
        self.checks = []

    def path(self, rel):
        return os.path.join(self.root, rel)

    def load(self, name, rel, cjk=False, follow_inputs=True):
        self.docs[name] = Doc(self.path(rel), cjk=cjk, follow_inputs=follow_inputs)
        return self.docs[name]

    def check(self, where, label, shown, ok):
        """Record one check. ok must be computed from the text; see the module docstring."""
        self.checks.append((where, label, str(shown), bool(ok)))
        return bool(ok)

    # -- output values
    def get(self, table, col, match, label=None):
        """A CSV cell as a float. A lookup that fails (zero or two rows, a
        missing column or file, a cell that is not a number) is recorded as a
        FAIL under "data" and returns NaN, so the checks that use it fail too
        and the rest of the run goes on."""
        try:
            return table.get(col, **match)
        except LookupError as e:
            self.check("data", label or "lookup %s %s" % (col, match), "lookup failed: %s" % e, False)
            return float("nan")

    # -- phrases
    def presence(self, where, label, phrase):
        return self.check(where, label, "present: " + phrase[:60], self.docs[where].has(phrase))

    def absence(self, where, label, phrase, regex=False):
        """The phrase is absent, read as it typesets (ties and thin spaces as
        spaces, empty groups dropped, English case folded, CJK commas dropped).
        A regex is searched in the typeset text without case folding: add
        (?i) to it for case."""
        d = self.docs[where]
        if regex:
            found = re.search(phrase, d.typeset_text(fold=False))
        else:
            found = typeset(phrase, d.cjk) in d.typeset_text()
        return self.check(where, label, "absent: " + phrase[:60], not found)

    def count(self, where, label, phrase, n=1):
        k = self.docs[where].count(phrase)
        return self.check(where, label, "%d x (need %d): %s" % (k, n, phrase[:50]), k == n)

    # -- numbers
    def number(self, where, label, printed, n=None):
        """A printed number, with digit boundaries; with n, exactly n occurrences."""
        k = len(num_pattern(printed).findall(self.docs[where].text()))
        ok = k >= 1 if n is None else k == n
        shown = printed if n is None else "%s %d x (need %d)" % (printed, k, n)
        return self.check(where, label, shown, ok)

    def value(self, where, label, table, col, match, spec=".3f", minus="-", n=None):
        """A CSV cell, looked up by key columns (match is a dict, so a key column
        may have any name), printed at a precision, checked as number(). A
        failed lookup is one FAIL, under this label."""
        x = self.get(table, col, match, label=label)
        if x != x:
            return False
        return self.number(where, label, fmt(x, spec, minus), n=n)

    def sentence(self, where, label, template, **values):
        """A whole sentence built from a template, present as written."""
        s = template.format(**values)
        return self.check(where, label, s[:70], self.docs[where].has(s))

    def in_sentence(self, where, label, anchor, printed):
        """The number inside the one sentence that holds the anchor phrase."""
        d = self.docs[where]
        hold = [s for s in d.sentences() if d.norm(anchor) in d.norm(s)]
        ok = len(hold) == 1 and bool(num_pattern(printed).search(d.norm(hold[0])))
        return self.check(where, label, "%s in the sentence '%s' (%d found)" % (printed, anchor[:40], len(hold)), ok)

    def stars(self, where, label, printed, p, star_fmt="{}$^{{{}}}$", also_printed=()):
        """Printed stars follow p; no other star string for this printed value,
        beyond those excused.

        printed is the coefficient as typeset (e.g. "$-$0.188"). With stars due,
        the starred string must appear; with none due, the bare number must
        appear without a star superscript after it. also_printed lists the
        star strings other cells legitimately print for the same printed value
        (another estimate that rounds to the same three decimals), one entry
        per such cell: ["*"] excuses one "*" occurrence, and a second one is
        still a wrong star."""
        t = self.docs[where].text()
        st = stars(p)
        if st:
            present = bool(num_pattern(star_fmt.format(printed, st)).search(t))
        else:
            present = any(not t[m.end():].startswith("$^{") for m in num_pattern(printed).finditer(t))
        excused = list(also_printed)
        wrong = []
        for c in ("***", "**", "*"):
            if c == st:
                continue
            k = len(num_pattern(star_fmt.format(printed, c)).findall(t))
            if k > excused.count(c):
                wrong.append(c)
        shown = (star_fmt.format(printed, st) if st else printed) + " (p=%.4f)" % float(p)
        if wrong:
            shown += "; also printed with " + ", ".join(wrong)
        return self.check(where, label, shown, present and not wrong)

    # -- structure
    def closed_paragraph(self, where, label, sentences, followed_by=None):
        """The paragraph that opens with sentences[0] is exactly these sentences,
        in order. With followed_by, the very next block (paragraph or heading)
        must open with that text, so nothing can sit behind a blank line
        between the paragraph and what follows it."""
        d = self.docs[where]
        first = d.norm(sentences[0])
        paras = d.paragraphs()
        idx = [i for i, p in enumerate(paras) if d.norm(p).startswith(first)]
        want = d.norm(("" if d.cjk else " ").join(sentences))
        ok = len(idx) == 1 and d.norm(paras[idx[0]]) == want
        shown = "%d paragraph(s) open with '%s'" % (len(idx), sentences[0][:40])
        if len(idx) == 1 and not ok:
            got = split_sentences(paras[idx[0]], d.cjk)
            for i in range(max(len(got), len(sentences))):
                a = d.norm(sentences[i]) if i < len(sentences) else "<nothing>"
                b = d.norm(got[i]) if i < len(got) else "<nothing>"
                if a != b:
                    shown += "; sentence %d differs: '%s'" % (i + 1, b[:50])
                    break
        if followed_by is not None and len(idx) == 1:
            nxt = paras[idx[0] + 1] if idx[0] + 1 < len(paras) else ""
            if not d.norm(nxt).startswith(d.norm(followed_by)):
                ok = False
                shown += "; next block is '%s', not '%s'" % (nxt[:40], followed_by[:30])
        return self.check(where, label, shown, ok)

    def footnote_only(self, where, label, phrase):
        d = self.docs[where]
        in_fn = any(d.norm(phrase) in d.norm(normalise(f)) for f in footnotes(d.raw))
        in_body = d.norm(phrase) in d.text(footnotes_in=False)
        return self.check(where, label, "in a footnote, not the body: " + phrase[:40], in_fn and not in_body)

    # -- report
    def report(self, out=sys.stdout):
        """One line per check, "PASS|FAIL <where> <label>  <shown>" (two spaces
        before shown, so gate_selftest.py can key a failing check by where and
        label), then "N checks, M failed". Exit code: 1 on any fail."""
        fails = [c for c in self.checks if not c[3]]
        for where, label, shown, ok in self.checks:
            out.write("%s %-6s %-44s  %s\n" % ("PASS" if ok else "FAIL", where, label[:44], shown))
        out.write("\n%d checks, %d failed\n" % (len(self.checks), len(fails)))
        return 1 if fails else 0


def _demo():
    import runpy
    here = os.path.dirname(os.path.abspath(__file__))
    example = os.path.join(here, "examples", "numbers", "example_gate.py")
    sys.argv = [example]
    try:
        runpy.run_path(example, run_name="__main__")
    except SystemExit as e:
        return e.code or 0
    return 0


if __name__ == "__main__":
    if "--demo" in sys.argv[1:]:
        sys.exit(_demo())
    print(__doc__)
