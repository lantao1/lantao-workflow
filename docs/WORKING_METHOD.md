# Working Method: how Lantao works with Claude

This is the operating method behind every round of revision: how the author's comments become
edits, how edits are proposed, approved, landed and checked, and how agents are kept honest.
It was distilled from many months of revision rounds on one long empirical manuscript with an
author, a supervisor and Claude. Nothing of that manuscript is kept here; only the method.

Read with:

- `.claude/rules/working-rules.md`: the always-loaded short form of this file.
- `.claude/rules/plan-first-workflow.md`: plan mode, plans on disk, session recovery.
- `.claude/rules/orchestrator-protocol.md`: fan-out, reduce, judge, loop-until-dry.
- `.claude/rules/session-logging.md`: when to write session logs.
- `docs/writing/WRITING_STANDARD.md` and `docs/writing/EMPIRICAL_RESULTS_WRITING.md`: the prose
  standard every agent reads before it edits.
- `docs/LESSONS.md`: the stories behind several rules below.
- `scripts/gates/`: `claims_gate_template.py` (bind text to outputs), `gate_selftest.py` (break
  what a gate guards in a throwaway mirror and watch it go red), `outline_check.py` (the
  topic-sentence outline equals the document), `prose_audit.py` (banned words, terminology,
  sentence length, stray other-language text), `mirror_digit_fidelity.py` (numbers agree across
  languages), `stale_value_scan.py` (values only a retired run explains).
- `.claude/workflows/` and `docs/workflows/EDIT_WORKFLOWS.md`: the saved multi-agent recipes and
  how to run them.
- Templates: `templates/annotation-intake.md`, `templates/round-proposal.md`,
  `templates/landing-record.md`.

**Terms used below.**

- **Author**: Lantao, who owns the text and makes every decision.
- **Approver**: the person whose approval a document needs (a supervisor, a co-author, an editor).
- **Round**: one cycle from the author's comments to a landed, checked, recorded change. Rounds are
  numbered in sequence (`R<n>`). A follow-up landing inside the same round takes the next letter
  (`R<n>b`, `R<n>c`, ...), whatever it is: an audit's fixes, a retarget, a read-back fix, a ripple.
- **Gate**: a script check that binds the text to its sources (outputs, rulings, the other language).
- **Language mirror**: a second-language version of a document kept in step with the original.
- **Scratch mirror**: a throwaway copy of the repository used to test gates without touching live files.
- **Landing**: writing approved edits into the live files.

Where this file says "both languages", read "and the language mirror, if the document has one"
(section 7). A single-language project skips those steps and keeps the rest.

---

## 1. The round, step by step

This is the 「老规矩」 (the standing rules). Breaking it has cost more rounds than any writing defect.

1. **Intake first.** When the author marks a PDF or writes comments, back up the annotated file
   (copy plus hash) before anything can rebuild over it. Extract every annotation (page, quoted
   text, comment). List every comment one by one: which sentence it points at, what he asks
   for, what you propose. Do this at the start of the turn; extracting the comments a turn late
   was logged as a process failure. No editing until the list exists.
   Template: `templates/annotation-intake.md`.
2. **Each comment is a sample of a defect class, not a work item.** Distil it into a rule, then
   sweep the whole document set (every file, both languages) for that rule. Report the sweep even
   when it finds nothing. Most of the value of every round came from the unmarked instances.
3. **Check standing rulings before proposing** (section 4). Do not re-propose what he has refused.
4. **Draft the proposal**, usually with a small workflow (section 9, recipe A). The proposal shows
   old and new side by side, puts each decision with a recommended option first, lists the sweep
   results and the ripples, and flags NEW CONTENT. Have it checked (facts, rules, a reader) before
   the author sees it. Template: `templates/round-proposal.md`. The chat report is short
   (section 10); the detail lives in the proposal file and the plan file.
5. **Nothing lands before approval.** The author answers in shorthand (for example
   「1 A 2 改」, "1: option A; 2: change it"), so number the questions and letter the options.
6. **Land the approved edits.** For a large round the final edit list comes from a workflow per
   file group (drafter, facts verifier, rulings verifier, finalizer; section 9, recipe A); the main
   thread reads every sentence before it lands. Copy every file you will touch into `before/`
   first, including the gate scripts. Apply with a script that requires a unique match per edit
   and writes the file after every replacement. Then scan the edited files for proposal vocabulary
   and diff every sentence against `before/` (section 8, failures 1, 8 and 10).
7. **Run every gate**, not only the ones you expect the edit to touch. Retarget the checks the
   landing turned red, add new ones, audit for loosening, self-test in a scratch mirror
   (section 6).
8. **Build and verify.** Compile every edited file (twice) to 0 errors, 0 overfull boxes,
   0 unresolved references; check the output's modification time and that the log is complete;
   rebuild derived formats (Word copies, a combined build of the whole document) and check them
   for residue; build redlines of
   every edited file against `before/`.
9. **Read back.** Fresh read-only readers, given the author's comments, read the landed text in
   both languages. Fix what they confirm, and gate the fixes.
10. **Record.** Write the landing record (`templates/landing-record.md`), update the tracker row,
    mark the plan COMPLETED with a pointer to the record, add to the approver's change list if an
    approved document changed. State **NOT COMMITTED**.
11. **Clean up.** Delete the round's scratch mirrors once its results are saved (section 11).

Answering each comment by adding a sentence or a number accretes. After several rounds the text
becomes a pile of answers with connectives asserting a logic that was never built. When the
author says the whole thing is confused, stop patching: study the model papers he points at,
diagnose the root causes, and propose an outline with sample paragraphs and decisions before
rewriting (recipe E).

---

## 2. Only the author's meaning

The approver's prescription for using AI on the author's writing, generalised:

1. **Paste the instruction verbatim.** When the approver gives a writing instruction, the agent
   prompt carries it in the approver's own words. The project's style rules may go beside it,
   never in place of it.
2. **Edit his sentences; do not write his argument.** No new sentences, facts, claims, numbers or
   citations he did not write. If a repair needs something new, mark it **NEW CONTENT** on its own
   line and let him decide.
3. **Restoring text he cut is flagged, never silent.**
4. **Make his check possible.** List what changed and anything that goes beyond the source.
5. **Work section by section** when that is what the approver asked for, not document-wide.
6. **An agent never overrides an explicit instruction.** In one round an agent put back a sentence
   the approver had struck by hand, arguing the struck term was the more exact one. The
   instruction stood.
7. **Nothing goes to a busy approver until it is right.** If the approver has had to repeat an
   instruction, the next draft is judged on whether it was heard, so send nothing until it shows
   that.

Two modes when the approver returns marked edits on a draft:

- **Incorporation**: apply only the approver's marked insertions and deletions. Fix only typos,
  spacing and rendering debris unilaterally. Never delete content the approver kept; an echo the
  new wording creates is flagged and asked about, then cut.
- **Delegated finalization** ("you fix it", "finalize the section"): the full standard applies to
  the approver's own wording too, but report every sentence of theirs you delete, for veto.

A proposed topic sentence that is longer or has more clauses than the approved one is wrong; put
the missing purpose in the body under the old one. When a passage has failed the author twice
(two rounds of 「看不懂」, "I can't follow this"), propose deleting it rather than writing a third
version. Slogan: 「说不清宁愿不说」 (if it cannot be said clearly, do not say it). The rules
themselves live in `.claude/rules/writing-standard.md` (K6, P10).

---

## 3. The approved model becomes the standard

- When the approver signs off on a section, that section is the model for every other one.
  Consolidate its rules (the approver's rules, the topic-sentence rules, register, placement,
  numbers, gates, failure modes) into **one standard file** and hand it to every agent before it
  edits anything.
- If the approver points at a model article (sometimes the approver's own), the shape of that
  article is part of the standard. Study how it writes the section before rewriting yours.
- An approved document can still change, but each change is marked "APPROVED, the approver must
  see it" in the tracker and gets a numbered item in a running change list addressed to the
  approver.
- When the author adds a new class of rule (for example how coefficients are read), it goes into
  the standard in the same round, with examples taken from the landed text.

---

## 4. Standing rulings

- Before proposing, check the tracker, the memory files, the standard and recent landing records
  for his rulings. Re-proposing something he refused costs a round and his patience.
- Every verifier or refuter gets two things: the standing rulings, so a finding cannot reopen
  something settled, **and** the new comments. A refuter given only the old rulings refuted the
  author's new comments with his old approvals.
- When a new instruction reverses an earlier ruling, the newer instruction wins. Record the
  reversal explicitly ("ruling reversed by the author on <date>, gate changed from required to
  barred") so it is not mistaken for a loosened gate.

---

## 5. Ripples

- A change that touches another file (another section, the abstract, the outline, an approved
  document) is **listed, not applied**. The author rules on it, often in a follow-up round
  ("bring X in step with Y").
- After any correction, search the whole document set, in both languages, for the claim you just
  changed. A correction that lands in one file and does not sweep happened at least four times.
- Ripples are listed at the end of the proposal and again in the landing record, with what is
  still open.

---

## 6. Gates as a discipline

A gate proves only what it binds. Green means "the bound sentences and values are present", not
"the analysis is right".

**What to bind.**

- Bind a gate to the **whole sentence** in each language, not to a bare value. A substring test for
  `14` also passes on `0.140` and on `214`. A value can also pass on a coincidence when the same
  number appears elsewhere or names a different thing.
- Bind numbers to the **output file** that produced them (a CSV row, a column, a p value band), not
  to a typed copy. Then a data change turns the gate red.
- A printed number equals its output **at the printed precision**. For numbers printed in the text
  this rule governs; the tolerance table in `.claude/rules/replication-protocol.md` (for example,
  estimates within 0.01) applies only to replicating another paper's numbers.
- Retired wording gets an **absence** check, in every file and every language, including its
  obvious variants (synonyms, reordered phrases, a different number of decimals).
- A presence check cannot see a sentence pasted twice. Where saying it once matters (a topic
  sentence, a limitation, a number read once), gate the occurrence count.
- Structure can be gated too: a topic-sentence outline file that must match the document, a
  paragraph or note held "closed" (no sentence may be inserted), an order of sentences.
- `scripts/gates/claims_gate_template.py` gives the sentence, number, count and absence checks;
  write one gate file per project on top of it.

**A gate that has never been seen red is not a gate.**

- Self-test every new or retargeted check: break what it guards, confirm red, restore, confirm
  green. Test each language separately; an English phrase never matches the other language.
- Self-test in a **scratch mirror**, never on the live files. Use `scripts/gates/gate_selftest.py`:
  it copies only the files the gates read into a temporary mirror, never symlinks, refuses a gate
  command that names the live tree by absolute path, and reads each gate's exit code as its
  verdict. A hand-built mirror for a larger audit may symlink heavy folders (outputs, data) only
  when no perturbation writes them. A perturbation counts as red when at least one check fails,
  and it must apply exactly once (a replacement that matches nothing, or matches a comment too,
  tests nothing). At the end, compare
  every touched mirror file with its original by hash, and confirm the live files were not
  touched. Useful perturbations: the pre-round text restored (should go red), each removed
  sentence put back, each new number changed by one digit or printed at another precision, each
  retired phrase reinserted in each language. Keep the self-test script and its log in the round
  folder, and rerun older rounds' self-tests under the new gates.
- Perturbing data: copy the data file into the mirror and point the gate copy at it. The script
  must refuse to run if the path resolves into the real repository.

**Retargeting after a landing.**

- The landing turns some gates red. Save the list of failing checks, retarget each in place, and
  record for each in a gate-change log: its label, what it bound before, what it binds now, and why
  this is not a loosening. Mark every change in the gate script with a comment naming the round.
- "Not a loosening" means every data binding (output row, p value band, count) is kept, a removed
  sentence becomes an absence, and its fact is bound to the sentence that now carries it.
- Run the old checks on the live and the patched gate file and confirm the pass/fail lines are
  identical except where the new text requires otherwise.
- When several groups retarget in parallel, merge them and test the **union**. Cross-group
  conflicts (one group requires a sentence another bars) only show then; fix them as explicit
  post-merge patches. The live gate file must hash-match the copy the merge agent tested.

**Independent audits.** After the retarget, a separate workflow audits the gates through several
lenses: loosening of old bindings; coverage (can retired wording come back in another spelling,
file or language?); false positives on legitimate text; language asymmetry; cross-group conflicts
and idle checks. Each finding is confirmed by a perturbation in the verifier's own mirror before a
repair agent patches it. A gap that existed before the round is not a loosening. Record it
separately and close it in a follow-up landing; do not let it block or inflate the loosening
verdict.

**Other tools retarget gates.** The author may edit the same tree with another tool or a parallel
session, and that tool may rewrite gates so its own wording passes. If the text and the gate
changed together, green proves nothing. Before trusting a green run on a changed file, diff its
sentences and its gates against the last approved copy. With a peer session live, message it before
touching shared files, and edit shared files by targeted replacement only.

**Tool blind spots seen in practice.**

- A checker silently skipped part of every file (everything before the first heading).
- A tool kept reading a retired version of a file after a rename. When a file's version changes,
  repoint every tool that reads it.
- A language checker was never run on the language mirror.
- A comparison of digit multisets cannot see two values swapped; add an ordered check.
- A number gate checks only the numbers someone wrote a gate for. Add a stale-value scan
  (`scripts/gates/stale_value_scan.py`) that compares the live text against both the current and
  the retired output sets and reports any value only the retired set explains.
- A gate that cannot find its anchor sentence may silently measure something else and pass. A
  check whose anchor is missing must fail, not fall through.
- Phrase checks went red because the typesetter's line wrapping had put a newline inside a
  sentence. Normalise whitespace before matching (`claims_gate_template.py` does).
- A sentence splitter that does not strip footnotes with brace matching lets a footnote on a topic
  sentence swallow the sentences after it, and the outline can never match (`outline_check.py`
  strips them).
- A checker that reads the main checkout passes every mirror self-test without reading the mirror,
  and one that prints mismatches but exits 0 can never go red. Checkers resolve files from their
  own copy of the repository and exit non-zero on a mismatch (`gate_selftest.py` refuses absolute
  live paths and treats exit codes as the verdict).
- A derived format (Word) was not in the build pipeline, so a corrected source nearly went out
  beside an uncorrected copy. Every derived file is rebuilt by script and checked for residue.

**Code and data changes.**

- A new code switch must be **inert**: with the switch off, the pipeline reproduces the old outputs
  byte for byte. Only then is every later difference the switch and not a bug.
- A rebuilt dataset goes to a new output folder, built in scratch first; the old one stays
  untouched until the text is moved over and a stale-value scan is clean.

---

## 7. The bilingual mirror (optional module)

Use when a document is kept in two languages.

- The mirror moves in the same round. It is not a translation done later.
- Build a **glossary first**, from the existing mirrors, before parallel translators start. It is
  what keeps them on one vocabulary.
- **Digit fidelity**: the numbers in the two versions must agree, as a multiset and in order
  (`scripts/gates/mirror_digit_fidelity.py`). A reference list with identifiers (DOIs) is copied
  byte for byte, or stripped before the comparison.
- **Sentence-level alignment** catches what digit checks cannot: a topic sentence passed over while
  its paragraph was updated, missing sentences with no digits, a translator's status line left in
  the body. Compare sentence counts per paragraph.
- One name per object in each language, gated as an absence of the retired names.
- Gate and self-test each language separately.
- Proposed sentences are given in the document's language, verbatim; commentary to the author is in
  Chinese.
- After a batch application, scan each file for the other language's script where it should not be.
- CJK redlines: `latexdiff --type=UNDERLINE` cannot break CJK lines and overflows the margin; use
  `--type=CFONT`, and count `Overfull` in every redline log, not only errors.

---

## 8. How agents fail (read before editing)

Each of these happened and cost a round.

1. **A batch edit script prints "ok" and dies before writing the file.** The edits look applied and
   are lost. Write the file after every replacement; require a unique match per edit.
2. **A substring gate passes on a different number.** Bind the whole sentence.
3. **A gate passes on a coincidence.** The value appears elsewhere or names something else.
4. **A correction lands in one file and does not sweep.** Search everything, both languages.
5. **A rebuild drops an answer an earlier version had.** A definition or a stated reason disappears
   in a restructure and is restored rounds later. When you rewrite a section, diff its content
   against the version before.
6. **A refuter refutes the new comment with an old approval** because it was not given the comment.
7. **Fixing a mechanical flag introduces a real defect.** Word-count, pronoun and sentence-splitting
   heuristics have made prose worse. Read the replacement aloud.
8. **A finding whose "proposed" field is an instruction gets applied literally.** "No change to the
   sentence; add a check" was applied by deleting the sentence. "NEW CONTENT, the author decides"
   was written into the text. Write such edits by hand. After any batch application, scan for
   proposal vocabulary (`King:`, `NEW CONTENT`, `Move the`, `No change`, `Wording unchanged`,
   language tags) and account for every deleted sentence against `before/`.
9. **Re-writing what the author already ruled on.** Check the rulings first.
10. **A rewrite drops approved sentences, and the gates certify the drop.** A drafter silently cut
    or reworded approved sentences outside the change list; gate groups then bound the drifted text
    as required. Diff every sentence not on the approved change list against `before/`.
11. **A new draft coins a synonym** for an object that already has a name. Run the terminology check
    on agent drafts, including your own.
12. **A build is reported clean from a stale log.** An interrupted build leaves a half-written log
    with no error lines and the old PDF on disk. Check the output's modification time and that the
    log ends normally.
13. **Long workflows die overnight or offline.** Sleep and network loss killed agents mid-round.
    Request keep-awake before long runs; rerun only the failed groups from cache.
14. **Your own replacement is wrong.** It happened repeatedly: an unscoped claim, a broken
    antecedent, a false number in a new sentence. Check your own drafts with the same gates and
    report your errors plainly in the record.
15. **An agent's finding is itself wrong.** Reviewers have proposed edits that would have made a
    true sentence false, and have claimed a number had no source when the output held it. Verify
    every surviving finding against the text and the output yourself before it lands.
16. **A gate change hides inside a text change.** When the text and the check that guards it are
    edited together (by another tool, a parallel session, or a retarget group binding drifted
    text), the run is green and the ruling is gone. Diff gates as well as sentences against the
    last approved copy.

---

## 9. Multi-agent recipes that worked

Shapes only; the runtime contract is in `.claude/rules/orchestrator-protocol.md` and the saved
scripts are in `.claude/workflows/` (see `docs/workflows/EDIT_WORKFLOWS.md`). In every recipe
the main thread verifies the surviving findings itself and reads every sentence before it lands.

**A. Drafting a round's edits.** Per file group: a drafter writes old/new pairs; a facts verifier
and a rulings verifier check them; a finalizer merges. For a small round: one drafter, three
checkers (facts; standard and rulings; language mirror and reader), then a reviser who compiles
the variants in scratch so the proposal shows what each option looks like.

**B. Whole-document sweep against the standard.** One reader per file; two adversarial refuters per
file, given the standing rulings and the latest comments; one language-mirror checker per file; a
completeness critic looking for what all readers missed. Often about half of the raised findings,
or more, do not survive refutation.

**C. Rule sweep from the author's comments.** One lens per distilled rule over every sentence;
adversarial refuters per batch; a completeness critic; a gap round for what the critic found.

**D. Source audit.** One verifier per cited source, reading the full text rather than the abstract;
a refuter per finding; a completeness critic. Ask the author for paywalled sources; each one
supplied tends to change a sentence.

**E. A whole-section rewrite.** Study the model papers (how they write this kind of section),
produce a template and a diagnosis of root causes; propose an outline, sample paragraphs and the
decisions; after approval, **one drafter writes the whole section** so it reads as one argument;
two rounds of multi-lens checks (standard, facts, author-as-reader, logic, language mirror); the
main thread reads every sentence; then diff against `before/` for unapproved changes.

**F. Gate retarget.** Per group: a drafter, two reviewers checking for loosening, a finalizer; one
merge agent tests the union in its mirror.

**G. Independent gate audit.** Separate lenses (section 6); each finding confirmed by perturbation;
a repair agent patches only confirmed findings.

**H. Read-back.** Fresh read-only readers per file group, given the author's comments, reading both
languages paragraph by paragraph. They find text defects the gates cannot.

**I. Topic-sentence interrogation.** A blind reader hears each proposed topic sentence alone and
asks what it leaves open; a sentence that leaves a question is revised.

**J. Role review.** One reviewer per role (supervisor, examiner or committee member, journal editor
and referees, reproduction, language, language mirror, cross-document), plus sentence auditors of
every concession, clarification and qualifier when the text reads defensive. Every finding is
verified for facts and standing rulings; an edit lands only when at least two of three lenses
(facts, rulings, reader) pass it. One role can catch a wrong cut another lens proposed.

Rules for every recipe:

- Launch rules (collecting choices before launch, caps, convergence): `orchestrator-protocol.md`,
  RUN_CONFIG.
- Refuters and verifiers see the instruction a finding derives from.
- Give each agent the standard file and the relevant rulings.
- Record the workflow id and its result file in the landing record.
- Each agent deletes its own scratch mirror when done (section 11).

---

## 10. Reporting to the author

- Chat in **Chinese**. Everything that is or becomes deliverable content is **English**: document
  prose, proposed sentences, headings, table labels, code comments, commit messages, emails. A
  Chinese paraphrase of a proposed English sentence is not reviewable, so give the sentence
  verbatim. Round records (intake, proposal, landing) may carry their commentary in Chinese
  (section 14).
- **Short and direct** (「太多太长太杂了 直接一点」, "too much, too long, too messy; be
  direct"): one line per answer, one numbered list of what will be done, at most two yes/no
  questions he can answer in a word. He reads on the go and decides fast; a long structured report
  buries the decision he has to make. Old/new pairs, sweep tables and evidence go in the plan or
  proposal file, linked.
- Lead with the answers he asked for, then the actions, then the questions.
- If something he believes is not supported by the data, say so in one sentence with the numbers.
- Report your own mistakes plainly, including a status you gave that turned out wrong.

---

## 11. Disk and machine hygiene

- A scratch mirror per agent adds up: a few hundred MB each, tens of GB after a few rounds of audits,
  enough to fill the disk mid-round. A full disk can corrupt the repository, the builds and the
  running workflows, and on macOS it can purge on-demand fonts so later builds fail.
- Before a large fan-out, check free space (`df -h`) and run a background watcher that stops the
  workflow below about 10 GB free.
- Copy heavy data into a mirror only when the agent perturbs it. Never perturb data in a mirror whose
  data folder is a symlink into the repository.
- Each agent deletes its own mirror; after each round, delete the round's mirrors once its results
  are saved. Guard deletions: `rm -rf "${SP:?}/${name:?}"`.
- Run each gate inside a self-test or perturbation harness under a time limit, for example
  `perl -e 'alarm 900; exec @ARGV' <command>` (`gate_selftest.py` has a `timeout` field); a
  timeout counts as a crash. A stalled build is caught by the checks in section 8, item 12.
- Back up an annotated PDF before any build that writes the same path.

---

## 12. Commit discipline

- **Never commit unless the author explicitly says so.** "Change it and run it through" approves
  the landing and its checks, not a commit; for "just do it" see `orchestrator-protocol.md`,
  Just Do It mode.
- Every landing record and tracker row ends with **NOT COMMITTED** until he asks.
- When he asks, several landed rounds may go into one commit, with an English message listing them.
- Scratch outputs, temporary folders and redline symlinks stay untracked on purpose.

---

## 13. Before you say a round is done

- [ ] Every comment in the intake list has an edit, an answer, or a decision the author took.
- [ ] Every distilled rule was swept over every file and both languages; the sweep is reported,
      empty or not.
- [ ] Nothing landed that the author did not approve; every NEW CONTENT item was his call.
- [ ] Every sentence outside the approved change list is identical to `before/`.
- [ ] Every number comes from an output file and is gated; every new or retargeted gate was seen red.
- [ ] All gates green; every edited file compiles with 0 errors, 0 overfull, 0 unresolved.
- [ ] The language mirror is in step; digit fidelity passes.
- [ ] Ripples are listed for the author, not applied.
- [ ] Landing record written, tracker row updated, approver's change list updated if needed.
- [ ] Scratch mirrors deleted.
- [ ] Nothing committed unless he said so.

---

## 14. Tracker and records

- **The tracker stays short.** One row per document: current state in a few lines, gate status, and
  a pointer to the latest landing record. History lives in the landing records, not in the row. In
  the source project, rows that appended every round's history in a "Previously:" chain grew the
  always-loaded instruction file to about 300 KB, which then had to be searched rather than read.
- **One folder per round** under `quality_reports/<date>_<topic>/`: the backed-up annotations and
  their extraction, the proposal, `before/` copies, the edit lists as applied, the list of checks
  that failed after landing, the gate-change log and patch files, self-test scripts and logs,
  workflow result files, `redline/`, and the landing record.
- **Language of records.** The intake, the proposal and the landing record are reports to the
  author, so their commentary may be in the language he reads best. Every sentence quoted from the
  document or proposed for it stays verbatim in the document's language.
- **The plan file** (in `quality_reports/plans/`) gets its status updated to COMPLETED with a
  pointer to the landing record.
- **Durable lessons** (a new rule from the author, a new failure mode) go to the memory files and,
  when they bind every agent, into the standard or this file.
