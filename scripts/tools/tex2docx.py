#!/usr/bin/env python3
"""tex2docx.py - a Word reading copy of a LaTeX document (LaTeX -> HTML -> LibreOffice -> .docx).

The .tex and its PDF stay authoritative. The .docx is the copy a reader who works in Word gets,
so it is rebuilt from the .tex every time the .tex changes, never edited by hand.

Usage:
    python3 tex2docx.py INPUT.tex [-o OUTPUT.docx] [--title TITLE] [--number N]
                        [--academic] [--html-only] [--keep-html] [--strict]

    -o, --output    the .docx to write (default: INPUT with .docx, beside it). With --html-only,
                    the .html to write (default: INPUT with .html).
    --title         heading printed at the top (default: \\title{...}, else the first
                    \\chapter{...}, else the file name).
    --number N      chapter number: sections print as N.1, tables as Table N.1, equations as
                    (N.1). Without it they print as 1, Table 1, (1).
    --academic      Times New Roman, 12 pt body text with 12 pt after each paragraph, 1 inch
                    margins, figures and their Table/Figure captions centred (a body paragraph
                    that opens "Table 1 reports ..." is not a caption and is not centred).
    --html-only     write the HTML and stop (no LibreOffice needed).
    --keep-html     keep the intermediate HTML beside the output.
    --strict        exit 1 if LaTeX residue (an unconverted \\command) reaches the HTML.

What it handles: sections (numbered and starred), \\appendix (lettered), paragraphs, footnotes
(brace matched; a superscript marker in the text and a small paragraph after it), inline and
display math linearised to Unicode with sub- and superscripts, equation numbering and
\\ref/\\eqref/\\autoref, tables (\\caption, \\label, \\input'd tabular fragments, \\multicolumn
as a spanned cell, Notes paragraphs), figures (PNG/JPEG/GIF embedded; a PDF figure is replaced
by a marked placeholder), itemize/enumerate/description (nested lists matched by depth), quote,
abstract, \\bibentry and thebibliography, and \\input/\\include of text files outside floats
(inlined; paths resolve against the main file's folder). Comments are stripped before anything
else, so a comment that mentions \\begin{document} does not start the body. Definitions
(\\newcommand, \\renewcommand, \\providecommand, \\def, \\DeclareMathOperator) are dropped.
Citation commands print their keys, because no .bib is processed.

After conversion every table is restyled to the three-rule (booktabs) form the .tex uses: a
rule above the header, a rule under the last row, no vertical rules, numeric columns
right-aligned, 10 pt cell text, rows kept together, the caption kept with its table. The thin
inner rules sit where the .tex puts its \\midrule (or \\hline) lines, so a two-row header and a
Panel A / Panel B break keep theirs; a tabular with no inner rule gets one under its first row.

LibreOffice: found on PATH (soffice or libreoffice) or in the usual install locations. The Word
filter is named explicitly ("docx:MS Word 2007 XML"); the bare "--convert-to docx" form fails
with "no export filter" on current LibreOffice. Each run uses a throwaway LibreOffice profile,
so it works while LibreOffice is open.

Check the result: a reading copy that silently keeps the old text, or leaks raw LaTeX, is worse
than none. The script reports the residue count; open the .docx before sending it.

Exit codes: 0 written, 1 residue with --strict, 2 usage, input or LibreOffice error.
"""
import argparse
import base64
import html
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

GREEK = {
    'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ϵ', 'varepsilon': 'ε',
    'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'vartheta': 'ϑ', 'iota': 'ι', 'kappa': 'κ',
    'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ', 'pi': 'π', 'rho': 'ρ', 'sigma': 'σ',
    'tau': 'τ', 'upsilon': 'υ', 'phi': 'ϕ', 'varphi': 'φ', 'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',
    'Gamma': 'Γ', 'Delta': 'Δ', 'Theta': 'Θ', 'Lambda': 'Λ', 'Xi': 'Ξ', 'Pi': 'Π', 'Sigma': 'Σ',
    'Phi': 'Φ', 'Psi': 'Ψ', 'Omega': 'Ω', 'ell': 'ℓ', 'infty': '∞', 'partial': '∂', 'nabla': '∇',
    'sum': 'Σ', 'prod': 'Π', 'int': '∫', 'cup': '∪', 'cap': '∩', 'to': '→', 'rightarrow': '→',
    'leftarrow': '←', 'Rightarrow': '⇒', 'mapsto': '↦', 'le': '≤', 'ge': '≥', 'leq': '≤',
    'geq': '≥', 'neq': '≠', 'ne': '≠', 'approx': '≈', 'sim': '∼', 'equiv': '≡', 'propto': '∝',
    'times': '×', 'div': '÷', 'cdot': '·', 'pm': '±', 'mp': '∓', 'ldots': '…', 'cdots': '⋯',
    'dots': '…', 'forall': '∀', 'exists': '∃', 'subset': '⊂', 'subseteq': '⊆', 'notin': '∉',
    'emptyset': '∅', 'lt': '&lt;', 'gt': '&gt;', 'prime': '′', 'circ': '∘',
}
FUNCS = ['ln', 'log', 'exp', 'max', 'min', 'sup', 'inf', 'lim', 'Pr', 'det', 'var', 'cov', 'corr']
SOFFICE_CANDIDATES = ("/Applications/LibreOffice.app/Contents/MacOS/soffice", "/opt/homebrew/bin/soffice",
                      "/usr/local/bin/soffice", "/usr/bin/soffice", "/usr/bin/libreoffice")
FN_MARK = "\x07FN%d\x07"
LB, RB = "\u000e", "\u000f"                               # escaped braces \{ \}
E_AMP, E_LT, E_GT = "\u0010", "\u0011", "\u0012"          # HTML entities inside math


# --------------------------------------------------------------------------- small helpers

def brace_end(s, i):
    """Index just past the brace group opening at s[i] == '{'."""
    depth, k = 0, i
    while k < len(s):
        c = s[k]
        if c == '\\':
            k += 2
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return k + 1
        k += 1
    return len(s)


def command_arg(s, name):
    """The first \\name{...} argument (brace matched), or None."""
    m = re.search(r'\\' + re.escape(name) + r'\*?\s*(?:\[[^\]]*\])?\s*\{', s)
    if not m:
        return None
    end = brace_end(s, m.end() - 1)
    return s[m.end():end - 1]


def unwrap(s, names, open_tag='', close_tag=''):
    pat = re.compile(r'\\(' + '|'.join(names) + r')\s*\{')
    for _ in range(50):
        m = pat.search(s)
        if not m:
            break
        end = brace_end(s, m.end() - 1)
        s = s[:m.start()] + open_tag + s[m.end():end - 1] + close_tag + s[end:]
    return s


def drop_definitions(s):
    """Remove \\newcommand, \\renewcommand, \\providecommand, \\def and \\DeclareMathOperator
    definitions (brace matched)."""
    pat = re.compile(r'\\(?:(?:re|provide)?newcommand|DeclareMathOperator|def)(?![A-Za-z])\*?\s*')
    out, i = [], 0
    while True:
        m = pat.search(s, i)
        if not m:
            out.append(s[i:])
            return ''.join(out)
        out.append(s[i:m.start()])
        k = m.end()
        if k < len(s) and s[k] == '{':
            k = brace_end(s, k)
        else:                                    # \newcommand\foo{...}, \def\foo{...}
            mm = re.match(r'\\(?:[A-Za-z@]+|.)', s[k:])
            k += mm.end() if mm else 0
        if m.group(0).startswith('\\def'):
            k += len(re.match(r'[^{\n]*', s[k:]).group(0))     # parameter text, #1#2
        else:
            k += len(re.match(r'\s*(?:\[[^\]]*\]\s*){0,2}', s[k:]).group(0))
        if k < len(s) and s[k] == '{':
            k = brace_end(s, k)
        i = k


FLOAT_SPAN = re.compile(r'\\begin\{(table\*?|sidewaystable|figure\*?)\}.*?\\end\{\1\}', re.S)
INPUT_RE = re.compile(r'\\(?:input|include)\s*\{([^}]*)\}')
LIST_ENV = re.compile(r'\\(begin|end)\{(itemize|enumerate|description)\}')


def inline_inputs(body, base, warnings, depth=0):
    """Replace \\input{f} and \\include{f} in the running text by the file's text.

    Inside a table or figure float an \\input is a table fragment, left for the float handler.
    Paths resolve against the main file's folder, as LaTeX resolves them. A missing file stays
    in place, so the residue count shows it.
    """
    if depth > 8:
        return body
    spans = [(m.start(), m.end()) for m in FLOAT_SPAN.finditer(body)]
    out, last = [], 0
    for m in INPUT_RE.finditer(body):
        if any(a <= m.start() < b for a, b in spans):
            continue
        name = m.group(1).strip()
        fp = os.path.normpath(os.path.join(base, name))
        if not os.path.exists(fp) and os.path.exists(fp + '.tex'):
            fp += '.tex'
        try:
            txt = open(fp, encoding='utf-8').read()
        except OSError:
            warnings.append('input file not found: %s' % name)
            continue
        txt = re.sub(r'(?m)(?<!\\)%.*$', '', txt)
        out += [body[last:m.start()], inline_inputs(txt, base, warnings, depth + 1)]
        last = m.end()
    out.append(body[last:])
    return ''.join(out)


def list_end(s, i):
    """(start of the matching \\end, index past it) for a list environment opened before s[i]."""
    depth = 1
    for m in LIST_ENV.finditer(s, i):
        depth += 1 if m.group(1) == 'begin' else -1
        if depth == 0:
            return m.start(), m.end()
    return len(s), len(s)


# --------------------------------------------------------------------------- math and prose

def math_lin(s):
    """Linearise LaTeX math to Unicode with <sub>/<sup>."""
    s = s.strip().replace('<', '&lt;').replace('>', '&gt;')
    s = s.replace('\\_', '\u0001')
    s = re.sub(r'\\(?:label|tag)\{[^}]*\}|\\nonumber|\\notag', '', s)
    s = unwrap(s, ['texttt'], '<tt>', '</tt>')
    s = unwrap(s, ['text', 'mathrm', 'textit', 'mathit', 'operatorname', 'mathbf', 'boldsymbol',
                   'textbf', 'mathcal', 'mathbb', 'mbox'])
    for _ in range(4):
        s = re.sub(r'\\underbrace\{(.*?)\}_\{([^{}]*)\}', r'\1 [\2]', s, flags=re.S)
    s = re.sub(r'\\(?:widehat|hat)\{([^{}]*)\}', '\\1\u0302', s)
    s = re.sub(r'\\(?:bar|overline)\{([^{}]*)\}', '\\1\u0304', s)
    s = re.sub(r'\\tilde\{([^{}]*)\}', '\\1\u0303', s)
    s = re.sub(r'\\in(?![A-Za-z])', '∈', s)
    s = s.replace('\\{', LB).replace('\\}', RB)   # escaped braces survive the clean-up below
    s = re.sub(r'\\left|\\right|\\big[lr]?|\\Big[lr]?|\\bigg[lr]?', '', s)
    for k in sorted(GREEK, key=len, reverse=True):
        s = re.sub(r'\\' + k + r'(?![A-Za-z])', GREEK[k], s)
    for f in FUNCS:
        s = re.sub(r'\\' + f + r'(?![A-Za-z])', f, s)
    s = s.replace(r'\;', ' ').replace(r'\,', ' ').replace(r'\:', ' ').replace(r'\!', '')
    s = s.replace(r'\qquad', '   ').replace(r'\quad', '  ')
    s = s.replace('\\\\', '<br/>')
    s = s.replace('&amp;', E_AMP).replace('&lt;', E_LT).replace('&gt;', E_GT)
    s = s.replace('&=', '=').replace('&', '')
    s = s.replace(E_AMP, '&amp;').replace(E_LT, '&lt;').replace(E_GT, '&gt;')
    for _ in range(4):
        s = re.sub(r'\^\{([^{}]*)\}', r'<sup>\1</sup>', s)
        s = re.sub(r'_\{([^{}]*)\}', r'<sub>\1</sub>', s)
    s = re.sub(r'\^(\\?[^\s<\\])', r'<sup>\1</sup>', s)
    s = re.sub(r'_(\\?[^\s<\\])', r'<sub>\1</sub>', s)
    for _ in range(6):
        s2 = re.sub(r'\\[dt]?frac\{([^{}]*)\}\s*\{([^{}]*)\}', r'(\1)/(\2)', s)
        if s2 == s:
            break
        s = s2
    s = re.sub(r'\\sqrt\{([^{}]*)\}', r'√(\1)', s)
    s = s.replace('$', '').replace('\u0001', '_')
    s = re.sub(r'(?<!\\)[{}]', '', s).replace(LB, '{').replace(RB, '}')
    return re.sub(r'\s+', ' ', s).strip(' ,')


ACUTE = {'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú', 'y': 'ý', 'A': 'Á', 'E': 'É', 'I': 'Í', 'O': 'Ó', 'U': 'Ú'}
GRAVE = {'a': 'à', 'e': 'è', 'i': 'ì', 'o': 'ò', 'u': 'ù', 'A': 'À', 'E': 'È'}
UMLAUT = {'a': 'ä', 'e': 'ë', 'i': 'ï', 'o': 'ö', 'u': 'ü', 'A': 'Ä', 'O': 'Ö', 'U': 'Ü'}
CIRC = {'a': 'â', 'e': 'ê', 'i': 'î', 'o': 'ô', 'u': 'û'}
TILDE = {'a': 'ã', 'n': 'ñ', 'o': 'õ', 'N': 'Ñ'}


def latex_accents(s):
    for sym, table in (("'", ACUTE), ('`', GRAVE), ('"', UMLAUT), ('^', CIRC), ('~', TILDE)):
        e = re.escape(sym)
        s = re.sub(r'\{\\' + e + r'\{?([A-Za-z])\}?\}', lambda m: table.get(m.group(1), m.group(1)), s)
        s = re.sub(r'\\' + e + r'\{([A-Za-z])\}', lambda m: table.get(m.group(1), m.group(1)), s)
        s = re.sub(r'\\' + e + r'([A-Za-z])', lambda m: table.get(m.group(1), m.group(1)), s)
    s = re.sub(r'\\c\{c\}|\{\\c c\}', 'ç', s)
    return s


def split_footnotes(s, counter):
    """Pull \\footnote{...} out of a run of prose with brace matching.

    Each becomes a superscript marker in the text and a small paragraph after it. Without
    this the literal "\\footnote{" reaches the Word file.
    """
    out, notes, i = [], [], 0
    pat = re.compile(r'\\footnote\s*(?:\[[^\]]*\])?\s*\{')
    while True:
        m = pat.search(s, i)
        if not m:
            out.append(s[i:])
            break
        out.append(s[i:m.start()])
        end = brace_end(s, m.end() - 1)
        counter[0] += 1
        out.append(FN_MARK % counter[0])
        notes.append((counter[0], s[m.end():end - 1]))
        i = end
    return ''.join(out), notes


CITE_STATS = {"keys": 0}


def _cite(m):
    cmd, keys = m.group(1), m.group(2)
    CITE_STATS["keys"] += 1
    keys = ', '.join(k.strip() for k in keys.split(','))
    return keys if cmd in ('citet', 'textcite', 'citeauthor', 'citealt') else '(' + keys + ')'


def inline(s):
    """Inline LaTeX prose -> HTML (comments already stripped)."""
    s = latex_accents(s)
    s = s.replace('\\_', '\u0001').replace('\\&', '\u0002').replace('\\%', '%').replace('\\$', '\u0003')
    s = s.replace('\\#', '#').replace('\\{', LB).replace('\\}', RB)
    maths = []

    def keep_math(m):
        maths.append('<i>' + math_lin(m.group(1) if m.group(1) is not None else m.group(2)) + '</i>')
        return '\x06%d\x06' % (len(maths) - 1)
    s = re.sub(r'(?<!\\)\$([^$]+)\$|\\\((.+?)\\\)', keep_math, s)
    s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    s = re.sub(r'\\label\{[^}]*\}', '', s)
    s = re.sub(r'\\(cite|citet|citep|citealt|citealp|citeauthor|parencite|textcite|autocite)\*?'
               r'(?:\[[^\]]*\]){0,2}\{([^}]*)\}', _cite, s)
    s = re.sub(r'\\href\{[^}]*\}\{([^{}]*)\}', r'\1', s)
    s = re.sub(r'\\url\{([^}]*)\}', r'\1', s)
    s = re.sub(r'\\path\{([^}]*)\}', r'<tt>\1</tt>', s)
    s = unwrap(s, ['textit', 'emph', 'textsl'], '<i>', '</i>')
    s = unwrap(s, ['textbf'], '<b>', '</b>')
    s = unwrap(s, ['texttt'], '<tt>', '</tt>')
    s = unwrap(s, ['textsc', 'textrm', 'textsf', 'textup', 'textnormal', 'mbox', 'hbox', 'text', 'enquote'])
    s = unwrap(s, ['underline'], '<u>', '</u>')
    s = s.replace("``", '\u201c').replace("''", '\u201d').replace('`', '\u2018')
    s = s.replace('---', '\u2014').replace('--', '\u2013')
    s = re.sub(r'\\(?:ldots|dots)(?![A-Za-z])\s?', '\u2026', s)
    s = re.sub(r'\\S(?![A-Za-z])\s?', '§', s)
    s = re.sub(r'\\qquad\s*', '\u2003\u2003', s)
    s = re.sub(r'\\quad\s*', '\u2003', s)
    s = re.sub(r'\\(?:newline|linebreak)\b|\\\\', '<br/>', s)
    s = s.replace('\\,', '\u2009').replace('\\ ', ' ').replace('\\@', '').replace('\\-', '').replace('\\/', '')
    s = s.replace('~', '\u00a0')
    s = re.sub(r'\\(?:smallskip|bigskip|medskip|noindent|centering|raggedright|sloppy|fussy|footnotesize|'
               r'small|large|Large|normalsize|scriptsize|FloatBarrier|clearpage|newpage|par|vfill|hfill|'
               r'indent|protect|selectfont)(?![A-Za-z])\s?', '', s)
    s = re.sub(r'\\(?:vspace|hspace|enlargethispage|setlength|setcounter|phantomsection)\*?\{[^}]*\}(?:\{[^}]*\})?', '', s)
    s = re.sub(r'\\(?:hangindent|hangafter)=\S+', '', s)
    s = re.sub(r'\\(?:begin|end)\{[^}]*\}(?:\[[^\]]*\])?', '', s)
    s = re.sub(r'(?<!\\)[{}]', '', s)
    s = re.sub(r'\x06(\d+)\x06', lambda m: maths[int(m.group(1))], s)
    s = re.sub(r'\x07FN(\d+)\x07', r'<sup>\1</sup>', s)
    s = s.replace('\u0001', '_').replace('\u0002', '&amp;').replace('\u0003', '$')
    s = s.replace(LB, '{').replace(RB, '}')
    return s


# --------------------------------------------------------------------------- tables and figures

RULE_MARK = '\u0013'


def parse_tabular(body):
    """A tabular as an HTML table. A row that a \\midrule or \\hline precedes (a panel break, the
    rule under the header) carries data-rule, which booktabs_docx turns into a rule above it."""
    rows, rules, pending = [], [], False
    body = re.sub(r'(?m)(?<!\\)%.*$', '', body)
    body = re.sub(r'\\(midrule|hline)(\[[^\]]*\])?', RULE_MARK, body)
    body = re.sub(r'\\(toprule|bottomrule|addlinespace)(\[[^\]]*\])?', '', body)
    body = re.sub(r'\\(cmidrule|cline)(\([^)]*\))?\{[^}]*\}', '', body)
    for line in re.split(r'\\\\(?:\[[^\]]*\])?', body):
        if RULE_MARK in line:
            pending = True
            line = line.replace(RULE_MARK, '')
        line = line.strip()
        if not line or re.fullmatch(r'[\s&]*', line):
            continue
        rules.append(pending and bool(rows))          # a rule above the first row is the top rule
        pending = False
        cells = []
        for c in re.split(r'(?<!\\)&', line):
            c = c.strip()
            span = 1
            m = re.match(r'\\multicolumn\{(\d+)\}\{[^}]*\}\{(.*)\}\s*$', c, re.S)
            if m:
                span, c = int(m.group(1)), m.group(2)
            cells.append((span, inline(c)))
        rows.append(cells)
    if not rows:
        return ''
    h = ['<table border="1" cellspacing="0" cellpadding="4">']
    for r, rule in zip(rows, rules):
        h.append(('<tr data-rule="above">' if rule else '<tr>')
                 + ''.join(('<td colspan="%d">' % sp if sp > 1 else '<td>') + c + '</td>' for sp, c in r) + '</tr>')
    h.append('</table>')
    return '\n'.join(h)


TABULAR_RE = re.compile(
    r'\\begin\{tabular\}(?:\[[^\]]*\])?\{(?:[^{}]|\{[^{}]*\})*\}(.*?)\\end\{tabular\}'
    r'|\\begin\{(tabular\*|tabularx)\}\{[^{}]*\}\{(?:[^{}]|\{[^{}]*\})*\}(.*?)\\end\{\2\}', re.S)


def float_notes(fl):
    m = re.search(r'\\(?:textbf|textit|emph)\{\s*(Notes?|Sources?)\s*[.:]?\s*\}[.:]?', fl)
    if not m:
        return None, None
    txt = fl[m.end():]
    txt = re.sub(r'\\end\{(?:table|figure)\*?\}.*$', '', txt, flags=re.S)
    txt = re.sub(r'\s+', ' ', txt).strip()
    while txt.endswith('}') and txt.count('}') > txt.count('{'):
        txt = txt[:-1].rstrip()
    return m.group(1).capitalize() if m.group(1).lower().startswith('note') else m.group(1), txt


IMG_MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif'}


def find_image(name, base_dirs):
    for d in base_dirs:
        p = os.path.normpath(os.path.join(d, name))
        if os.path.splitext(p)[1]:
            if os.path.exists(p):
                return p
        else:
            for ext in ('.png', '.jpg', '.jpeg', '.gif', '.pdf'):
                if os.path.exists(p + ext):
                    return p + ext
    return None


# --------------------------------------------------------------------------- conversion

SECTION_LEVELS = {'chapter': 1, 'section': 2, 'subsection': 3, 'subsubsection': 4, 'paragraph': 5}


def convert(tex_path, title=None, chapnum=None, warnings=None):
    """Return the HTML for one .tex file."""
    warnings = warnings if warnings is not None else []
    src = open(tex_path, encoding='utf-8').read()
    texdir = os.path.dirname(os.path.abspath(tex_path))
    # comments first: a header comment that mentions \begin{document} must not start the body
    src = re.sub(r'(?m)(?<!\\)%.*$', '', src)
    pre, body = (src.split(r'\begin{document}', 1) + [''])[:2] if r'\begin{document}' in src else ('', src)
    body = body.rsplit(r'\end{document}', 1)[0]
    pre_nc = pre
    gpath = [texdir] + [os.path.join(texdir, g) for g in re.findall(r'\{([^{}]+)\}', command_arg(pre_nc, 'graphicspath') or '')]
    body = inline_inputs(body, texdir, warnings)
    if title is None:
        title = command_arg(pre_nc, 'title') or command_arg(body, 'chapter') or \
            os.path.splitext(os.path.basename(tex_path))[0]
        title = re.sub(r'\\\\|\\thanks\{[^}]*\}', ' ', title)
    body = re.sub(r'\\maketitle', '', body)
    body = re.sub(r'\\begin\{(center|titlepage)\}.*?\\end\{\1\}', '', body, flags=re.S)
    body = re.sub(r'\\begingroup|\\endgroup', '', body)
    body = drop_definitions(body)
    body = re.sub(r'\\(?:setcounter|addtocounter)\{[^}]*\}\{[^}]*\}', '', body)
    body = re.sub(r'\\(?:tableofcontents|listoftables|listoffigures)', '', body)
    body = body.replace(r'\begin{abstract}', r'\section*{Abstract}').replace(r'\end{abstract}', '')
    body = re.sub(r'\\begin\{thebibliography\}\{[^}]*\}', r'\\section*{References}', body)
    body = body.replace(r'\end{thebibliography}', '')
    body = re.sub(r'\\bibitem(?:\[[^\]]*\])?\{[^}]*\}', r'\\bibentry ', body)
    body = re.sub(r'\\(?:bibliographystyle|bibliography)\{[^}]*\}', '', body)

    token = re.compile(
        r'\\(chapter|section|subsection|subsubsection|paragraph)(\*?)\s*(?:\[[^\]]*\])?\s*\{'
        r'|\\begin\{(equation\*?|align\*?|gather\*?|multline\*?|eqnarray\*?)\}(.*?)\\end\{\3\}'
        r'|\\\[(.*?)\\\]'
        r'|\\begin\{(table\*?|sidewaystable)\}(.*?)\\end\{\6\}'
        r'|\\begin\{(figure\*?)\}(.*?)\\end\{\8\}'
        r'|\\begin\{(itemize|enumerate|description)\}()'      # its \end is found by depth
        r'|\\begin\{(quote|quotation)\}(.*?)\\end\{\12\}'
        r'|\\appendix\b', re.S)

    def render(labelmap, warnings):
        parts = ['<html><head><meta charset="utf-8"></head><body>',
                 '<h1 style="text-align:center">%s</h1>' % inline(title)]
        st = {'app': False, 'sec': [0, 0, 0], 'eq': 0, 'tab': 0, 'fig': 0, 'letter': None, 'fn': [0]}

        def pre_n():
            if st['app']:
                return (st['letter'] or 'A')
            return ('%s.' % chapnum) if chapnum else ''

        def ref_sub(s):
            def name(lab):
                return {'tab': 'Table ', 'fig': 'Figure ', 'eq': 'Equation ', 'sec': 'Section ',
                        'app': 'Appendix ', 'ch': 'Chapter '}.get(lab.split(':')[0], '')
            s = re.sub(r'\\eqref\{([^}]*)\}', lambda m: '(' + labelmap.get(m.group(1), '?') + ')', s)
            s = re.sub(r'\\(?:autoref|cref|Cref)\{([^}]*)\}', lambda m: name(m.group(1)) + labelmap.get(m.group(1), '?'), s)
            return re.sub(r'\\(?:ref|vref|nameref)\{([^}]*)\}', lambda m: labelmap.get(m.group(1), '?'), s)

        def flush_prose(txt):
            for para in re.split(r'\n\s*\n', txt):
                p = para.strip()
                if not p or not re.sub(r'\\label\{[^}]*\}', '', p).strip():
                    continue
                if r'\bibentry' in p:
                    for bib in p.split(r'\bibentry'):
                        b = re.sub(r'\s+', ' ', bib).strip()
                        if b:
                            parts.append('<p style="margin-left:0.35in;text-indent:-0.35in">' + inline(ref_sub(b)) + '</p>')
                    continue
                p = re.sub(r'\s+', ' ', p)
                p, fns = split_footnotes(p, st['fn'])
                parts.append('<p>' + inline(ref_sub(p)).strip() + '</p>')
                for num, ftxt in fns:
                    parts.append('<p style="font-size:9pt;margin-left:0.25in"><sup>%d</sup> ' % num
                                 + inline(ref_sub(re.sub(r'\s+', ' ', ftxt).strip())) + '</p>')

        def emit_eq(content, numbered):
            inner = re.sub(r'\\begin\{(aligned|split|gathered)\}|\\end\{(aligned|split|gathered)\}', '', content)
            lab = re.search(r'\\label\{([^}]*)\}', inner)
            tag = ''
            if numbered:
                st['eq'] += 1
                tag = pre_n() + str(st['eq'])
                if lab:
                    labelmap[lab.group(1)] = tag
            lin = math_lin(inner)
            parts.append('<p style="text-align:center"><i>%s</i>%s</p>' % (lin, '&nbsp;&nbsp;&nbsp;(%s)' % tag if tag else ''))

        def emit_float(kind, fl):
            fl = ref_sub(fl)
            lab = re.search(r'\\label\{((?:tab|fig)?[^}]*)\}', fl)
            st[kind] += 1
            tag = pre_n() + str(st[kind])
            if lab:
                labelmap[lab.group(1)] = tag
            cap = command_arg(fl, 'caption')
            word = 'Table' if kind == 'tab' else 'Figure'
            if kind == 'tab' and cap is not None:
                parts.append('<p style="text-align:center"><b>%s %s. %s</b></p>' % (word, tag, inline(cap)))
            if kind == 'tab':
                found = False
                for inp in re.findall(r'\\input\{([^}]*)\}', fl):
                    fp = os.path.normpath(os.path.join(texdir, inp))
                    if not os.path.exists(fp) and os.path.exists(fp + '.tex'):
                        fp += '.tex'
                    try:
                        frag = ref_sub(open(fp, encoding='utf-8').read())
                    except OSError:
                        warnings.append('table fragment not found: %s' % inp)
                        continue
                    for tm in TABULAR_RE.finditer(frag):
                        parts.append(parse_tabular(tm.group(1) if tm.group(1) is not None else tm.group(3)))
                        found = True
                if not found:
                    for tm in TABULAR_RE.finditer(fl):
                        parts.append(parse_tabular(tm.group(1) if tm.group(1) is not None else tm.group(3)))
            else:
                for img in re.findall(r'\\includegraphics\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}', fl):
                    ip = find_image(img, gpath)
                    ext = os.path.splitext(ip)[1].lower() if ip else ''
                    if ip and ext in IMG_MIME:
                        b64 = base64.b64encode(open(ip, 'rb').read()).decode()
                        parts.append('<p style="text-align:center"><img src="data:%s;base64,%s" width="640"/></p>' % (IMG_MIME[ext], b64))
                    else:
                        warnings.append('figure not embedded (missing, or not PNG/JPEG/GIF): %s' % img)
                        parts.append('<p style="text-align:center">[Figure file: %s]</p>' % html.escape(img))
                if cap is not None:
                    parts.append('<p style="text-align:center"><b>%s %s. %s</b></p>' % (word, tag, inline(cap)))
            label, notes = float_notes(fl)
            if notes:
                parts.append('<p style="font-size:9pt"><b>%s.</b> %s</p>' % (label, inline(notes)))

        def render_list(env, content):
            """A list, nested lists included: \\item splits only at the list's own depth."""
            tag = 'ol' if env == 'enumerate' else 'ul'
            content = re.sub(r'^\s*\[[^\]]*\]', '', content)          # \begin{enumerate}[label=...]
            items, depth, last = [], 0, None
            for t in re.finditer(r'\\(begin|end)\{(itemize|enumerate|description)\}|\\item(?![A-Za-z])\s*(?:\[[^\]]*\])?', content):
                if t.group(1) == 'begin':
                    depth += 1
                elif t.group(1) == 'end':
                    depth -= 1
                elif depth == 0:
                    if last is not None:
                        items.append(content[last:t.start()])
                    last = t.end()
            if last is not None:
                items.append(content[last:])
            lis = []
            for it in items:
                nested, segs, k = [], [], 0
                for t in LIST_ENV.finditer(it):                     # top-level nested lists
                    if t.group(1) != 'begin' or t.start() < k:
                        continue
                    e0, e1 = list_end(it, t.end())
                    segs.append(it[k:t.start()])
                    nested.append(render_list(t.group(2), it[t.end():e0]))
                    segs.append('\u0014%d\u0014' % (len(nested) - 1))
                    k = e1
                segs.append(it[k:])
                text, fns = split_footnotes(re.sub(r'\s+', ' ', ''.join(segs)).strip(), st['fn'])
                li = inline(ref_sub(text))
                li = re.sub(r'\u0014(\d+)\u0014', lambda mm: nested[int(mm.group(1))], li)
                lis.append('<li>' + li + '</li>')
                for num, ftxt in fns:
                    lis.append('<li style="list-style:none;font-size:9pt"><sup>%d</sup> %s</li>' % (num, inline(ref_sub(ftxt))))
            return '<%s>%s</%s>' % (tag, ''.join(lis), tag)

        pos = 0
        while True:
            m = token.search(body, pos)
            if not m:
                break
            flush_prose(body[pos:m.start()])
            pos = m.end()
            g = m.group(0)
            if g.startswith(r'\appendix'):
                st['app'], st['eq'], st['tab'], st['fig'] = True, 0, 0, 0
                st['sec'] = [0, 0, 0]
                continue
            if m.group(1):
                end = brace_end(body, m.end() - 1)
                name = body[m.end():end - 1]
                pos = end
                level, starred = SECTION_LEVELS[m.group(1)], m.group(2) == '*'
                lab = re.match(r'\s*\\label\{([^}]*)\}', body[pos:])
                if level == 1:
                    if inline(name) != inline(title):        # the title already printed it
                        parts.append('<h1>%s</h1>' % inline(name))
                    continue
                if level >= 5:
                    parts.append('<p><b>%s</b></p>' % inline(name))
                    continue
                num = ''
                if not starred:
                    i = level - 2
                    st['sec'][i] += 1
                    for j in range(i + 1, 3):
                        st['sec'][j] = 0
                    if st['app'] and i == 0:
                        st['letter'] = chr(64 + st['sec'][0])
                        st['eq'] = st['tab'] = st['fig'] = 0
                    head = st['letter'] if st['app'] else (('%s.' % chapnum if chapnum else '') + str(st['sec'][0]))
                    num = '.'.join([head] + [str(x) for x in st['sec'][1:i + 1]])
                    if lab:
                        labelmap[lab.group(1)] = num
                parts.append('<h%d>%s%s</h%d>' % (level, (num + '&nbsp;&nbsp;') if num else '', inline(name), level))
            elif m.group(3):
                emit_eq(m.group(4), not m.group(3).endswith('*'))
            elif m.group(5) is not None:
                emit_eq(m.group(5), False)
            elif m.group(6):
                emit_float('tab', m.group(7))
            elif m.group(8):
                emit_float('fig', m.group(9))
            elif m.group(10):
                end_start, end_stop = list_end(body, m.end())
                parts.append(render_list(m.group(10), body[m.end():end_start]))
                pos = end_stop
            elif m.group(12):
                for para in re.split(r'\n\s*\n', m.group(13)):
                    if para.strip():
                        parts.append('<p style="margin-left:0.5in;margin-right:0.5in">' + inline(ref_sub(re.sub(r'\s+', ' ', para.strip()))) + '</p>')
        flush_prose(body[pos:])
        parts.append('</body></html>')
        return '\n'.join(parts)

    labelmap = {}
    render(labelmap, [])             # first pass numbers every label
    CITE_STATS["keys"] = 0
    out = render(labelmap, warnings)  # second pass resolves forward references
    if CITE_STATS["keys"]:
        warnings.append('%d citation command(s) printed as keys (no .bib is processed)' % CITE_STATS["keys"])
    return out


def residue(html_text):
    """LaTeX commands that survived conversion, by name and count."""
    body = re.sub(r'<[^>]+>', ' ', html_text)
    body = re.sub(r'data:[^"]+', '', body)
    found = {}
    for m in re.finditer(r'\\[A-Za-z]+', body):
        found[m.group(0)] = found.get(m.group(0), 0) + 1
    return found


# --------------------------------------------------------------------------- booktabs restyle

_NUM = re.compile(r'^[\d.,\-−+±%()\[\]*\s]+$')
_AFTER_SZ = ('highlight', 'u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign', 'rtl', 'cs',
             'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath')


def _cell_text(tc):
    return re.sub(r'<[^>]+>', '', tc).strip()


def _with_size(rpr_inner):
    """Insert sz/szCs into an rPr body at the position the schema requires."""
    if '<w:sz ' in rpr_inner:
        return rpr_inner
    sz = '<w:sz w:val="20"/><w:szCs w:val="20"/>'
    m = re.search(r'<w:(%s)[ />]' % '|'.join(_AFTER_SZ), rpr_inner)
    return rpr_inner[:m.start()] + sz + rpr_inner[m.start():] if m else rpr_inner + sz


def _keep_next(ppr_block):
    """keepNext goes right after pStyle (the first pPr child) when there is one."""
    if '<w:keepNext/>' in ppr_block:
        return ppr_block
    if '<w:pStyle ' in ppr_block:
        return re.sub(r'(<w:pStyle [^>]*/>)', r'\1<w:keepNext/>', ppr_block, count=1)
    return ppr_block.replace('<w:pPr>', '<w:pPr><w:keepNext/>', 1)


def _restyle_table(tbl, rule_rows=None):
    """Three rules: top, bottom, and the rules inside the table. With rule_rows (the rows a
    \\midrule preceded in the .tex) each of those rows gets a thin rule above it, so the header
    rule falls where the .tex puts it and a panel break keeps its rule; without, a thin rule goes
    under the first row."""
    rows = re.findall(r'<w:tr>.*?</w:tr>', tbl, flags=re.S)
    if not rows:
        return tbl
    grid = [re.findall(r'<w:tc>.*?</w:tc>', r, flags=re.S) for r in rows]
    ncol = max(len(r) for r in grid)
    align = ['left'] * ncol
    for j in range(ncol):
        head = _cell_text(grid[0][j]) if j < len(grid[0]) else ''
        body = [b for b in (_cell_text(r[j]) for r in grid[1:] if j < len(r)) if b]
        if body and all(_NUM.match(b) for b in body):
            align[j] = 'right'
        elif head.lower() == 'sign':
            align[j] = 'center'
    tp = re.search(r'<w:tblPr>.*?</w:tblPr>', tbl, flags=re.S)
    w = re.search(r'<w:tblW [^>]*/>', tp.group(0)) if tp else None
    newpr = ('<w:tblPr>' + (w.group(0) if w else '<w:tblW w:w="0" w:type="auto"/>') +
             '<w:jc w:val="center"/>'
             '<w:tblBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/>'
             '<w:left w:val="nil"/><w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/>'
             '<w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
             '<w:tblLayout w:type="autofit"/>'
             '<w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>'
             '<w:bottom w:w="30" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>')
    out = tbl.replace(tp.group(0), newpr, 1) if tp else tbl.replace('<w:tbl>', '<w:tbl>' + newpr, 1)

    def fix_row(row, idx):
        is_head = idx == 0
        rule = None
        if rule_rows:
            if idx in rule_rows:
                rule = '<w:tcBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>'
        elif is_head:
            rule = '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>'
        cells = re.findall(r'<w:tc>.*?</w:tc>', row, flags=re.S)
        for j, tc in enumerate(cells):
            new = re.sub(r'<w:tcBorders>.*?</w:tcBorders>', '', tc, flags=re.S)
            if rule:
                new = re.sub(r'(<w:tcW [^>]*/>)', lambda mm: mm.group(1) + rule, new, count=1)
            new = re.sub(r'<w:spacing w:before="\d+" w:after="\d+"/>', '<w:spacing w:before="20" w:after="20"/>', new)
            if j < ncol and align[j] != 'left':
                new = re.sub(r'<w:jc w:val="[a-z]+"/>', '<w:jc w:val="%s"/>' % align[j], new)
            new = re.sub(r'<w:r>(?:<w:rPr>(.*?)</w:rPr>)?',
                         lambda mm: '<w:r><w:rPr>' + _with_size(mm.group(1) or '') + '</w:rPr>', new, flags=re.S)
            row = row.replace(tc, new, 1)
        trpr = '<w:trPr><w:cantSplit/>%s</w:trPr>' % ('<w:tblHeader/>' if is_head else '')
        if '<w:trPr></w:trPr>' in row:
            row = row.replace('<w:trPr></w:trPr>', trpr, 1)
        elif '<w:trPr>' not in row:
            row = row.replace('<w:tr>', '<w:tr>' + trpr, 1)
        return row
    state = {'n': 0}

    def rowsub(m):
        r = fix_row(m.group(0), state['n'])
        state['n'] += 1
        return r
    out = re.sub(r'<w:tr>.*?</w:tr>', rowsub, out, flags=re.S)
    rows2 = re.findall(r'<w:tr>.*?</w:tr>', out, flags=re.S)
    for r in rows2[:-1]:   # keep the table on one page: every row but the last keeps with the next
        out = out.replace(r, re.sub(r'<w:pPr>.*?</w:pPr>', lambda mm: _keep_next(mm.group(0)), r, flags=re.S), 1)
    return out


def _rewrite_part(path, part, fn):
    tmp = path + '.tmp'
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == part:
                data = fn(data.decode('utf-8')).encode('utf-8')
            zout.writestr(item, data)
    shutil.move(tmp, path)


def table_rules(html_text):
    """For each table of the HTML, in order, the rows marked data-rule (a \\midrule above)."""
    return [{i for i, tr in enumerate(re.findall(r'<tr\b[^>]*>', t)) if 'data-rule' in tr}
            for t in re.findall(r'<table\b.*?</table>', html_text, flags=re.S)]


def booktabs_docx(path, rules=None):
    """Restyle every table in a .docx to the three-rule form, in place. rules: table_rules() of
    the HTML the .docx came from; used only when it has one entry per table."""
    def fix(x):
        tables = re.findall(r'<w:tbl>.*?</w:tbl>', x, flags=re.S)
        use = rules if rules is not None and len(rules) == len(tables) else [None] * len(tables)
        it = iter(use)
        x = re.sub(r'<w:tbl>.*?</w:tbl>', lambda m: _restyle_table(m.group(0), next(it)), x, flags=re.S)
        # the caption paragraph directly above each table keeps with it
        return re.sub(r'<w:p>(?:(?!</w:p>).)*?</w:p>(?=\s*<w:tbl>)',
                      lambda mm: re.sub(r'<w:pPr>.*?</w:pPr>', lambda pp: _keep_next(pp.group(0)), mm.group(0), flags=re.S),
                      x, flags=re.S)
    _rewrite_part(path, 'word/document.xml', fix)
    return path


def _center(p):
    if '<w:jc ' in p:
        return re.sub(r'<w:jc w:val="[^"]*"/>', '<w:jc w:val="center"/>', p, count=1)
    if '<w:pPr>' in p:
        return p.replace('<w:pPr>', '<w:pPr><w:jc w:val="center"/>', 1)
    return re.sub(r'^<w:p([ >])', lambda m: '<w:p' + m.group(1), p).replace('>', '><w:pPr><w:jc w:val="center"/></w:pPr>', 1)


def academic_docx(path):
    """Times New Roman 12 pt body text with 12 pt after each paragraph, 1 inch margins,
    figures and Table/Figure captions centred."""
    def styles(s):
        s = re.sub(r'w:ascii="[^"]*"', 'w:ascii="Times New Roman"', s)
        s = re.sub(r'w:hAnsi="[^"]*"', 'w:hAnsi="Times New Roman"', s)

        def size_block(m):
            b = re.sub(r'(<w:sz w:val=")\d+(")', r'\g<1>24\2', re.sub(r'(<w:szCs w:val=")\d+(")', r'\g<1>24\2', m.group(0)))
            return re.sub(r'(<w:spacing\b[^>]*?\bw:after=")\d+(")', r'\g<1>240\2', b)
        s = re.sub(r'<w:docDefaults>.*?</w:docDefaults>', size_block, s, flags=re.S)
        s = re.sub(r'<w:style [^>]*w:styleId="(?:Normal|Standard|TextBody|BodyText)"[^>]*>.*?</w:style>', size_block, s, flags=re.S)
        return s

    def document(s):
        for side in ('left', 'right', 'top', 'bottom'):
            s = re.sub(r'(<w:pgMar[^/]*w:%s=")\d+(")' % side, r'\g<1>1440\2', s)
        s = re.sub(r'w:ascii="(?!Times)[^"]*"', 'w:ascii="Times New Roman"', s)
        s = re.sub(r'w:hAnsi="(?!Times)[^"]*"', 'w:hAnsi="Times New Roman"', s)

        def para(m):
            # a caption is what convert() writes: a bold run opening "Table N. " or "Figure N. ";
            # a body paragraph that opens "Table 1 reports ..." is not one
            p = m.group(0)
            txt = re.sub(r'<[^>]+>', '', p)
            run = re.search(r'<w:r>.*?</w:r>', p, flags=re.S)
            caption = (run is not None and '<w:b/>' in run.group(0)
                       and re.match(r'^\s*(Table|Figure)\s+[A-Z]?\d+(?:\.\d+)*\.\s', txt))
            if '<w:drawing' in p or '<pic:pic' in p or caption:
                return _center(p)
            return p
        return re.sub(r'<w:p\b[^>]*>.*?</w:p>', para, s, flags=re.S)
    _rewrite_part(path, 'word/styles.xml', styles)
    _rewrite_part(path, 'word/document.xml', document)
    return path


# --------------------------------------------------------------------------- LibreOffice

def soffice():
    """The LibreOffice binary, or None."""
    exe = shutil.which('soffice') or shutil.which('libreoffice')
    if exe:
        return exe
    for c in SOFFICE_CANDIDATES:
        if os.path.exists(c):
            return c
    return None


def html_to_docx(html_path, out_docx, restyle_tables=True):
    """Convert an .html file to .docx with LibreOffice and restyle its tables.

    The Word filter is named explicitly; a throwaway profile keeps the run independent of a
    LibreOffice window that is already open.
    """
    exe = soffice()
    if exe is None:
        raise RuntimeError('LibreOffice (soffice) not found. Install it, or use --html-only.')
    with tempfile.TemporaryDirectory() as tmp:
        outdir = os.path.join(tmp, 'out')
        cmd = [exe, '-env:UserInstallation=file://' + os.path.join(tmp, 'profile'), '--headless',
               '--convert-to', 'docx:MS Word 2007 XML', '--outdir', outdir, html_path]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        produced = os.path.join(outdir, os.path.splitext(os.path.basename(html_path))[0] + '.docx')
        if not os.path.exists(produced):
            raise RuntimeError('soffice wrote no .docx (exit %s): %s %s' % (r.returncode, r.stdout.strip(), r.stderr.strip()))
        os.makedirs(os.path.dirname(os.path.abspath(out_docx)), exist_ok=True)
        shutil.move(produced, out_docx)
    if restyle_tables:
        booktabs_docx(out_docx, table_rules(open(html_path, encoding='utf-8').read()))
    return out_docx


def main(argv=None):
    ap = argparse.ArgumentParser(description='LaTeX -> Word reading copy (HTML + LibreOffice).',
                                 epilog='See the module docstring for what is converted.')
    ap.add_argument('input')
    ap.add_argument('-o', '--output')
    ap.add_argument('--title')
    ap.add_argument('--number', metavar='N')
    ap.add_argument('--academic', action='store_true')
    ap.add_argument('--html-only', action='store_true')
    ap.add_argument('--keep-html', action='store_true')
    ap.add_argument('--strict', action='store_true')
    a = ap.parse_args(argv)
    if not os.path.exists(a.input):
        print('no such file: %s' % a.input, file=sys.stderr)
        return 2
    warnings = []
    try:
        page = convert(a.input, a.title, a.number, warnings)
    except (OSError, UnicodeDecodeError) as e:
        print('cannot convert %s: %s' % (a.input, e), file=sys.stderr)
        return 2
    stem = os.path.splitext(a.input)[0]
    res = residue(page)
    for w in warnings:
        print('warning: ' + w, file=sys.stderr)
    if a.html_only:
        out = a.output or stem + '.html'
        open(out, 'w', encoding='utf-8').write(page)
        print('HTML: %s' % out)
    else:
        out = a.output or stem + '.docx'
        with tempfile.TemporaryDirectory() as tmp:
            hp = os.path.join(tmp, os.path.splitext(os.path.basename(out))[0] + '.html')
            open(hp, 'w', encoding='utf-8').write(page)
            try:
                html_to_docx(hp, out)
            except (RuntimeError, subprocess.TimeoutExpired) as e:
                print('error: %s' % e, file=sys.stderr)
                return 2
            if a.keep_html:
                shutil.copy(hp, os.path.splitext(out)[0] + '.html')
        if a.academic:
            academic_docx(out)
        print('DOCX: %s' % out)
    print('residue: %d unconverted LaTeX command(s)%s' % (
        sum(res.values()), (' ' + ', '.join('%s x%d' % kv for kv in sorted(res.items()))) if res else ''))
    return 1 if (a.strict and res) else 0


if __name__ == '__main__':
    sys.exit(main())
