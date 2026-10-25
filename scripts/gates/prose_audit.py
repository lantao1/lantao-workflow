#!/usr/bin/env python3
"""prose_audit.py - mechanical prose gate for LaTeX (.tex) and Markdown (.md) drafts.

Usage:
    python3 prose_audit.py FILE [FILE ...] [options]

Options:
    --banned FILE       an extra banned-word list, added to banned_words.txt beside this script
                        (repeatable). Use it for a project's own retired names (one object, one
                        name). A plain entry is gated (error); an entry with a leading "~" is on
                        the style list (warning). An entry gated in any list stays gated. English
                        entries match whole words, case ignored ("May" before a number is the
                        month and passes); Chinese entries match as substrings, so the Chinese
                        hedge words are warnings to sweep, not failures.
    --no-default-banned do not load banned_words.txt; only the --banned lists apply.
    --allow FILE:TEXT[:COUNT]
                        a deliberate exception the author approved, recorded by file and count:
                        in FILE, the hit TEXT (the quoted text of a banned, manual-register,
                        en-dash, proposal-leak or number-pointer finding; case, ties and spacing
                        ignored) occurs exactly COUNT times (default 1). Any other count fails, a
                        second occurrence included, and so does an exception that matches
                        nothing any more. FILE is a path, or a bare name matched against the base
                        name. Repeatable. Never loosen the list itself.
    --allow-file LIST   the same exceptions, one FILE:TEXT[:COUNT] per line ('#' comments).
    --baseline FILE     the version before an edit round (one input file only). Proposal-leak and
                        stray-cjk findings on a line the before copy already had are dropped, so
                        the scan reports what the round wrote. Pair it with a sentence diff
                        against the same before copy: account for every deleted sentence.
    --max-sentence N    flag sentences longer than N words (default 40 in English; no default
                        in Chinese, where N counts characters). 0 turns the check off.
    --max-king N        flag a paragraph's first sentence longer than N words (default 26 in
                        English; no default in Chinese). 0 turns the check off.
    --lang en|zh        language of the file (default en). Chinese files skip the ", and " king
                        check, the stray-CJK check and the typography check, and add the Chinese
                        pointer and dash forms.
    --echo              also warn on king echoes (a body sentence that restates its own king),
                        cross-king echoes (two kings that share most of their content words) and
                        repeated N-word strings (say-once).
    --ngram N           the string length for the --echo say-once check (default 6). Run 5 and 4
                        as well before calling a draft clean.
    --strict            exit 1 on warnings too.
    --json              print findings as JSON instead of text.

Checks (severity):
    banned          a gated banned word or phrase (error); a style-list word (warning)
    manual-register a paper is not a manual: the test is the reader's need, not the author's
                    workflow. A file name of code or data (.do, .csv, .dta, .py, .R, .rds ...),
                    a project folder path (scripts/, output/, build/), typewriter text
                    (\\texttt, \\path, \\verb; inline code in .md) (error). A document that
                    describes itself or narrates its own construction ("This note documents",
                    "documents how", "should be stated wherever", "for the reader's
                    convenience") (warning: "We document how ..." can be a finding; read it).
    em-dash         an em dash: "---", U+2014 or U+2015, a double hyphen or en dash with a space
                    on either side between words (error). In Chinese the double dash or a
                    spaced single one; a single dash joining two words (a compound such as
                    district-year) is a connector and passes.
    en-dash         a double hyphen between two letters with no space (warning): a compound name
                    (Cobb--Douglas) is right, a dash used as punctuation is not. Record the
                    compounds as exceptions.
    typography      a curly quote or a non-breaking space character in an English .tex file
                    (warning): use `` '' and ~.
    king-length     a paragraph's first sentence over --max-king words (error)
    king-and        a paragraph's first sentence containing ", and " (error). It usually joins two
                    claims; split them. A serial list ("A, B, and C") trips it too: read the king.
    king-abbrev     a king holding an abbreviation or a single capital followed by a capitalised
                    word (warning). Where the abbreviation ends the sentence ("rose in the U.S.
                    Prices fell", "in Panel B. Prices recover") the king runs into the next
                    sentence and the outline check fails. End kings on a word.
    long-sentence   a sentence over --max-sentence words (warning: a place to look, not a rule;
                    read it aloud, split only if it does not read in one pass)
    stray-cjk       Chinese characters or full-width punctuation in an English file (error)
    proposal-leak   proposal vocabulary written into the text: "King:", "NEW CONTENT",
                    "Move the", "(CN:", "[CN]", "No change", "Wording unchanged" (error). This is
                    the scan to run after a batch of edits lands, with --baseline set to the
                    before copy; an ordinary sentence that trips it is recorded as an exception.
    number-pointer  a part of the document pointed at by number ("Section 3", "Chapter~\\ref",
                    "Appendix B", "Sec.~3", "Ch.~2", "\\autoref{sec:...}", "第3章", "第2.1节",
                    "§4") instead of by name; tables, figures and equations may be numbered
                    (error). A proper noun that trips it ("Section 8 vouchers") is recorded as
                    an exception. Headings are labels, not pointers, and are not checked.
    exception       a recorded exception whose count no longer matches the text (error)
    king-echo, cross-king-echo, repeated-ngram   only with --echo (warning)

What is read. In .tex: the text between \\begin{document} and \\end{document} (the whole file
for a fragment), comments stripped first (a comment that mentions \\begin{document} is not the
body), the reference list cut, the preamble paragraphs before the first heading kept. Display
math, tabulars, code, quotes, TikZ and title blocks are not prose; nor are \\input, \\include and
\\includegraphics lines, or \\newcommand, \\renewcommand, \\providecommand, \\def and
\\DeclareMathOperator definitions, which would otherwise stand alone as a paragraph and invent a
king (audit an \\input file on its own). Footnotes are pulled out with brace matching and audited
as their own units, so they never swallow the sentence they hang on. Float captions and notes are
audited for words and dashes but are exempt from the length checks. Each \\item is its own unit
and is not a king. In .md: front matter, code, HTML comments, tables and
block quotes are skipped; list items and footnote definitions are their own units; a wrapped
line that starts with a number and a period ("2010. Prices fell") continues its paragraph unless
it opens a list (after a blank line, inside a list, or numbered 1). In both formats headings break
paragraphs, are never kings and are exempt from the length checks, and their titles are audited
for banned words, dashes, stray CJK, proposal vocabulary and manual register.

Exit codes: 0 clean (warnings allowed unless --strict), 1 findings, 2 usage or read error.

The parser is reused by outline_check.py: load_document(), kings(), first_sentence(),
split_sentences(), normalize().
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BANNED = os.path.join(HERE, "banned_words.txt")

SENT = "\x00"    # a line kept for line numbering that is not a blank line
BREAK = "\x02"   # a forced paragraph break (heading, list end, skipped block)
ITEM = "\x03"    # a list-item break

CJK = re.compile(r"[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]")

PROPOSAL_VOCAB = ["King:", "NEW CONTENT", "Move the", "(CN:", "[CN]", "No change", "Wording unchanged"]

# The manual register: what a reader of a paper never needs. Errors are names of the author's
# files, folders and code; the phrases are warnings, because "documents how" can open a finding.
MANUAL_ERR = [
    (re.compile(r"(?<=[\w\-])\.(?:do|ado|csv|dta|py|R|Rmd|qmd|ipynb|rds|RData|sas|sav|parquet|json|log)(?![\w])"),
     "a code or data file name"),
    (re.compile(r"(?<![\w])(?:scripts|output|build)/"), "a project folder path"),
    (re.compile(r"\\(?:texttt|path)\s*\{|\\verb(?![A-Za-z])|\\lstinline(?![A-Za-z])"), "typewriter text"),
    (re.compile(r"`code`"), "inline code (typewriter text)"),
]
MANUAL_PHRASES = ["documents how", "This note documents", "This chapter documents",
                  "should be stated wherever", "for the reader's convenience"]

# A part of the document pointed at by number. Tables, figures and equations are exhibits and
# may carry numbers; chapters, sections and appendices are pointed at by name.
POINTER_EN = re.compile(
    r"(?<![\\A-Za-z])(?:Chapters?|Sections?|Subsections?|Appendix|Appendices|"
    r"chapters?|sections?|subsections?|appendix|appendices|Secs?\.|Chs?\.|Chap\.)"
    r"(?:~|\s)*(?:\\(?:auto|c|C|name|v)?ref\{|\d|[IVX]{2,}\b|[A-H](?:\.\d+)?\b(?![a-z]))")
POINTER_REF = re.compile(r"\\(?:autoref|cref|Cref|vref|nameref)\{(?:sec|ssec|subsec|ch|chap|app|part)[:\-]")
POINTER_SECT = re.compile(r"§\s*\d")
POINTER_ZH = re.compile(r"第\s*[0-9一二三四五六七八九十]+(?:\.\d+)*\s*[章节]|附录\s*~?\s*(?:\\ref\{|[A-Z0-9])")

ABBREV = ["U.S.A.", "U.S.", "U.K.", "e.g.", "i.e.", "vs.", "et al.", "etc.", "cf.", "Fig.", "Figs.",
          "Eq.", "Eqs.", "No.", "Nos.", "Dr.", "Mr.", "Ms.", "Mrs.", "Prof.", "approx.", "resp.",
          "Ref.", "Refs.", "Sec.", "Ch.", "Jr.", "Sr.", "St.", "Vol.", "pp.", "p.", "ed.", "eds.",
          "Inc.", "Ltd.", "Co.", "Jan.", "Feb.", "Mar.", "Apr.", "Aug.", "Sept.", "Sep.", "Oct.",
          "Nov.", "Dec."]
_ABBR_RE = re.compile("|".join(r"(?<![A-Za-z])" + re.escape(a) for a in sorted(ABBREV, key=len, reverse=True)))
_INITIAL_RE = re.compile(r"(?<![A-Za-z])([A-Z])\.(?=\s+[A-Z])")   # "J. Smith", as in "T. W."

NONPROSE_ENVS = [
    "equation", "equation*", "align", "align*", "alignat", "alignat*", "gather", "gather*",
    "multline", "multline*", "eqnarray", "eqnarray*", "displaymath", "flalign", "flalign*",
    "verbatim", "Verbatim", "lstlisting", "minted", "comment", "tikzpicture", "titlepage",
    "thebibliography", "quote", "quotation", "verse", "center", "tabular", "tabular*",
    "tabularx", "longtable", "array",
]
MATH_ENVS = {"equation", "equation*", "align", "align*", "alignat", "alignat*", "gather", "gather*",
             "multline", "multline*", "eqnarray", "eqnarray*", "displaymath", "flalign", "flalign*"}
FLOAT_ENVS = ["figure", "figure*", "table", "table*", "sidewaystable", "sidewaysfigure"]
LIST_ENVS = ["itemize", "enumerate", "description"]
REF_MARKERS = [r"\section*{References}", r"\section*{Bibliography}", r"\section{References}",
               r"\begin{thebibliography}", r"\bibliography{", r"\printbibliography",
               r"\section*{参考文献}", r"\section{参考文献}"]
LAYOUT_CMDS = ["clearpage", "newpage", "cleardoublepage", "FloatBarrier", "appendix", "smallskip",
               "medskip", "bigskip", "sloppy", "fussy", "noindent", "indent", "maketitle",
               "tableofcontents", "listoffigures", "listoftables", "centering", "raggedright",
               "raggedleft", "par", "linebreak", "pagebreak", "nopagebreak", "vfill", "hfill",
               "frontmatter", "mainmatter", "backmatter", "onehalfspacing", "doublespacing",
               "singlespacing", "normalsize", "small", "footnotesize", "scriptsize", "large", "Large"]
LAYOUT_ARG_CMDS = ["vspace", "hspace", "enlargethispage", "setcounter", "addtocounter", "setlength",
                   "thispagestyle", "pagestyle", "label", "addcontentsline", "graphicspath",
                   "bibliographystyle", "nocite", "phantomsection", "input", "include", "includegraphics"]
HEADING_RE = re.compile(r"\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\s*(?:\[[^\]]*\])?\s*\{")
DEF_RE = re.compile(r"\\(?:(?:re|provide)?newcommand|DeclareMathOperator|def)(?![A-Za-z])\*?")
UNWRAP_CMDS = ["textit", "textbf", "emph", "textsc", "texttt", "textrm", "textsf", "textup",
               "textnormal", "underline", "mbox", "hbox", "text", "enquote", "textmd", "uline"]


# --------------------------------------------------------------------------- data model

class Unit:
    """A run of prose: a paragraph, a list item, a footnote, a float's caption and notes."""

    def __init__(self, kind, line, section, light, end_line=None):
        self.kind = kind            # para | item | cont | footnote | float
        self.line = line            # first line in the file (1-based)
        self.end_line = end_line or line
        self.section = section
        self.light = light          # markup kept, whitespace collapsed
        self.sentences = split_sentences(light)
        # a display that opens a paragraph is not its topic sentence
        while self.sentences and not clean(self.sentences[0]).strip(" .:;,"):
            self.sentences.pop(0)

    def first(self):
        return self.sentences[0] if self.sentences else ""


class Document:
    def __init__(self, path, fmt, lang, units, scan, raw_lines, offset, head_scan=None):
        self.path, self.fmt, self.lang = path, fmt, lang
        self.units = units          # list of Unit
        self.scan = scan            # list of (lineno, text) for line-based checks
        self.head_scan = head_scan or []   # (lineno, title) for each heading
        self.raw_lines = raw_lines  # comment-stripped lines, indexed by lineno - 1
        self.offset = offset


# --------------------------------------------------------------------------- helpers

def brace_end(s, i):
    """Index just past the group that opens at s[i] == '{' (brace matching, escapes skipped)."""
    depth, k = 0, i
    while k < len(s):
        c = s[k]
        if c == "\\":
            k += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return k + 1
        k += 1
    return len(s)


def keep_lines(block, placeholder=""):
    """Replace a block by a placeholder, keeping its line count with non-blank sentinel lines."""
    n = block.count("\n")
    return placeholder + ("\n" + SENT) * n


def blank_lines(block, placeholder=""):
    """Replace a block by a placeholder plus forced breaks, keeping its line count."""
    n = block.count("\n")
    return BREAK + placeholder + ("\n" + SENT) * n + BREAK


def eq_placeholder(block):
    """A display equation in running text. If the display ends the sentence (its last
    character is a period), the placeholder carries the period so the next sentence splits."""
    inner = re.sub(r"\\(?:begin|end)\{[^}]*\}|\\label\{[^}]*\}|\\nonumber|\\notag|\\\[|\\\]|\$\$", " ", block)
    inner = re.sub(r"(\\\\|\s)+$", "", inner.replace(SENT, " ").strip())
    return " <EQ>. " if inner.endswith(".") else " <EQ> "


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def strip_tex_comments(text):
    out = []
    for line in text.split("\n"):
        stripped = re.sub(r"(?<!\\)%.*$", "", line)
        if stripped.strip() == "" and line.strip() != "":
            stripped = SENT          # a comment-only line does not break a paragraph in LaTeX
        out.append(stripped)
    return "\n".join(out)


def strip_definitions(s):
    """Replace each \\newcommand-style definition by a sentinel, keeping the line count.

    A definition is not prose; standing alone between blank lines it would be read as a paragraph
    and its text as a king. Brace matched, so a definition body with nested groups goes whole.
    """
    out, i = [], 0
    while True:
        m = DEF_RE.search(s, i)
        if not m:
            out.append(s[i:])
            return "".join(out)
        out.append(s[i:m.start()])
        k = m.end()
        k += len(re.match(r"\s*", s[k:]).group(0))
        if k < len(s) and s[k] == "{":                       # \newcommand{\foo}
            k = brace_end(s, k)
        else:                                                # \newcommand\foo, \def\foo
            mm = re.match(r"\\(?:[A-Za-z@]+|.)", s[k:])
            k += mm.end() if mm else 0
        if m.group(0).startswith("\\def"):
            k += len(re.match(r"[^{\n]*", s[k:]).group(0))    # parameter text, #1#2
        else:
            k += len(re.match(r"\s*(?:\[[^\]]*\]\s*){0,2}", s[k:]).group(0))
        if k < len(s) and s[k] == "{":
            k = brace_end(s, k)
        out.append(keep_lines(s[m.start():k], SENT))
        i = k


def unwrap_commands(s, names):
    """\\textit{x} -> x for each name, with brace matching, nested calls included."""
    pat = re.compile(r"\\(" + "|".join(re.escape(n) for n in names) + r")\*?\s*\{")
    for _ in range(20):
        m = pat.search(s)
        if not m:
            break
        start, ob = m.start(), m.end() - 1
        end = brace_end(s, ob)
        s = s[:start] + s[ob + 1:end - 1] + s[end:]
    return s


def mask_math(s):
    """Replace inline math by opaque tokens so sentence splitting never cuts inside it."""
    store = []

    def keep(m):
        store.append(m.group(0))
        return "\x04%d\x05" % (len(store) - 1)
    s = re.sub(r"(?<!\\)\$\$.+?(?<!\\)\$\$|(?<!\\)\$.+?(?<!\\)\$|\\\(.+?\\\)", keep, s)
    return s, store


def unmask(s, store):
    return re.sub(r"\x04(\d+)\x05", lambda m: store[int(m.group(1))], s)


def split_sentences(text):
    """Split prose into sentences. Abbreviations, initials and inline math are protected."""
    if not text.strip():
        return []
    s, store = mask_math(text)
    s = _ABBR_RE.sub(lambda m: m.group(0).replace(".", "\x06"), s)
    s = _INITIAL_RE.sub(lambda m: m.group(1) + "\x06", s)
    if CJK.search(s):
        parts = re.split(r"(?<=[。！？])\s*|(?:(?<=[.!?])|(?<=[.!?][\"'”’)\]]))\s+(?=[A-Z0-9\"“‘(\[\\])", s)
    else:
        parts = re.split(r"(?:(?<=[.!?])|(?<=[.!?][\"'”’)\]]))\s+(?=[A-Z0-9\"“‘(\[\\<\x04])", s)
    out = []
    for p in parts:
        if p is None:
            continue
        p = unmask(p.replace("\x06", "."), store).strip()
        if p:
            out.append(p)
    return out


def first_sentence(text):
    ss = split_sentences(text)
    return ss[0] if ss else ""


def clean(s):
    """Light text -> plain words, for counting and word matching."""
    s = s.replace("<EQ>", " ")
    s = re.sub(r"\\(?:cite|citet|citep|citealt|citealp|citeauthor|citeyear|parencite|textcite|autocite)\*?"
               r"(?:\[[^\]]*\]){0,2}\{[^}]*\}", "Cite", s)
    s = re.sub(r"\\(?:eqref|ref|pageref|autoref|cref|Cref|vref|nameref)\{[^}]*\}", "1", s)
    s = re.sub(r"\\href\{[^}]*\}\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\url\{[^}]*\}", "URL", s)
    s = unwrap_commands(s, UNWRAP_CMDS)
    s = re.sub(r"(?<!\\)\$\$.+?(?<!\\)\$\$|(?<!\\)\$.+?(?<!\\)\$|\\\(.+?\\\)", "MATH", s)
    s = s.replace("``", '"').replace("''", '"').replace("\\%", "%").replace("\\&", "&").replace("\\$", "$")
    s = s.replace("\\_", "_").replace("\\#", "#")
    s = re.sub(r"\\[,;:! ]", " ", s)
    s = s.replace("~", " ")
    s = re.sub(r"\\[A-Za-z]+\*?", " ", s)
    s = re.sub(r"[{}]", "", s)
    # markdown residue
    s = re.sub(r"`[^`]*`", "CODE", s)
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    s = re.sub(r"(\*\*|__)(.+?)\1", r"\2", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"\1", s)
    s = re.sub(r"</?[A-Za-z][^>]*>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def normalize(s):
    """Light text -> a comparison key: formatting unwrapped, whitespace, quotes and ties unified.

    Math, references and citations are kept as written, so a king and its outline entry match
    only when they say the same thing.
    """
    s = unwrap_commands(s, UNWRAP_CMDS)
    s = re.sub(r"(\*\*|__)(.+?)\1", r"\2", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"\1", s)
    s = s.replace("``", '"').replace("''", '"').replace("“", '"').replace("”", '"')
    s = s.replace("‘", "'").replace("’", "'").replace("\\%", "%").replace("\\&", "&")
    s = s.replace("~", " ").replace("\u00a0", " ")
    s = re.sub(r"\\label\{[^}]*\}", "", s)
    return re.sub(r"\s+", " ", s).strip()


def words(s):
    return len(s.split())


def zh_len(s):
    """Length of a Chinese sentence: CJK characters plus Latin words."""
    return len(CJK.findall(s)) + len(re.findall(r"[A-Za-z0-9]+", CJK.sub(" ", s)))


# --------------------------------------------------------------------------- .tex reader

def _extract_footnotes(t, fn_units):
    pat = re.compile(r"\\footnote(?:text)?\s*(?:\[[^\]]*\])?\s*\{")
    out, i = [], 0
    while True:
        m = pat.search(t, i)
        if not m:
            out.append(t[i:])
            return "".join(out)
        out.append(t[i:m.start()])
        ob = m.end() - 1
        end = brace_end(t, ob)
        body = t[ob + 1:end - 1]
        fn_units.append((m.start(), body))
        out.append(keep_lines(t[m.start():end]))
        i = end


def _process_envs(t, names, handler):
    for name in names:
        pat = re.compile(r"\\begin\{" + re.escape(name) + r"\}.*?\\end\{" + re.escape(name) + r"\}", re.S)
        t = pat.sub(lambda m: handler(name, m), t)
    return t


def _float_text(block):
    """What a float says in words: its caption and its notes, with tabulars and graphics removed."""
    b = re.sub(r"\\begin\{(tabular\*?|tabularx|longtable|array|tikzpicture)\}.*?\\end\{\1\}", " ", block, flags=re.S)
    b = re.sub(r"\\begin\{[^}]*\}(?:\[[^\]]*\])?(?:\{[^}]*\})?|\\end\{[^}]*\}", " ", b)
    b = re.sub(r"\\includegraphics\s*(?:\[[^\]]*\])?\s*\{[^}]*\}", " ", b)
    b = re.sub(r"\\input\{[^}]*\}", " ", b)
    b = re.sub(r"\\caption\s*(?:\[[^\]]*\])?\s*\{", r" {", b)
    b = re.sub(r"\\(?:" + "|".join(LAYOUT_ARG_CMDS) + r")\*?\s*\{[^}]*\}", " ", b)
    b = re.sub(r"\\(?:" + "|".join(LAYOUT_CMDS) + r")\b", " ", b)
    b = b.replace(SENT, " ")
    return re.sub(r"\s+", " ", b).strip()


def _float_scan_lines(block, first_line):
    """A float's lines for the line-based checks: captions and notes kept, tabulars and graphics removed."""
    b = re.sub(r"\\begin\{(tabular\*?|tabularx|longtable|array|tikzpicture)\}.*?\\end\{\1\}",
               lambda m: keep_lines(m.group(0)), block, flags=re.S)
    b = re.sub(r"\\includegraphics\s*(?:\[[^\]]*\])?\s*\{[^}]*\}|\\label\{[^}]*\}|\\input\{[^}]*\}", " ", b)
    return [(first_line + k, l.replace(SENT, "")) for k, l in enumerate(b.split("\n"))]


def read_tex(path, text):
    # comments first: a header comment that mentions \begin{document} must not start the body
    text = strip_tex_comments(text)              # same line structure as the file
    offset = text.find(r"\begin{document}")
    offset = offset + len(r"\begin{document}") if offset >= 0 else 0
    body = text[offset:]
    line0 = text.count("\n", 0, offset)          # lines before the body
    if r"\end{document}" in body:
        body = body[:body.index(r"\end{document}")]
    cut = min([body.find(m) for m in REF_MARKERS if m in body] or [len(body)])
    body = body[:cut]
    body = strip_definitions(body)
    pre = body                                   # comment-stripped, same line structure as the file
    raw = [""] * line0 + [l.replace(SENT, "") for l in body.split("\n")]
    extra_scan = []

    # footnotes out, as their own units (brace matching, so a footnote never swallows its sentence)
    fns = []
    body = _extract_footnotes(body, fns)
    for pos, ftxt in fns:
        start = line_of(pre, pos)
        extra_scan += [(line0 + start + k, l.replace(SENT, "")) for k, l in enumerate(ftxt.split("\n"))]

    # floats: their captions and notes are units of their own; replacements keep the line count
    floats = []
    for name in FLOAT_ENVS:
        pat = re.compile(r"\\begin\{" + re.escape(name) + r"\}.*?\\end\{" + re.escape(name) + r"\}", re.S)
        new, last = [], 0
        for m in pat.finditer(body):
            new.append(body[last:m.start()])
            fl, blk = line_of(body, m.start()), m.group(0)
            floats.append((fl, _float_text(blk), blk.count("\n")))
            extra_scan += _float_scan_lines(blk, line0 + fl)
            new.append(keep_lines(blk))
            last = m.end()
        new.append(body[last:])
        body = "".join(new)

    def env_handler(name, m):
        if name in MATH_ENVS:
            return keep_lines(m.group(0), eq_placeholder(m.group(0)))
        return blank_lines(m.group(0))
    body = _process_envs(body, NONPROSE_ENVS, env_handler)
    body = re.sub(r"\\\[.*?\\\]", lambda m: keep_lines(m.group(0), eq_placeholder(m.group(0))), body, flags=re.S)
    body = re.sub(r"(?<!\\)\$\$.*?(?<!\\)\$\$", lambda m: keep_lines(m.group(0), eq_placeholder(m.group(0))), body, flags=re.S)

    # headings: record the title (audited as a heading, never a king), then force a paragraph break
    heads, head_scan, head_units = [], [], []
    while True:
        m = HEADING_RE.search(body)
        if not m:
            break
        end = brace_end(body, m.end() - 1)
        ln = line_of(body, m.start())
        raw_title = body[m.end():end - 1]
        title = re.sub(r"\s+", " ", raw_title.replace(SENT, " ")).strip()
        heads.append((ln, clean(title)))
        if title:
            head_scan.append((line0 + ln, title))
            head_units.append(Unit("heading", line0 + ln, clean(title), title, line0 + ln + raw_title.count("\n")))
        body = body[:m.start()] + BREAK + keep_lines(body[m.start():end]) + BREAK + body[end:]

    # lists: each \item starts a unit; text after the list continues the paragraph
    for name in LIST_ENVS:
        body = re.sub(r"\\begin\{" + name + r"\}(?:\[[^\]]*\])?", ITEM, body)
        body = re.sub(r"\\end\{" + name + r"\}", ITEM + "\x07", body)
    body = re.sub(r"\\item\s*(?:\[[^\]]*\])?", ITEM, body)

    # layout commands
    body = re.sub(r"\\(?:" + "|".join(LAYOUT_ARG_CMDS) + r")\*?\s*(?:\[[^\]]*\])?\s*\{[^}]*\}", " ", body)
    body = re.sub(r"\\(?:" + "|".join(LAYOUT_CMDS) + r")(?![A-Za-z])", " ", body)
    body = re.sub(r"\\(?:begin|end)\{(?:abstract|document|minipage|landscape|singlespace|doublespace|"
                  r"onehalfspace|flushleft|flushright|samepage)\}(?:\{[^}]*\})?", " ", body)
    body = body.replace(r"\bibentry", BREAK)

    scan = [(line0 + i + 1, l.replace(SENT, "").replace(BREAK, "").replace(ITEM, "").replace("\x07", ""))
            for i, l in enumerate(body.split("\n"))] + extra_scan
    units = _units_from_body(body, heads, line0)
    for fl, ftxt, nl in floats:
        if ftxt and re.search(r"[A-Za-z\u4e00-\u9fff]", ftxt):
            units.append(Unit("float", line0 + fl, _section_at(heads, fl), ftxt, line0 + fl + nl))
    for pos, ftxt in fns:
        lt = re.sub(r"\s+", " ", ftxt.replace(SENT, " ")).strip()
        ln = line_of(pre, pos)
        if lt:
            units.append(Unit("footnote", line0 + ln, _section_at(heads, ln), lt, line0 + ln + ftxt.count("\n")))
    units += head_units
    units.sort(key=lambda u: (u.line, KIND_ORDER[u.kind]))
    return units, scan, raw, head_scan


KIND_ORDER = {"heading": 0, "para": 1, "item": 2, "cont": 2, "float": 3, "footnote": 4}


def _section_at(heads, ln):
    name = "PREAMBLE"
    for hl, title in heads:
        if hl <= ln:
            name = title
    return name


def _units_from_body(body, heads, line0):
    """Split the processed body into paragraph, item and continuation units with line numbers."""
    units = []
    # positions of paragraph starts: split on blank lines and forced breaks, keep offsets
    pieces, pos = [], 0
    for m in re.finditer(r"\n[ \t]*\n|" + BREAK, body):
        pieces.append((pos, body[pos:m.start()]))
        pos = m.end()
    pieces.append((pos, body[pos:]))
    for start, piece in pieces:
        if not piece.strip(" \t\n" + SENT):
            continue
        segs, spos = [], 0
        for m in re.finditer(ITEM, piece):
            segs.append((spos, piece[spos:m.start()]))
            spos = m.end()
        segs.append((spos, piece[spos:]))
        for idx, (so, seg) in enumerate(segs):
            txt = seg.replace(SENT, " ")
            after_list_end = txt.startswith("\x07")
            txt = re.sub(r"\s+", " ", txt.replace("\x07", " ")).strip()
            if not re.search(r"[A-Za-z\u4e00-\u9fff]", txt.replace("<EQ>", "")):
                continue
            lead_ws = len(seg) - len(seg.lstrip(" \t\n" + SENT + "\x07"))
            ln = line_of(body, start + so + lead_ws)
            if idx == 0:
                kind = "para"
            elif after_list_end:
                kind = "cont"
            else:
                kind = "item"
            end_ln = line_of(body, start + so + len(seg))
            units.append(Unit(kind, line0 + ln, _section_at(heads, ln), txt, line0 + end_ln))
    return units


# --------------------------------------------------------------------------- .md reader

def read_md(path, text):
    lines = text.split("\n")
    out = list(lines)
    heads, fns, head_scan = [], [], []
    i, n = 0, len(lines)
    if n and lines[0].strip() == "---":                       # front matter
        for j in range(1, n):
            if lines[j].strip() in ("---", "..."):
                for k in range(0, j + 1):
                    out[k] = SENT
                out[j] = BREAK
                i = j + 1
                break
    in_code, fence = False, ""
    in_comment = False
    # list state: an ordered item opens a list only after a blank line, inside a list, or at 1
    # (as in CommonMark), so a wrapped line that starts "2010. Prices ..." stays in its paragraph
    prev_blank, list_open = True, False

    def structural():
        nonlocal prev_blank, list_open
        prev_blank, list_open = True, False

    while i < n:
        l = lines[i]
        s = l.strip()
        if in_code:
            out[i] = BREAK if s.startswith(fence) else SENT
            if s.startswith(fence):
                in_code = False
            i += 1
            continue
        if in_comment:
            if "-->" in l:
                in_comment = False
                out[i] = l.split("-->", 1)[1] or SENT
            else:
                out[i] = SENT
            i += 1
            continue
        m = re.match(r"^\s*(```+|~~~+)", l)
        if m:
            in_code, fence = True, m.group(1)[:3]
            out[i] = BREAK
            structural()
            i += 1
            continue
        if "<!--" in l:
            before, after = l.split("<!--", 1)
            if "-->" in after:
                out[i] = before + " " + after.split("-->", 1)[1]
            else:
                out[i] = before or SENT
                in_comment = True
            i += 1
            continue
        if s.startswith("$$"):
            j = i
            if not (s.endswith("$$") and len(s) > 2):
                j = i + 1
                while j < n and "$$" not in lines[j]:
                    j += 1
            j = min(j, n - 1)
            out[i] = eq_placeholder("\n".join(lines[i:j + 1]))
            for k in range(i + 1, j + 1):
                out[k] = SENT
            prev_blank = False
            i = j + 1
            continue
        hm = re.match(r"^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$", l)
        if hm:
            heads.append((i + 1, hm.group(2)))
            head_scan.append((i + 1, hm.group(2)))
            out[i] = BREAK
            structural()
            i += 1
            continue
        if re.match(r"^\s{0,3}(=+|-+)\s*$", l) and i > 0 and lines[i - 1].strip() and out[i - 1] not in (BREAK, SENT):
            heads.append((i, lines[i - 1].strip()))                # setext heading
            head_scan.append((i, lines[i - 1].strip()))
            out[i - 1] = BREAK
            out[i] = BREAK
            structural()
            i += 1
            continue
        if re.match(r"^\s{0,3}([-*_])(\s*\1){2,}\s*$", l):          # horizontal rule
            out[i] = BREAK
            structural()
            i += 1
            continue
        if s.startswith("|") or s.startswith(">"):                  # table, block quote
            out[i] = BREAK
            structural()
            i += 1
            continue
        fm = re.match(r"^\[\^[^\]]+\]:\s*(.*)$", l)
        if fm:
            body = [fm.group(1)]
            j = i + 1
            while j < n and lines[j].startswith(("    ", "\t")) and lines[j].strip():
                body.append(lines[j].strip())
                out[j] = BREAK
                j += 1
            fns.append((i + 1, " ".join(body), j - i))
            out[i] = BREAK
            structural()
            i = j
            continue
        bm = re.match(r"^\s*[-*+]\s+(.*)$", l)
        om = re.match(r"^\s*(\d+)[.)]\s+(.*)$", l)
        if bm or (om and (prev_blank or list_open or int(om.group(1)) == 1)):
            out[i] = ITEM + (bm.group(1) if bm else om.group(2))
            prev_blank, list_open = False, True
            i += 1
            continue
        if not s:
            prev_blank = True
        else:
            if prev_blank and l[:1] not in (" ", "\t"):
                list_open = False                                   # a new paragraph ends the list
            prev_blank = False
        i += 1
    body = "\n".join(out)
    body = re.sub(r"\[\^[^\]]+\]", "", body)                         # footnote references
    # inline code keeps a marker, so the manual-register check sees typewriter text
    scan = [(k + 1, re.sub(r"`[^`]*`", "`code`", l.replace(SENT, "").replace(BREAK, "").replace(ITEM, "")))
            for k, l in enumerate(body.split("\n"))]
    for ln, ftxt, nl in fns:
        scan.append((ln, re.sub(r"`[^`]*`", "`code`", ftxt)))
    head_scan = [(ln, re.sub(r"`[^`]*`", "`code`", t)) for ln, t in head_scan]
    units = _units_from_body(body, heads, 0)
    for ln, ftxt, nl in fns:
        if ftxt.strip():
            units.append(Unit("footnote", ln, _section_at(heads, ln), re.sub(r"\s+", " ", ftxt).strip(), ln + nl - 1))
    for ln, t in heads:
        if t.strip():
            units.append(Unit("heading", ln, t, t))
    units.sort(key=lambda u: (u.line, KIND_ORDER[u.kind]))
    return units, scan, list(lines), head_scan


# --------------------------------------------------------------------------- public API

def load_document(path, lang="en"):
    text = open(path, encoding="utf-8").read()
    ext = os.path.splitext(path)[1].lower()
    fmt = "md" if ext in (".md", ".markdown", ".txt", ".qmd", ".rmd") else "tex"
    if fmt == "tex":
        units, scan, raw, head_scan = read_tex(path, text)
    else:
        units, scan, raw, head_scan = read_md(path, text)
    return Document(path, fmt, lang, units, scan, raw, 0, head_scan)


def kings(doc):
    """[(line, section, king_light)] for every paragraph unit, in document order."""
    return [(u.line, u.section, u.first()) for u in doc.units if u.kind == "para" and u.first()]


# --------------------------------------------------------------------------- checks

def load_banned(paths):
    """[(entry, severity)] from one or more lists. An entry gated in any list stays gated: a
    project list can add words or raise a style word to an error, never lower a gated one."""
    sev_of, order = {}, []
    for p in paths:
        for raw in open(p, encoding="utf-8"):
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            sev = "error"
            if line.startswith("~"):
                sev, line = "warn", line[1:].strip()
            if not line:
                continue
            k = line.lower()
            if k not in sev_of:
                order.append(line)
                sev_of[k] = sev
            elif sev == "error":
                sev_of[k] = "error"
    return [(e, sev_of[e.lower()]) for e in order]


def norm_key(s):
    """The comparison key of a hit or an exception: case, ties and spacing ignored."""
    return re.sub(r"\s+", " ", s.replace("~", " ").replace("\u00a0", " ")).strip().lower()


def parse_exception(spec):
    """FILE:TEXT[:COUNT] -> (file, key, text, count). FILE runs to the first colon."""
    if ":" not in spec:
        raise ValueError("an exception names its file and its count: FILE:TEXT[:COUNT], got %r" % spec)
    f, rest = spec.split(":", 1)
    m = re.match(r"^(.*?)(?::(\d+))?$", rest, re.S)
    text, count = m.group(1).strip(), int(m.group(2) or 1)
    if not f.strip() or not text:
        raise ValueError("an exception needs a file and a text: FILE:TEXT[:COUNT], got %r" % spec)
    return f.strip(), norm_key(text), text, count


def _same_file(spec_file, path):
    if "/" in spec_file or os.sep in spec_file:
        return os.path.abspath(spec_file) == os.path.abspath(path)
    return os.path.basename(path) == spec_file


def apply_exceptions(findings, path, exceptions):
    """Drop the hits an exception covers when their count matches; fail when it does not."""
    out, excepted = list(findings), 0
    for spec_file, key, text, count in exceptions:
        if not _same_file(spec_file, path):
            continue
        hits = [x for x in out if x.get("_key") == key]
        if len(hits) == count:
            out = [x for x in out if x.get("_key") != key]
            excepted += count
        else:
            out.append({"file": path, "line": hits[0]["line"] if hits else 0, "check": "exception",
                        "severity": "error", "text": "",
                        "message": 'exception "%s" records %d occurrence(s), found %d' % (text, count, len(hits))})
    return out, excepted


def banned_regex(entry):
    if CJK.search(entry):
        return re.compile(re.escape(entry))
    return re.compile(r"(?<![\w-])" + r"\s+".join(re.escape(w) for w in entry.split()) + r"(?![\w-])", re.I)


def locate(doc, unit, rx):
    """The first line in the unit's span where a pattern matches, else the unit's first line."""
    for ln in range(unit.line, unit.end_line + 1):
        if 0 < ln <= len(doc.raw_lines) and rx.search(clean(doc.raw_lines[ln - 1])):
            return ln
    return unit.line


def excerpt(s, n=110):
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[:n - 3] + "..."


def _dash_hits(t):
    """[(start, end, severity, key)] for a double hyphen or en dash between words.

    A space on either side makes it a dash used as punctuation (error). Unspaced between two
    letters it is a compound name such as Cobb--Douglas or a dash typed without spaces
    (warning). Between digits it is a range and passes. A triple hyphen is the em-dash check's.
    """
    out = []
    for m in re.finditer(r"(?<!-)(?:--|\u2013)(?!-)", t):
        i, j = m.start(), m.end()
        lsp = i > 0 and t[i - 1] == " "
        rsp = j < len(t) and t[j] == " "
        a = t[i - 2] if lsp and i >= 2 else (t[i - 1] if i >= 1 else "")
        b = t[j + 1] if rsp and j + 1 < len(t) else (t[j] if j < len(t) else "")
        if (lsp or rsp) and re.match(r"[A-Za-z\u4e00-\u9fff)]", a) and re.match(r"[A-Za-z\u4e00-\u9fff(]", b):
            out.append((i, j, "error", None))
        elif not (lsp or rsp) and m.group(0) == "--" and re.match(r"[A-Za-z]", a) and re.match(r"[A-Za-z]", b):
            left = re.search(r"[A-Za-z]+$", t[:i]).group(0)
            right = re.match(r"[A-Za-z]+", t[j:]).group(0)
            out.append((i, j, "warn", left + "--" + right))
    return out


_KING_ABBR = re.compile(r"(?:" + _ABBR_RE.pattern + r"|(?<![A-Za-z])[A-Z]\.)(?=\s+[A-Z])")


def audit(doc, banned, max_sentence, max_king, echo=False, ngram=6):
    F = []

    def add(check, sev, line, msg, text="", key=None, linetext=None):
        f = {"file": doc.path, "line": line, "check": check, "severity": sev,
             "message": msg, "text": excerpt(text)}
        if key is not None:
            f["_key"] = norm_key(key)          # a recorded exception can cover this hit
        if linetext is not None:
            f["_line"] = re.sub(r"\s+", " ", linetext).strip()   # for --baseline
        F.append(f)

    zh = doc.lang == "zh"
    # ---- unit-based: banned words, self-description, lengths, kings
    rxs = [(e, sev, banned_regex(e)) for e, sev in banned]
    for u in doc.units:
        plain = clean(u.light)
        for e, sev, rx in rxs:
            for m in rx.finditer(plain):
                if m.group(0) == "May" and re.match(r"\s+\d", plain[m.end():]):
                    continue                     # the month, not the modal
                add("banned", sev, locate(doc, u, rx), 'banned %s "%s"' % ("word" if sev == "error" else "style word", m.group(0)),
                    plain[max(0, m.start() - 50):m.end() + 50], key=m.group(0))
        for ph in MANUAL_PHRASES:
            for m in re.finditer(re.escape(ph), plain):
                add("manual-register", "warn", locate(doc, u, re.compile(re.escape(ph))),
                    'the text describes itself: "%s" (a finding is fine; narration of the work is not)' % ph,
                    plain[max(0, m.start() - 50):m.end() + 50], key=ph)
        length = zh_len if zh else (lambda s: words(clean(s)))
        if max_sentence and u.kind not in ("float", "heading"):
            for k, s in enumerate(u.sentences, 1):
                n = length(s)
                if n > max_sentence:
                    add("long-sentence", "warn", u.line, "sentence %d of this %s has %d %s (limit %d)"
                        % (k, u.kind, n, "characters" if zh else "words", max_sentence), clean(s))
        if u.kind == "para" and u.first():
            king = u.first()
            n = length(king)
            if max_king and n > max_king:
                add("king-length", "error", u.line, "first sentence has %d %s (limit %d)"
                    % (n, "characters" if zh else "words", max_king), clean(king))
            if not zh and ", and " in clean(king):
                add("king-and", "error", u.line, 'first sentence contains ", and "', clean(king))
            m = _KING_ABBR.search(king)
            if m:
                add("king-abbrev", "warn", u.line, '"%s" before a capitalised word: if it ends the sentence, '
                    "this king runs into the next one; end kings on a word" % m.group(0).strip(), clean(king))
        if echo and u.kind == "para" and len(u.sentences) > 1:
            kw = _content(u.first())
            for k, s in enumerate(u.sentences[1:], 2):
                bw = _content(s)
                ov = len(kw & bw)
                if ov >= 3 and ov / max(1, len(bw)) >= 0.30:
                    add("king-echo", "warn", u.line, "sentence %d repeats %d content words of its king" % (k, ov), clean(s))

    # ---- line-based: dashes, typography, CJK, proposal vocabulary, manual register, pointers
    def around(text, i, j):
        return text[max(0, i - 50):j + 50]

    # English: any U+2014/U+2015. Chinese: the double dash (the Chinese em dash) or a spaced
    # single one; a single dash joining two words (a compound such as district-year) is a connector.
    em = re.compile((r"[\u2014\u2015]{2,}| [\u2014\u2015] ?|[\u2014\u2015] " if zh else r"\u2014|\u2015") + r"|---")
    lines = [(ln, t, False) for ln, t in doc.scan] + [(ln, t, True) for ln, t in doc.head_scan]
    for ln, text, is_head in lines:
        if not text.strip():
            continue
        t_nomath = re.sub(r"(?<!\\)\$.+?(?<!\\)\$", lambda m: " " * len(m.group(0)), text)
        m = em.search(t_nomath)
        dashed = bool(m)
        if m:
            add("em-dash", "error", ln, "em dash (or a spaced dash used as one)", around(text, m.start(), m.end()))
        for i, j, sev, key in _dash_hits(t_nomath):
            if sev == "error":
                if not dashed:                   # one em-dash finding per line
                    add("em-dash", "error", ln, "a spaced dash used as an em dash", around(text, i, j))
                    dashed = True
            else:
                add("en-dash", "warn", ln, 'double hyphen between words: "%s" (a compound name is fine; '
                    "a dash typed without spaces is not)" % key, around(text, i, j), key=key)
        if doc.fmt == "tex" and not zh:
            q = re.search(r"[\u2018\u2019\u201c\u201d]", text)
            if q:
                add("typography", "warn", ln, "curly quote in a .tex file: use `` and ''", around(text, q.start(), q.end()))
            if "\u00a0" in text:
                k = text.index("\u00a0")
                add("typography", "warn", ln, "non-breaking space character: use ~", around(text, k, k + 1))
        m = CJK.search(text)
        if not zh and m:
            add("stray-cjk", "error", ln, "Chinese characters or full-width punctuation in an English file",
                around(text, m.start(), m.end()), linetext=text)
        for v in PROPOSAL_VOCAB:
            for mm in re.finditer(re.escape(v), text):
                add("proposal-leak", "error", ln, 'proposal vocabulary "%s" in the text' % v,
                    around(text, mm.start(), mm.end()), key=v, linetext=text)
        for rx, why in MANUAL_ERR:
            for mm in rx.finditer(text):
                add("manual-register", "error", ln, '%s in the text: "%s"' % (why, mm.group(0)),
                    around(text, mm.start(), mm.end()), key=mm.group(0))
        if is_head:
            continue                             # a heading is a label, not a pointer
        for rx in (POINTER_EN, POINTER_REF, POINTER_SECT, POINTER_ZH):
            for mm in rx.finditer(text):
                add("number-pointer", "error", ln, 'part pointed at by number: "%s"' % mm.group(0).strip(),
                    around(text, mm.start(), mm.end()), key=mm.group(0).strip())

    if echo:
        ks = [(u.line, _content(u.first()), u.first()) for u in doc.units if u.kind == "para" and u.first()]
        for a in range(len(ks)):
            for b in range(a + 1, len(ks)):
                A, B = ks[a][1], ks[b][1]
                ov = len(A & B)
                if ov >= 4 and ov / max(1, min(len(A), len(B))) >= 0.4:
                    add("cross-king-echo", "warn", ks[b][0], "this king shares %d content words with the king at line %d "
                        "(%s): a succession, or a restatement?" % (ov, ks[a][0], ", ".join(sorted(A & B))), clean(ks[b][2]))
        n = max(2, ngram)
        need = max(2, n - 3)                     # content words a repeated string must carry
        allw, wlines = [], []
        for u in doc.units:
            if u.kind not in ("float", "heading"):
                ws = re.findall(r"[a-z0-9']+", clean(u.light).lower())
                allw += ws
                wlines += [u.line] * len(ws)
        where, first = {}, {}
        for i in range(len(allw) - n + 1):
            g = tuple(allw[i:i + n])
            where.setdefault(g, []).append(wlines[i])
            first.setdefault(g, i)
        rep = [len(where[tuple(allw[i:i + n])]) > 1 and sum(1 for w in allw[i:i + n] if w not in STOP) >= need
               for i in range(len(allw) - n + 1)]
        i = 0
        while i < len(rep):                      # one warning per repeated passage, not per window
            if not rep[i]:
                i += 1
                continue
            j = i
            while j + 1 < len(rep) and rep[j + 1]:
                j += 1
            g = tuple(allw[i:i + n])
            if first[g] == i:                    # report a passage at its first occurrence only
                at = where[g]
                add("repeated-ngram", "warn", at[1], "%d-word string appears %d times (lines %s)"
                    % (j - i + n, len(at), ", ".join(str(x) for x in at)), " ".join(allw[i:j + n]))
            i = j + 1
    F.sort(key=lambda f: (f["file"], f["line"], f["check"]))
    return F


STOP = set("the a an of in on to and or for with that is are was were be been as by from at it its "
           "this those these which so not no over one two same each every".split())


def _content(s):
    return {w for w in re.findall(r"[a-z0-9']+", clean(s).lower()) if w not in STOP}


# --------------------------------------------------------------------------- CLI

def main(argv=None):
    ap = argparse.ArgumentParser(description="Mechanical prose gate for .tex and .md drafts.",
                                 epilog="See the module docstring for the checks and exit codes.")
    ap.add_argument("files", nargs="+")
    ap.add_argument("--banned", action="append", default=[], metavar="FILE")
    ap.add_argument("--no-default-banned", action="store_true")
    ap.add_argument("--allow", action="append", default=[], metavar="FILE:TEXT[:COUNT]")
    ap.add_argument("--allow-file", action="append", default=[], metavar="LIST")
    ap.add_argument("--baseline", metavar="FILE")
    ap.add_argument("--max-sentence", type=int, default=None, metavar="N")
    ap.add_argument("--max-king", type=int, default=None, metavar="N")
    ap.add_argument("--lang", choices=["en", "zh"], default="en")
    ap.add_argument("--echo", action="store_true")
    ap.add_argument("--ngram", type=int, default=6, metavar="N")
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)

    max_sentence = a.max_sentence if a.max_sentence is not None else (40 if a.lang == "en" else 0)
    max_king = a.max_king if a.max_king is not None else (26 if a.lang == "en" else 0)
    try:
        banned = load_banned(([] if a.no_default_banned else [DEFAULT_BANNED]) + a.banned)
    except OSError as e:
        print("cannot read banned list: %s" % e, file=sys.stderr)
        return 2
    specs = list(a.allow)
    try:
        for lst in a.allow_file:
            for raw in open(lst, encoding="utf-8"):
                line = raw.split("#", 1)[0].strip()
                if line:
                    specs.append(line)
        exceptions = {}
        for sp in specs:
            f_, key, text, count = parse_exception(sp)
            exceptions[(f_, key)] = (f_, key, text, count)     # a later record replaces an earlier one
        exceptions = list(exceptions.values())
    except OSError as e:
        print("cannot read exception list: %s" % e, file=sys.stderr)
        return 2
    except ValueError as e:
        print("bad --allow: %s" % e, file=sys.stderr)
        return 2
    for f_, key, text, count in exceptions:
        if not any(_same_file(f_, f) for f in a.files):
            print('note: exception "%s:%s" names no file of this run' % (f_, text), file=sys.stderr)
    if a.baseline and len(a.files) != 1:
        print("--baseline compares one file with its before copy; give one input file", file=sys.stderr)
        return 2

    findings, excepted, carried = [], 0, 0
    for f in a.files:
        try:
            doc = load_document(f, a.lang)
            base = load_document(a.baseline, a.lang) if a.baseline else None
        except (OSError, UnicodeDecodeError) as e:
            print("cannot read %s: %s" % (e.filename or f, e), file=sys.stderr)
            return 2
        F = audit(doc, banned, max_sentence, max_king, a.echo, a.ngram)
        if base is not None:                     # only what the round wrote
            before = {re.sub(r"\s+", " ", t).strip() for _, t in base.scan + base.head_scan if t.strip()}
            kept = [x for x in F if not (x["check"] in ("proposal-leak", "stray-cjk") and x.get("_line") in before)]
            carried += len(F) - len(kept)
            F = kept
        F, n = apply_exceptions(F, f, exceptions)
        excepted += n
        findings += F
    for x in findings:
        x.pop("_key", None)
        x.pop("_line", None)
    findings.sort(key=lambda x: (x["file"], x["line"], x["check"]))

    errors = [x for x in findings if x["severity"] == "error"]
    warns = [x for x in findings if x["severity"] == "warn"]
    if a.json:
        print(json.dumps({"files": a.files, "errors": len(errors), "warnings": len(warns),
                          "excepted": excepted, "in_baseline": carried,
                          "findings": findings}, ensure_ascii=False, indent=2))
    else:
        for x in findings:
            tag = "ERROR" if x["severity"] == "error" else "warn "
            print("%s %s:%s [%s] %s" % (tag, x["file"], x["line"], x["check"], x["message"]))
            if x["text"]:
                print("      | %s" % x["text"])
        by = Counter(x["check"] for x in findings)
        extra = []
        if excepted:
            extra.append("%d covered by recorded exceptions" % excepted)
        if carried:
            extra.append("%d already in the before copy" % carried)
        print("prose_audit: %d error(s), %d warning(s) in %d file(s)%s%s" % (
            len(errors), len(warns), len(a.files),
            (" | " + ", ".join("%s %d" % kv for kv in sorted(by.items()))) if by else "",
            (" | " + "; ".join(extra)) if extra else ""))
    if errors or (a.strict and warns):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
