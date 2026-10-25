# Review Workflows

Five saved Workflow-tool scripts in `.claude/workflows/` review a draft and edit nothing. They
encode recipes B, D, H and J of `docs/WORKING_METHOD.md` section 9, plus one shape that was run
repeatedly in practice: an adversarial stress test of the argument. The edit side of a round
(proposal, landing, mirrors, gates) is in `docs/workflows/EDIT_WORKFLOWS.md`.

| Script | Use it when | Typical agents | Writes |
|---|---|---|---|
| `standard-audit` | a draft must meet the writing standard: before it goes to the supervisor, after a large rewrite | 60 to 150 | reports in `roundDir`, if set |
| `multi-role-review` | a section reads defensive, hedged or unfocused, or must satisfy the supervisor, an examiner and an editor at once | 20 to 110 | one report in `roundDir`, if set |
| `source-verification` | claims about cited works must be checked against the works themselves | about 2 per source, plus 3 | one report in `roundDir`, if set |
| `argument-stress-test` | before a meeting, a defence or a submission: does the story hold up? | 40 to 60 | the verdict in `roundDir`, if set |
| `read-back` | right after a round of edits lands, before the author sees it | 3 to 10 | one report in `roundDir`, if set |

None of them writes to a document. Every one returns its findings as data; the main thread
verifies the survivors itself and turns them into a proposal for the author.

"King" below means the first sentence of a paragraph, the topic sentence (see the writing
standard). "Mirror" means a translated copy of a document kept in step with it (optional).

---

## Where they sit in a round

1. **Before a draft goes out.** `standard-audit` over the whole draft; `source-verification` over
   every file that reports other studies; `argument-stress-test` on the section carrying the
   result. They can run in parallel; they read, they do not write.
2. **Into a proposal.** Verify every surviving finding against the text and the output yourself,
   then write it into `templates/round-proposal.md`: old and new side by side, decisions for the
   author, new content flagged, ripples listed. Report to the author as `docs/WORKING_METHOD.md`
   section 10 says, and link the file.
3. **After approval**, land with `group-landing` (see `EDIT_WORKFLOWS.md`).
4. **`read-back`** on the landed text, with the author's comments and the `before/` copies. Then
   the gates, the build and the landing record.
5. **When the author's complaint is about stance** (too defensive, not direct, hedged, weakens the
   story), run `multi-role-review` on that section instead of a full audit. Its drafted edits go
   into the proposal. After they land, run it again on the revised text with `changes` (the first
   round's diff or change list) and each document's `before` copy: the roles then also judge the
   first round's edits, and a regression reader walks the diff.

---

## Running a workflow

```text
Workflow({name: "standard-audit", args: { ...JSON values, not a JSON-encoded string... }})
```

- Each script begins with its `meta` block (the runtime requires it first), followed by a header
  comment with the purpose, a full JSON example of `args`, the output and the cost. Read the header
  before the first run.
- A script throws before spawning any agent when `documents` is missing. Every choice the agents
  need is collected before launch: a forked agent cannot stop to ask.
- **Shared argument names**, the same as the edit workflows: `root`, `context`, `documents`,
  `standard`, `rulings`, `authorMessage`, `outputs`, `roundDir`, `scratch`, `effort`. The
  snake_case forms (`files`, `instruction`, `numbers`, `out_dir`, `scratch_dir`) are accepted as
  aliases. A script reads only the names that apply to it, and its header lists them: all five
  read `rulings` and `authorMessage`; `standard` is not read by `argument-stress-test` and is
  optional in `source-verification`; `outputs` is not read by `source-verification`.
- **`rulings`** takes file paths and inline rulings in one list: an entry that looks like a path is
  read as a file, anything else is quoted as a ruling.
- **`authorMessage`** is the author's newest comment, verbatim. In all five scripts every refuter,
  verifier and tester receives it together with the rulings. It overrides older approvals it
  contradicts.
- **`effort`** maps a stage to a reasoning effort, for example `{"refute": "high", "find":
  "medium"}`. Refuting, verifying and rebutting stages default to `high`.
- **Resume** an interrupted run (sleep, network, a usage limit) with the same script, the same args
  and `resumeFromRunId`; unchanged agent calls come back from the cache.
- **Disk.** See `.claude/rules/working-rules.md` (disk and scratch mirrors). Every agent is told to
  keep its scratch under `scratch` and delete it before it returns.
- **Afterwards**, record the workflow id and the result file in the landing record.

Status: all five scripts pass `node --check` and a dry run with mocked agents (every stage reached,
argument validation exercised, failed agents tolerated). None has yet run end to end in this
generic form. Run each the first time on a small target and read its journal.

---

## standard-audit

**What it does.** For every document, one reader per lens: kings (K), sentences and paragraphs
(S), register, names and pointers (R), placement, numbers and consistency (P), and the mirror (C)
when there is one; a short file can take one combined lens (A). Across documents, four more
readers: one object one name (a usage table, file by file), consistency between files, the outline
of first lines read as one text, and citations against reference lists. Each batch of findings goes
to two adversaries with different angles (the text and the facts; the standard and the rulings; a
third, the reader, if `refuters` is 3). A finding is dropped when a majority of the returned votes
refute it (both of two, two of three; `killOn` changes the rule), and at once when an adversary
cannot find the quoted "old" text in the file. A minority refutation leaves it CONTESTED. A finding
that only repeats an item already in the author's open-decision table (`openItems`) and brings no
new evidence is marked DUPLICATE and not raised again. A replacement checker then tests every
surviving "new" text: it must read in one pass, mean exactly what the old text meant, keep numbers
and markup, and never be heavier than the king it replaces. A completeness critic names what nobody
read, and up to `maxGaps` (default 8) gap readers read it. Plain code dedupes by file and old text.
Then one reconciler per file reads all standing proposals for that file together, because each was
checked one lens at a time: two proposals on the same paragraph (a split and a sentence rewrite, a
deletion and a rewrite) must still apply together, none may contradict another or a ruling. It
revises them to fit, or sends the conflict to the author. The list is ranked kings first, then
HIGH, MED, LOW; findings in a file marked `deferred` (set aside by the author) come last, tagged
DEFERRED.

**When.** Before the supervisor or a co-author sees a draft; after a rewrite by a tool or an
agent; when a new standard has been written and the whole document has to be read against it.

**Key args.** `documents` (with `mirror`, `status`, `short`, `scope`, `deferred` per file),
`approvedDocuments` (the supervisor-approved model: only factual errors, contradictions and
unambiguous breaches are raised there, and its names are canonical), `standard`, `rulings`,
`authorMessage`, `openItems`, `outputs`, `glossary`, `mechanical` (a scan such as
`scripts/gates/prose_audit.py` that readers run and do not recount), `ear` (the author's complaint
phrases), `refuters`, `killOn`, `maxGaps`, `reconcile`, `roundDir`.

**Cost.** Per document: lenses x (1 reader + refuters + 1 replacement check). Across documents:
4 units x the same. Plus 1 critic, up to `maxGaps` gap units, one reconciler per file with standing
findings, and with `roundDir` one reporter per document with findings plus a summary. Five
documents with mirrors: about 150 agents.

**What came out of it in practice.**

- Often about half of the raised findings, or more, did not survive the adversaries. Once the
  mechanical layer was clean, the survivors were judgment defects: a "therefore" that promised
  something the document never does, a term used a section before it was defined, a topic
  sentence that restated rather than claimed, two names for one object.
- The consistency check is weighted as the most valuable part of the placement lens, and has its
  own cross-file reader, because corrections had repeatedly landed in one file and not swept the
  others: the abstract, the introduction and the conclusion still carried claims the results no
  longer made.
- The mirror lens found whole sentences and paragraphs missing from the translated copy, which a
  check comparing digits could not see because they carried no digits.
- The outline of first lines, returned in the summary, is built to be handed to the supervisor as
  it is: he reads first lines as the document's outline.
- The replacement check exists because fixing a mechanical flag has made prose worse here before:
  sentences split by a word count, kings made heavier to carry a purpose. The reconciler exists
  because the replacement check sees one lens at a time, so two lenses could propose edits to one
  paragraph that do not fit together.
- A refuter that was given only older approvals refuted the author's new comments with them. Since
  then every refuter gets `authorMessage` and the rulings, and each finding names what it
  `derives_from`.

---

## multi-role-review

**What it does.** Three role reviewers read the section as its judges will: the supervisor (reads
the first lines as an outline, asks "what do you mean?" at every sentence, wants one name per
object), an external examiner (lists the questions he would actually ask, keeps a qualifier only if
it answers one of them), and a journal co-editor (desk reject or send out; is the result stated
clearly and testably in the first lines?). Sentence auditors name the job of every sentence and run
the strict test on every concession, clarification, qualifier, denial and pre-emption: does it
answer a real logical problem, and would deleting it harm the facts or the argument? Delete when
the problem is imagined and nothing is lost. A structure lens checks one centre per paragraph and
where each limitation sits; a facts lens checks numbers and cited studies; a mirror lens finds
defensive turns the translation added. Findings are grouped by paragraph. Three lenses judge each
paragraph's findings (facts, rulings, reader), and a finding goes on only if at least `minPass` (2)
of them uphold or modify it. One drafter per paragraph then writes the edits as exact old and new
text, original and mirror; a king change and any new content come back separately, for the author.

The rule it applies by default is the author's: 「先直接陈述核心判断，再给出原因和证据」, state the
core judgment first, then the reason and the evidence; do not pre-empt objections the reader has
not raised. A qualifier the author himself asked for is real: it may be tightened or said once,
never removed. A sentence that is the evidence for its paragraph's king is not a hedge. In an
appendix (`appendix: true`), test and diagnostic detail belongs; its auditor asks only whether a
sentence defends against an objection nobody raised or restates what a number is not. Facts of
descriptions of cited studies that were already verified against the studies are not touched.

On a second round (`changes` and `before` copies given), the supervisor and editor roles say which
first-round edits they would reverse, the examiner asks of each first-round deletion whether it
removed the answer to a question he would ask, and a regression reader walks the diff: a fact or
scope lost, a new wording that is untrue, an orphaned pointer, a mirror out of step. Such findings
carry action `restore` and go through the same three lenses.

**When.** The author's comment is about stance (defensive, hedged, not direct, weakens the story),
or a section must satisfy several readers at once. Not a substitute for `standard-audit` on a whole
document.

**Before you run it**, make a numbered copy of each document (one paragraph per id, P01, P02, ...,
notes and footnotes counted where they stand), with the same ids in the mirror. Every reviewer then
cites the same ids. Without it, each reviewer counts paragraphs itself and the grouping can drift;
the drafter rereads the paragraph either way.

**Key args.** `documents` (with `numbered`, `mirror`, `mirror_numbered`, `appendix`, and on a
second round `before`, `mirror_before`), `changes` (second round), `sweepExtra` (files with the
same claims, for ripples), `authorMessage`, `rulings`, `outputs`, `sourcesDir`,
`supervisorProfile`, `field`, `journal`, `modelPaper`, `auditorGroups` (each may carry `appendix`),
`minPass`, `draft`, `mirrorLanguage`.

**Cost.** Review: 3 roles + one auditor per group + structure + facts (+ mirror, + regression on a
second round). Then per paragraph with findings: 3 verifiers + 1 drafter. One document with 20
paragraphs touched: about 87.
Two rounds over a long section with its appendix came to about 200 agents.

**What came out of it in practice.**

- A long list of throat-clearing went: "taken at face value", "does not conflict with", "X, not Y"
  contrasts that answered a misreading nobody made, "still" and "only" used to reassure, sentences
  restating what an estimate is not. Each paragraph then opened on its judgment.
- The 2-of-3 rule stopped single-lens enthusiasm. The examiner role caught one wrong cut: a
  sentence proposed for deletion as a hedge was the evidence for its paragraph's king, and it was
  restored.
- Qualifiers the author had asked for in an earlier round stayed, tightened or said once. The
  `kept` list showed him what survived the sweep, which he wanted to see.
- The mirror auditor found defensive turns that existed only in the translation.
- The second round runs the roles on the revised text and adds a regression reader on the diff, so
  a first-round cut that removed the answer to a real question is restored before the author reads.

---

## source-verification

**What it does.** If no source list is given, an inventory agent lists every cited work, its
citing sentences, its reference entry and its local file. Then one verifier per source finds every
sentence citing it in every file (and mirror), obtains the source by the best route (local file;
a connected literature tool; an open-access copy; failing that, the abstract from OpenAlex or
Semantic Scholar), and checks each claim in the study's own terms: setting, period, unit, design,
sample, direction, size, units, which specification, every qualifier. It checks the reference entry
field by field (against Crossref when there is a DOI) and reports what it found correct, not only
what is wrong. Each source with findings goes to an adversarial refuter whose default is that every
finding is wrong. A completeness critic names what the round did not check; its findings are
refuted too. Status is honest: FULLTEXT, ABSTRACT or UNVERIFIED, with the version read.

**When.** Before a literature review or a whole draft goes out; after sources were added or
paragraphs rewritten by an agent; whenever a claim about a study looks doubtful; again when the
author supplies full texts that were only abstracts before.

**Key args.** `documents`, `sourcesDir`, `bib`, `sources` (optional list with `local`, `doi`,
`note` and `special`, a claim that needs a hard look), `verificationLog`, `libraryHint`, `web`,
`onlyLocal`, `rulings`, `authorMessage`, `standard` (optional, for findings of category "rule").

**Cost.** 1 inventory (if no list) + 1 verifier per source + 1 refuter per source with findings +
1 critic + 1 critic refuter. Thirty sources: about 60.

**What came out of it in practice.**

- An abstract is not the paper. A round checked against abstracts passed claims that the full
  texts contradicted. With the full text: a number came from a working paper whose estimate, and
  even the direction of a comparison, differed in the published version; a summary sentence was the
  negation of the study's own conclusion; a share was attached to the wrong denominator; period
  averages were reported as single years.
- An earlier "correction" can itself be wrong. One had deleted half of a finding as unsupported,
  and the published article reported it.
- Most raised findings were refuted when the refuter reread the source (in one full-text round
  about nine in ten). The few survivors were material. Without the refuter the round would have
  cost the author many false alarms.
- Every paywalled source the author supplied changed at least one sentence. The `unverifiable` list
  is the request to send him.
- Reference entries were mostly right. A repository cover page and the article disagreed on a page
  range, and the article was right: check the article, not the cover.
- Scanned files with no text layer return nothing from `pdftotext`; the verifier renders the pages
  and reads them as images.

---

## argument-stress-test

**What it does.** Six adversarial lenses, each told to break the story: identification (what
variation identifies each coefficient; does an estimator gap point the way the document's own bias
story predicts), magnitudes (implied changes in units a reader understands; benchmarks compared
like for like), the claimed contribution (is a split informative or a relabelling; are two
instruments really two), measurement and sample (does the outcome measure what the question asks;
are two robustness checks one check twice), coherence (is there one sentence a reader could repeat
as the finding; do introduction, results and conclusion claim the same thing), and literature
positioning. Each measures things itself. Every objection then goes to an independent tester whose
job is to test it, not agree: is it factually right, does the document already answer it (quoted),
is the severity right for this level, does the remedy really need new analysis? Verdicts:
SUSTAINED, PARTLY, OVERRULED. A final reader writes the verdict: does the story hold up; what is
load-bearing and sound; what will be attacked, in order of danger, with writing-only fixes separated
from fixes that need new analysis; the questions the author must be able to answer, with the
answer the document already gives; the one change to make; and what to tell the supervisor.

**When.** Before a supervisor meeting, a defence or a submission; when the author asks whether the
story stands rather than whether the prose is clean; after a data rebuild that changed the numbers
under the story.

**Key args.** `documents`, `focus`, `story` (the claims the author wants to make), `design`,
`outputs`, `sourcesDir`, `constraints` (for example "no new estimation for this draft"), `rulings`,
`authorMessage`, `level`, `field`, `lenses` (supply your own for a field outside empirical
economics). Every referee is told that revision-history comments record why things were removed:
a remedy that puts removed content back must engage the recorded reason.

**Cost.** One referee per lens + one tester per objection + 1 verdict. Six lenses raising six to
eight objections each: about 45 to 55.

**What came out of it in practice.**

- No lens returned a fatal objection. Most came back PARTLY: right in substance but wrong in
  degree, or already answered somewhere the referee had missed. A few were sustained and a few
  overruled.
- The one serious objection: a benchmark from another study had been compared as if it were the
  same kind of coefficient, when its dependent variable was a different outcome. Another file
  described that study correctly; the two disagreed.
- The real gain was a reframe. The benchmark matched a column with the same fixed effects, not the
  headline column, so the document had been leading with a number far above the literature and
  then disowning it, while the comparable number sat one column over.
- It found two robustness checks that were one: deflating by a single national price index removes
  a period-specific constant, which is what period effects do.
- Separating writing-only remedies from new estimation mattered because new results had been ruled
  out for that draft.

---

## read-back

**What it does.** Fresh readers who did not write the edits read the text as it now stands, with
the author's comments for the round, which override earlier approvals recorded anywhere. Lenses per
file group: a first-time reader with the house rules (kings against their bodies, antecedents
orphaned by cuts, pointers that no longer resolve, notes that no longer read their tables, ripples
into related files); facts (every new or changed number and claim against the output; no deleted
sentence was the only home of something another file needs; each kept limitation still stated once,
plainly; every cited work still has a reference entry and every entry is still cited); regression
(the diff against the `before/` copies: every listed change landed, nothing off the list changed
or vanished, no proposal vocabulary was pasted into the text); the mirror; and a
sweep of the whole text for the class of defect the author named, each instance marked KEEP (with
the reason) or CUT or MOVE, kings listed only. An optional adversary per lens result filters false
alarms (`verify: true`).

**When.** After every landing, before the author sees the result, and after the gates are green:
the gates prove only what they bind.

**Key args.** `documents` (with `before`, `mirror`, `mirror_before`), `authorMessage`, `changes`
(the approved change list or proposal), `defectClass`, `sweepExtra`, `rulings`, `outputs`,
`groups` (a group matching no document is dropped and logged; documents in no group are read as an
extra group, "ungrouped"), `lenses`, `verify`.

**Cost.** Per file group: 3 to 5 readers (regression needs `before` copies, mirror needs mirrors),
doubled with `verify`.

**What came out of it in practice.** It found text defects no gate could see:

- a table note that said no estimate was reported, over a table that printed them;
- a king whose scope word had been removed, which made it false of part of the table beneath it;
- a sentence the round added to one file and left out of another file making the same claim;
- a sign that was wrong in the mirror only;
- a qualifier the round removed in one file and left standing in another;
- a reading of the results that the numbers did not support (a path called fading when it was
  flat), which was withdrawn.

The regression lens was added after a rewrite dropped and reworded approved sentences outside the
change list, and later checks then bound the drifted text as if it were approved. It was caught
only because other agents compared against the copy from before the rewrite. The comments are
passed because a verification stage without them once refuted the author's new comments with his
older approvals; pass `authorMessage` every time.

---

## Lessons common to the review workflows

The edit-side lessons are in `EDIT_WORKFLOWS.md`. The general agent failures are in
`.claude/rules/working-rules.md` (top failure modes; the round, item 6) and `docs/WORKING_METHOD.md`
section 8: a refuter not given the newest comment, a proposal written as an instruction and applied
literally, a replacement king heavier than the old one, an agent's finding that is itself wrong.
The scripts build those in: every adversary gets `rulings` and `authorMessage`; the readers of
`standard-audit` and `read-back` are told that a proposal is text, never an instruction; the
readers of `standard-audit` and `multi-role-review` are told that a new king is never heavier;
`standard-audit`'s replacement check rejects both. The main thread still verifies every survivor.
How to report to the author is in `docs/WORKING_METHOD.md` section 10. What the review side adds:

1. **Split the adversaries by angle, and name what each finding derives from.** One adversary
   checks the text and the facts, one the standard and the rulings, a third the reader
   (`standard-audit`'s refuters, `multi-role-review`'s three lenses). In `standard-audit` each
   finding names the rule, ruling or comment it rests on in `derives_from`, so an adversary can
   check that it really rests there.
2. **Default to refuted, and quote the file.** A misquoted "old" text refutes a finding outright.
   Finding ids are renumbered in code so that votes cannot collide.
3. **Report the sweep, including what is clean.** Every reader returns a clean note, rule by rule.
   The author wants to see the sweep even when it finds nothing, and the critic reads the notes to
   find thin coverage.
4. **Reviewers never retype numbers.** A doubtful number becomes a NUMBER-CHECK with both places
   quoted and the output file named.
5. **The approved model is held to a higher bar.** Only factual errors, contradictions and
   unambiguous breaches; never restyling.
6. **The completeness critic earns its place.** In one round it named a dozen gaps and the gap round
   added four findings. Its prompt points at what readers skip: captions, notes, footnotes, symbol
   lists, a file with few findings for its length, and the twin of a high-severity finding in
   another file.
7. **Run mechanical scans over every file, every time.** A banned-word scan run by hand, file by
   file, once missed the word in two kings. Pass the scan as `mechanical` so every reader runs it.
