# Edit and Landing Workflows

Five saved Workflow-tool scripts in `.claude/workflows/` run the multi-agent parts of a revision
round. They encode the shapes in `docs/WORKING_METHOD.md` section 9 (recipes A, C, E, F, G and the
bilingual module of section 7), parameterised so that any project can use them.

| Script | Use it to | Writes | Never writes |
|---|---|---|---|
| `annotation-round` | turn the author's comments into a checked proposal | intake and proposal files in the round folder | the documents |
| `group-landing` | turn approved items into verified exact edits and land them | a scratch report; with `apply: true`, the edited files, `before/` copies and the landing files | anything when the scratch check is not clean |
| `bilingual-mirror` | build or update a language mirror, or mirror approved edits | a glossary and a mirror draft (or verified pairs) in the round folder | the live mirror |
| `gate-audit` | attack the gates (audit) or repair them without loosening (retarget) | diffs, patch lists, self-test specs in the round folder | the live gate files |
| `model-papers-study` | learn how model papers write a section and diagnose the draft | anatomies, template, diagnosis, outline in the round folder | the draft |

The round they serve, in order:

1. The author marks up a draft. Back up the annotated file and extract the comments to JSON
   (`templates/annotation-intake.md`, section 1).
2. `annotation-round` writes the intake and the proposal. The main thread reads it, verifies the
   surviving items itself, and sends the author the short report with the link.
3. The author answers in shorthand ("1 A 2 yes").
4. `group-landing` with `apply: false`: the dry run in scratch. Read the report. Then relaunch with
   `apply: true` and `resumeFromRunId` set to the dry run's runId: the cached Draft, Verify,
   Finalize and Check results are reused, so exactly the edits you read are landed. Never set
   `apply: true` on a fresh run. Landing copies the edited files and the gate files into `before/`
   (pass the gates with their `file`, or `gateFiles`); `gate-audit` needs those gate copies.
5. If the mirror edits were not drafted with the proposal, `bilingual-mirror` in `edits` mode.
6. Gates go red where they bound the old wording: `gate-audit` with `mode: "retarget"`.
7. `gate-audit` with `mode: "audit"` (an independent audit of what the retarget did), with the
   `readback` lens for the text.
8. Build, landing record (`templates/landing-record.md`), tracker row, cleanup. Never commit unless
   the author says so.

`model-papers-study` comes before a section is rewritten from scratch: when the same section keeps
failing the author's reading, or before writing a kind of section the project has not written.

---

## Running a workflow

```text
Workflow({name: "annotation-round", args: { ...JSON values, not a JSON-encoded string... }})
```

- Each script starts with its `meta` block (the runtime requires it first), then a header comment
  with the purpose, a full JSON example of `args`, the outputs and the cost. Read the header before
  the first run.
- A script throws before spawning any agent when a required argument is missing. Every choice the
  agents need is collected before launch: a forked agent cannot stop to ask.
- `scratch` is a folder for private mirrors and throwaway files. Use the session scratchpad or a
  folder under the system temp dir, never the project.
- `effort` (optional) maps a stage to a reasoning effort, e.g. `{"verify": "high", "draft": "medium"}`.
  Verification and refutation stages default to `high`; the rest inherit the session's effort.
- Interrupted (sleep, network, a usage limit): relaunch with the same script and the same args and
  `resumeFromRunId`; unchanged agent calls come back from the cache. Editing the script or the args
  before resuming re-runs everything from the first changed call.
- Before a large fan-out, check free disk space (`df -h`). Every stage that builds a mirror is told
  to stop below about 10 GB and to delete its mirror when it returns.
- Afterwards: verify every surviving finding against the text and the output yourself, read every
  sentence before it lands, and record the workflow id and result file in the landing record.

Status: all five scripts compile as async function bodies and pass a dry run with mocked agents
(every stage reached, argument validation exercised). `node --check` is not a test here: it passes
these files even with a syntax error in the body. None has yet run end to end in this generic form.
Run each the first time on a small round and read its journal.

---

## annotation-round

**Use when** the author has marked up one or more documents and the comments are extracted.
**Do not use** for a single typo: the round overhead is larger than the fix.

Stages: Intake (one agent lists every comment, one by one: where it points, what it asks, whether it
is an edit, a question or a decision, how many times it has come back) → Distil (a candidate rule per
comment, each with a test, the marked sentence as the failing example and a passing rewrite; a refuter
per candidate; two independent synthesizers and a judge, or one merger with `distill: "simple"`) →
Sweep (one sweeper per rule over every file, marked instances included, empty sweeps reported; a
refuter per unmarked instance) → Draft (one drafter per source file and its mirror; the claims the
author asks about are answered from the outputs, with file and row, before drafting; a passage he has
rejected twice is proposed for deletion, one he keeps asking more of gets lettered variants) → Verify
(facts, rulings, and the author as a first-time reader) → Finalize → Critic (collisions between edits,
missed instances, notes the body no longer explains, comments left unanswered) → Gap (the critic's
extra edits through the facts and rulings lenses and a finalizer; marked UNVERIFIED in the proposal
if a lens fails) → Build (optional: each lettered option applied to a scratch copy and built) → Write.

| Arg | Required | Meaning |
|---|---|---|
| `root`, `roundId`, `roundDir`, `scratch` | yes | project root, round id, round folder, scratch folder |
| `annotations` | yes | path to the extracted JSON, or an inline array |
| `documents` | yes | `[{path, mirror?}]`: the files this round may edit |
| `sweepExtra` | no | files swept for the rules but not edited (hits become ripples) |
| `authorMessage` | no | the message that came with the comments, verbatim |
| `standard`, `rulings`, `priorComments` | no | what every agent reads first |
| `outputs`, `gateFiles` | no | where numbers come from; which sentences are bound |
| `approvedDocuments` | no | changes to these are flagged for the approver |
| `mirrorLanguage`, `replyLanguage` | no | the mirror's language; the language of commentary to the author |
| `distill` | no | `judge` (default) or `simple` |
| `refuteSweep`, `readerLens` | no | default `true`; turn off on a small round |
| `build`, `buildCopy` | no | `[{name, cmd}]` build commands and the folders a scratch copy needs; with decisions, each option is built and its errors, overfull boxes and pages go in the proposal |

Outputs: `<roundDir>/annotation_intake.md`, `<roundDir>/<roundId>_proposal.md` (the
`templates/round-proposal.md` shape: comments one by one, lettered decisions with the recommended
option first, the sweep table, answers, ripples, Old / New / Mirror per edit) and
`<roundDir>/<roundId>_proposal.json` for `group-landing`.

Cost: about `1 + 2N + 3 + R + F + 5G + 2` agents for N comments, R rules, F unmarked instances and G
file groups, plus 3 for the gap round when the critic adds edits and 1 for the build. The F refuters
dominate on a document with many unmarked instances.

---

## group-landing

**Use when** the author has ruled on a proposal. **Do not use** to make an edit he has not approved.

Stages: Plan (partition the approved items so that each file, with its mirror, belongs to one group,
or to several groups each with a scope (section or line range); skipped when `groups` is given) →
Draft (per group: recheck each item on the live text, which may have moved since the proposal; exact
`{file, old, new}` with `old` unique; mirror edit in the same item; two items on one sentence merged)
→ Verify (facts; rulings) → Finalize → Check (test that no two edits in one file overlap; apply the
union in a scratch mirror, writing after every replacement; scan for proposal vocabulary and stray
script; account for every deleted and every added sentence; run the gates) → Land (only with
`apply: true`, a clean check and no open question: copy each edited file and each gate file to
`before/`, apply one edit at a time, repeat the scans and the accounting on the live files, write the
landing files).

| Arg | Required | Meaning |
|---|---|---|
| `root`, `roundId`, `roundDir`, `scratch` | yes | as above |
| `proposal` | yes | the proposal file (JSON or markdown) |
| `items` | yes | `[{id, decision: apply / apply-part / drop, note?}]`: the author's ruling per item; a drop is never reopened |
| `approval` | no | his words on the proposal, verbatim |
| `groups` | no | `[{key, files, items, scope?}]`; a file in two groups needs a `scope` on each, else the run stops |
| `mirrorPairs`, `mirrorLanguage` | no | source and mirror pairs |
| `gates` | no | `[{name, cmd, file?}]` run in the mirror and after landing |
| `gateFiles` | no | gate scripts copied into `before/` with the texts (default: every `gates[].file`) |
| `beforeDir` | no | default `<roundDir>/before`, never overwritten; each landing pass after the first in the same round uses its own folder (e.g. `<roundDir>/before_<pass>`), and the round-level `before/` stays the pre-round state |
| `generators` | no | scripts whose printed values are fixed in the script, never in the generated file |
| `mirrorCopy` | no | what the scratch mirror copies (the rest is symlinked) |
| `apply` | no | `false` (default): dry run only |

The landing verdict is computed from the check's lists (edits that did not apply, overlapping edits,
vocabulary hits, stray script, unaccounted deletions, unexplained additions, open questions), not taken from an
agent's own "clean" flag. Red gates in the check are expected where a gate bound the old wording;
their labels go to `failing_after_landing.txt` for the retarget.

Cost: `1 + 4G + 1 (+1 when applying)`.

---

## bilingual-mirror

**Use when** a document has, or needs, a second-language version: a first mirror, a mirror of a
restructured source, or the mirror half of approved source edits.

`sections` mode: Glossary (built first, from the existing mirror pairs: term map with file and line,
the file skeleton, recurring sentence patterns, punctuation, banned terms) → Scout (lists the
sections; skipped when `sections` is given) → Translate (one translator per section; with
`oldSource` and `oldMirror`, every sentence unchanged since the old source reuses its old mirror
sentence word for word) → Check (per section: digits in order, sentence alignment, meaning, terms,
markup; a fixer when needed) → Assemble (one file, the digit gate run on it) → Verify (digits and
markup; terminology across sections; meaning) → Reconcile.

`edits` mode: Glossary → one editor per mirror file (exact pairs; grammar-only source fixes need no
pair) → one verifier per file (each pair: `old` once, meaning, digits, references byte for byte;
disputes on items left unchanged) → Reconcile (pairs applied to a copy, digit gate run, verified
pairs written to `mirror_edits.json`).

| Arg | Required | Meaning |
|---|---|---|
| `root`, `roundDir`, `scratch`, `language` | yes | `language` is the mirror's language |
| `mode` | no | `sections` (default) or `edits` |
| `source` | sections | the authoritative file |
| `files` | edits | `[{source, mirror, edits}]`, edits as a path or an inline array |
| `oldSource`, `oldMirror` | no | enable sentence reuse in sections mode |
| `existingMirrors`, `glossary` | no | pairs and an existing glossary to build from |
| `sections` | no | `[{id, heading, paragraphs, hint}]` |
| `mirrorRules` | no | project-specific rules (fixed terms, forbidden punctuation) |
| `out`, `gatesDir` | no | draft path; folder of `mirror_digit_fidelity.py` |

The live mirror is never written. The main thread reads the draft, then lands it like any edit.

Cost: sections mode about `3 + 3S + 4` for S sections; edits mode `2 + 2F` for F files.

---

## gate-audit

**Use when** gates were retargeted or extended (audit), when a landing broke gates (retarget), and
whenever text and gates changed together outside a reviewed round, since then green proves nothing.

`audit` mode: Prepare (diffs of each gate file from its pre-round copy, split into parts; baseline
counts; the run stops when a gate file has no pre-round copy) → Audit (lenses: `loosen` per diff part,
`cover` per document and language, `conflict` for requires-versus-bars, shadowed helpers, vacuous
splits and false reds, `binding` for whether each new or retargeted check computes the printed value
from the right rows at the printed rounding and can fail at all; optional `readback` for the text,
given the standard, the rulings and the author's comments) → Verify (each finding rebuilt by an
independent verifier in its own mirror: confirmed only when demonstrated) → Fix (one fixer: tested
patches; for a conflict it narrows only the bar that blocks legitimate text and shows the retired
wording is still caught; earlier self-tests rerun on its patched mirror; a self-test spec run through
`scripts/gates/gate_selftest.py`).

`retarget` mode: Prepare (failing checks located by line; groups by line range unless given) → Draft
(per group: in-place retargets and new check blocks with the group's helper prefix) → Review (two
auditors per group: one diffs for loosening, one tries to break each binding) → Finalize → Merge (the
union applied in a fresh mirror; every old check's verdict compared, pre-round gates on pre-round texts
against merged gates on live texts; cross-group conflicts fixed; a self-test of every new binding; the
earlier rounds' self-tests rerun, with perturbations whose anchor no longer exists named rather than
counted as passes).

| Arg | Required | Meaning |
|---|---|---|
| `root`, `roundId`, `roundDir`, `scratch` | yes | as above |
| `gates` | yes | `[{name, file, cmd, anchor?, prefix?}]`: `anchor` is the line new blocks go before |
| `documents` | yes | every file the gates read, each language |
| `before` | audit | pre-round copies of the gate files and the texts (`group-landing` writes them); audit stops without the gate copies |
| `failing` | retarget | the failing checks after landing |
| `dataDirs` | no | outputs the gates bind to; a perturbed directory must be a real copy |
| `roundChanges`, `removedOnPurpose`, `addedOnPurpose`, `untouched` | no | what the round meant to change |
| `reopenedOnPurpose` | no | `[{wording, sentence}]`: a bar an approved change reverses, reopened only for that sentence; every other retired form stays barred and the reopened wording is tested everywhere else |
| `standard`, `rulings`, `comments` | no | given to the read-back lens and its verifier |
| `lenses`, `diffParts` | no | default `["loosen", "cover", "conflict", "binding"]` (add `"readback"`), 3 parts |
| `selftests` | no | earlier self-test specs, rerun in both modes (merge agent; fixer) |
| `groups` | no | retarget groups `[{key, scope}]` |

Definitions every agent receives: a finding counts only with a concrete perturbation that a correct
gate set would catch and the live gates pass. "Loosened" means a fact an old check bound is bound by
no check while the text still states it, or a retired wording can return with the gates green. A
binding moved to new wording is not loosening. A fact removed on purpose turns its presence check into
an absence check; it is never dropped. A bar an approved change reverses is narrowed to the one
sentence that needs it, never dropped; the reopened wording is tested in every other place.

Patches are proposed, never applied to the live gate files. The merge agent returns the sha256 of the
gate files it tested, so the landing can confirm the live files equal the tested ones.

Cost: audit about `1 + (parts + documents + conflict + binding + readback) + one verifier per finding
+ 1`; retarget `1 + 4G + 1`.

---

## model-papers-study

**Use when** a section keeps failing the author's reading, he asks whether the papers he named were
read, or a new kind of section is about to be written.

Stages: Study (one reader per paper: the section paragraph by paragraph, how numbers become
substantive statements, how magnitudes are judged, how other studies are related to the paper's own
result, connectives, dynamics language, limits, register, the extra `focus` questions) → Synthesize
(one template, written as a checklist, including where the papers disagree) → Diagnose (the draft
against the template and every comment, at root) → Outline (one number per paragraph with its first
sentence and contents, sample paragraphs, lettered decisions) → Verify (the author as reader; facts;
rulings) → Finalize. `outline: false` stops after the diagnosis.

| Arg | Required | Meaning |
|---|---|---|
| `root`, `roundDir`, `scratch`, `section` | yes | `section` names the kind of section, e.g. "results and discussion" |
| `papers` | yes | `[{key, file, why}]`; `file` may join several files with " AND " |
| `draft` | yes | the current draft file(s) |
| `focus`, `exhibits`, `samples` | no | extra questions; the draft's tables and figures; which sample paragraphs to write |
| `comments`, `verdict`, `approverGuidance` | no | everything the author and the approver have said about the section |
| `standard`, `rulings`, `outputs`, `context` | no | as above; `context` are the files the section relies on |
| `mirrorLanguage` | no | first sentences and samples also in the mirror language |

Readers quote at most one short phrase per example, with its page, and describe the rest in their own
words. After the author approves the outline, one drafter writes the whole section so it reads as one
argument; then two rounds of checks and a diff against `before/` for anything dropped without approval.

Cost: N readers plus 7. The reading is the cost.

---

## Lessons from practice

Each comes from real rounds: an incident, or a check added after one. Together they are why the
stages exist. The general round and gate failure modes (comments first, a refuter given the comment
it tests, a proposal field is not text, write after every replacement, a rewrite drops approved
sentences, never loosen, text and gates changed together, mirrors through symlinks and disk, the
first-sentence and twice-rejected rules, agents' findings can be wrong) are in
`.claude/rules/working-rules.md` and `docs/WORKING_METHOD.md` sections 6 and 8; every refuter prompt
in these scripts carries the comment or rule it tests. The lessons below are the ones specific to the
workflows.

1. **Default to refuted.** Often half or more of the raised findings do not survive. A text finding must
   quote the file; a gate finding must come with a perturbation that someone else reran.
2. **Verify the drops too.** A drafter can drop an item as "already fixed" while the defect is still
   there. The facts verifier checks every drop.
3. **Two items on one sentence become one edit, and no two edits in a file overlap.** The finalizer
   merges overlapping edits in a file. A large file may be split across groups by section or line
   range; the Check stage then tests the edits for overlap. Parallel gate retargets do collide: two
   groups have bound one sentence to different wording. Merge and test the union.
4. **Glossary first.** Parallel translators who cannot see each other drift onto different words for one
   term. A glossary built from the existing mirrors before translation started kept them on one
   vocabulary; the terminology checker still found collisions across sections.
5. **Digit checks have blind spots.** A multiset comparison misses two values swapped between the
   languages (check the order too); numbers the source spells out must stay spelled out; a reference
   list with identifiers is copied byte for byte; a translator's status line left in the body carried a
   mirror-only digit.
6. **Digits do not see lost sentences.** A mirror once lacked whole paragraphs and a first sentence with
   no digits, and the digit gate passed. Count sentences per paragraph.
7. **Builds hang inside background agents.** A font dialog can block a CJK build with no error. Wrap
   builds in a timeout, check the output's modification time and the log's end, or build in the main
   session.
8. **Read the papers, not memory.** A rewrite drawn up without studying the papers the author had named
   drew his question whether they had been read at all. Study first; after approval one drafter writes the
   whole section so it reads as one argument.
9. **The reader lens catches what facts and rules miss.** A first-time-reader or role-based lens found
   logic jumps and unsourced steps the other lenses passed, and once caught a cut of a sentence that was
   the paragraph's evidence.
10. **A printed value has one home.** A cell or note printed by a generator is fixed in the generator; an
    edit to the generated file is lost at the next build.
