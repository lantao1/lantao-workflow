#!/usr/bin/env python3
"""Digit fidelity between a manuscript and its translated mirror.

Every number in the original must appear in the mirror, and the other way
round. Run it after any numeric edit to either file. It catches a number
changed in one language and not the other, a sentence that carries a number
lost in translation, and two values swapped between the languages.

It does not catch a lost sentence that carries no number, or a stale claim
that both languages still state. Bind those with a claims gate
(claims_gate_template.py) loaded on each language.

Usage
-----
    python3 mirror_digit_fidelity.py --pair paper.tex paper_zh.tex [--pair A B ...]
    python3 mirror_digit_fidelity.py --config pairs.json
    python3 mirror_digit_fidelity.py --config pairs.json --strip-refs --follow-inputs --strict-order

pairs.json (paths are relative to the JSON file's own directory):

    {
      "pairs": [["paper.tex", "paper_zh.tex"], ["abstract.tex", "abstract_zh.tex"]],
      "strip_refs": true,
      "follow_inputs": false,
      "strict_order": false,
      "ref_markers": ["\\\\section*{References}", "\\\\section*{参考文献}"],
      "xref_patterns": ["(?i)\\\\bappendix\\\\s*[A-Z]\\\\d*"]
    }

List every translated file in the config, fragments included: a mirror that
is not listed is never checked, and a drift in it goes unseen however long
it stays there. Adding a forgotten pair tends to find an omission at once.

"xref_patterns" are added to the built-in ones, not substituted for them.
Exit code 0 when every pair matches, 1 when any pair fails, 2 on a usage or
file error. Python 3 standard library only.

What is compared
----------------
The body only (everything after \\begin{document} when the file has one; a
fragment such as an abstract without it is read whole, so pair it too).
Before counting, the tool removes:

* comments. A percent is escaped only after an odd number of backslashes:
  10\\% is text and is NOT a comment start (a naive stripper drops the rest
  of every line that contains 10\\%, and the checker then reports phantom
  numbers that exist in one language only), while a\\\\% note after a line
  break IS a comment;
* LaTeX dimensions (p{4cm} in one language and p{3.5cm} in the other is
  typesetting, not content). No space is allowed before the unit, so
  "0.5 in the base year" is not eaten as a dimension;
* chapter and section cross-references ("Chapter 2", "Section~2.1",
  "Sections 2 and 3", and the Chinese 第2章, 第2.1节, 第2、3节). The two
  languages carry these numerals in different shapes, and they are
  navigation, not results. A list is removed whole only when it ends in
  "and", "or", "to" or a dash ("Sections 2, 3 and 4"), so a result after a
  comma ("In Section 2, 0.21 of ...") is kept;
* optionally the reference list (--strip-refs). A bibliography with DOIs
  carries many digits. Either strip it, or copy it byte for byte into the
  mirror so its digits match.

\\input{} fragments are not read by default: when both languages input the
same generated table, its digits match trivially. When each language has its
own translated fragment, pass --follow-inputs so the fragments are compared.

Two tests per pair, a third on request
--------------------------------------
1. Multiset test: the numbers that occur in one file and not the other, with
   their counts.
2. Transposition test: multiset equality misses a SWAP. If the original
   prints 0.12 in the prose and 0.21 in a table while the mirror prints them
   the other way round, both multisets match. The ordered sequences of
   decimals are aligned, and an aligned block where the original has one set
   of values and the mirror another is reported as transposed. Integers
   (counts, years, numbered columns) are left out, and a block that only
   reorders the same values is skipped: translations legitimately state two
   values in the other order ("the OLS estimate is 0.31 and the IV estimate
   0.47" against a mirror that names the IV estimate first).
3. --strict-order (or "strict_order": true): also report a decimal the
   aligner had to delete in one place and insert in another. This catches
   two NEIGHBOURING values swapped, which test 2 skips, but it also fails a
   mirror that legitimately states two values in the other order. Use it
   where the mirror is meant to keep the original's order, and read each
   report by hand.

A gate that has never been seen red is not a gate: self-test it with
gate_selftest.py (swap two values in a mirror copy, drop a number, confirm
red, restore, confirm green).
"""
import argparse
import collections
import difflib
import json
import os
import re
import sys

NUM = re.compile(r"\d+(?:,\d{3})*(?:\.\d+)?")

DEFAULT_REF_MARKERS = [
    r"\begin{thebibliography}",
    r"\section*{References}",
    r"\section*{参考文献}",
    r"\bibliography{",
    r"\printbibliography",
]

_N = r"\d+(?:\.\d+)?"
DEFAULT_XREF_PATTERNS = [
    # 第2章, 第2.1节, 第2、3节, 第2至3章 (第2节和第3节 is two matches)
    r"第\s*%s(?:\s*[、，,至到和与及\-–]\s*(?:第\s*)?%s)*\s*[章节]" % (_N, _N),
    # Chapter 2, Section~2.1, Sections 2 and 3, Sections 2, 3 and 4, Sections 2--3
    (r"(?i)\b(?:chapter|section)s?~?\s*%s"
     r"(?:(?:\s*,\s*~?%s)*\s*,?\s*(?:\band\b|\bor\b|\bto\b|--|–|-)\s*~?%s)?" % (_N, _N, _N)),
]

INPUT = re.compile(r"\\input\{([^}]+)\}")


def strip_comments(s):
    """Drop every comment; a percent after an odd number of backslashes is text."""
    return re.sub(r"(?m)((?<!\\)(?:\\\\)*)%.*$", r"\1", s)


def expand_inputs(s, base, depth=0):
    """Splice in \\input{} fragments (comments stripped first, so a commented
    \\input is not followed)."""
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
    return INPUT.sub(sub, s)


def body(path, strip_refs=False, ref_markers=None, xref_patterns=None, follow_inputs=False):
    """The text whose numbers are compared."""
    with open(path, encoding="utf-8") as fh:
        s = fh.read()
    s = s.split(r"\begin{document}", 1)[-1]
    s = strip_comments(s)
    if follow_inputs:
        s = expand_inputs(s, os.path.dirname(os.path.abspath(path)))
    if strip_refs:
        cut = [s.find(m) for m in (ref_markers or DEFAULT_REF_MARKERS)]
        cut = [i for i in cut if i >= 0]
        if cut:
            s = s[:min(cut)]
    s = re.sub(r"\d+(?:\.\d+)?(?:cm|mm|in|pt|em|ex|bp|sp)\b", "", s)
    for pat in (xref_patterns if xref_patterns is not None else DEFAULT_XREF_PATTERNS):
        s = re.sub(pat, "", s)
    return s


def transpositions(a, b, strict_order=False):
    """Decimal values that changed place between two ordered number sequences.

    Integers are left out: counts, years and numbered columns reorder freely
    in translation, and the multiset test still counts them. On the decimal
    sequences:
    * transposed (always): an aligned block where the original has one set of
      values and the mirror another, as when two values are swapped between a
      sentence and a table. A block that only reorders the same values is
      skipped as a translation artefact;
    * moved (strict_order only): a value the aligner had to delete in one
      place and insert in another, as when two neighbouring values are
      swapped, or when a mirror legitimately states them in the other order."""
    a = [x for x in a if "." in x]
    b = [x for x in b if "." in x]
    out, dels, ins = [], collections.Counter(), collections.Counter()
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        left, right = a[i1:i2], b[j1:j2]
        if tag == "replace":
            if set(left) != set(right):
                out.append(("transposed", left, right))
        elif tag == "delete":
            dels.update(left)
        elif tag == "insert":
            ins.update(right)
    if strict_order:
        moved = sorted((dels & ins).elements())
        if moved:
            out.append(("moved", moved, moved))
    return out


def compare(orig, mirror, strict_order=False, **kw):
    """(only_in_original, only_in_mirror, swaps) for one pair."""
    a = NUM.findall(body(orig, **kw))
    b = NUM.findall(body(mirror, **kw))
    ca, cb = collections.Counter(a), collections.Counter(b)
    return ca - cb, cb - ca, transpositions(a, b, strict_order)


def load_config(path):
    with open(path, encoding="utf-8") as fh:
        cfg = json.load(fh)
    base = os.path.dirname(os.path.abspath(path))
    pairs = [(os.path.join(base, a), os.path.join(base, b)) for a, b in cfg.get("pairs", [])]
    extra = cfg.get("xref_patterns") or []
    return {
        "pairs": pairs,
        "strip_refs": bool(cfg.get("strip_refs", False)),
        "follow_inputs": bool(cfg.get("follow_inputs", False)),
        "strict_order": bool(cfg.get("strict_order", False)),
        "ref_markers": cfg.get("ref_markers") or DEFAULT_REF_MARKERS,
        "xref_patterns": DEFAULT_XREF_PATTERNS + list(extra),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Digit fidelity between a manuscript and its translated mirror.")
    ap.add_argument("--pair", nargs=2, action="append", metavar=("ORIGINAL", "MIRROR"), default=[],
                    help="one original/mirror pair; repeat for more")
    ap.add_argument("--config", help="JSON file with pairs and options")
    ap.add_argument("--strip-refs", action="store_true", help="drop the reference list before counting")
    ap.add_argument("--follow-inputs", action="store_true", help="splice \\input{} fragments into both files")
    ap.add_argument("--strict-order", action="store_true",
                    help="also report decimals moved within the order (neighbouring swaps and legitimate reorders)")
    args = ap.parse_args(argv)

    opts = {"pairs": [], "strip_refs": False, "follow_inputs": False, "strict_order": False,
            "ref_markers": DEFAULT_REF_MARKERS, "xref_patterns": DEFAULT_XREF_PATTERNS}
    if args.config:
        try:
            opts = load_config(args.config)
        except (OSError, ValueError) as e:
            print("error: cannot read config %s: %s" % (args.config, e), file=sys.stderr)
            return 2
    opts["pairs"] = list(opts["pairs"]) + [tuple(p) for p in args.pair]
    opts["strip_refs"] = opts["strip_refs"] or args.strip_refs
    opts["follow_inputs"] = opts["follow_inputs"] or args.follow_inputs
    opts["strict_order"] = opts["strict_order"] or args.strict_order
    if not opts["pairs"]:
        ap.print_usage(sys.stderr)
        print("error: give at least one --pair or a --config with pairs", file=sys.stderr)
        return 2
    for a, b in opts["pairs"]:
        for p in (a, b):
            if not os.path.isfile(p):
                print("error: file not found: %s" % p, file=sys.stderr)
                return 2

    kw = {k: opts[k] for k in ("strip_refs", "ref_markers", "xref_patterns", "follow_inputs", "strict_order")}
    bad = 0
    for orig, mirror in opts["pairs"]:
        name = "%s <-> %s" % (os.path.basename(orig), os.path.basename(mirror))
        only_o, only_m, swaps = compare(orig, mirror, **kw)
        if not only_o and not only_m and not swaps:
            print("PASS %s" % name)
            continue
        bad += 1
        print("FAIL %s" % name)
        if only_o:
            print("  original only: %s" % dict(sorted(only_o.items())))
        if only_m:
            print("  mirror only:   %s" % dict(sorted(only_m.items())))
        for kind, left, right in swaps:
            if kind == "moved":
                print("  moved in the mirror's order (--strict-order): %s" % left)
            else:
                print("  transposed: original %s vs mirror %s" % (left, right))
    print("\n%d pairs, %d fail" % (len(opts["pairs"]), bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
