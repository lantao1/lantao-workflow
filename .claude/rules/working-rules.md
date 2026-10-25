---
description: Lantao's standing working rules for every session (communication, rounds, approval, gates, agent failure modes, disk hygiene). Full method in docs/WORKING_METHOD.md.
---

# Working Rules (always on)

Short form of `docs/WORKING_METHOD.md`. Read that file before running a revision round.

## Communication

- Reply to Lantao in **Chinese**. Everything that is or becomes deliverable content is **English**
  (document prose, proposed sentences, headings, labels, code comments, commit messages, emails).
  Give proposed sentences verbatim in English; commentary around them in Chinese. Round records
  (intake, proposal, landing) may carry Chinese commentary, quoted and proposed sentences verbatim.
- **Short and direct** (「太多太长太杂了 直接一点」, "too much, too long, too messy; be
  direct"): one line per answer, one numbered action list, at most two yes/no questions. He
  reads on the go and decides fast; a long report buries the decision. Old/new pairs, sweeps and
  evidence go in the plan or proposal file, linked.
- Number questions and letter options so he can answer in shorthand ("1 A 2 yes").
- If something he believes is not supported by the data, say so in one sentence with the numbers.
- Report your own mistakes plainly.

## Commits

- **Never commit unless he explicitly says so** ("just do it": `orchestrator-protocol.md`).
- Landing records and tracker rows say **NOT COMMITTED** until he does.

## The round

1. **Comments first, one by one.** Back up the annotated file, extract every comment, list each:
   where it points, what he asks, what you propose. No edits before the list exists.
2. **A comment is a sample of a defect class.** Distil a rule, sweep every file (and the
   language mirror, if any) for it, report the sweep even when empty.
3. **Check standing rulings** (tracker, memory, standard, landing records) before proposing.
   Never re-propose what he refused.
4. **Old and new side by side before anything lands.** Decisions carry a recommended option first.
   Nothing is written to a live document before he approves.
5. **Only his meaning.** No new facts, claims, numbers or citations. A repair that needs one is
   marked **NEW CONTENT** on its own line. Restoring text he cut is flagged, never silent.
6. **A replacement topic sentence is never longer or more complex than the approved one**; put
   the missing purpose in the body. Twice failed: delete. Both in `writing-standard.md` (K6, P10).
7. **Ripples are listed, not applied.** After any correction, search everything for the claim.
8. **Land with `before/` copies**, a script that requires unique matches and writes after every
   replacement, then diff every sentence against `before/` and account for each deletion.
9. **Gates, build, read-back, landing record, tracker row, cleanup.** Templates:
   `templates/annotation-intake.md`, `templates/round-proposal.md`,
   `templates/landing-record.md`.
10. **An approved document is the model.** Its rules live in one standard file every agent reads.
    Any later change to it is flagged for the approver and added to the approver's change list.

## Gates

- Run every gate after every landing, not only the ones the edit seems to touch.
- Bind a gate to the **whole sentence** and to the **output file** that produced the number,
  never to a bare typed value (a substring test for `14` passes on `214`).
- Retired wording gets absence checks in every file, every language, common variants included.
- **A gate never seen red is not a gate.** Self-test every new or retargeted check by
  perturbation, in a **scratch mirror**, never on live files; test each language separately.
- Retargets record before, now, and why it is not a loosening. Parallel retarget groups are
  merged and tested as a union. An independent audit checks loosening, coverage and false
  positives.
- If the text and its gate changed together (another tool, a parallel session), green proves
  nothing: diff sentences and gates against the last approved copy.
- Green proves only what is bound. It does not prove the data are built right.

## Top agent failure modes

1. Batch script prints "ok" and dies before writing. Write after each replacement.
2. A correction lands in one file and does not sweep.
3. A rewrite silently drops approved sentences, and retargeted gates certify the drop.
4. A finding whose "proposed" field is an instruction gets applied literally. Scan edited files
   for proposal vocabulary (`NEW CONTENT`, `No change`, `King:`) and stray other-language text.
5. A refuter not given the author's new comment refutes it with an old approval.
6. A build is reported clean from a stale log. Check the output's modification time and log end.
7. An agent's finding is itself wrong. Verify every surviving finding against the text and the
   output yourself before it lands.

## Disk and scratch mirrors

- Scratch mirrors add up to tens of GB. Check `df -h` before a large fan-out; copy heavy data only
  when an agent perturbs it; never perturb data through a symlink into the repository.
- Each agent deletes its own mirror; delete the round's mirrors once results are saved.
  Guard deletions: `rm -rf "${SP:?}/${name:?}"`.
- Request keep-awake for long runs; rerun only failed groups from cache.
