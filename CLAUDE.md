# CLAUDE.md: [PROJECT TITLE]

- **Project:** [one line: the question this project answers]
- **Institution:** [institution, or none]
- **Field:** [field; the writing standard's register rules use economics, adapt them if needed]
- **Approver:** [the supervisor, co-author or editor whose approval the deliverables need]
- **Branch:** [main]

<!-- Fill every [BRACKET]. Keep this file short: it loads every session. -->

---

## Core Principles

- **Plan first.** Enter plan mode before non-trivial tasks; save plans to `quality_reports/plans/`.
- **Verify after.** Run the scripts and every gate, and confirm the output at the end of every task.
- **Single source of truth.** [The analysis scripts] and [the manuscript source] are authoritative.
  Tables, figures, Word copies and outlines are generated from them, never edited by hand.
- **Quality gates.** Slides and R scripts: nothing ships below 80/100 on `scripts/quality_score.py`
  (thresholds below). That score is a slide and R rubric: it scores any `.tex` as a Beamer deck, so
  it is not a paper gate. The manuscript's gates are the prose audit, the outline check and the
  project's claims gate (Commands, below); run them all after every change.
- **[LEARN] tags.** When corrected, save `[LEARN:category] wrong -> right` to [MEMORY.md](MEMORY.md)
  if it holds for any project, or to `.claude/state/personal-memory.md` if it holds for this machine.
- **Never commit unless explicitly asked.** Landing records and tracker rows say NOT COMMITTED
  until the author says to commit.

Cross-project lessons, loaded every session through this import:

@MEMORY.md

Working rules (always loaded): `.claude/rules/working-rules.md`. Full method:
`docs/WORKING_METHOD.md`. Prose standard: `docs/writing/WRITING_STANDARD.md`. Reporting estimates:
`docs/writing/EMPIRICAL_RESULTS_WRITING.md`. Past plans, specs, round records and session logs
are in `quality_reports/`.

---

## Communication

- Reply in Chinese. Everything that is or becomes deliverable content is English: prose, proposed
  sentences, headings, labels, code comments, commit messages, emails. Give a proposed sentence
  verbatim in English, never as a paraphrase. Round records (intake, proposal, landing) may carry
  Chinese commentary, with quoted and proposed sentences verbatim in the document's language.
- Short and direct: one line per answer, one numbered action list, at most two yes/no questions.
  Old/new pairs, sweeps and evidence go in the plan or proposal file, linked.
- Number questions and letter options so the author answers in shorthand ("1 A 2 yes").
- If a belief of the author's is not supported by the data, say so in one sentence with the numbers.

---

## Interpretation Rules (read every session)

<!-- Replace or extend with the rules this project's text must never break. The first two are
     the defaults for empirical work; delete them only if the design identifies causal effects. -->

- **The project's own estimates are associations.** Never call them an effect or an impact, and
  never make a regressor the subject of a causal verb. Technical terms such as fixed effects stay.
  Other studies' findings are reported in their own terms.
- **Label IV estimates by what the instrument addresses** (for example, sorting or measurement
  error), not as causal effects. Report OLS and IV side by side, each labelled.
- [Concepts never to blur: two regressors that measure different things keep separate names.]
- [Unit of analysis: the level at which the regressions run.]

---

## Folder Structure

```
[project]/
├── CLAUDE.md  MEMORY.md  README.md
├── .claude/                     # rules, skills, agents, hooks, saved workflows
├── docs/                        # working method, writing standards, lessons, workflow guides
├── [paper]/                     # manuscript source (.tex) and its outline
├── drafts/                      # Word reading copies, annotated PDFs, language mirrors
├── bibliography/                # .bib files and source PDFs
├── data/
│   ├── raw/                     # never edited, never committed
│   └── clean/                   # built by scripts (gitignored)
├── scripts/
│   ├── [stata | R | python]/    # analysis code, one driver per output family
│   ├── gates/                   # prose, outline, claims, mirror, stale-value gates + self-test
│   └── tools/                   # tex2docx, outline_to_docx, bump_version, ctex_macold_fontfix
├── output/                      # estimation output (CSV) the text is gated against
├── tables/  figures/            # generated exhibits
├── quality_reports/             # plans/, session_logs/, specs/, one folder per round
├── explorations/                # sandbox (60/100)
└── templates/                   # round templates, specs, session logs
```

The writing rules (`.claude/rules/writing-standard.md`, `.claude/rules/empirical-results-writing.md`)
load on `paper/`, `manuscript/` and `drafts/`. If [paper] is another folder, add it to the `paths:`
of both files.

---

## Commands

```bash
# Analysis: one driver per output family
[stata -b do scripts/stata/00_run_all.do | Rscript scripts/R/00_run_all.R]

# Manuscript: three passes, then confirm 0 errors, 0 overfull, 0 undefined and the PDF's mtime
cd [paper] && xelatex -interaction=nonstopmode main.tex && bibtex main \
  && xelatex -interaction=nonstopmode main.tex && xelatex -interaction=nonstopmode main.tex

# Repository gates (also run by the pre-commit hook)
./scripts/check-surface-sync.sh
python3 scripts/quality_score.py [Slides/deck.tex | scripts/R/file.R]   # slide and R rubric only

# Text gates: the manuscript's gates (usage and exit codes: scripts/gates/README.md).
# PAPER_GATES=1 git commit ... makes the pre-commit hook run the prose audit on staged manuscript files.
python3 scripts/gates/prose_audit.py [paper]/main.tex
python3 scripts/gates/outline_check.py [paper]/main.tex [paper]/outline.md
python3 scripts/gates/[project]_claims_gate.py           # built from claims_gate_template.py
python3 scripts/gates/mirror_digit_fidelity.py --config [scripts/gates/digit_pairs.json]
python3 scripts/gates/stale_value_scan.py --text [paper]/main.tex \
    --current output/[current] --retired output/[retired]
python3 scripts/gates/gate_selftest.py [scripts/gates/selftest.json]
# Start both JSON files from scripts/gates/examples/numbers/digit_pairs.json and perturbations.json.

# Word reading copy, rebuilt after every change to the .tex
python3 scripts/tools/tex2docx.py [paper]/main.tex --academic
```

---

## Quality Thresholds

| Score | Checkpoint | Meaning |
|-------|------------|---------|
| 80 | Commit | Good enough to save |
| 90 | Approver-ready | Ready for the approver to read |
| 95 | Submission-ready | Aspirational |

The score is `scripts/quality_score.py`'s slide and R rubric. A manuscript is held to its text gates
instead: all green, and a build with 0 errors, 0 overfull boxes and 0 undefined references.

---

## Skills Quick Reference

- **Writing and review:** `/review-paper` (`--peer`), `/seven-pass-review`, `/respond-to-referees`,
  `/verify-claims`, `/proofread`, `/humanize`, `/lit-review`, `/validate-bib`
- **Data and replication:** `/data-analysis`, `/stata-replication`, `/did-event-study`, `/diagnose`,
  `/audit-reproducibility`, `/replication-package`, `/capture-environment`, `/review-r`
- **Research design:** `/interview-me`, `/research-ideation`, `/power-analysis`, `/preregister`
- **Session:** `/commit` (only when asked), `/checkpoint`, `/compress-session`, `/learn`,
  `/context-status`, `/deep-audit`
- **Saved workflows** (`.claude/workflows/`): `annotation-round`, `group-landing`,
  `bilingual-mirror`, `gate-audit`, `model-papers-study`, `standard-audit`, `multi-role-review`,
  `source-verification`, `argument-stress-test`, `read-back`. Guides in `docs/workflows/`.

Full lists: [README.md](README.md).

---

## Deliverable Tracker

One row per deliverable. Each row holds one line of status, the gate state and a pointer to the
latest landing record; the history lives in the landing records under `quality_reports/`, never
here. Why: this file loads every session, and a tracker that appended every round's history to its
rows once grew the instruction file to hundreds of KB, which then had to be searched, not read.

| Deliverable | Source file | Status (one line) | Gates | Latest record |
|---|---|---|---|---|
| [Section or document] | `[paper]/[file].tex` | [drafting / with approver / approved] | [green / N red] | `quality_reports/[date]_[topic]/landing.md` |

Approved documents: [list them; any later change to one goes on the approver's change list].
Commit state: [NOT COMMITTED since commit ...].
