#!/usr/bin/env python3
"""outline_check.py - the outline of kings must equal the first sentence of every paragraph.

The outline is the document a reader reviews as the argument: the first sentence (the king) of
every paragraph, in order. It must never be retyped by hand and never drift from the draft it
summarises. This gate compares the two and fails on any difference.

Usage:
    python3 outline_check.py DRAFT OUTLINE [--lang en|zh] [--plain] [--json]
    python3 outline_check.py DRAFT --emit [--no-headings] [--lang en|zh]

    DRAFT     .tex, .md or .docx. In .tex and .md, paragraphs are read the way prose_audit.py
              reads them: comments, display math, floats and code are not prose; footnotes are
              stripped with brace matching so a footnote hanging on a king never swallows the
              sentences after it; list items are not kings. In .docx (a draft written in Word),
              every non-empty body paragraph is a paragraph except headings, numbered list
              items, table cells, centred lines and Notes paragraphs; reading stops at a
              References or Bibliography heading. A .docx made by tex2docx.py breaks a paragraph
              at a display or a list, so check the .tex, not its reading copy.
    OUTLINE   .tex (each \\item is one king), .md or .txt (a numbered or bulleted list; an
              indented line continues the item above it), or .docx (numbered paragraphs).
    --emit    print the draft's kings as a numbered Markdown outline (with section headings
              unless --no-headings). Build the outline from the draft this way; never retype it.
    --plain   compare the text a reader sees: letters and digits only, Greek by name, markup
              and punctuation dropped. Automatic when either file is .docx, where math is
              already rendered.

A king that runs into a display equation is compared up to the display: the outline entry must
start with the text before it. Formatting commands, quotes, ties (~) and whitespace are
normalised on both sides; math, citations and \\ref stay as written, so keep \\ref out of kings.
Abbreviations and initials are protected inside a sentence ("the U.S. survey", "J. Smith"), so a
king that ENDS on one ("Yields rose in the U.S." or "... in Panel B.") merges with the sentence
after it and a correct outline fails. End kings on a word; prose_audit.py warns (king-abbrev).
Definitions (\\newcommand and the like) and layout commands are not paragraphs, and a comment
that mentions \\begin{document} does not start the body.

Exit codes: 0 match, 1 mismatch, 2 usage or read error.
"""
import argparse
import difflib
import html
import json
import os
import re
import sys
import unicodedata
import zipfile

sys.dont_write_bytecode = True          # no __pycache__ beside the gates
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prose_audit as pa  # noqa: E402


# --------------------------------------------------------------------------- .docx reading

def docx_paragraphs(path):
    """[(style, text, is_list)] for the body paragraphs of a .docx, in order.

    Table cells are not body paragraphs. A paragraph counts as a list item when Word numbers
    it, and as not prose (style "Other") when it is centred (titles, displays, captions,
    figures) or opens on a superscript run (a footnote rendered in the text).
    """
    x = zipfile.ZipFile(path).read("word/document.xml").decode("utf-8")
    x = re.sub(r"<w:tbl>.*?</w:tbl>", "", x, flags=re.S)
    out = []
    for p in re.findall(r"<w:p\b[^>]*>.*?</w:p>|<w:p\b[^>]*/>", x, re.S):
        st = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        style = st.group(1) if st else "Normal"
        first_run = re.search(r"<w:r\b.*?</w:r>", p, re.S)
        if not _is_heading(style) and ('<w:jc w:val="center"/>' in p or
                                       (first_run and re.search(r'w:val="superscript"|<w:position w:val="[1-9]',
                                                                first_run.group(0)))):
            style = "Other"
        q = p.replace("<w:tab/>", "<w:t>\t</w:t>").replace("<w:br/>", "<w:t> </w:t>")
        t = "".join(re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", q, re.S))
        out.append((style, html.unescape(t), "<w:numPr>" in p))
    return out


def _is_heading(style):
    s = style.lower()
    return s.startswith("heading") or s in ("title", "subtitle") or s.startswith("berschrift")


def docx_kings(path):
    kings = []
    for n, (style, text, is_list) in enumerate(docx_paragraphs(path), 1):
        t = text.strip()
        if _is_heading(style):
            if re.match(r"(references|bibliography|works cited|参考文献)\b", t.lower()):
                break
            continue
        if not t or is_list or style == "Other" or re.match(r"(Notes?|Sources?)[.:]", t):
            continue
        kings.append((n, "", pa.first_sentence(t)))
    return kings


# --------------------------------------------------------------------------- outline reading

def parse_outline(path):
    """{'title': str|None, 'items': [{'section': str|None, 'text': str}]} from an outline file."""
    ext = os.path.splitext(path)[1].lower()
    items, title, section = [], None, None
    if ext == ".docx":
        for style, text, is_list in docx_paragraphs(path):
            t = text.strip()
            if not t:
                continue
            if _is_heading(style):
                if title is None and style.lower() in ("title", "heading1"):
                    title = t
                else:
                    section = t
                continue
            if style == "Other":
                continue
            m = re.match(r"^\s*(\d+)[.)]\s*(.*)$", t)
            if m or is_list:
                items.append({"section": section, "text": (m.group(2) if m else t).strip()})
        return {"title": title, "items": items}

    src = open(path, encoding="utf-8").read()
    if ext == ".tex":
        src = re.sub(r"(?<!\\)%.*", "", src)     # first: a comment may mention \begin{document}
        tm = re.search(r"\\title\{([^}]*)\}", src)
        title = tm.group(1).strip() if tm else None
        if r"\begin{document}" in src:
            src = src.split(r"\begin{document}", 1)[1]
        tokens = re.finditer(
            r"\\(?:section|subsection)\*?\{([^}]*)\}|\{\\large\\textbf\{([^}]*)\}\}|"
            r"\\item\s+(.*?)(?=\\item\b|\\end\{(?:enumerate|itemize)\}|\\(?:sub)?section|\{\\large|\Z)",
            src, re.S)
        for m in tokens:
            if m.group(1) is not None or m.group(2) is not None:
                section = (m.group(1) or m.group(2)).strip()
            else:
                items.append({"section": section, "text": re.sub(r"\s+", " ", m.group(3)).strip()})
        return {"title": title, "items": items}

    # Markdown or plain text
    lines = src.split("\n")
    if lines and lines[0].strip() == "---":
        for j in range(1, len(lines)):
            if lines[j].strip() in ("---", "..."):
                lines = lines[j + 1:]
                break
    cur = None
    plain = []
    for line in lines:
        hm = re.match(r"^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$", line)
        if hm:
            cur = None
            if hm.group(1) == "#" and title is None:
                title = hm.group(2)
            else:
                section = hm.group(2)
            continue
        im = re.match(r"^\s*(?:\d+[.)]|[-*+])\s+(.*)$", line)
        if im:
            cur = {"section": section, "text": im.group(1).strip()}
            items.append(cur)
            continue
        if not line.strip():
            cur = None
            continue
        if cur is not None and line[:1] in (" ", "\t"):
            cur["text"] += " " + line.strip()
            continue
        cur = None
        plain.append({"section": section, "text": line.strip()})
    if not items:
        items = plain
    return {"title": title, "items": items}


# --------------------------------------------------------------------------- comparison

def draft_kings(path, lang="en"):
    if path.lower().endswith(".docx"):
        return docx_kings(path)
    doc = pa.load_document(path, lang)
    return pa.kings(doc)


def same(king, item):
    nk, no = pa.normalize(king), pa.normalize(item)
    if nk == no:
        return True
    if "<EQ>" in nk:
        head = nk.split("<EQ>")[0].strip()
        return bool(head) and no.startswith(head)
    return False


GREEK = ("alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho "
         "sigma tau upsilon phi chi psi omega").split()
MATHFN = "ln log exp max min sup inf lim Pr det".split()


def _greek_word(ch):
    try:
        name = unicodedata.name(ch)
    except ValueError:
        return ch
    if not name.startswith("GREEK"):
        return ch
    parts = name.split()
    if "LETTER" in parts and parts.index("LETTER") + 1 < len(parts):
        return parts[parts.index("LETTER") + 1].lower()
    if "SYMBOL" in parts and parts.index("SYMBOL") > 0:
        return parts[parts.index("SYMBOL") - 1].lower()
    return ch


def plain_key(s):
    """A comparison key that survives rendering: what a reader sees in Word, letters and digits.

    Used when one side is a .docx, where math is already rendered (s_{dt} reads as sdt, \\beta as
    a Greek letter). Greek letters are compared by name, markup and punctuation are dropped.
    """
    s = pa.normalize(s)
    if "<EQ>" in s:
        s = s.split("<EQ>")[0]
    s = re.sub(r"\\(?:var)?(" + "|".join(GREEK) + r")(?![A-Za-z])", lambda m: m.group(1).lower(), s, flags=re.I)
    s = re.sub(r"\\(" + "|".join(MATHFN) + r")(?![A-Za-z])", r"\1", s)
    s = re.sub(r"\\[A-Za-z]+\*?", " ", s)
    s = "".join(_greek_word(c) for c in s)
    return "".join(re.findall(r"[^\W_]", s))


def _king_key(i, king, items, okeys):
    """The normalised king; a king that runs into a display takes the key of its outline entry."""
    key = pa.normalize(king)
    if "<EQ>" in key:
        for j in ([i] if i < len(items) else []) + list(range(len(items))):
            if same(king, items[j]):
                return okeys[j]
    return key


def compare(kings, items, plain=False):
    """Mismatches as dicts: kind in {mismatch, missing-from-outline, missing-from-draft}."""
    if plain:
        okeys = [plain_key(o) for o in items]
        dkeys = [plain_key(k) for _, _, k in kings]
    else:
        okeys = [pa.normalize(o) for o in items]
        dkeys = [_king_key(i, k, items, okeys) for i, (_, _, k) in enumerate(kings)]
    out = []
    sm = difflib.SequenceMatcher(None, dkeys, okeys, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if tag == "replace":
            for a, b in zip(range(i1, i2), range(j1, j2)):
                out.append({"kind": "mismatch", "draft_no": a + 1, "line": kings[a][0],
                            "draft": kings[a][2], "outline_no": b + 1, "outline": items[b]})
            for a in range(i1 + (j2 - j1), i2):
                out.append({"kind": "missing-from-outline", "draft_no": a + 1, "line": kings[a][0], "draft": kings[a][2]})
            for b in range(j1 + (i2 - i1), j2):
                out.append({"kind": "missing-from-draft", "outline_no": b + 1, "outline": items[b]})
        elif tag == "delete":
            for a in range(i1, i2):
                out.append({"kind": "missing-from-outline", "draft_no": a + 1, "line": kings[a][0], "draft": kings[a][2]})
        elif tag == "insert":
            for b in range(j1, j2):
                out.append({"kind": "missing-from-draft", "outline_no": b + 1, "outline": items[b]})
    return out


def emit(kings, headings=True):
    lines, last = [], None
    for n, (_, section, k) in enumerate(kings, 1):
        if headings and section and section != "PREAMBLE" and section != last:
            lines += ["", "## " + section, ""]
            last = section
        k = k.split("<EQ>")[0].strip() if "<EQ>" in k else k     # a king that runs into a display
        lines.append("%d. %s" % (n, re.sub(r"\s+", " ", k)))
    return "\n".join(lines).strip() + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Check an outline of kings against a draft.",
                                 epilog="See the module docstring for the formats read.")
    ap.add_argument("draft")
    ap.add_argument("outline", nargs="?")
    ap.add_argument("--emit", action="store_true", help="print the draft's kings as an outline")
    ap.add_argument("--no-headings", action="store_true")
    ap.add_argument("--lang", choices=["en", "zh"], default="en")
    ap.add_argument("--plain", action="store_true",
                    help="compare rendered text only (automatic when either file is .docx)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    try:
        kings = draft_kings(a.draft, a.lang)
    except (OSError, UnicodeDecodeError, KeyError, zipfile.BadZipFile) as e:
        print("cannot read %s: %s" % (a.draft, e), file=sys.stderr)
        return 2
    if a.emit:
        sys.stdout.write(emit(kings, not a.no_headings))
        return 0
    if not a.outline:
        ap.error("an OUTLINE file is required unless --emit is given")
    try:
        items = [it["text"] for it in parse_outline(a.outline)["items"]]
    except (OSError, UnicodeDecodeError, KeyError, zipfile.BadZipFile) as e:
        print("cannot read %s: %s" % (a.outline, e), file=sys.stderr)
        return 2
    plain = a.plain or a.draft.lower().endswith(".docx") or a.outline.lower().endswith(".docx")
    res = compare(kings, items, plain)
    if a.json:
        print(json.dumps({"draft": a.draft, "outline": a.outline, "draft_kings": len(kings),
                          "outline_items": len(items), "mismatches": res}, ensure_ascii=False, indent=2))
    else:
        print("draft kings: %d (%s) | outline items: %d (%s)" % (len(kings), a.draft, len(items), a.outline))
        where = "paragraph" if a.draft.lower().endswith(".docx") else "line"
        for r in res:
            if r["kind"] == "mismatch":
                print("MISMATCH draft king %d (%s %s) vs outline item %d\n  draft:   %s\n  outline: %s"
                      % (r["draft_no"], where, r["line"], r["outline_no"], r["draft"], r["outline"]))
            elif r["kind"] == "missing-from-outline":
                print("MISSING FROM OUTLINE draft king %d (%s %s)\n  draft:   %s" % (r["draft_no"], where, r["line"], r["draft"]))
            else:
                print("MISSING FROM DRAFT outline item %d\n  outline: %s" % (r["outline_no"], r["outline"]))
        print("outline_check: %d mismatch(es)" % len(res))
    return 1 if res else 0


if __name__ == "__main__":
    sys.exit(main())
