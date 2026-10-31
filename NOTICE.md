# Notice

This folder is a derivative of **claude-code-my-workflow** by Pedro H. C. Sant'Anna,
<https://github.com/pedrohcgs/claude-code-my-workflow>, used under the MIT License. The upstream
copyright notice and permission notice below are kept, as the license requires, and are also in
[LICENSE](LICENSE).

---

## Upstream copyright and license

```text
MIT License

Copyright (c) 2026 Pedro H. C. Sant'Anna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## What this copy adds (Lantao Liu's own work)

- **Rules:** `.claude/rules/working-rules.md` (always loaded), `.claude/rules/writing-standard.md`
  and `.claude/rules/empirical-results-writing.md` (loaded on manuscript files).
- **Documents:** everything in `docs/`: the working method, the writing standard, the guide to
  writing empirical results, the lessons, and the guides to the saved workflows.
- **Gates:** everything in `scripts/gates/`: the prose audit and its banned-word list, the outline
  check, the claims-gate template, the mirror digit-fidelity check, the stale-value scan, the gate
  self-test script, and their worked examples.
- **Tools:** everything in `scripts/tools/`: the LaTeX-to-Word reading copy, the outline printout,
  the version bump, the CJK fontset fix (it writes a local copy from the installed ctex and ships no
  ctex file).
- **Saved workflows:** everything in `.claude/workflows/`.
- **Templates:** `templates/annotation-intake.md`, `templates/round-proposal.md`,
  `templates/landing-record.md`.
- **This notice**, and new versions of `README.md` and `CLAUDE.md`.

These were distilled from his own revision rounds on one long empirical manuscript. None of that
manuscript's content is included.

---

## What this copy changes in upstream files

- `README.md` and `CLAUDE.md`: replaced (a guide to this folder; a project template).
- `MEMORY.md`: rewritten. Generic upstream entries kept and condensed; his lessons added.
- `.claude/WORKFLOW_QUICK_REF.md`: preferences and non-negotiables filled in; asks before any text
  change and before any commit.
- `scripts/check-surface-sync.py`, `scripts/check-surface-sync.sh`,
  `scripts/check-skill-integrity.py`, `scripts/check-model-versions.sh`: surfaces that are absent
  (the guide, the rendered site, the changelog) are skipped with a printed note instead of failing.
- `scripts/validate-setup.sh`: accepts the Claude desktop app in place of the command-line tool,
  treats Quarto as recommended, and explains a folder that is not yet a git repository. It skips the
  palette check when the slide files are absent and suggests the sample decks only while they exist.
- `scripts/check-palette-sync.py`: with the default paths, an absent `Preambles/header.tex` or
  `Quarto/theme-template.scss` is skipped with a note (exit 0) instead of an error.
- `.githooks/pre-commit`: an opt-in block (`PAPER_GATES=1`) runs the prose audit on staged manuscript
  files; the header says the quality score is a slide and R rubric.
- `.claude/output-styles/academic-writing.md`: the number, sentence-length, self-reference and
  hedging lines aligned with the writing standard in `docs/writing/`, which wins where the two
  disagree.
- `scripts/check-tikz-prevention.py`: with no arguments it scans the default slide and figure
  folders instead of exiting with a usage error.
- `scripts/quality_score.py`: the hardcoded-path check no longer flags R escape strings or escaped
  LaTeX commands.
- `scripts/sync_to_docs.sh`: guarded for a missing figures folder.
- `.gitignore`: the project-specific tail replaced by generic patterns, plus patterns for stray
  scratch mirrors.
- `.claude/skills/verify-claims`, `.claude/skills/did-event-study`,
  `.claude/skills/research-ideation`: example citations reworded to neutral ones.
- `.claude/hooks/claim-reconcile.py`, `.claude/hooks/git-guardrails.py`: made executable.
- `TROUBLESHOOTING.md`, `templates/tikz-snippets/README.md`: pointers to files this copy does not
  ship removed.

## Credits the upstream files carry

The upstream files keep their own attributions. The `/review-paper --peer` pipeline and
`.claude/references/journal-profiles.md` are adapted from Hugo Sant'Anna's
[clo-author](https://github.com/hugosantanna/clo-author) with his permission, as the upstream
README and those files state. This copy does not change them.

## Third-party skills

`.claude/skills/audit-analysis`, `.claude/skills/review-paper-code` and
`.claude/skills/explain-diff` come from Claes Bäckman's
[AI-research-feedback](https://github.com/claesbackman/AI-research-feedback) at commit `4c1aef5`,
used under the MIT License. Each folder keeps the license in its `LICENSE` file.
`review-paper-code` and `explain-diff` are unchanged. `audit-analysis` is changed in two ways: it
takes optional paths after the base ref, and it passes untracked code files to the auditor.

## What this copy leaves out

This copy does not ship the upstream Quarto guide (`guide/`) or its rendered site
(`docs/index.html`, `docs/workflow-guide.html`). It also leaves out `CHANGELOG.md`, `CITATION.cff`
and the community files in `.github/`: the contributing guide, the code of conduct, the security
policy, and the issue and pull-request templates. The upstream repository holds them.
