# [Round id] Landing Record: [what landed] ([YYYY-MM-DD] to [YYYY-MM-DD])

<!--
USAGE
- Written when a round has landed, in the round folder:
  quality_reports/[YYYY-MM-DD]_[topic]/[round]_landing.md
- This is where the round's history lives. The tracker row gets two or three lines and a
  pointer here, nothing more.
- Every count is copied from a tool's output, not remembered. Every path is relative to the
  repository root.
- Record your own errors in section 9, plainly.
- Commentary may be in the language the author reads best; every sentence quoted from the
  document stays verbatim in the document's language.
- Delete these comments when done.
-->

- **Author's words:** 「[comment message]」; on the proposal: 「[approval, e.g. "1 A 2 yes"]」
- **Proposal:** `[round folder]/[round]_proposal.md`
- **Plan:** `quality_reports/plans/[YYYY-MM-DD]_[topic].md` (status set to COMPLETED)
- **Annotated file backup:** `[round folder]/[file]` (sha256 `[...]`)
- **Before copies:** `[round folder]/before/` ([n] files, including the gate scripts)
- **Status:** landed, **NOT COMMITTED**

## 1. Drafting

- Workflow `[id]`, result `[round folder]/[result].json`: [shape, e.g. one drafter, three checkers
  (facts; standard and rulings; mirror and reader), one reviser].
- Main changes the checkers forced: [one line each].
- Agents interrupted (sleep, network): [which; rerun from cache] or "none".

## 2. What landed

[n] edits in [n] files, list in `[round folder]/edits_applied.json`.

1. **[location] ([comment #]):** [what changed, one or two lines]
2. **[location]:** [...]
3. **Not changed, answered:** [comment #: the answer]
4. **Approved document changed:** [yes/no; if yes, the approver's change-list item number]
5. **Unapproved changes found and restored:** [sentences changed outside the approved list, how
   they were found, restored to the `before/` wording] or "none"
6. **Choices made on delegation / left undone:** [what the author left to my judgment and what I
   chose; items deliberately not done, with the reason] or "none"

## 2b. Code and output changes

- [script]: [what changed and why]; rerun: [which outputs]; printed values unchanged: [yes / no,
  which] (figures compared: [identical / changed]). Or "none".

## 3. Standard and rules updated

- `[standard file]` [section]: [what was added or changed, with which landed sentence as example]

## 4. Gates

| Gate | Before round | After landing (fails) | Final |
|---|---|---|---|
| [gate script 1] | [n]/0 | [n] fail | [n]/0 |
| [gate script 2] | [n]/0 | [n] fail | [n]/0 |
| language digit check | [ok] | | [ok] |
| stale-value scan | 0 | | 0 |

- **Failing after landing:** `[round folder]/failing_after_landing.txt` ([n] checks).
- **Gate-change log:** `[round folder]/gates_[round]_changes.md` (per check: label, before → now,
  why not a loosening); every change marked `# [round]` in the gate script.
- **Retarget:** workflow `[id]`, [n] groups, each drafter → 2 loosening reviewers → finalizer;
  merge agent tested the union. [n] patches; cross-group conflicts fixed post-merge: [list or none].
  Live gate file hash equals the tested copy: [yes, hash prefix].
- **Old checks unchanged:** pass/fail lines identical except [n] relabelled / [n] required by the
  new text.
- **Rulings reversed (recorded, not loosened):** [earlier required → now barred, author's words]
- **Self-tests (scratch mirror, live files hashed before and after):** `[selftest script]`:
  [n] perturbations, [n] red; pre-round text restored: [n] red; after restore [n]/0. Logs: `[...]`.
  Earlier rounds' self-tests rerun under the new gates: [round: n/n red, ...].
- **Independent audit:** workflow `[id]`, [n] findings, [n] confirmed by perturbation, [n] patches.
  Confirmed: [one line each]. Refuted: [count, why].
- **Pre-existing gaps found** (real, but older than this round; not loosenings): [n]; closed in
  [follow-up landing id, workflow id] / still open.
- **Not yet closed:** [gaps the finalizer listed]

## 5. Builds and outputs

- [file]: EN [n] pp / [second language] [n] pp, 0 errors, 0 overfull, 0 unresolved
  (output timestamps and log endings checked).
- Derived formats (Word copies, combined full-document builds): rebuilt, residue [0].
- Redlines: `[round folder]/redline/` ([n] files, 0 overfull).

## 6. Read-back

- Readers: [n], given the author's comments, [both languages / one language].
- Findings: [n], confirmed [n]. Fixed: [one line each, gated]. Listed for the author: [...]

## 7. Ripples (listed, not applied)

- [file / section]: [what still says the old thing]

## 8. Left for the author

- [decision or item, one line each]

## 9. Errors I made this round

- [what I reported or did wrong, how it was found, what fixed it] or "none"

## 10. Cleanup

- Scratch mirrors deleted: [yes, paths] / kept: [which, why]. Free disk after: [n] GB.
