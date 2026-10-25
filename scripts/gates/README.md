# Gates

A gate is a script that binds a text to its sources: the output, the author's rulings, the
outline of topic sentences, the other language. A FAIL means the text and its source have drifted
apart. Green proves only what a gate binds; it does not prove the data are built right.

Every tool here uses only the Python 3 standard library and prints its usage with `--help` or in
its module docstring. All of them follow one exit-code convention:

| Exit | Meaning |
|---|---|
| 0 | clean (warnings allowed unless a tool's `--strict` is set) |
| 1 | findings: a mismatch, a stale value, a failed check, a self-test gap |
| 2 | usage, file or setup error |

The policy behind the gates is in `.claude/rules/working-rules.md` and `docs/WORKING_METHOD.md`.
In short: bind whole sentences, gate retired wording as an absence, run every gate after every
landing, and self-test every new or retargeted check. The stories behind the gates are in
`docs/LESSONS.md`.

---

## Prose gates

### prose_audit.py

Mechanical prose gate for `.tex` and `.md`. It reports errors and warnings; the module docstring
lists every check.

- Errors: gated banned words; em dashes; a paragraph's first sentence (the king) over 26 words or
  holding ", and "; stray CJK in an English file; proposal vocabulary pasted into the text; parts
  of the document pointed at by number; manual register (file names, folder paths, typewriter
  text).
- Warnings: style-list words, sentences over 40 words, and with `--echo` king echoes and repeated
  word strings.

```bash
python3 scripts/gates/prose_audit.py paper/main.tex
python3 scripts/gates/prose_audit.py paper/main_zh.tex --lang zh
python3 scripts/gates/prose_audit.py paper/main.tex --baseline before/main.tex   # what a round wrote
python3 scripts/gates/prose_audit.py paper/main.tex --banned retired_names.txt   # one object, one name
python3 scripts/gates/prose_audit.py paper/main.tex --allow main.tex:however:1   # an approved exception
python3 scripts/gates/prose_audit.py paper/main.tex --echo --ngram 5 --strict --json
```

- `banned_words.txt` beside the script is the default list. A plain entry is gated (error); an entry
  with a leading `~` is on the style list (warning). `--banned FILE` adds a list; it never replaces
  the default unless `--no-default-banned` is given.
- An exception is recorded with its exact count. A second occurrence fails, and so does an
  exception that matches nothing any more.
- The manual-register check is written for papers. A README or a method note is a manual by design,
  so expect those findings there.
- Exit 0 clean, 1 findings, 2 usage or read error.

### outline_check.py

The outline of kings must equal the first sentence of every paragraph, in order. Drafts in `.tex`,
`.md` or `.docx`; outlines in `.tex` (`\item`), `.md`/`.txt` (numbered or bulleted) or `.docx`.

```bash
python3 scripts/gates/outline_check.py paper/main.tex paper/outline.md
python3 scripts/gates/outline_check.py paper/main.tex --emit > paper/outline.md   # never retype it
python3 scripts/gates/outline_check.py drafts/main.docx drafts/outline.docx          # --plain is automatic
```

End kings on a word, never on an abbreviation. Keep `\ref` out of them. Check the `.tex`, not its
Word reading copy: the copy breaks a paragraph at a display or a list. Exit codes: 0 match,
1 mismatch, 2 usage or read error.

---

## Number and claim gates

### claims_gate_template.py

The reusable layer for a project's claims gate. The gate itself is one short Python file per
project. It loads the manuscript as a reader sees it (`\input` spliced in, comments out,
whitespace normalised) and binds each number and ruled claim to the output.

| Check | Binds |
|---|---|
| `presence`, `absence` | a phrase is in the text, or is not (retired wording, read as it typesets) |
| `count` | a phrase occurs exactly n times (a sentence pasted twice) |
| `number` | a printed number with digit boundaries; with `n=`, an exact occurrence count |
| `value` | a CSV cell, looked up by key columns, formatted at the printed precision |
| `sentence`, `in_sentence` | a whole sentence built from output values, or a number inside one sentence |
| `closed_paragraph` | a paragraph is exactly the listed sentences, in order |
| `footnote_only` | a detail lives in a footnote and not in the body |
| `stars` | printed stars follow the p value the table note names |
| `check` | any custom test, as long as its result is computed from the text |

```bash
python3 scripts/gates/claims_gate_template.py --demo      # the bundled example
python3 scripts/gates/[project]_claims_gate.py           # the project's own gate
```

Resolve every path from the gate file's own folder, never from an absolute path. A gate that reads
the main checkout passes every mirror self-test, because it never reads the mirror. `report()`
prints "N checks, M failed" and returns the exit code: 0 all pass, 1 any FAIL.

### mirror_digit_fidelity.py

Checks that an original and its translated mirror carry the same numbers. It runs a multiset test
in both directions, plus an order test on the decimals that catches values swapped between the
languages.

```bash
python3 scripts/gates/mirror_digit_fidelity.py --pair paper/main.tex paper/main_zh.tex
python3 scripts/gates/mirror_digit_fidelity.py --config scripts/gates/digit_pairs.json \
    --strip-refs --follow-inputs --strict-order
```

List every translated file in the config, fragments included: an unlisted mirror is never checked.
It does not see a lost sentence that carries no number, or a stale claim both languages still
state; bind those in the claims gate. Exit 0 every pair matches, 1 any pair fails, 2 usage or file
error.

### stale_value_scan.py

After a rerun, reports every printed number that the retired output explains and the current
output does not. It catches the unchecked numbers a claims gate never had a check for.

```bash
python3 scripts/gates/stale_value_scan.py --text paper/main.tex --text paper/main_zh.tex \
    --current output/current --retired output/retired --follow-inputs \
    [--min-decimals 2] [--min-abs 1] [--exceptions stale_exceptions.json]
```

Pass every source the text draws on as `--current`. An exception must give its reason or it is
refused. Exit 0 nothing stale, 1 something stale, 2 usage or file error.

---

## Self-testing a gate: gate_selftest.py

A gate never seen red is not a gate. The script copies only the files a gate reads into a
throwaway mirror under the system temp folder, confirms every gate is green there, applies each
perturbation, runs the gates, restores the file and checks the restore byte for byte. The live
files are never written, and the script checks that they did not change.

```bash
python3 scripts/gates/gate_selftest.py selftest.json [--only LABEL_REGEX] [--keep]
```

How to self-test a new or retargeted check:

1. List in `copy` every file the gates read, and in `gates` each gate command (`{python}`, `{gates}`
   and `{mirror}` are filled in). Set `timeout` and `max_mb`.
2. Write one perturbation per thing the check guards: the number changed in one language, the
   retired wording back, a sentence pasted twice, the output cell moved. Each must turn at least one
   gate red.
3. Add perturbations with `"expect": "green"` for edits that must not trip anything (a re-wrapped
   paragraph, a comment that records an old value). A gate that cries wolf gets switched off.
4. For a retarget, keep the approved gate as a reference (`"counts": false`) and list
   `[approved, retargeted]` under `compare`. A check that fails under the approved gate and passes
   under the retargeted one is reported as LOOSENED. Keep a check's label when you retarget it.
5. Test each language separately. Run the self-tests of earlier rounds again after a retarget.
6. Results read RED (caught), MISS (not caught), FALSE-RED, CRASH (a gate died: make it record the
   lost anchor as a FAIL and go on) or LOOSENED.

Exit 0 every perturbation behaved as expected, 1 any gap, 2 spec or setup error (including a
baseline that is not green).

---

## Worked examples

| Folder | What it shows | Run |
|---|---|---|
| `examples/numbers/` | a toy two-language paper with current and retired output, a claims gate, a digit config and two self-test specs, one of which must fail as LOOSENED | see `examples/numbers/README.md` |
| `examples/prose/` | clean and dirty fixtures in `.tex`, `.md` and Chinese, outlines that match and one that is stale | `bash scripts/gates/examples/prose/run_examples.sh` |

All numbers and sentences in the examples are invented. `run_examples.sh` writes only to a
temporary folder; its Word steps run only when LibreOffice is installed.

---

## Document tools (`scripts/tools/`)

| Tool | What it does | Exit codes |
|---|---|---|
| `tex2docx.py INPUT.tex [-o OUT.docx] [--number N] [--academic] [--strict]` | a Word reading copy of a LaTeX document (LaTeX to HTML to LibreOffice), tables restyled to three rules; `--strict` fails on LaTeX residue | 0 written, 1 residue with `--strict`, 2 usage, input or LibreOffice error |
| `outline_to_docx.py OUTLINE -o OUT.docx` or `DRAFT --from-draft -o OUT.docx` | the outline of kings as a numbered Word page | 0 written, 2 usage, input or LibreOffice error |
| `bump_version.py OLD [NEW] --pointers-file LIST` and `--check DIR` | copies `STEM_vK` to `STEM_v(K+1)`, leaves the old file, moves every pointer; `--check` lists stale pointers | 0 done, 1 stale pointers, 2 usage or file error |
| `ctex_macold_fontfix.py [--dest DIR] [--font NAME] [--force] [--dry-run]` | writes a project-local `ctex-fontset-macold.def` from the installed ctex with STHeiti replaced by an installed face, so CJK builds on macOS raise no font download dialog (`docs/LESSONS.md`, 1.1) | 0 written, 2 usage, file or setup error |

The `.tex` stays authoritative: rebuild the Word copy after every change, never edit it by hand.
Run `outline_check.py` before printing an outline.

---

## Repository checks (`scripts/`, upstream)

| Command | Checks | Exit codes |
|---|---|---|
| `./scripts/check-surface-sync.sh` | counts of skills, agents, rules and hooks stated in `README.md`, `CLAUDE.md` and the skill template match the disk; skill integrity; model versions | max of the three: 0, 1 drift, 2 error |
| `python3 scripts/check-skill-integrity.py` | skill frontmatter against body, argument hints, markdown anchors, rule and skill parity | 0 pass or advisories only, 1 findings, 2 error |
| `python3 scripts/quality_score.py FILE` | rubric score for slides and R: a `.tex` is scored as a Beamer deck, so a manuscript passes it unchecked; `.qmd`, `.R` | 0 at or above 80, 1 below 80, 2 auto-fail |
| `python3 scripts/check-tikz-prevention.py [FILE.tex]` | TikZ prevention rules | 0 pass, 1 violations, 2 usage error |
| `./scripts/check-palette-sync.sh` | the Beamer and Quarto palettes agree; skipped with a note when either default file is absent (no slides) | 0 in step or skipped, 1 drift, 2 a file named with `--latex` or `--scss` is missing |
| `./scripts/validate-setup.sh` | the tools this workflow uses are installed | 0 ready, non-zero when something required is missing |
| `./scripts/nightly-repro-check.sh` | claims whose source or output changed after they were last verified | 0 none stale, 1 stale |

`./scripts/install-hooks.sh` makes every `git commit` run surface-sync and the quality score. A
project's own gates (claims, prose, outline, mirror, stale-value) are not in the hook by default:
run them after every landing, or add them to `.githooks/pre-commit`. One is built in as an opt-in:

```bash
PAPER_GATES=1 git commit ...                          # prose audit on staged manuscript .tex/.md
PAPER_GATES=1 PAPER_DIRS="paper appendix" git commit ...   # other manuscript folders
```

It runs `prose_audit.py` on every staged `.tex` and `.md` under `PAPER_DIRS` (default `paper
manuscript drafts`), with `--lang zh` for a file whose name ends in `_zh` before its extension, and
aborts the commit on any finding. A README or a method note in those folders trips the
manual-register check by design; keep such files elsewhere.
