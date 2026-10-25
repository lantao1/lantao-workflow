#!/usr/bin/env bash
# run_examples.sh - run every prose tool on the fixtures in this folder and check the outcome.
#
# Usage: bash scripts/gates/examples/prose/run_examples.sh      (from any folder)
#
# A gate never seen red is not a gate: the clean fixtures must pass, the dirty fixtures must
# fail with exactly the findings they were written to carry. Needs Python 3; the .docx steps
# run only when LibreOffice (soffice) is found. Writes only to a temporary folder it deletes.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
GATES="$(cd "$HERE/../.." && pwd)"
TOOLS="$(cd "$GATES/../tools" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail=0
LAST=""

expect() {   # expect EXIT_CODE DESCRIPTION command...
  local want=$1 desc=$2
  shift 2
  LAST="$("$@" 2>&1)"
  local got=$?
  if [ "$got" = "$want" ]; then echo "ok   $desc"; else
    echo "FAIL $desc (exit $got, want $want)"; printf '%s\n' "$LAST" | sed 's/^/     /'; fail=1; fi
}
has() {      # has TEXT DESCRIPTION : the last output contains TEXT (fixed string)
  if printf '%s' "$LAST" | grep -qF -- "$1"; then echo "ok   $2"; else
    echo "FAIL $2 (missing: $1)"; fail=1; fi
}
lacks() {    # lacks TEXT DESCRIPTION
  if printf '%s' "$LAST" | grep -qF -- "$1"; then echo "FAIL $2 (found: $1)"; fail=1; else
    echo "ok   $2"; fi
}

PA="python3 $GATES/prose_audit.py"
OC="python3 $GATES/outline_check.py"
X="$HERE"

echo "== prose_audit.py"
expect 0 "clean .tex and .md pass, warnings included" $PA "$X/clean.tex" "$X/clean.md" --strict
expect 1 "dirty .tex fails" $PA "$X/dirty.tex"
has '[banned] banned word "however"' "gated banned word"
has '[banned] banned word "May"' "banned word in a heading"
has '[banned] banned style word "very"' "style-list word (warning)"
has '[em-dash]' "em dash inside a footnote"
has '[king-length] first sentence has 27 words (limit 26)' "king over 26 words"
has '[king-and]' 'king joined with ", and "'
has '[long-sentence] sentence 2 of this para has 45 words (limit 40)' "long body sentence (warning)"
has '[stray-cjk]' "stray CJK in an English file"
has '[proposal-leak] proposal vocabulary "NEW CONTENT"' "proposal vocabulary"
has '[number-pointer] part pointed at by number: "Section~\ref{"' "section pointed at by number"
has '[manual-register] a code or data file name in the text: ".dta"' "manual register: a data file name"
has '9 error(s), 2 warning(s)' "exactly the defects the fixture carries"
expect 1 "dirty .md fails" $PA "$X/dirty.md"
has '5 error(s), 0 warning(s)' "Markdown: dash, leak, banned, pointer, CJK"
has '"King:"' "Markdown proposal vocabulary"
expect 0 "clean Chinese file passes" $PA --lang zh "$X/clean_zh.tex" --strict
expect 1 "dirty Chinese file fails" $PA --lang zh "$X/dirty_zh.tex"
has '[em-dash]' "Chinese em dash"
has '"第3章"' "Chinese chapter number"
has '"其实"' "Chinese hedge (warning)"
has '3 error(s), 1 warning(s)' "Chinese counts"
expect 1 "--allow records an exception by file" $PA "$X/dirty.tex" --allow dirty.tex:however --allow dirty.tex:very
lacks 'banned word "however"' "the recorded word is not reported"
has '2 covered by recorded exceptions' "the exceptions are counted"
expect 2 "an exception without its file is refused" $PA "$X/dirty.tex" --allow however
printf '%s\n' "Yields may rise. Prices may fall." > "$TMP/may.md"
expect 1 "a second occurrence breaks an exception recorded once" $PA "$TMP/may.md" --allow may.md:may
has 'exception "may" records 1 occurrence(s), found 2' "the count mismatch is named"
expect 0 "the exact count passes" $PA "$TMP/may.md" --allow may.md:may:2
expect 1 "an exception that matches nothing fails" $PA "$TMP/may.md" --allow may.md:may:2 --allow may.md:however
printf '%s\n' "may.md:may:2" > "$TMP/allow.txt"
expect 0 "--allow-file reads the same records" $PA "$TMP/may.md" --allow-file "$TMP/allow.txt"
expect 1 "--max-sentence 0 turns the length check off" $PA "$X/dirty.tex" --max-sentence 0
lacks '[long-sentence]' "no length finding"
printf '%s\n' "Yields however rose. The size grew." > "$TMP/terms.md"
printf '%s\n' "size" "~however" > "$TMP/retired.txt"
expect 1 "--banned adds a project list to the default one" $PA "$TMP/terms.md" --banned "$TMP/retired.txt"
has 'banned word "however"' "the default list still applies, and a project list cannot lower it"
has 'banned word "size"' "the project's retired name is gated"
expect 1 "--no-default-banned uses the project list alone" $PA "$TMP/terms.md" --banned "$TMP/retired.txt" --no-default-banned
lacks 'banned word "however"' "default list off"

echo "== prose_audit.py: headings, dashes, register, pointers, leaks"
printf '%s\n' '\documentclass{article}' '\begin{document}' '\section{Data --- How Yields May Move（注）}' 'Yields rose.' '\section*{Appendix A: Proofs}' 'Prices fell.' '\end{document}' > "$TMP/head.tex"
expect 1 "a .tex heading is audited" $PA "$TMP/head.tex"
has '[banned] banned word "May"' "banned word in a heading"
has '[em-dash]' "em dash in a heading"
has '[stray-cjk]' "stray CJK in a heading"
lacks '[number-pointer]' "a heading is a label, not a pointer"
printf '%s\n' '# Data — how yields may move（注）' '' 'Yields rose.' > "$TMP/head.md"
expect 1 "a Markdown heading is audited" $PA "$TMP/head.md"
has '3 error(s), 0 warning(s)' "banned word, em dash and CJK in a Markdown heading"
printf '%s\n' "Yields rose --- prices fell." "" "Yields rose---prices fell." "" "Prices rose--yields fell. A Cobb--Douglas form fits pages 10--20." > "$TMP/dash.md"
expect 1 "Markdown dashes" $PA "$TMP/dash.md"
has '2 error(s), 2 warning(s)' "spaced and unspaced triple hyphens are errors, double hyphens between words warnings"
expect 1 "a compound name is recorded as an exception" $PA "$TMP/dash.md" --allow dash.md:Cobb--Douglas
has '2 error(s), 1 warning(s)' "the recorded compound is not reported"
printf '%s\n' '\documentclass{article}' '\begin{document}' 'Yields rose--prices fell. The ‘fit’ is close.' '\end{document}' > "$TMP/typo.tex"
expect 0 "an unspaced dash and a curly quote in .tex are warnings" $PA "$TMP/typo.tex"
has '[en-dash]' "double hyphen between words"
has '[typography] curly quote' "curly quote in .tex"
printf '%s\n' 'The code in `clean` writes output/panel.csv. This note documents how the panel is built.' > "$TMP/manual.md"
expect 1 "manual register in Markdown" $PA "$TMP/manual.md"
has 'inline code (typewriter text)' "inline code"
has 'a project folder path in the text: "output/"' "folder path"
has 'a code or data file name in the text: ".csv"' "data file name"
has '[manual-register] the text describes itself: "This note documents"' "self-description (warning)"
printf '%s\n' "No change in the estimates follows from dropping the first wave." "" "Section 8 vouchers expand housing. As Sec.~3 shows, prices fall. Ch.~2 has the data." > "$TMP/ptr.md"
expect 1 "leaks and pointers" $PA "$TMP/ptr.md"
has '"Sec.~3"' "an abbreviated section pointer"
has '"Ch.~2"' "an abbreviated chapter pointer"
has '4 error(s)' "one leak and three pointers"
expect 1 "exceptions cover a leak and a proper noun" $PA "$TMP/ptr.md" --allow "ptr.md:No change" --allow "ptr.md:Section 8"
has '2 error(s)' "the two abbreviated pointers remain"
cp "$TMP/ptr.md" "$TMP/ptr_before.md"
printf '%s\n' "" "No change to the sentence. Add a check." >> "$TMP/ptr.md"
expect 1 "--baseline reports only the leak the round wrote" $PA "$TMP/ptr.md" --baseline "$TMP/ptr_before.md" --allow "ptr.md:Section 8" --allow "ptr.md:Sec. 3" --allow "ptr.md:Ch. 2"
has 'ptr.md:5 [proposal-leak]' "the new leak is reported"
has '1 error(s)' "the old sentence is not"
printf '%s\n' "Yields rose in the U.S. Prices fell in every district." "" "Yields rose after the canal opened in" "2010. Prices then fell." "" "1. A first item." "2. A second item." > "$TMP/abbr.md"
expect 0 "a king that may run into the next sentence is a warning" $PA "$TMP/abbr.md"
has '[king-abbrev] "U.S."' "abbreviation before a capital in a king"
$OC "$TMP/abbr.md" --emit > "$TMP/abbr_out.md"
LAST="$(cat "$TMP/abbr_out.md")"
has '2. Yields rose after the canal opened in 2010.' "a wrapped line starting with a number continues its paragraph"
lacks '3.' "list items are not kings"
printf '%s\n' "Yields move with rainfall. The lag appears because farmers plant after the first rains, harvest several months later, and report output for the season in which the harvest falls, so a dry spell late in one season lowers the yield recorded for the next season. The fit is very close." > "$TMP/warn.md"
expect 0 "warnings alone do not fail" $PA "$TMP/warn.md"
has '0 error(s), 2 warning(s)' "a long sentence and a style word are warnings"
expect 1 "--strict fails on warnings" $PA "$TMP/warn.md" --strict
printf '%s\n\n%s\n' "Yields rise with rainfall in dry districts. In dry districts yields rise with rainfall every season." "Prices also rise with rainfall in dry districts. Farm size does not change the pattern." > "$TMP/echo.md"
expect 0 "--echo is off by default" $PA "$TMP/echo.md"
lacks '[king-echo]' "no echo finding without --echo"
expect 0 "--echo warns" $PA "$TMP/echo.md" --echo
has '[king-echo]' "body sentence restating its king"
has '[cross-king-echo]' "two kings that share most content words"
has '[repeated-ngram] 6-word string' "repeated six-word string"
expect 0 "--ngram sets the string length" $PA "$TMP/echo.md" --echo --ngram 4
has '[repeated-ngram]' "repeated four-word passage"
$PA "$X/dirty.tex" --json > "$TMP/f.json"
expect 0 "--json is valid JSON with the right counts" python3 -c "import json,sys; d=json.load(open('$TMP/f.json')); sys.exit(0 if (d['errors'], d['warnings']) == (9, 2) else 1)"

echo "== outline_check.py"
expect 0 ".tex draft matches a .md outline" $OC "$X/clean.tex" "$X/outline.md"
expect 0 ".md draft matches the same outline" $OC "$X/clean.md" "$X/outline.md"
expect 0 ".tex draft matches a .tex outline" $OC "$X/clean.tex" "$X/outline.tex"
expect 1 "stale outline fails" $OC "$X/clean.tex" "$X/outline_stale.md"
has 'MISMATCH draft king 6' "reworded king reported"
has 'MISSING FROM OUTLINE draft king 7' "missing king reported"
$OC "$X/clean.tex" --emit > "$TMP/emitted.md"
expect 0 "an emitted outline matches its draft" $OC "$X/clean.tex" "$TMP/emitted.md"
expect 0 "and the Markdown twin" $OC "$X/clean.md" "$TMP/emitted.md"
printf '%s\n' '% Notes: the body starts at \begin{document} below.' '\documentclass{article}' '\begin{document}' 'Yields rose in dry districts.' '' '\renewcommand{\thetable}{A\arabic{table}}' '' 'Prices fell in wet districts.' '' '\input{results_part}' '' '\newcommand{\foo}{bar baz}' '\def\half#1{#1/2}' '' 'Wages held in every district.' '\end{document}' > "$TMP/defs.tex"
expect 0 "definitions and a commented \\begin{document} invent no king" $OC "$TMP/defs.tex" --emit
has '3. Wages held in every district.' "three kings, the last one third"
lacks 'below.' "the header comment is not the body"
lacks 'renewcommand' "a definition is not a king"
lacks 'results_part' "an \\input line is not a king"

echo "== tex2docx.py"
expect 0 "HTML with no LaTeX residue" python3 "$TOOLS/tex2docx.py" "$X/clean.tex" --html-only -o "$TMP/clean.html" --strict
has 'residue: 0' "residue count is zero"
printf '%s\n' 'Prices fell in the second year.' > "$TMP/part.tex"
cat > "$TMP/toy.tex" <<'TEX'
% Notes: the body starts at \begin{document} below.
\documentclass{article}
\title{Toy Draft}
\begin{document}
\section{Results}
Table~\ref{tab:a} reports the estimates.

\begin{itemize}
\item outer one
\begin{enumerate}
\item inner one
\end{enumerate}
\item outer two
\end{itemize}

\input{part}

\begin{table}[htbp]
\caption{Two panels}
\label{tab:a}
\begin{tabular}{lc}
\toprule
 & (1) \\
\midrule
Panel A & \\
Share & 0.42 \\
\midrule
Panel B & \\
Share & 0.39 \\
\bottomrule
\end{tabular}
\end{table}
\end{document}
TEX
expect 0 "nested lists, an \\input text file and a commented \\begin{document}" python3 "$TOOLS/tex2docx.py" "$TMP/toy.tex" --html-only -o "$TMP/toy.html" --strict
LAST="$(cat "$TMP/toy.html")"
has '<li>outer one <ol><li>inner one</li></ol></li><li>outer two</li>' "the inner list nests inside the outer item"
has '<p>Prices fell in the second year.</p>' "the \\input file is inlined"
has '<h1 style="text-align:center">Toy Draft</h1>' "the title comes from \\title, not from the comment"
if command -v soffice >/dev/null 2>&1 || [ -x /Applications/LibreOffice.app/Contents/MacOS/soffice ] || [ -x /opt/homebrew/bin/soffice ]; then
  expect 0 ".docx written" python3 "$TOOLS/tex2docx.py" "$X/clean.tex" -o "$TMP/clean.docx" --academic --strict
  expect 0 ".docx carries the text and a three-rule table" python3 -c "
import zipfile, re, sys
x = zipfile.ZipFile('$TMP/clean.docx').read('word/document.xml').decode()
t = re.sub(r'<[^>]+>', ' ', x)
ok = 'Table 1. Irrigated share and log yield' in re.sub(r'\s+', ' ', t) and '<w:insideV w:val=\"nil\"/>' in x \
     and 'w:top w:val=\"single\" w:sz=\"12\"' in x and not re.search(r'\\\\[A-Za-z]+', t)
sys.exit(0 if ok else 1)"
  expect 0 "toy .docx with --academic" python3 "$TOOLS/tex2docx.py" "$TMP/toy.tex" -o "$TMP/toy.docx" --academic --strict
  expect 0 "a body paragraph is not centred; a caption is; panel rules survive; 12 pt after" python3 -c "
import zipfile, re, sys
z = zipfile.ZipFile('$TMP/toy.docx')
x = z.read('word/document.xml').decode()
st = z.read('word/styles.xml').decode()
ps = {re.sub(r'<[^>]+>', '', p)[:12]: p for p in re.findall(r'<w:p\\b[^>]*>.*?</w:p>', x, re.S)}
body = next(p for t, p in ps.items() if t.startswith('Table') and 'reports' in re.sub(r'<[^>]+>', '', p))
cap = next(p for t, p in ps.items() if t.startswith('Table 1. Two'))
rows = re.findall(r'<w:tr>.*?</w:tr>', re.findall(r'<w:tbl>.*?</w:tbl>', x, re.S)[0], re.S)
ruled = [i for i, r in enumerate(rows) if '<w:top w:val=\"single\" w:sz=\"6\"' in r]
bt = re.search(r'w:styleId=\"BodyText\".*?</w:style>', st, re.S).group(0)
ok = 'w:val=\"center\"' not in body and 'w:val=\"center\"' in cap and ruled == [1, 3] and 'w:after=\"240\"' in bt
sys.exit(0 if ok else 1)"
  echo "== outline_to_docx.py"
  expect 0 "outline .docx from the .md outline" python3 "$TOOLS/outline_to_docx.py" "$X/outline.md" -o "$TMP/outline.docx"
  expect 0 "the printed outline matches the draft" $OC "$X/clean.tex" "$TMP/outline.docx"
  expect 0 "outline .docx built from the draft itself" python3 "$TOOLS/outline_to_docx.py" "$X/clean.tex" --from-draft --no-headings -o "$TMP/from_draft.docx"
  expect 0 "and it matches the Markdown twin" $OC "$X/clean.md" "$TMP/from_draft.docx"
else
  echo "skip .docx steps (LibreOffice not found)"
fi

echo "== bump_version.py"
BV="python3 $TOOLS/bump_version.py"
mkdir -p "$TMP/b/docs" "$TMP/b/tools"
printf 'Draft paper_v3.\n' > "$TMP/b/docs/paper_v3.tex"
printf 'Mirror of paper_v3.\n' > "$TMP/b/docs/paper_v3_zh.tex"
printf 'An older, separate document.\n' > "$TMP/b/docs/old_paper_v3.tex"
printf 'DOC = "docs/paper_v3.tex"\nMIRROR = "docs/paper_v3_zh.tex"\nOTHER = "docs/old_paper_v3.tex"\nNOTE = "paper_v3b"\n' > "$TMP/b/tools/gate.py"
printf '# files that name the draft by version\ntools/gate.py\n' > "$TMP/b/pointers.txt"
expect 0 "dry run writes nothing" $BV "$TMP/b/docs/paper_v3.tex" --also "$TMP/b/docs/paper_v3_zh.tex" --pointers-file "$TMP/b/pointers.txt" --dry-run
expect 1 "nothing was written" test -e "$TMP/b/docs/paper_v4.tex"
expect 2 "a bump with no pointer list stops" $BV "$TMP/b/docs/paper_v3.tex"
expect 1 "and writes nothing" test -e "$TMP/b/docs/paper_v4.tex"
expect 0 "bump copies and repoints" $BV "$TMP/b/docs/paper_v3.tex" --also "$TMP/b/docs/paper_v3_zh.tex" --pointers-file "$TMP/b/pointers.txt"
has '0 stale pointer(s)' "no stale pointer after the bump"
expect 0 "old file untouched" grep -q 'Draft paper_v3.' "$TMP/b/docs/paper_v3.tex"
expect 0 "pointer moved; old_paper_v3 and paper_v3b left alone" python3 -c "
import re, sys
t = open('$TMP/b/tools/gate.py').read()
sys.exit(0 if 'docs/paper_v4.tex' in t and 'paper_v4_zh.tex' in t and 'docs/old_paper_v3.tex' in t
         and 'paper_v3b' in t and not re.search(r'(?<![A-Za-z0-9_])paper_v3(?![0-9A-Za-z])', t) else 1)"
printf 'X = "paper_v3"\n' > "$TMP/b/tools/stale.py"
expect 1 "--check finds an older version" $BV --check "$TMP/b/docs" --pointers "$TMP/b/tools/gate.py" "$TMP/b/tools/stale.py"
has 'names paper_v3; newest is paper_v4.tex' "stale pointer named"
printf 'X = "paper_v30"\nY = "docs/paper_v4_appendix.tex"\n' > "$TMP/b/tools/odd.py"
expect 1 "--check finds a version newer than any file and a missing file" $BV --check "$TMP/b/docs" --pointers "$TMP/b/tools/odd.py"
has 'names paper_v30; newest is paper_v4.tex' "a version no file carries"
has 'names docs/paper_v4_appendix.tex; no such file' "a named file that is not there"
expect 2 "--check with no pointer list stops" $BV --check "$TMP/b/docs"

echo
if [ "$fail" = 0 ]; then echo "ALL EXAMPLES PASS"; else echo "SOME EXAMPLES FAILED"; fi
exit $fail
