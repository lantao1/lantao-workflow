# Lantao's Claude Code Research Workflow

This folder is Lantao's personal Claude Code workflow for research projects.

It is built on Pedro Sant'Anna's MIT-licensed template
[claude-code-my-workflow](https://github.com/pedrohcgs/claude-code-my-workflow). The template
supplies the agents, skills, hooks, most rules and the check scripts. On top of it sit Lantao's own
working rules, writing standards, gate scripts, round templates and saved multi-agent workflows. They
were distilled from many months of revision rounds on one long empirical manuscript. Nothing of that
manuscript is kept here; only the method. License and credits: [NOTICE.md](NOTICE.md) and
[LICENSE](LICENSE).

Copy the folder into a new project to start (Quick start, below).

---

## What is his own and what is upstream

| Part | Where | Origin |
|---|---|---|
| Working rules, always loaded | `.claude/rules/working-rules.md` | his |
| Writing standard, one-page form | `.claude/rules/writing-standard.md` | his |
| Rules for reporting estimates | `.claude/rules/empirical-results-writing.md` | his |
| Working method, writing standards, lessons, workflow guides | `docs/` (index: `docs/README.md`) | his |
| Gate scripts and their worked examples | `scripts/gates/` (guide: `scripts/gates/README.md`) | his |
| Document tools: Word reading copy, outline printout, version bump, CJK fontset fix | `scripts/tools/` | his |
| Saved multi-agent workflows | `.claude/workflows/` | his |
| Round templates: intake, proposal, landing record | `templates/annotation-intake.md`, `templates/round-proposal.md`, `templates/landing-record.md` | his |
| Cross-project memory | `MEMORY.md` | upstream file, rewritten: generic upstream entries plus his lessons |
| Project instructions | `CLAUDE.md` | a template in the shape he used |
| Agents, skills, hooks, the other rules, references, output styles | `.claude/` | upstream |
| Check scripts, quality score, hook installer, setup check | `scripts/*.py`, `scripts/*.sh` | upstream, adapted: absent optional surfaces are skipped with a note |
| Other templates, slide demos, preambles, R demo, CI, editor settings | `templates/`, `Slides/`, `Quarto/`, `Preambles/`, `scripts/R/`, `.github/`, `.githooks/`, `.vscode/` | upstream |
| Troubleshooting notes | `TROUBLESHOOTING.md` | upstream, dead pointers removed |

---

## Quick start for a new project

1. **Copy the contents, never a `.git` folder.**

   ```bash
   git clone https://github.com/lantao1/lantao-workflow.git ~/projects/new-paper
   rm -rf ~/projects/new-paper/.git
   cd ~/projects/new-paper
   ```

   From a local copy instead: `rsync -a --exclude .git ~/Desktop/lantao-workflow/ ~/projects/new-paper/`.

2. **Start version control and install the pre-commit gates.**

   ```bash
   git init
   ./scripts/install-hooks.sh      # every commit now runs surface-sync and the quality score
                                   # (a slide and R rubric); PAPER_GATES=1 adds the prose audit
   ./scripts/validate-setup.sh     # reports what is installed and what each tool unlocks
   ```

3. **Fill the placeholders in `CLAUDE.md`.** Project name, field, approver, the interpretation
   rules this project must never break, the folder layout, the build commands and one tracker row
   per deliverable. Keep every tracker row to one line; history goes in the landing records. If the
   manuscript folder is not `paper/`, `manuscript/` or `drafts/`, add it to the `paths:` of
   `.claude/rules/writing-standard.md` and `.claude/rules/empirical-results-writing.md`. Replace
   `README.md` with the project's own; keep `LICENSE` and `NOTICE.md`, which carry the MIT notice
   the upstream license requires.

4. **Adapt to the field, where it applies.** Project items in `.claude/WORKFLOW_QUICK_REF.md`, the
   knowledge base in `.claude/rules/knowledge-base-template.md`, the review lenses in
   `.claude/agents/domain-reviewer.md`. The writing standard uses economics examples for its
   register rules; adapt those in a project from another field.

5. **Review `.claude/settings.json`.** It ships as upstream ships it: `bypassPermissions` mode with
   broad allow rules, and the hooks wired in. Narrow it if the project holds data or drafts you do
   not want edited without a prompt.

6. **Delete what the project does not need** (the slide demos, Quarto, TikZ snippets; `Preambles/`
   too if the project has no slides, and then the palette line in `.claude/WORKFLOW_QUICK_REF.md`).
   The palette check and the setup check skip absent slide files with a note. Then run
   `./scripts/check-surface-sync.sh`: `templates/skill-template.md` states the skill count, and a
   deleted skill, agent, rule or hook has to move every count that names it.

7. **Optional: seed the auto-memory.** Claude Code keeps per-project notes in
   `~/.claude/projects/<encoded project path>/memory/`, where the encoded path is the absolute
   project path with its separators turned into `-` (for example `-Users-me-projects-new-paper`).
   Start one session in the new folder first, then `ls ~/.claude/projects/` to find the folder.
   Each note is one Markdown file with front matter and a short body; `MEMORY.md` in that folder
   indexes them, one line per note. The working rules already load every session from
   `.claude/rules/working-rules.md`, so seed only notes about you that should follow you from
   project to project. For example, `user_response_language.md`:

   ```markdown
   ---
   name: user-response-language
   description: Reply in Chinese in chat; everything that lands in a file stays English.
   metadata:
     node_type: memory
     type: feedback
   ---
   Reply in Chinese. Keep in English every string that lands in a file.

   **Why:** the deliverable is English, so a Chinese paraphrase of a proposed sentence is not reviewable.

   **How to apply:** Chinese for explanation and status; proposed sentences verbatim in English.
   ```

   ```text
   # MEMORY.md in the memory folder (the index)
   - [Response language](user_response_language.md): reply in Chinese; file content stays English
   ```

---

## The round at a glance

A round is one cycle from the author's comments to a landed, checked, recorded change. Short form
in `.claude/rules/working-rules.md`; full method in `docs/WORKING_METHOD.md`.

1. **Intake.** Back up the annotated file, extract every comment, list them one by one
   (`templates/annotation-intake.md`). No edit before the list exists.
2. **Sweep.** Each comment is a sample of a defect class: distil a rule and sweep every file for it.
   Report the sweep even when it finds nothing.
3. **Check standing rulings.** Never re-propose what the author refused.
4. **Propose.** Old and new side by side, decisions with the recommended option first, ripples
   listed, any new fact flagged as new content (`templates/round-proposal.md`).
5. **Approve.** Nothing lands in a live document before the author says so.
6. **Land.** Copy every touched file to `before/`, apply with a script that writes after each
   replacement, then diff every sentence against `before/`.
7. **Gates.** Run every gate. Retarget what the landing turned red without loosening it, and
   self-test each new or retargeted check in a scratch mirror.
8. **Build and read back.** Compile to zero errors, zero overfull boxes, zero unresolved references.
   Fresh readers then read the landed text with the author's comments in hand.
9. **Record.** Landing record (`templates/landing-record.md`), one-line tracker row, NOT COMMITTED.
10. **Clean up.** Delete the round's scratch mirrors.

Commits happen only when the author says so.

---

## Gates and tools

Run from the project root. Usage, exit codes and the self-test method are in
`scripts/gates/README.md`.

```bash
# Repository checks (also run by the pre-commit hook and CI)
./scripts/check-surface-sync.sh                          # counts, skill integrity, model versions
python3 scripts/quality_score.py Slides/deck.tex        # slide and R rubric, 80 to commit

# Prose
python3 scripts/gates/prose_audit.py paper/main.tex      # banned words, dashes, kings, leaks
python3 scripts/gates/outline_check.py paper/main.tex paper/outline.md
python3 scripts/gates/outline_check.py paper/main.tex --emit > paper/outline.md

# Numbers
python3 scripts/gates/claims_gate_template.py --demo     # then write the project's own gate
python3 scripts/gates/mirror_digit_fidelity.py --pair paper/main.tex paper/main_zh.tex
python3 scripts/gates/stale_value_scan.py --text paper/main.tex \
    --current output/current --retired output/retired

# Self-test any gate: break what it guards in a throwaway mirror and watch it go red
python3 scripts/gates/gate_selftest.py scripts/gates/selftest.json

# Documents
python3 scripts/tools/tex2docx.py paper/main.tex --academic          # Word reading copy
python3 scripts/tools/outline_to_docx.py paper/main.tex --from-draft -o paper/outline.docx
python3 scripts/tools/bump_version.py drafts/paper_v3.tex --pointers-file scripts/tools/pointers.txt

# Worked examples (the number gates: scripts/gates/examples/numbers/README.md)
bash scripts/gates/examples/prose/run_examples.sh        # prose gates and document tools
```

The paths in this block are examples: `paper/`, `output/` and the pointer list are whatever the
project uses. The quality score is a slide and R rubric: it scores any `.tex` as a Beamer deck, so a
manuscript passes it without being checked. The manuscript's gates are the prose audit, the outline
check and the project's claims gate; `PAPER_GATES=1 git commit` makes the pre-commit hook run the
prose audit on staged manuscript files (`scripts/gates/README.md`). The prose audit is written for papers: run on a README or a method note, it reports
every inline code span as manual register, which is expected there.

---

## Saved workflows

The Workflow-tool scripts in `.claude/workflows/` run the multi-agent parts of a round. Guides:
`docs/workflows/EDIT_WORKFLOWS.md` (proposal, landing, mirrors, gates) and
`docs/workflows/REVIEW_WORKFLOWS.md` (read-only reviews).

| Workflow | Use it when | Writes |
|---|---|---|
| `annotation-round` | the author has marked up a draft: comments to rules, sweeps and a checked proposal | intake and proposal in the round folder |
| `group-landing` | approved items become verified exact edits; dry run first, then land | a scratch report; with `apply: true`, the edits and `before/` copies |
| `bilingual-mirror` | build or update a language mirror, or mirror approved edits | glossary and drafts in the round folder |
| `gate-audit` | attack the gates (audit) or repair them without loosening (retarget) | diffs, patches and self-test specs |
| `model-papers-study` | before rewriting a section: how the model papers write it, and a diagnosis of the draft | anatomies, template, diagnosis, outline |
| `standard-audit` | a draft must meet the writing standard before it goes out | reports, if a round folder is given |
| `multi-role-review` | a section reads defensive or hedged, or must satisfy several readers at once | one report, if a round folder is given |
| `source-verification` | claims about cited works must be checked against the works | one report, if a round folder is given |
| `argument-stress-test` | before a meeting, a defence or a submission: does the story hold? | the verdict, if a round folder is given |
| `read-back` | right after a round lands, before the author sees it | one report, if a round folder is given |

**How to run one.** Ask Claude for the workflow by name and give its arguments. For example: "Run
the `read-back` workflow on `paper/results.tex`, with its `before/` copy and my comments." Claude
then calls the Workflow tool:

```text
Workflow({name: "read-back", args: {
  "documents": [{"path": "paper/results.tex",
                 "before": "quality_reports/2027-01-20_round/before/results.tex"}],
  "authorMessage": "the author's comments for this round, verbatim",
  "roundDir": "quality_reports/2027-01-20_round",
  "scratch": "<session scratchpad>/read-back"
}})
```

- Each script opens with its `meta` block, then a header comment with a full `args` example, the
  outputs and the agent count. Read the header before the first run.
- A script stops before spawning any agent when a required argument is missing.
- An interrupted run resumes with the same script, the same args and `resumeFromRunId`.
- Check free disk space before a large fan-out: every scratch mirror adds up.
- The Workflow tool is not available in every session. Without it, ask Claude to run the same shape
  as parallel subagents (`.claude/rules/orchestrator-protocol.md`).
- Status: every script passes a dry run with mocked agents. None has yet run end to end in this
  generic form, so run each the first time on a small target and read its journal.

---

## Folder tree

```text
lantao-workflow/
├── CLAUDE.md                  # project template: fill the placeholders
├── MEMORY.md                  # cross-project [LEARN] entries (committed)
├── README.md  NOTICE.md  LICENSE  TROUBLESHOOTING.md
├── Bibliography_base.bib      # bibliography template with example entries
├── .claude/
│   ├── WORKFLOW_QUICK_REF.md  # one-page preferences and non-negotiables
│   ├── agents/                # reviewers, referees, verifiers (upstream)
│   ├── hooks/                 # git guardrails, context and compaction hooks (upstream)
│   ├── output-styles/         # academic-writing, referee (upstream)
│   ├── references/            # orchestration schemas, agent fleet, model versions (upstream)
│   ├── rules/                 # working-rules, writing-standard, empirical-results-writing + upstream
│   ├── scripts/statusline.sh
│   ├── settings.json          # permissions and hooks
│   ├── skills/                # slash commands (upstream)
│   └── workflows/             # saved multi-agent workflows (his)
├── docs/                      # his method, standards, lessons, workflow guides
│   ├── WORKING_METHOD.md  LESSONS.md
│   ├── writing/               # WRITING_STANDARD.md, EMPIRICAL_RESULTS_WRITING.md
│   └── workflows/             # EDIT_WORKFLOWS.md, REVIEW_WORKFLOWS.md
├── scripts/
│   ├── gates/                 # prose, outline, claims, mirror, stale-value gates + self-test
│   ├── tools/                 # tex2docx, outline_to_docx, bump_version, ctex_macold_fontfix
│   ├── R/                     # demo analysis pipeline (upstream)
│   └── check-*.py|sh  quality_score.py  install-hooks.sh  validate-setup.sh  ...
├── templates/                 # round templates (his) + specs, logs, decisions, TikZ (upstream)
├── quality_reports/           # plans/, session_logs/, specs/, decisions/, audits/ ...
├── explorations/              # sandbox at a 60/100 threshold
├── master_supporting_docs/    # source papers and slides you work from
├── Preambles/  Quarto/  Slides/   # slide demos and the shared palette (upstream)
├── .githooks/pre-commit       # installed by scripts/install-hooks.sh
└── .github/workflows/gates.yml
```

A project adds its own folders beside these: the manuscript (`paper/` or `drafts/`), `data/raw/`
and `data/clean/` (gitignored), analysis scripts, `tables/`, `figures/`, `output/`.

---

## Skills by category

Each skill's own `SKILL.md` says when to use it; `ls .claude/skills` lists them all.

| Category | Skills |
|---|---|
| Papers and review | `/review-paper`, `/seven-pass-review`, `/respond-to-referees`, `/verify-claims`, `/proofread`, `/humanize`, `/lit-review`, `/validate-bib`, `/submission-disclosures` |
| Research design | `/interview-me`, `/research-ideation`, `/power-analysis`, `/preregister`, `/grant-proposal`, `/data-management-plan` |
| Data, estimation and replication | `/data-analysis`, `/stata-replication`, `/did-event-study`, `/simulation-study`, `/diagnose`, `/audit-reproducibility`, `/replication-package`, `/capture-environment`, `/disclosure-check`, `/review-r`, `/r-package-check` |
| Slides and teaching | `/create-lecture`, `/compile-latex`, `/translate-to-quarto`, `/qa-quarto`, `/deploy`, `/extract-tikz`, `/new-diagram`, `/slide-excellence`, `/visual-audit`, `/pedagogy-review`, `/devils-advocate`, `/syllabus`, `/teach-from-paper`, `/scaffold-exercises`, `/respond-to-eval` |
| Session and repository | `/commit`, `/checkpoint`, `/compress-session`, `/context-status`, `/learn`, `/promote-memory`, `/deep-audit`, `/permission-check`, `/new-skill`, `/coauthor-brief`, `/triage-inbox` |

**Agents** (`.claude/agents/`, upstream):

| Role | Agents |
|---|---|
| Manuscript review | `editor`, `domain-referee`, `methods-referee`, `claim-verifier`, `humanize-auditor`, `proofreader` |
| Code and simulation | `r-reviewer`, `r-package-reviewer`, `sim-reviewer` |
| Slides | `slide-auditor`, `pedagogy-reviewer`, `tikz-reviewer`, `beamer-translator`, `quarto-critic`, `quarto-fixer`, `domain-reviewer` |
| Workflow | `verifier`, `promote-memory-council` |

**Rules** (`.claude/rules/`). Always loaded: `working-rules.md` (his), `plan-first-workflow.md`,
`orchestrator-protocol.md`, `session-logging.md`, `prompt-shaping.md`, `meta-governance.md`,
`cross-artifact-review.md`. The rest load only on matching files: his `writing-standard.md` and
`empirical-results-writing.md` on the manuscript folders (`paper/`, `manuscript/`, `drafts/`), the
upstream rules on code, data, slides,
TikZ and replication.

---

## Prerequisites

| Tool | Needed for |
|---|---|
| Claude Code (command line or desktop app) | everything |
| git, Python 3 | version control, every gate and check script |
| XeLaTeX or pdfLaTeX, BibTeX | papers and slides |
| LibreOffice | Word reading copies (`tex2docx.py`, `outline_to_docx.py`) |
| Stata, R | the analysis, as the project needs |
| Quarto, pdf2svg, gh | web slides, TikZ to SVG, the pull-request flow (optional) |

`./scripts/validate-setup.sh` reports which of these are installed.

---

## Credit

The upstream template is [claude-code-my-workflow](https://github.com/pedrohcgs/claude-code-my-workflow),
released under the MIT License. Copyright (c) 2026 Pedro H. C. Sant'Anna. The upstream license is
kept in [LICENSE](LICENSE); [NOTICE.md](NOTICE.md) lists what this copy adds and changes.
