# Memory

Lessons that carry from one project to the next. Each line is one entry:

`[LEARN:category] what went wrong or what was found -> what to do instead. Why, when the reason is not obvious.`

- This file is committed. Keep it generic: true for any project, any field, any machine.
- Machine-specific notes (paths, installed fonts, tool versions, local workarounds) go in `.claude/state/personal-memory.md`, which is gitignored.
- When you are corrected, append an entry under the right heading. When a personal note turns out to hold everywhere, promote it here.
- CLAUDE.md imports this file (`@MEMORY.md`), so it loads every session: keep it under 180 lines. The longer stories behind many entries are in [docs/LESSONS.md](docs/LESSONS.md); the standing rules for agents are in [docs/WORKING_METHOD.md](docs/WORKING_METHOD.md) and, short form, `.claude/rules/working-rules.md`. An entry that only points to a rule file keeps the incident detail the rule lacks.

---

## Claude Code mechanics

[LEARN:hooks] A Stop hook can block in two valid ways: legacy `exit 2` with the reason on stderr, or modern `exit 0` with `{"decision":"block","reason":"..."}` on stdout. An audit that says "should exit 2" about the modern form is a false alarm.
[LEARN:hooks] PreCompact hooks can block with the same modern protocol. Make any such guard opt-in and fire it at most once per plan, or it locks the session out.
[LEARN:hooks] Post-merge hooks prompt reflection and do not auto-append to memory, so the user keeps control while the habit forms.
[LEARN:permissions] `.claude/` (minus `commands`, `agents`, `skills`, `worktrees`), `.git`, `.vscode`, `.idea` and `.husky` are hard-protected. Bypass mode still prompts on them; only auto mode routes them through a classifier instead of a prompt. No setting removes the protection.
[LEARN:edits] Many edits to protected `.claude/` paths in one session -> write one python script that reads, modifies and writes, and run it through Bash. The Edit tool fires the protected-path prompt on every call; Bash does not.
[LEARN:vscode] The VS Code key is `allowDangerouslySkipPermissions` with NO `claudeCode.` prefix, while `claudeCode.initialPermissionMode` has it. The wrong key is silently ignored.
[LEARN:hooks] `initialPermissionMode` applies only at session start; a mid-session mode change wins until the session ends. "Prompts despite bypass" is almost always a stale session, not a settings bug.
[LEARN:safety] Plan approval is a chance to review the approach, not a safety boundary: after plan mode the session returns to its default mode. If you need enforcement, keep the default mode and approve risky tools one by one.
[LEARN:gates] A check that runs only inside a skill is advisory until the pre-commit hook is installed: see `.claude/rules/quality-gates.md`.
[LEARN:scheduling] `CronCreate` is session-only in practice, even with `durable: true`: it dies when the session ends (rate limit, restart, sleep). Use cloud routines for anything that must survive the session; use CronCreate only for short polling inside a live session.
[LEARN:privacy] A diagnostic skill that reads host-global config (`~/.claude/`, editor user settings) asks first and redacts keys. Repo-local reads can be automatic.
[LEARN:skills] A skill whose body says "spawn via Task" needs `Task` in its `allowed-tools`. Body and frontmatter drift apart because one reads as prose and the other as a list.
[LEARN:skills] Sibling check: if a rule's `paths:` includes a skill, confirm the skill implements that rule's protocol. Rule-versus-implementation drift is the same bug one layer up.
[LEARN:skills] Set `disable-model-invocation: true` only on skills that write a persistent file the user must mean to create; leave it off skills that only report.
[LEARN:skills] Skill descriptions should carry the trigger phrases users actually say, and the body needs instructions, examples and troubleshooting.
[LEARN:context] Before compression, run the checklist in `.claude/rules/plan-first-workflow.md` (Context Survival). Plans and logs held only in the conversation do not survive.
[LEARN:context] For long sessions, distil instead of truncating: a structured note (state, decisions, files, open questions, next actions, and what was discarded as noise) beats lossy auto-compaction. Listing discarded hypotheses stops them coming back.
[LEARN:agents] A build hung inside a background agent while the same file built cleanly in the main session; a system dialog nobody in the agent can see is the likely cause. Run builds that can raise a dialog in the main session, under a timeout.

## Planning and review loops

[LEARN:workflow] Complex or ambiguous task -> a requirements spec before the plan: see `.claude/rules/plan-first-workflow.md`, Step 3.
[LEARN:workflow] For multi-pass work, the plan file on disk is the navigation, not the conversation. Add mid-flight requests to the plan as new passes.
[LEARN:workflow] When the question is "what should we add?", research first (parallel agents, sources cited, uncertainties verified) and plan second. Brainstormed roadmaps produce opinions, not facts.
[LEARN:review-loop] A reader's comment is a sample of a defect class: distil a rule, sweep everything, report the sweep. Rule: `.claude/rules/working-rules.md` (The round, step 2).
[LEARN:review-loop] An "overall" comment (plainer language, more citations) is a document-wide requirement. Fixing it only where the note sits guarantees an angry next round.
[LEARN:review-loop] Refuters must see the instruction a finding derives from (docs/WORKING_METHOD.md section 8, item 6). Given only house rules and old approvals, refuters defended the author's earlier approvals against his new objections and killed dozens of valid findings. The same holds for any review after requirements change (a revised spec, a referee report): stale approvals in headers, gates and changelogs are evidence of the past, not of the present.
[LEARN:review-loop] Verify an agent's HIGH or CRITICAL finding yourself before passing it on (docs/WORKING_METHOD.md section 8, item 15). A proofreader flagged correct parenthetical citations as errors; a reviewer claimed a number had no machine source when the data held it.
[LEARN:review-loop] When an agent's suggestion contradicts something the author struck out by hand, the author's instruction stands.
[LEARN:review-loop] Two review flags on the same summary paragraph -> rewrite it structurally: see `.claude/rules/summary-parity.md`.
[LEARN:review-loop] A replace on one phrasing misses its sibling phrasings (plurals, extra words, a prose variant). Sweep with a pattern that covers every phrasing, and add a new pattern when a new phrasing appears.
[LEARN:review-loop] A drift scanner that matches "number + noun" also hits legitimate uses. Require several project-specific tokens on the same line before flagging.
[LEARN:review-loop] Scan the rendered PDF text, not the source, for register tells (manual-style or code-style prose). In the source, LaTeX markup drowns the signal.
[LEARN:review-loop] After a restructure or an expansion, a mechanical diff of before and after (every author-year citation, every number, every reference surname) proves nothing was lost.
[LEARN:review-loop] In a documentation-heavy repo the highest-yield audit lens is claim versus reality: where do the docs promise more than the code does?
[LEARN:pattern] Three verification patterns, each enforcing independence differently: critic-fixer loop (role tension), cross-artifact review (paper claim -> code -> output), fresh-context claim verification (the verifier never sees the draft). Do not collapse them into one.
[LEARN:pattern] For prose quality, detect and flag with suggested rewrites; do not auto-rewrite. Model rewrites of AI-voice tells introduce new tells.
[LEARN:pattern] Isolated critics (each votes on one dimension, none sees the others) beat one critic's composite judgment. The user stays the final gate even on a unanimous vote.
[LEARN:pattern] Simulated peer review: report the spread of verdicts across sampled reviewer dispositions, not one verdict. The spread is information.
[LEARN:pattern] Model tiers follow the cognitive demand of the work, and judgment agents are not demoted to save cost: see `.claude/rules/model-routing.md`.
[LEARN:pattern] A check that blocks a commit must be conservative about what it calls blocking. False positives erode the gate's authority until people bypass it.
[LEARN:pdf-annotations] A raw-byte scan that finds 0 PDF annotations proves nothing: annotations often sit inside compressed object streams. Inflate every FlateDecode stream and search again before saying a PDF has no comments.

## Multi-agent workflows

[LEARN:agents] Parallel translators or drafters drift apart on vocabulary -> build the glossary first, from the existing text, and give it to every agent.
[LEARN:agents] Agent failure modes and their rules are in docs/WORKING_METHOD.md section 8: proposal vocabulary pasted in as text, rewrites that drop approved sentences and gates that then certify the drop, batch scripts that print "ok" and die before writing. One proposal written as an instruction deleted the sentence it said to keep; one lost batch was noticed only by a stale-value scan.
[LEARN:agents] Parallel gate-retarget groups: merge, test the union, then run a loosening audit. Rule: docs/WORKING_METHOD.md section 6 (Retargeting after a landing).
[LEARN:agents] Other tools and parallel sessions edit the same tree and may rewrite gates to fit their own wording. When a document has changed since its last approved state, diff both its sentences and its gates against that state before trusting a green run. Rule: docs/WORKING_METHOD.md section 6.
[LEARN:agents] Disk and mirror hygiene (df before a fan-out, a watcher below about 10 GB free, each agent deletes its mirror, no data perturbation through a symlinked data folder, guarded deletes `rm -rf "${SP:?}/${e:?}"`): docs/WORKING_METHOD.md section 11. Audit mirrors reached tens of GB over a few rounds.
[LEARN:shell] Mirror builders left self-referencing symlinks (`dir/dir -> dir`) in dozens of repo folders. Before linking, assert the destination does not already exist and that the mirror root is not the repo root; afterwards, `find <repo> -type l` should show nothing new.
[LEARN:edits] A script that cut a file at a marker wiped the file's top because the marker also occurred in a header comment. Assert the marker occurs exactly once, then check the head and length of the result.

## Gates (scripts that check text against outputs)

[LEARN:gates] Core discipline is in docs/WORKING_METHOD.md section 6: a gate never seen red is not a gate; a gate proves only what it binds; bind whole sentences, not bare substrings (`'12' in text` passes on "2012").
[LEARN:gates] A gate can pass on a coincidence: the value may also appear in another sentence that names something else. Bind the gate to the sentence that makes the claim.
[LEARN:gates] A gate that checks a number is present cannot see the same sentence pasted twice. Where duplication matters, gate the occurrence count.
[LEARN:gates] A digit-multiset check between two language versions cannot see a transposition (two numbers swapped) or a missing sentence that carries no digit. Add an ordered-sequence check, and align the two versions sentence by sentence.
[LEARN:gates] A cross-language digit check also counts the digits in the bibliography (DOIs, page ranges): copy the reference block byte for byte or strip reference lists first. A layout fix that carries a digit (a length in `\enlargethispage`) trips it too.
[LEARN:gates] A text gate that does not follow `\input{}` is blind to every number in a generated fragment.
[LEARN:gates] Phrase gates go red on LaTeX re-wrapping. Normalise whitespace before matching; absence checks get stricter as a bonus.
[LEARN:gates] Parsers have blind spots: one skipped everything before the first `\section`, one skipped `\noindent` paragraphs, one let a footnote swallow the next sentences. When a gate reads structure, test it on each structural case.
[LEARN:gates] A gate defaulted to a retired version of the file it checks. When a file's version changes, repoint every tool that reads it in the same step.
[LEARN:gates] A gate that opened files by absolute path never read the mirror, so mirror self-tests of it were void. Resolve files from the gate's own checkout and exit non-zero on any mismatch.
[LEARN:gates] A check that is run by hand on some files misses the others (banned words survived in files nobody ran it on; one scan was never run on the translated files). Run every scan over every live file from one command.
[LEARN:gates] To find which gates depend on a passage, blank the passage and run the gates. A grep found half of them.
[LEARN:gates] Run the existing gates, unchanged, straight after a pure restructure (a section moved, an appendix split off). All green proves no gated number was lost in the move.
[LEARN:gates] Numeric gates only check numbers someone wrote a gate for. After an output rebuild, compare every printed number against the old and the new outputs and report any value only the retired outputs explain. At low precision both may explain a value; bind those by name.
[LEARN:gates] Retired wording comes back in new forms. Gate a claim as a presence plus an absence, read table rows by position, and hold a finished table or note closed so a retired value cannot return in any wording.
[LEARN:gates] When a note says which p value the stars follow, gate every printed star string against the stars of that p value and bar any other star string. A note claimed bootstrap significance while the generator still took the stars from the clustered p.
[LEARN:gates] Recompute derived quantities from the data in the gate. A gate caught a draft that used the square of a mean where the mean of a square was meant.
[LEARN:gates] Files a gate reads must be tracked, not left in a gitignored diagnostics folder. A fresh clone has to be able to run every gate.
[LEARN:audit] Deterministic checks (field exists, anchor resolves, count matches disk) belong in a script, not an agent prompt. Agents drift; scripts do not. Keep agents for judgment.
[LEARN:audit] Strip inline code spans and fenced blocks before running a parity regex over Markdown; examples inside backticks are not real links.
[LEARN:audit] Audit scope atrophies: when a new code location is added, widen every audit to cover it first, or bugs there go unchecked.
[LEARN:audit] Count checks do not verify enumerative tables. When adding an item, update the count, the table rows and every list that enumerates it.

## Sources, citations and numbers

[LEARN:sources] Numbers copied from a working paper while the published article was cited: the two versions differed on every number, and one published table was a different regression. Take every number from the version you cite.
[LEARN:sources] Check claims against the full text, not the abstract: an abstract's general claim held only for a subgroup in the paper's own table. Ask the author for paywalled sources; each one supplied tended to change a sentence.
[LEARN:sources] Fill reference fields from the publisher's record, never from memory, and check that each entry resolves to the article the text means: one library entry resolved to a different article and was dropped, and a database cover sheet carried a wrong page range.
[LEARN:sources] A sentence said some data did not exist; the publisher had them, and the project had downloaded only one series. Check the publisher's catalogue before writing that data are unavailable.
[LEARN:sources] Compression rounds grind off qualifiers and drop references with their verified sentences. Rerun the source-fidelity pass after any compression, and keep a literature library (one verified sentence per reference, an in-use marker) to restore cut studies from. Title-validate every fetched abstract against its entry: a title-search fallback returned the wrong paper for several references. Rule: writing standard C14.
[LEARN:citations] Every document that circulates on its own needs an entry for each work it cites and a citation for each entry. Cuts orphan entries, and a rewrite can drop the only prose citation of a reference. Gate cited <-> entry per document.
[LEARN:citations] Every pointer to a note or appendix must resolve to a label, a citation or an entry. One pointed at a technical note by a title used nowhere else.
[LEARN:numbers] A number can be right and its description wrong: a table note described a different universe from the one the number was computed on; a total covered all units, not the estimation sample; a median was quoted over pairs that included the reference group. Check the population behind every quoted statistic.
[LEARN:numbers] Every sentence about a result must point to an estimate that was actually run. One sentence described a first stage at a horizon the script never estimated.

## Reproducibility

[LEARN:repro] Inertness proof before trusting a change: with the new switch off, the pipeline must rebuild the old outputs byte for byte. Then every later difference is the change, not a bug. Rebuild twice to show the new outputs are stable.
[LEARN:repro] One driver per output family; every switch that family needs is set in the driver. Stage scripts stop with an error when run without a driver instead of falling back to standalone defaults that point at retired settings.
[LEARN:repro] Pin a seed on every bootstrap call. Without one, a bootstrap consumes the current RNG state, so adding a bootstrap earlier in a script silently moves every p value after it.
[LEARN:repro] Pin the sort seed too (`.claude/rules/stata-code-conventions.md`). Without it, sorts with ties made rebuilt files differ in the last floating-point digits, which defeats a byte-for-byte comparison.
[LEARN:repro] Store generated outcomes as double. A lead stored as float made a horizon-zero estimate match the main table only to the seventh digit.
[LEARN:repro] Stage scripts that hardcode their build directory cannot be repointed by a driver. Take every path from the driver or one setup file, and prove the fix inert on existing outputs.
[LEARN:repro] A stage that sets its output folder to the published one overwrites published outputs on a diagnostic rerun. Make the output path overridable, point diagnostic reruns at scratch, and compare against a backup.
[LEARN:repro] Regenerate in a sandbox first, back up the official outputs, then regenerate them; afterwards confirm the raw files are byte-unchanged and record the tolerance the author accepted.
[LEARN:repro] Raw data are read-only. Exploration scripts write new files under new names and never overwrite a published output.
[LEARN:repro] Each stage confirms its output file exists and aborts otherwise.
[LEARN:repro] No table cell or figure value is typed. Generators turn output files into table fragments marked "do not edit by hand". A failing text gate means the text or the outputs are stale: fix the text, or rerun the layer that feeds it; never type a generated table value by hand.
[LEARN:repro] An exhibit or a published value with no surviving generator -> write a read-only regenerator and prove it reproduces every committed value exactly before pointing it at new data or gating it.
[LEARN:repro] A code comment saying a step was skipped "for cost" may never have been tested. Time it; one such claim fell to seconds.
[LEARN:repro] The first step, from the raw files as the publisher distributes them to the analysis format, needs its own script too. Verify it reproduces the files the analysis was built on, variable by variable.
[LEARN:repro] On a case-insensitive disk (macOS), a folder on disk as `Figures` while every reference said `figures/` was committed with the capital: plain `git add` and shell globs record the on-disk case, and case-sensitive clones broke. Before shipping a repository or a package, list tracked paths that differ only in case (`git ls-files | sort -f | uniq -di`) and check every referenced path against `git ls-files` with its case.
[LEARN:repro] Before a package ships: run it end to end in a clean folder, compare every output against stored checksums, and vendor the package versions you ran (the public archive may now serve later ones).
[LEARN:repro] Vendored package versions apply only when the driver puts their folder first on the package search path. Run any other way, the scripts use whatever versions the system holds; run through the driver.
[LEARN:empirics] A printed star whose bootstrap p lies within a few Monte Carlo standard deviations of a threshold: recompute with many more draws and two seeds before trusting the star.
[LEARN:empirics] Absorbing unit dummies explicitly (Stata `areg, absorb()`) counts them in the residual degrees of freedom; `xtreg, fe` does not and reports a larger first-stage F. Record which one a table prints; post both when a reader may re-derive it.
[LEARN:empirics] Year fixed effects absorb any series that is constant within a year, such as a national price deflator. Changing it moves only the columns without year effects.
[LEARN:empirics] An instrument must be built on the same population base as the variable it instruments. If the endogenous index drops a reference group, its instrument drops it too; check each instrument's within-unit correlation with each endogenous variable before trusting a joint first stage. A weak or failed first stage can be a construction bug, not a data limitation: check how each instrument is built before concluding the data cannot identify the parameter.
[LEARN:empirics] A confidence set computed on a grid (a weak-instrument-robust set, say) printed the grid's edges as infinity when the grid was too narrow. Check that no set touches the grid edge; widen the grid until none does.
[LEARN:empirics] Before changing a specification, run a read-only diagnostic into its own output folder and show the author what moves (signs, stars, first-stage strength). The author then chooses.
[LEARN:data] A series that jumps at a wave boundary may be a recording change (rounding base, a sentinel such as "1 means rounded to zero", top-codes), not an economic one. Count distinct values per wave and read the file's user guide before interpreting it.
[LEARN:data] Category membership can change across waves (the files moved codes from one category to another), and a "not available" code can appear from one wave on. Check both wave by wave: merge categories whose membership moves, and decide explicitly how the unavailable code is counted.

## LaTeX, CJK, latexdiff and figures

[LEARN:latex] On macOS a CJK fontset that names a downloadable font opens a "needs to download the font" dialog and the build waits. Clicking Download did not fix it. Fix: a project-local copy of the fontset `.def` that maps the font to an installed one (`scripts/tools/ctex_macold_fontfix.py` writes it from the installed ctex); TeX reads the current directory first.
[LEARN:latex] macOS has no `timeout`. Wrap long builds in `perl -e 'alarm N; exec @ARGV' xelatex ...` so a stall fails fast.
[LEARN:latex] A low disk can make macOS purge downloadable fonts; CJK builds then fail with `nullfont` errors or hang. Re-download in Font Book and keep free space.
[LEARN:latex] A killed build leaves a half-written log and the OLD PDF. An error count of zero and a sane page count prove nothing; check the PDF's modification time and that the log is complete.
[LEARN:latex] A lengthened sentence makes a longer CJK mirror and can push it into an Overfull box. Build both languages after every edit and count Overfull, not only errors.
[LEARN:latex] A combined build aborted on an author name with a diacritic. Write author names in one ASCII convention across all bibliographies.
[LEARN:latex] Point at sections and appendices by name (writing standard S10, PT1). Where a number is printed (a table, a figure, an equation), produce it with `\ref`, never a typed number: a typed appendix number was caught in review, and literal pointers dangled after the passage they named was cut.
[LEARN:latexdiff] CJK redlines need `--type=CFONT`. `--type=UNDERLINE` boxes do not break CJK lines and overflow the margin. Check `grep -c Overfull` on every redline log.
[LEARN:figures] A label-placement loop that runs out of candidate offsets falls back silently to the default spot: labels overlapped, and some sat next to the wrong point. Look at the rendered figure; pin the labels the text names, with leader lines.
[LEARN:builds] A combined-document build should refuse to finish unless every verification passes. Another builder turned out not to parse at all (a missing comma) and carried stale entries; rebuild every derived document in every round.

## Word (.docx)

[LEARN:docx] No pandoc or python-docx -> edit by unpack, change `word/document.xml`, repack with `zip -X` (`[Content_Types].xml` first), or convert HTML with LibreOffice naming the Word filter: `--convert-to "docx:MS Word 2007 XML"`. The bare `docx` target fails with "no export filter".
[LEARN:docx] Never round-trip a document with equations through Google Docs: it destroys display equations and under-braces. Edit in Word; recover from the last Word-saved version.
[LEARN:docx] Before writing: check the file is not open in Word, re-unpack from disk (the author edits between rounds), back up, and prefer writing a new version file.
[LEARN:docx] Word splits runs when it re-saves. Rebuild a replaced paragraph as one run and assert one `<w:t>` and the exact text; a regex over every `<w:t>` multiplied a paragraph fivefold while every structural check passed.
[LEARN:docx] Accept tracked changes in this order: strip `pPrChange`/`rPrChange` with balanced matching first, then drop `<w:del>`, then unwrap `<w:ins>`.
[LEARN:docx] The final check is the rendered PDF and its page count, after `pkill -f soffice` (LibreOffice caches renders). Also: a plain-text diff, `xmllint --noout`, counts of equation and change elements, and any backslash left in the tag-stripped XML.
[LEARN:docx] Every deliverable has to be in the generator's job list. A document missing from the list never had an edit reach its Word copy.
[LEARN:docx] Files can vanish from the drafts folder between rounds. Re-list it before every round and keep unpacked build trees until the round is closed.

## Writing (any paper)

[LEARN:writing] The writing rules (no "effect" for your own reduced-form estimates, IV framed by the bias it addresses with OLS beside it, a framework section that opens inside the model, narrative and parenthetical citations both correct) are in `docs/writing/` and `.claude/rules/empirical-results-writing.md`. Read them before drafting; do not restate them here.

## Project records

[LEARN:records] A tracker row that appends "Previously: ..." every round grows without bound (one project's instructions file reached about 300 KB and had to be grepped, not read). Keep the current status and a link to the round's landing record; history lives in the reports folder.
[LEARN:records] Memory can record a fix that did not work. Write down the outcome of every attempted fix, and correct every copy of the note when a later attempt contradicts it.
[LEARN:records] Empty plans, specs and session-log folders mean the rules are not being followed. A Stop hook catches a missing session log; plan-first needs its own habit.
