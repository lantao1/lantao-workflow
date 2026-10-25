#!/usr/bin/env python3
"""outline_to_docx.py - a printable Word copy of an outline of kings (one numbered line each).

A reader who reviews the argument reads the outline: the first sentence of every paragraph, in
order. This writes it as a .docx through the same HTML -> LibreOffice route as tex2docx.py,
with numbered paragraphs on a hanging indent so wrapped lines align under the text.

Usage:
    python3 outline_to_docx.py OUTLINE -o OUT.docx [--title T] [--subtitle S] [--no-headings]
                               [--ref LABEL=TEXT ...] [--html-only]
    python3 outline_to_docx.py DRAFT --from-draft -o OUT.docx [...]

    OUTLINE         .tex (\\item entries; \\section or {\\large\\textbf{...}} headings), .md/.txt
                    (a numbered or bulleted list; # headings), or .docx. Read by
                    outline_check.parse_outline, the same reader the gate uses.
    --from-draft    build the outline straight from a draft (.tex, .md or .docx): the kings
                    are read from the draft, so the printed outline cannot drift from it.
    --title         heading (default: the outline's own title, else the file name).
    --subtitle      line under the title (default: "Outline: the topic sentence of each
                    paragraph").
    --no-headings   number the kings straight through with no section headings (some readers
                    find subheadings a distraction in an outline and want one coherent story).
    --ref L=TEXT    resolve \\ref{L} to TEXT (repeatable), e.g. --ref tab:main=2. Better: keep
                    \\ref out of kings; an unresolved reference prints "?".
    --html-only     write the HTML and stop (no LibreOffice needed).

Run outline_check.py first: print an outline only after it matches the draft.

Exit codes: 0 written, 2 usage, input or LibreOffice error.
"""
import argparse
import html
import os
import re

import sys
import tempfile
import zipfile

sys.dont_write_bytecode = True          # no __pycache__ beside the gates
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "gates"))
import tex2docx  # noqa: E402
import outline_check  # noqa: E402

SUBTITLE = "Outline: the topic sentence of each paragraph"


def md_emphasis(s):
    s = re.sub(r"(\*\*|__)(.+?)\1", r"<b>\2</b>", s)
    return re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", s)


def hanging_indent(path):
    """Numbered paragraphs: 'N.  text' -> 'N.<tab>text' with a hanging indent."""
    def fix_doc(x):
        def fix(m):
            para = m.group(0)
            if not re.search(r"<w:t[^>]*>\d+\.\u00a0\u00a0", para):
                return para
            para = re.sub(r"(<w:t[^>]*>)(\d+)\.\u00a0\u00a0", r"\1\2.</w:t><w:tab/><w:t xml:space='preserve'>", para, count=1)
            para = re.sub(r"<w:ind [^>]*/>", "", para)
            ind = '<w:ind w:left="567" w:hanging="567"/>'
            if re.search(r"<w:spacing [^>]*/>", para):
                para = re.sub(r"(<w:spacing [^>]*/>)", r"\1" + ind, para, count=1)   # schema order: spacing, ind, jc
            elif "<w:jc " in para:
                para = para.replace("<w:jc ", ind + "<w:jc ", 1)
            elif "<w:pPr>" in para:
                para = para.replace("</w:pPr>", ind + "</w:pPr>", 1)
            return para
        return re.sub(r"<w:p>.*?</w:p>", fix, x, flags=re.S)
    tex2docx._rewrite_part(path, "word/document.xml", fix_doc)


def build_html(title, subtitle, items, headings=True, refs=None):
    refs = refs or {}
    parts = ['<html><head><meta charset="utf-8"></head><body>',
             '<h1 style="text-align:center">%s</h1>' % html.escape(title)]
    if subtitle:
        parts.append('<p style="text-align:center">%s</p>' % html.escape(subtitle))
    last = None
    for n, it in enumerate(items, 1):
        sec = it.get("section")
        if headings and sec and sec != "PREAMBLE" and sec != last:
            parts.append("<h2>%s</h2>" % tex2docx.inline(sec))
            last = sec
        text = it["text"].split("<EQ>")[0].strip()
        text = re.sub(r"\\(?:ref|eqref)\{([^}]*)\}", lambda m: refs.get(m.group(1), "?"), text)
        parts.append('<p style="margin-left:2.2em; text-indent:-2.2em; margin-top:4pt; margin-bottom:4pt">'
                     '%d.&nbsp;&nbsp;%s</p>' % (n, md_emphasis(tex2docx.inline(text))))
    parts.append("</body></html>")
    return "\n".join(parts)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Print an outline of kings as a .docx.",
                                 epilog="See the module docstring for the formats read.")
    ap.add_argument("input")
    ap.add_argument("-o", "--output")
    ap.add_argument("--from-draft", action="store_true")
    ap.add_argument("--title")
    ap.add_argument("--subtitle", default=SUBTITLE)
    ap.add_argument("--no-headings", action="store_true")
    ap.add_argument("--ref", action="append", default=[], metavar="LABEL=TEXT")
    ap.add_argument("--html-only", action="store_true")
    ap.add_argument("--lang", choices=["en", "zh"], default="en")
    a = ap.parse_args(argv)
    try:
        if a.from_draft:
            kings = outline_check.draft_kings(a.input, a.lang)
            items = [{"section": sec or None, "text": k} for _, sec, k in kings]
            title = None
        else:
            o = outline_check.parse_outline(a.input)
            items, title = o["items"], o["title"]
    except (OSError, UnicodeDecodeError, KeyError, zipfile.BadZipFile) as e:
        print("cannot read %s: %s" % (a.input, e), file=sys.stderr)
        return 2
    if not items:
        print("no outline items found in %s" % a.input, file=sys.stderr)
        return 2
    refs = dict(r.split("=", 1) for r in a.ref if "=" in r)
    title = a.title or title or os.path.splitext(os.path.basename(a.input))[0]
    page = build_html(title, a.subtitle, items, not a.no_headings, refs)
    stem = os.path.splitext(a.input)[0] + ("_outline" if a.from_draft else "")
    if a.html_only:
        out = a.output or stem + ".html"
        open(out, "w", encoding="utf-8").write(page)
        print("kings: %d | HTML: %s" % (len(items), out))
        return 0
    out = a.output or stem + ".docx"
    with tempfile.TemporaryDirectory() as tmp:
        hp = os.path.join(tmp, os.path.splitext(os.path.basename(out))[0] + ".html")
        open(hp, "w", encoding="utf-8").write(page)
        try:
            tex2docx.html_to_docx(hp, out, restyle_tables=False)
        except RuntimeError as e:
            print("error: %s" % e, file=sys.stderr)
            return 2
    hanging_indent(out)
    print("kings: %d | DOCX: %s" % (len(items), out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
