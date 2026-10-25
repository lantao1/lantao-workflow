# Annotation Intake: [document] ([YYYY-MM-DD])

<!--
USAGE
- Fill this in at the START of the turn in which the author sends comments, before any edit.
- Save it in the round folder: quality_reports/[YYYY-MM-DD]_[topic]/annotation_intake.md
- Back up the annotated PDF first (copy + hash). Never rebuild a PDF over an annotated one.
- Extract the annotations to annotations.json (one object per comment: page, type, comment,
  quoted text, surrounding context), for example with a PDF annotation reader such as PyMuPDF.
- Quote the author's comments verbatim, in his language. Commentary may be in the language he
  reads best; any sentence quoted from the document stays verbatim in the document's language.
- Each comment is a SAMPLE of a defect class: section 3 turns it into a rule and a sweep.
- This file feeds templates/round-proposal.md. Chat gets only the short report.
- Delete these comments when done.
-->

## 1. Source

- **Author's message (verbatim):** 「[...]」
- **Annotated file:** `[path]` backed up as `[round folder]/[file]_annotated_[date].pdf`
  (sha256 `[first 8 chars]...`)
- **Extraction:** `[round folder]/annotations.json`, [N] annotations, [N] pages.
- **Other comments** (chat, email, the approver's notes): [list or "none"]

## 2. Comments, one by one

| # | Page | Points at (quoted text) | Comment (verbatim) | What he asks for | Defect class / rule | Proposed response |
|---|---|---|---|---|---|---|
| 1 | [p] | "[quoted sentence]" | 「[...]」 | [plain restatement] | [rule name or "new rule"] | [edit / answer only / decision needed] |
| 2 | | | | | | |

Notes:

- A comment that is a question gets an answer; it is not automatically an edit.
- A comment that repeats an earlier one on the same sentence: say how many times it has come
  back. Twice failed means propose deletion, not a third rewrite.
- A comment that needs a fact, number or claim not already in the text: mark **NEW CONTENT**.

## 3. Rules distilled and sweep plan

| Rule | From comment(s) | Sweep scope (every file; the language mirror too, if any) | Instances found (marked / unmarked) |
|---|---|---|---|
| [R-a: one-line statement of the rule] | #1, #4 | [all live files] | [n] / [n] |
| [R-b] | #2 | | [0, reported anyway] |

## 4. Standing rulings checked

- [ ] Tracker rows for the files involved
- [ ] Memory files and the standard
- [ ] Recent landing records and proposals
- **Conflicts found:** [comment #n vs earlier ruling X: the newer instruction wins, recorded as a
  reversal] or "none"
- **Previously refused, not to re-propose:** [list or "none"]

## 5. Verification needed before proposing

| # | Claim to check | Source (output file, table, paper) | Result |
|---|---|---|---|
| [n] | [what the author asked about or asserted] | [path] | [verified / not supported: one line with the numbers] |

## 6. Next

- Proposal file: `[round folder]/[round]_proposal.md` (templates/round-proposal.md)
- Plan file: `quality_reports/plans/[YYYY-MM-DD]_[topic].md`
- Questions for the author (at most two, answerable by number and letter):
  1. [...]
