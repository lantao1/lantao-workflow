# Lessons

What went wrong in past projects, why, and what now prevents it. Each lesson reads **symptom -> cause -> fix -> prevention**. The one-line versions are in [MEMORY.md](../MEMORY.md). The standing rules for agents (comments first, sweep after every correction, refuters see the instruction, proposals are not text) are in [WORKING_METHOD.md](WORKING_METHOD.md); this file tells the stories behind some of them and does not repeat the rules.

Contents

1. LaTeX with CJK fonts on macOS
2. latexdiff on CJK text
3. Word documents without pandoc or python-docx
4. Gate pitfalls
5. Reproducibility
6. Editing incidents
7. Disk and filesystem
8. Project records
9. Sources, citations and numbers
10. Figures and combined builds

---

## 1. LaTeX with CJK fonts on macOS

### 1.1 The font download dialog that never goes away

- **Symptom.** Every `xelatex` run of a Chinese document opened the macOS dialog "texbin needs to download the font STHeiti" and the build waited on it. Clicking Download installed nothing; the dialog came back on the next run.
- **Cause.** ctex's `macold` fontset uses STHeiti for bold CJK and `\heiti`. On recent macOS that font is a downloadable asset, not an installed file, so every process asks for it.
- **Fix.** A project-local copy of ctex's `ctex-fontset-macold.def` with STHeiti replaced by an installed face (`STHeitiSC-Medium`, from `/System/Library/Fonts/STHeiti Medium.ttc`). TeX reads the current directory first, so every build whose working directory holds the copy picks it up. Builds then finished in seconds with no dialog; the only visible change was medium instead of light headings. `scripts/tools/ctex_macold_fontfix.py` writes this copy from the ctex installed on the machine (`kpsewhich` finds it), so the modified file is generated locally and never redistributed.
- **Prevention.** Keep the `.def` beside every CJK build root. One copy covers every build whose working directory holds it, including a combined build or a redline compiled from there with `-output-directory`. A build run from any other working directory needs its own copy. Two earlier notes recorded fixes that did not work ("a CoreText re-match fixes it", "Download once fixes it"); see 8.2.

### 1.2 Low disk purges the downloadable fonts

- **Symptom.** CJK builds that had worked stopped with `Cannot use \XeTeXOTfeaturetag with nullfont`, or hung.
- **Cause.** The disk had filled (see 7.1). macOS then purged its downloadable font assets: the font asset folders under `/System/Library/AssetsV2/com_apple_MobileAsset_Font*` held no font files.
- **Fix.** Re-download the fonts in Font Book, then rebuild.
- **Prevention.** Keep free space. Diagnose with `find /System/Library/AssetsV2/com_apple_MobileAsset_Font8 -iname '*.tt*'` and `fc-match -f '%{file}' <FontName>`.

### 1.3 A zero error count on a build that never ran

- **Symptom.** A build reported 0 errors and the expected page count, but the PDF held the old text.
- **Cause.** The build was killed by its timeout. A killed run leaves a half-written log and the previous PDF on disk. Grepping that log for `^!` finds nothing, and `pdfinfo` reads the old PDF.
- **Fix.** Rebuild after fixing the stall.
- **Prevention.** After every build, check the PDF's modification time against the build start and check that the log is complete, not only the error count. Wrap builds in `perl -e 'alarm N; exec @ARGV' xelatex ...` (macOS has no `timeout`) so a stall fails fast instead of hanging.

### 1.4 Builds inside background agents

- **Symptom.** A CJK build hung inside a workflow agent while the same file built cleanly in the main session.
- **Likely cause.** Fonts were installed, so the build was not missing them. The font download dialog of 1.1, which each xelatex process raised at that time, waits on a window nobody in a background agent can see.
- **Prevention.** Run builds that can open a dialog in the main session, always under a timeout, and keep the font fix (1.1) in place so no dialog is ever raised.

### 1.5 A longer sentence overflows in the CJK version

- **Symptom.** After a topic sentence was lengthened, the English built clean and the Chinese version had a new Overfull box. It happened twice in the same way.
- **Cause.** The new sentence stated a verdict where the old one announced a topic, and a verdict takes more characters; the CJK mirror grew with it.
- **Fix.** Trim the CJK sentence in the same round.
- **Prevention.** Build both languages after every edit and count `Overfull` in each log, not only errors.

---

## 2. latexdiff on CJK text

- **Symptom.** Chinese redlines ran past the right margin, with many Overfull boxes per document (up to a few dozen). English redlines of the same edits were fine.
- **Cause.** `latexdiff --type=UNDERLINE` puts added and deleted text inside `ulem` boxes, and those boxes do not break CJK lines.
- **Fix.** `latexdiff --type=CFONT` (colour and font change, no `ulem`) breaks normally; every Chinese redline then built with 0 Overfull.
- **Prevention.**
  - Use CFONT for CJK, UNDERLINE is fine for English.
  - When a table changes its column count, add `--config="PICTUREENV=(?:picture|DIFnomarkup|tabular)[\w\d*@]*"` so the table is shown whole instead of diffed cell by cell.
  - A fragment pulled in by `\input` (an abstract, say) has no preamble: wrap the old and new versions in the same minimal document before diffing.
  - Compile with `-output-directory` and the fontset copy from 1.1 beside the redline.
  - Run `grep -c Overfull` on every redline log, not only the error count.

---

## 3. Word documents without pandoc or python-docx

### 3.1 The conversion path, and the step that was done by hand

- **Symptom.** A corrected chapter nearly went to the supervisor beside a Word copy that still carried the old sentences. In a second case, no edit to one chapter had ever reached its Word copy.
- **Cause.** The LaTeX-to-Word generator wrote only HTML; the HTML-to-docx step was run by hand and was skipped. Separately, one chapter had never been added to the generator's job list.
- **Fix.** The conversion is now inside the script: `soffice --headless --convert-to "docx:MS Word 2007 XML" --outdir <dir> <file>.html`. The bare `--convert-to docx` form fails with "no export filter" on current LibreOffice; the Word filter has to be named. The script then checks the output's modification time and stops if soffice did not rewrite the file.
- **Prevention.** Every deliverable goes through one script, and every document is in its job list. Check the content of the Word copy (a text diff against the source), not only that the source was corrected.

### 3.2 Google Docs destroys equations

- **Symptom.** After a round trip through Google Docs, display equations had become centred inline math and labelled under-braces had turned into bare brace characters.
- **Cause.** The Google Docs export drops OMML structures (`m:oMathPara`, `m:groupChr`, `m:limLow`). Fingerprints of such an export: embedded Roboto, Cardo and Cambria Math fonts (the file grows many times over), hundreds of `w:rsidR="00000000"`, no `docProps/core.xml` or `app.xml`.
- **Fix.** Rebuild from the last version saved by Word and carry the prose edits across as text.
- **Prevention.** Edit Word files in Word only.

### 3.3 Editing the XML directly

- Unpack, edit `word/document.xml`, repack with `zip -X`, `[Content_Types].xml` first.
- **Before any write**: check the file is not open in Word (`~$` lock files, `pgrep "Microsoft Word"`); re-unpack from disk, because the author edits between rounds; back up; prefer a new version file over overwriting.
- **Run splitting.** *Symptom*: a paragraph replacement made a short chapter about four times as long; `xmllint`, `unzip -t` and every paragraph-count assertion passed, and only the page count of the rendered PDF showed it. *Cause*: Word had re-saved the file and inserted `<w:proofErr>` markers that split each paragraph into many runs, and a regex filled every `<w:t>` with the full paragraph text. *Fix*: rebuild a replaced paragraph as one run (keep the paragraph attributes, its `<w:pPr>`, the first run's opening tag and `<w:rPr>`, then one `<w:t xml:space="preserve">`). *Prevention*: assert one `<w:t>` in the result and that the round-tripped text equals the intended text, then re-read the packed file and compare every paragraph.
- **Font size leak.** The same re-save applied `<w:sz w:val="32"/>` (16 pt) to the whole body, and the next version built from it inherited the size. Detect with `Counter(re.findall(r'<w:sz w:val="(\d+)"/>', xml))`: a body that uses the style default has no `w:sz` at all. When a page count jumps, re-render the previous version too; if it now renders differently, Word touched it, not you. Take templates from the last version Word has not opened.
- **Several `<w:t>` in one run.** Run merging and `<w:lastRenderedPageBreak/>` create them; reading only the first one silently dropped a whole paragraph.

### 3.4 Accepting tracked changes

LibreOffice's headless accept-changes route failed silently on these files. At the XML level the order matters:

1. strip `pPrChange` and `rPrChange` with **balanced** matching while the document is still valid (`pPrChange` nests a `<w:pPr>` inside itself);
2. drop the `<w:del>` blocks;
3. unwrap the `<w:ins>` blocks.

In the reverse order the closing tags are orphaned.

### 3.5 Equations in a Chinese-locale Word

Do not use `m:d` separator commas (`m:sepChr`): they render as a raised odd mark in a Chinese-locale Word. Use one `m:e` with explicit comma runs. Remove empty equation shells (`<m:oMath></m:oMath>`); they render as boxes.

### 3.6 Verification checklist for every docx

- a plain-text diff before and after, not eyeballing;
- `xmllint --noout` on the XML;
- counts of `oMathPara`, `groupChr`, `limLow`, `w:ins`, `w:del`, `m:sepChr` and empty shells;
- a residue check that counts **any** backslash in the tag-stripped XML. A letters-only pattern (`\\[A-Za-z]+`) read 0 while the bibliography printed a literal `\1` in place of every DOI, because "1" is not a letter;
- a text diff against the previous build, so a fix is shown to change only what it meant to;
- a rendered PDF and its page count, after `pkill -f soffice` (LibreOffice caches renders, and a stale render looks like a broken file).

### 3.7 Files that disappear

Version files vanished from the drafts folder between rounds more than once, even after the previous round had confirmed they were there. Re-list the folder before every round. Keep the packed files and unpacked trees of the round in the scratchpad until it closes; a missing `.docx` can be rebuilt from its unpacked tree with `zip -X`. Scratchpads are session-specific, so do not count on them across sessions.

---

## 4. Gate pitfalls

A gate is a script that checks the text against the outputs or the rules. These are the ways gates have passed while the text was wrong.

### 4.1 Substring tests

- **Symptom.** A number in the text was changed and the gate stayed green.
- **Cause.** The check was `value in text`. A bare `'12' in text` also passes on "2012", and short numbers occur inside other numbers on any page of results.
- **Fix and prevention.** Bind the gate to the whole sentence in each language, or match the number with boundaries. Self-test by changing the digit and watching the gate go red (4.9). That self-test is how this one was found.

### 4.2 Passing on a coincidence

- **Symptom.** A sentence moved to a table note and its gate stayed green.
- **Cause.** The gated phrase ("about X percent") also named a different quantity elsewhere on the page.
- **Fix and prevention.** Bind the gate to the sentence that makes the claim and to the quantities it is computed from, not to a value that can appear twice.

### 4.3 Gates that read the wrong file

- A banned-word audit defaulted to a file version two drafts old, so a run with its defaults checked a retired version instead of the live file.
- An outline gate opened the live files by absolute path wherever it ran, so a perturbation in a mirror never turned it red and a run from a worktree checked the main checkout. It also printed mismatches without a non-zero exit, so any wrapper keyed on exit codes saw success.
- **Prevention.** Resolve every file from the gate's own checkout, never from an absolute path or a version default. Exit non-zero on any failure. When a document gets a new version, repoint every gate in the same step.

### 4.4 Gates with blind spots

Each of these was found only after something slipped through:

- **Generated fragments.** The reconciler did not follow `\input{}` and was blind to every number in a generated table.
- **Re-wrapping.** Phrase checks went red because LaTeX reflow had put a line break inside a sentence. Normalising whitespace fixed it and made absence checks stricter.
- **Duplicates.** Three sentences pasted twice in a paragraph, in both languages, passed every number gate: a gate checks that a number is present, not that it is present once. Gate the occurrence count where duplication matters.
- **Transpositions.** A check comparing the multiset of digits between the English and Chinese versions passed while two numbers were swapped between prose and table, because a swap cancels. An ordered-sequence check now catches it.
- **Digit-free text.** The same check passed a translation missing whole paragraphs and two topic sentences, because those sentences carried no digit. A sentence-by-sentence alignment of the two languages found it.
- **Bibliographies.** The same check counts the digits in reference lists (DOIs, issue numbers, page ranges), so a translated document must carry exactly the same digits there. A glossary agent caught this before translation began. Copy the reference block byte for byte, or strip reference lists before comparing (`scripts/gates/mirror_digit_fidelity.py --strip-refs`). A layout fix that carries a digit, such as a length in `\enlargethispage`, also trips it; the first attempt at one did, so write such fixes without digits.
- **Structure.** An audit discarded everything before the first `\section`, so every chapter preamble went unchecked for many rounds. Another skipped `\noindent` paragraphs. A footnote hanging on a sentence swallowed the next sentences until footnotes were stripped with brace matching.

### 4.5 Gate scope

- **Symptom.** A banned word survived in two topic sentences for some rounds; a retired term survived in a translation.
- **Cause.** The scans were run by hand, file by file, and some files were never in the list. One phrase gate had been scoped to two files while a third carried the phrase.
- **Prevention.** Run every scan over every live file from one command. When a new file or language joins the project, add it to every gate in the same step.

### 4.6 Tools and agents that retarget gates

- **Other tools.** Another tool, editing the same working tree at the author's request, rewrote more than a dozen gates so its own wording passed: it required a clause the author had barred and required the absence of an approved sentence. Every gate was green while the rulings they guarded were broken.
- **Rewrite drafters.** A drafter silently dropped two approved sentences, and the agents retargeting gates then bound the drifted text as required, so the gates certified the drop. It was caught only because two other groups compared against the pre-rewrite text.
- **Parallel groups.** When several agent groups retarget gates at once, conflicts appear only after the merge (one group requires what another bars).
- **Rule.** See [WORKING_METHOD.md](WORKING_METHOD.md) section 6 ("Retargeting after a landing", "Other tools retarget gates") and section 8, items 10 and 16.

### 4.7 Stale values that only a retired output family explains

- **Symptom.** After the outputs were rebuilt, the reconciler was fully green while several printed values still came from the old outputs.
- **Cause.** A reconciler checks only the numbers someone wrote a gate for.
- **Fix.** A stale-value checker compares every number in the live text against both the old and the new outputs and reports any value that only the retired outputs explain.
- **Prevention.** Run it after every rebuild. It has one known limit: at low printed precision both families can explain the same value, so a stale range passed it. Bind such values to their source by name.

### 4.8 Finding which gates depend on a passage

Before deleting or moving a passage, blank it in a mirror and run every gate. A grep for the passage's numbers found only half of the gates that depended on it.

### 4.9 How to self-test a gate

The procedure is in [WORKING_METHOD.md](WORKING_METHOD.md) section 6 ("A gate that has never been seen red is not a gate"), with `scripts/gates/gate_selftest.py`. The stories behind its parts: 4.1 (a substring gate found only by a self-test), 7.1 (mirrors that filled the disk), 7.2 (a symlinked data directory that writes through).

### 4.10 Scan what the reader sees

A sweep for prose that sounds like a manual or a codebook was run on the rendered PDFs, not on the `.tex` sources: the reader reads the PDF, and in the source the LaTeX markup drowns the signal. The lexical scan came back clean; a read for the one class no scan catches (prose narrating the author's own work steps) found the remaining cases. Run lexical scans on the extracted PDF text, then read for what a word list cannot see.

### 4.11 Files a gate reads must ship with the repository

Diagnostic outputs lived in a gitignored folder. When a regenerator was written for values a gate checks, its output went to a tracked folder on purpose, because a fresh clone has to be able to run every gate. Keep every gate input tracked, and run the whole package once from a clean folder (5.7).

### 4.12 Stars that follow a different p value from the one the note names

- **Symptom.** A table note said significance followed the wild cluster bootstrap, and the stars did not.
- **Cause.** The bootstrap p values had been computed, but the table generator still took the stars from the clustered p values. The note was false while every number on the page was right.
- **Fix.** The generator took the stars from the bootstrap p, and a gate now requires every printed star string to equal the stars of that p value and bars any other star string.
- **Prevention.** When a note says which p value the stars follow, gate every printed star against that p value.

---

## 5. Reproducibility

### 5.1 The inertness proof

When a change is added as a switch, run the pipeline with the switch off and confirm it rebuilds the previous outputs **byte for byte**, from raw data if possible. Only then is every later difference the change and not a bug. Then build the new outputs twice and confirm the two builds are identical. Fixes that should not move results (a path fix, an added output column) were proved this way on the existing outputs before they were trusted.

### 5.2 One driver, no standalone defaults

- **Symptom.** Stage scripts run on their own fell back to defaults that pointed at retired settings (an old output folder, an old control set, unseeded bootstraps).
- **Fix.** One driver per output family sets every switch the family needs. Stage scripts that need a driver stop with an error when run without one.
- **Prevention.** Paths come from one setup file or the driver. Each stage confirms that its output file exists and aborts otherwise. Raw data are read-only, and exploratory scripts write new files under new names.

### 5.3 Seeds and the RNG state

- **Symptom.** A rerun moved every bootstrap p value in one section although that section's code was untouched.
- **Cause.** Without a seed, the bootstrap command consumes the current RNG state, so a bootstrap added earlier in the script shifted every draw after it.
- **Fix.** Every bootstrap call carries its own seed; every estimating script sets `set seed` and `set sortseed`.
- **Prevention.** With seeds pinned, a p value depends only on the data and the number of replications, not on execution order. Without `set sortseed`, sorts with ties left rebuilt files different in the last floating-point digits, which defeats a byte-for-byte comparison.

### 5.4 Hardcoded build directories

Several estimation scripts hardcoded their build directory, so a driver could not point them at a new build. The fix took every path from the driver and was proved inert on the existing outputs.

### 5.5 Storage precision

A lead outcome stored as `float` made the horizon-zero estimate match the main table only to about the seventh digit. Stored as `double` it matched exactly, and no printed digit moved. Generate outcomes as `double`.

### 5.6 Exhibits with no generator, and cost claims nobody tested

- Some tables and a figure turned out to have no generating script; the tables had been built by hand. Before pointing a new generator at new data, prove that it reproduces the committed exhibit exactly.
- A comment said a bootstrap had been skipped "for cost". Nobody had timed it; it took seconds. Time a claimed cost before accepting it.

### 5.7 Shipping a replication package

- One command runs from the raw files to every output and compares each output against stored checksums.
- Run it end to end in a clean folder before it ships.
- Vendor the package versions you actually ran: the public archive may already serve later ones.
- Every exhibit needs its generating code in the package, including figures in technical notes.

### 5.8 A recorded value is not always the value

- **Symptom.** A mean series dipped at one wave and looked like a real fall.
- **Cause.** From that wave the public files rounded the variable to a coarser base and coded values that would round to zero as 1, whose log is 0. A spike of such records pulled the mean down. The distinct-value count of the variable collapsed at the same wave.
- **Fix.** A threshold applied on the recorded value, balanced across the break, defined once in one file and used by every stage; then the inertness proof (5.1).
- **Prevention.** When a series jumps at a wave boundary, count distinct values per wave and read the user guide's notes on rounding, sentinels and top-codes before interpreting it.

### 5.9 An instrument must match the variable it instruments

A first stage failed (the two instruments loaded on the same dimension, so the rank condition failed) because one instrument was built on the whole population while the variable it instrumented was defined after dropping a reference group. Rebuilt on the same base as its variable, the instrument identified it. Build each instrument on the same population base as its endogenous variable, and check every instrument's within-unit correlation with every endogenous variable before trusting a joint first stage. The failure was a construction bug, not a data limitation: when a first stage is weak or fails, check how each instrument is built before concluding that the data cannot identify the parameter.

### 5.10 Diagnostic reruns and regeneration

- **A diagnostic rerun that overwrites the published output.** One stage set its output folder to the published family itself, so rerunning it "just to check" rewrote a published file instead of a scratch copy. The recorded workaround was to compare the result against a backup, which works only because the stage is deterministic under pinned seeds. Make every output path overridable from the driver, and point diagnostic reruns at scratch.
- **Sandbox first.** A full regeneration from raw data was run in a sandbox, compared against the published outputs within a stated tolerance, and only then run for real, after the official outputs were backed up. Afterwards the raw files were confirmed byte-unchanged, and the author accepted the tolerance.
- **Values with no surviving generator.** A section of a technical note printed values whose only leftover output files predated a correction and matched none of them; a transposed number had sat there undetected for many rounds. A new read-only regenerator reproduced every value exactly, and only then were the values gated. Treat any printed value without a live generator as unverified.
- **Raw files to analysis format.** No script in the repository had ever done the step from the publisher's raw text files to the analysis format. The replication package added the script and checked that it reproduces the files the analysis used, in every variable and record.
- **A read-only diagnostic before a specification change.** When the author noticed that one level of the analysis carried a control the other did not, a read-only diagnostic in its own output folder showed what would move (signs, stars, first-stage strength) before anything was rebuilt. The author then chose, and the change went in as a switch with an inertness proof (5.1).

### 5.11 Stars near a threshold

A wild-bootstrap p value carries Monte Carlo error. Several printed stars sat within a few Monte Carlo standard deviations of a threshold. They were recomputed with many more draws under two seeds; every one stayed on its side, so the number of draws stayed and no star moved. Do this check for any star that sits close to a threshold before you print it.

### 5.12 Two estimators, two first-stage F statistics

Absorbing unit dummies explicitly (Stata `areg, absorb()`) counts them in the residual degrees of freedom; the within estimator (`xtreg, fe`) does not, and its first-stage F came out larger on the same data. An exploration script had used one and the published table the other. Write down which one a table prints, and when a reader may re-derive the number, post both.

### 5.13 Path case on a case-insensitive disk

- **Symptom.** Newly committed figures were recorded under `Figures/` while every reference said `figures/`, which breaks any clone on a case-sensitive file system.
- **Cause.** The folder on disk was `Figures`. macOS file systems are case-insensitive by default, so local builds resolved either spelling, and plain `git add` and shell globs recorded the on-disk capital in the index.
- **Fix.** The index entries were rewritten to the lower-case path the references use (`git update-index --cacheinfo`).
- **Prevention.** Before shipping a repository or a replication package, list tracked paths that differ only in case (`git ls-files | sort -f | uniq -di`) and check each path the text, the scripts and the build files reference against `git ls-files`, case included. The upstream template itself uses both spellings (`Figures/` in its sync and TikZ scripts, `figures/` in this folder's project template), so check after every copy.

---

## 6. Editing incidents

The rules these led to are in [WORKING_METHOD.md](WORKING_METHOD.md). The stories:

### 6.1 Batch edit scripts that print "ok" and die before writing

Three edit batches applied their replacements in memory, printed "ok" for the first ones, and died on a later assertion before writing the file. The edits looked applied and were lost; only the stale-value scan (4.7) noticed. Write the file after every single replacement, or re-read the file after the batch and check each change landed.

### 6.2 A slice marker that matched twice

A script cut a file at a marker string. The marker also occurred inside a quotation in the file's header comment, so the cut wiped the top of the file. It was rebuilt from the previous version and the session records. Use a marker that occurs exactly once (assert the count), and check the file's head and length after any slice.

### 6.3 Corrections that do not sweep

A false claim was corrected in one chapter and survived in another, at least four times. The worst case was the document's first statement of its own results, still carrying a claim the results chapter had withdrawn. After any correction, search the whole project, in every language version, for the claim you just changed, and gate it as an absence.

### 6.4 Rebuilds that drop an earlier answer

A section was rebuilt on a new outline and silently lost two answers an earlier version had given (a definition a reader had asked for by name, and the reason for a design choice). Both were restored rounds later. When you restructure, diff the section's content against the version before and account for every fact that left.

The check that worked the other way: when a literature review was reorganised and lengthened on the instruction "cut nothing", a mechanical diff of every author-year citation, every number and every reference surname before and after proved that nothing had been lost. Run the same diff after any restructure.

A second check that worked: after two pure restructures (diagnostics moved between appendix sections and set as a table; an appendix split off into its own file), the existing gates were run unchanged and stayed fully green. Run the existing gates, unchanged, immediately after a pure restructure; all green proves no gated number was lost in the move.

### 6.5 A gate that went red on a fix made an hour earlier

A gate written for a restored sentence went red within the hour, when the translation of that sentence was reworded to remove an ambiguity. That is the gate working: retarget it to the new wording and self-test it again (4.9). Compare 4.1, where a deliberate change to a number left a gate green because the gate was a substring test.

---

## 7. Disk and filesystem

### 7.1 Scratch mirrors fill the disk

- **Symptom.** Free space fell from about 30 GB to a few GB in a day; then the fonts disappeared (1.2).
- **Cause.** Every audit and verifier agent built its own mirror of the repository in the scratchpad, some with the large build data copied in, and nothing deleted them. A few rounds left about 32 GB; one audit alone held 40 mirrors and was still growing when it was stopped.
- **Fix.** Delete the mirrors once each round's results are saved in the reports folder.
- **Why it matters.** A full disk can corrupt the repository, the LaTeX and Word builds, and the running workflows.
- **Rule.** See [WORKING_METHOD.md](WORKING_METHOD.md) section 11.

### 7.2 Symlinked mirrors write through

A mirror whose data directory is a symlink is fine for reading. An agent that perturbs data in such a mirror writes into the real repository. The self-test script now refuses to run when that directory is a symlink. Copy the directory before any data perturbation.

### 7.3 Self-referencing symlinks

- **Symptom.** More than forty folders of a project, at the top level and one level down, each held a link to themselves (`figures/figures -> <repo>/figures`).
- **Cause.** A mirror builder's `ln -s <repo>/<dir> <mirror>/<dir>` was evidently run where `<mirror>/<dir>` already existed as a real directory (or with the mirror root equal to the repo root). When the destination is an existing directory, `ln -s` creates the link inside it.
- **Risk.** A recursive walk that follows links (a copy, a size count, a search) can loop.
- **Prevention.** In a mirror builder, assert the mirror root is not the repo root and that each destination does not already exist before linking. After the builder runs, `find <repo> -type l` should list nothing new.

### 7.4 Guarded deletes

The safety check refused scripted deletes written without a guard on their variables. The guarded form is in [WORKING_METHOD.md](WORKING_METHOD.md) section 11.

---

## 8. Project records

### 8.1 Tracker rows that grow without bound

- **Symptom.** The project instructions file grew to about 300 KB. It loads into every session and could no longer be read whole; it had to be grepped.
- **Cause.** Each status row in the tracker table kept the whole previous status as "Previously: ..." every round, so every row carried the history of every round.
- **Rule.** See [WORKING_METHOD.md](WORKING_METHOD.md) section 14.

### 8.2 Memory that records a fix that did not work

Two notes about the font dialog (1.1) recorded fixes that turned out wrong, and the instructions file still carried one of them after the memory note was corrected. Write down the outcome of every attempted fix, mark a note wrong when a later attempt contradicts it, and correct every copy of it.

---

## 9. Sources, citations and numbers

The recipe for a source audit (one verifier per source, full text, refuters, a completeness critic) is in [WORKING_METHOD.md](WORKING_METHOD.md), section 9. These are the failures it was built to catch.

### 9.1 Working-paper numbers under a published citation

- **Symptom.** A comparison with a published study rested on numbers that did not appear in the article the text cited.
- **Cause.** Every number had been taken from the study's working paper. The two versions differed on all of them. One published table was a different regression, with different instruments, and the direction of a comparison the text relied on (instrumented estimate above or below least squares) was reversed between the versions. A second study showed the same pattern: the text printed the working paper's estimate and its claim that a large decline was ruled out, where the published article reports a different estimate and says such a decline is not ruled out.
- **Fix.** Every number re-taken from the published version, and the comparison restated on it.
- **Prevention.** Take numbers from the version you cite. When a note records a number from another study, record which version it came from.

### 9.2 Read the paper, not the abstract

- A sentence reported a study as finding no relationship, while that study's own abstract and results section report a strong one.
- An abstract's general finding held only for one subgroup in the paper's own table.
- The author supplied the paywalled sources an audit could not read, and each one changed a sentence.
- Reference fields were checked against the articles. A database cover sheet printed a wrong page range; the article's own range was right, which also settled a doubt raised in an earlier round.
- Reference entries were expanded from the publishers' records, not written from memory. One entry was dropped because the library's reference line for it resolved to a different article.
- **Prevention.** Fill reference fields from the publisher's record, never from memory, and check that each entry resolves to the article the text means.

### 9.3 "The data do not exist"

- **Symptom.** A topic sentence justified a design choice by saying that finer price indexes were not published.
- **Cause.** The statistical agency publishes them at finer geographic levels. The project had downloaded only the national series.
- **Fix.** The sentence now gives the real reason, what the national series does in the model (it acts as a year effect), and that was verified: with year effects, the estimates on the deflated outcome equal those on the undeflated one.
- **Prevention.** Check the publisher's catalogue before writing that data are unavailable. Absence from your own data folder is not absence. Year fixed effects absorb any series constant within a year (a national deflator, for one), so changing such a series moves only the columns without year effects.

### 9.4 Orphan citations and pointers that resolve nowhere

- Two chapters that circulate as standalone files cited works their own reference lists did not carry. One of them was a study the chapter's whole verdict was set against.
- The author cut several passages and left their reference entries orphaned; the entries were removed and the gate was re-scoped to "cited implies entry".
- A rewrite that removed hedges also removed the only prose citation of a statistic's source, while its entry stayed in the list.
- A pointer named a technical note by a title used nowhere else, with no label, citation or entry behind it.
- **Prevention.** Gate citation and entry both ways in every document that circulates on its own, and require every pointer to resolve.

### 9.5 The number is right, the description is wrong

- A table note described a narrower universe than the one its count was computed on.
- A median was quoted over pairs that included the reference group, while the note's own index excluded it.
- A total for all units was quoted where the estimation sample was meant.
- Shares of one quantity (the instrumented variation) were described as shares of another (the coefficient).
- A draft used the square of a mean where the mean of a square was meant; the gate that recomputed the value from the data caught it.
- **Prevention.** For each quoted statistic, recompute it from the data over the population the sentence names. A gate that computes the value catches more than a gate that compares it with a typed copy.

### 9.6 Sentences about estimates that do not exist

- A sentence described a first stage at a horizon the script never estimated.
- A sentence said a table had no estimate to report while the table printed several; a read-back caught it.
- **Prevention.** For every claim about a result, find the line of code that produced it and the printed cell it describes.

### 9.7 Compression grinds off qualifiers and drops verified sentences

- **Symptom.** After several rounds that shortened a literature review, a full fidelity pass against the sources found qualifiers gone from cited sentences (the kind of word that limits a finding: "slightly", "on average", "for one subgroup"), so the sentences claimed more than the studies. The same rounds had dropped references repeatedly, and when a study was wanted back its sentence had to be rewritten and verified from scratch.
- **Cause.** Each compression treats a qualifier as padding and a reference as optional. Nothing kept the verified wording once a sentence was cut.
- **Fix.** The fidelity pass repaired the qualifiers. A literature library was built from every earlier draft: each reference grouped under the king of the current draft it serves, with one verified paste-ready sentence, the question and the finding, a tag for what it was checked against, and an in-use marker.
- **Pitfall in building it.** Abstracts fetched by a title-search fallback came back for the wrong paper for several references. A string-similarity check between the entry's title and the returned title caught every one; without it the library would have been quietly wrong.
- **Prevention.** Rerun the source-fidelity pass after any compression. Restore a cut study from the library. Title-validate every fetched abstract. Rule: [writing standard](writing/WRITING_STANDARD.md), C14.

---

## 10. Figures and combined builds

### 10.1 Labels that sit on the wrong point

- **Symptom.** In a labelled scatter, the labels of the two points the text named printed on top of each other. In a later round, labels pinned for checking showed that two labels sat next to each other's points and several more were ambiguous.
- **Cause.** The label-placement loop ran out of candidate offsets and fell back silently to the default position.
- **Fix.** More candidate offsets first; later, the labels in doubt were fixed with leader lines, and the other figures were confirmed pixel-identical.
- **Prevention.** Look at every rendered figure at print size, check each label against its point, and pin the labels the text names.

### 10.2 Combined-document builds

- A builder for the whole document (title page, a contents list whose page numbers match the body, continuous page numbers, PDF outline) refuses to finish unless every verification passes. That is the property to copy.
- It hid each chapter's own page number under a white box. A white box hides text on the page but leaves it in the PDF's text layer, where search and copy still find it.
- Another builder turned out not to parse at all (a missing comma) and carried stale entries in its rewrite map. Rebuild every derived document in every round, so a broken builder shows at once.
- A combined build aborted on an author name with a diacritic. Write author names in one ASCII convention across all bibliographies.

### 10.3 Floats and half-empty pages

Forcing floats with `[H]` left half-empty pages. `[!htbp]` with the `placeins` package (to keep floats inside their section) removed them.

### 10.4 Figures in a second language

Each figure a translated document includes was written as a separate file (`<name>_<lang>.png`) with translated axis titles and legends, and the original images were then confirmed byte-identical. Add a language variant as a new file and prove the originals did not change.
