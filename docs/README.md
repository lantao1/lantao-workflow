# docs

Lantao's method, standards and lessons. Hand the writing files to any agent that drafts, edits or
reviews prose; hand the working method to any agent that runs part of a round.

| File | What it holds |
|---|---|
| [WORKING_METHOD.md](WORKING_METHOD.md) | How a round runs from the author's comments to a landed, gated, recorded change: approval, ripples, gates, how agents fail, multi-agent recipes, reporting, disk hygiene, commits, records. Short form: `.claude/rules/working-rules.md`. |
| [LESSONS.md](LESSONS.md) | What went wrong in past projects, as symptom, cause, fix and prevention: CJK fonts in LaTeX, latexdiff, Word files, gate pitfalls, reproducibility, editing incidents, disk, records, sources, figures. One-line versions: `MEMORY.md`. |
| [writing/WRITING_STANDARD.md](writing/WRITING_STANDARD.md) | The prose standard for any paper, chapter or report: topic sentences (kings) and the outline of kings, sentence, paragraph and flow rules, register, names, pointers, equations, citations, placement, limitations, genre moves, banned words, a checklist. Short form: `.claude/rules/writing-standard.md`. |
| [writing/EMPIRICAL_RESULTS_WRITING.md](writing/EMPIRICAL_RESULTS_WRITING.md) | How estimates are reported and read: causal-language discipline, reading a coefficient at the observed change, numbers generated and gated, the structure of a results section, table notes and footnotes, a language mirror. Short form: `.claude/rules/empirical-results-writing.md`. |
| [workflows/EDIT_WORKFLOWS.md](workflows/EDIT_WORKFLOWS.md) | The saved workflows that change files or plan changes (`annotation-round`, `group-landing`, `bilingual-mirror`, `gate-audit`, `model-papers-study`): when to use each, the order within a round, arguments, outputs, cost, lessons. |
| [workflows/REVIEW_WORKFLOWS.md](workflows/REVIEW_WORKFLOWS.md) | The saved read-only review workflows (`standard-audit`, `multi-role-review`, `source-verification`, `argument-stress-test`, `read-back`): when to use each, where it sits in a round, arguments, cost, lessons. |
| README.md | This index. |

Related folders: the gates and their guide in `scripts/gates/` (`scripts/gates/README.md`), the
workflow scripts in `.claude/workflows/`, the round templates in `templates/`.

`scripts/sync_to_docs.sh` (used by `/deploy`) renders Quarto slides into this folder for GitHub
Pages. In a project that publishes slides, the rendered pages sit beside these files.
