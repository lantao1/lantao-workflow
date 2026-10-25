export const meta = {
  name: 'group-landing',
  description: 'Land approved edits per file group (drafter, facts verifier, rulings verifier, finalizer), apply them in a scratch mirror, scan for proposal vocabulary and stray script, account for every deleted sentence against before/ copies; write live files only when apply is true and the checks are clean.',
  whenToUse: 'The author has approved a proposal (e.g. "1 A 2 yes"). Run it to turn the approved items into exact, verified edits and to prove nothing else changed. Default is a dry run in scratch.',
  phases: [
    { title: 'Plan', detail: 'partition the approved items into file groups (skipped when groups are given)' },
    { title: 'Draft', detail: 'one drafter per group: recheck each item on the live text, exact old/new, mirror included' },
    { title: 'Verify', detail: 'facts verifier and rulings verifier per group' },
    { title: 'Finalize', detail: 'one finalizer per group' },
    { title: 'Check', detail: 'apply in a scratch mirror; vocabulary and stray-script scan; deletion accounting; gates' },
    { title: 'Land', detail: 'only with apply true and a clean check: before/ copies, apply, re-scan, re-account' },
  ],
}

/*
 * group-landing: approved items -> verified exact edits -> a landing that accounts for itself.
 *
 * PURPOSE
 *   An approved proposal is rechecked against the live text (it may have moved since the
 *   proposal), drafted as exact replacements per file group, verified for facts and for the
 *   standing rulings, and finalized. The union is applied first in a scratch mirror, where three
 *   checks run that no reviewer reliably does by eye:
 *     1. proposal vocabulary written into the text ("NEW CONTENT", "No change", "King:", "(CN:" ...);
 *     2. stray script of the other language in a file (e.g. CJK in an English file);
 *     3. deletion accounting: every sentence present in before/ and absent after is mapped to an
 *        approved edit, and every new sentence to an edit's new text. Anything unmapped stops the landing.
 *   Only when apply is true and all three are clean does the Land stage copy the live files and the
 *   gate files to before/, apply the edits one at a time (writing the file after each), and repeat
 *   the checks on the live files.
 *
 *   DRY RUN, THEN LAND WHAT YOU READ. Run first with apply false and read the report. Then relaunch
 *   the same script with the same args, apply true, and resumeFromRunId set to the dry run's runId.
 *   No prompt before Land contains the apply flag, so the Plan, Draft, Verify, Finalize and Check
 *   results come back from the cache and exactly the edits you read are landed. Never set apply true
 *   on a fresh run: the drafters would run again and land a draft nobody has read.
 *
 * ARGS (JSON example)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "roundId": "R2",
 *     "roundDir": "quality_reports/2027-01-15_results_comments",
 *     "scratch": "<session scratchpad>/group-landing",
 *     "proposal": "quality_reports/2027-01-15_results_comments/R2_proposal.json",
 *     "approval": "1 A 2 yes",
 *     "items": [{"id": "P1", "decision": "apply"}, {"id": "P4", "decision": "apply-part", "note": "first sentence only"},
 *               {"id": "P5", "decision": "apply"}, {"id": "P6", "decision": "apply"}, {"id": "P7", "decision": "drop"}],
 *     "groups": [{"key": "results", "files": ["paper/results.tex", "paper/results_zh.tex"], "items": ["P1", "P4"]},
 *                {"key": "app_a", "files": ["paper/appendix.tex"], "scope": "from the start to the first table", "items": ["P5"]},
 *                {"key": "app_b", "files": ["paper/appendix.tex"], "scope": "from the first table to the end", "items": ["P6"]}],
 *     "mirrorPairs": [["paper/results.tex", "paper/results_zh.tex"]],
 *     "mirrorLanguage": "Chinese",
 *     "standard": ["docs/writing/WRITING_STANDARD.md", ".claude/rules/working-rules.md"],
 *     "rulings": ["quality_reports/TRACKER.md"],
 *     "outputs": ["results/current/"],
 *     "generators": ["scripts/make_tables.py"],
 *     "gates": [{"name": "claims", "file": "scripts/gates/paper_gate.py", "cmd": "python3 scripts/gates/paper_gate.py"},
 *               {"name": "digits", "cmd": "python3 scripts/gates/mirror_digit_fidelity.py --pair paper/results.tex paper/results_zh.tex"}],
 *     "gateFiles": ["scripts/gates/paper_gate.py"],
 *     "gatesDir": "scripts/gates",
 *     "beforeDir": "quality_reports/2027-01-15_results_comments/before",
 *     "mirrorCopy": ["paper", "scripts", "results/current", "tables"],
 *     "approvedDocuments": ["paper/data.tex"],
 *     "apply": false
 *   }
 *   Required: root, roundId, roundDir, scratch, proposal, items.
 *   items carries the author's ruling per proposal item: apply, apply-part (with a note saying
 *   which part) or drop. A drop is never reopened. groups is optional: without it a Plan agent
 *   partitions the items so that each file, with its mirror, belongs to one group. A large file may
 *   be split across groups by section or line range: then every group that holds it states its
 *   scope, each drafter edits only inside its scope, and the Check stage tests that no two edits in
 *   one file overlap. A file in two groups without a scope on each stops the run.
 *   gates are run in the scratch mirror after the edits; red checks there are expected where a
 *   gate binds the old wording and are listed for the retarget step (gate-audit, mode retarget).
 *   gateFiles (default: every gates[].file) are copied into beforeDir with the texts when landing,
 *   so that gate-audit can diff the gates against their pre-round state.
 *   beforeDir (default <roundDir>/before) holds the pre-landing copies and is never overwritten.
 *   A round that lands more than once (read-back fixes, critic fixes, a second pass) gives each
 *   pass after the first its own folder, e.g. <roundDir>/before_<pass>; the round-level before/
 *   stays the pre-round state that gate-audit and the deletion accounting compare against.
 *
 * OUTPUTS
 *   Always:   <scratch>/check/report.json (the scratch check), returned as check.
 *   apply:    <beforeDir>/<files and gate files> (never overwritten once present),
 *             <roundDir>/edits_applied.json, <roundDir>/failing_after_landing.txt,
 *             <roundDir>/deletion_accounting.md
 *   Return value: {groups, check, landed}
 *
 * COST
 *   1 (plan) + 4 per group + 1 (check) + 1 (land, when applying).
 */

const A = args || {}
const NAME = 'group-landing'
const REQUIRED = ['root', 'roundId', 'roundDir', 'scratch', 'proposal', 'items']
const missing = REQUIRED.filter(k => A[k] === undefined || A[k] === null || A[k] === '')
if (missing.length) throw new Error(`${NAME}: missing args: ${missing.join(', ')}. See the header comment for an example.`)
if (!Array.isArray(A.items) || !A.items.length) throw new Error(`${NAME}: items must be a non-empty array of {id, decision, note?}`)
const BAD = A.items.filter(i => !['apply', 'apply-part', 'drop'].includes(i.decision))
if (BAD.length) throw new Error(`${NAME}: item decisions must be apply, apply-part or drop: ${BAD.map(i => i.id).join(', ')}`)

const ROOT = A.root
const RD = A.roundDir
const SCR = A.scratch
const BEFORE = A.beforeDir || `${RD}/before`
const GD = A.gatesDir || 'scripts/gates'
const ML = A.mirrorLanguage || ''
const STANDARD = A.standard || ['docs/writing/WRITING_STANDARD.md', '.claude/rules/working-rules.md']
const RULINGS = A.rulings || []
const OUTPUTS = A.outputs || []
const GENERATORS = A.generators || []
const GATES = A.gates || []
const GATE_FILES = [...new Set((A.gateFiles || []).concat(GATES.map(g => g.file).filter(Boolean)))]
const PAIRS = A.mirrorPairs || []
const APPROVED = A.approvedDocuments || []
const APPLY = A.apply === true
const E = A.effort || {}

const bullet = xs => (xs && xs.length ? xs.map(x => `  - ${x}`).join('\n') : '  (none given)')
const opt = o => { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }
const itemLine = A.items.map(i => `  ${i.id}: ${i.decision.toUpperCase()}${i.note ? ` (${i.note})` : ''}`).join('\n')

// The vocabulary of proposals (docs/WORKING_METHOD.md section 8, item 8; scripts/gates/prose_audit.py
// PROPOSAL_VOCAB) plus the field labels of templates/round-proposal.md.
const PROPOSAL_VOCAB = ['King:', 'NEW CONTENT', 'Move the', '(CN:', '[CN]', 'No change', 'Wording unchanged', 'Old:', 'New:', 'Mirror:']

const CTX = `
PROJECT ROOT: ${ROOT}
The author approved a proposal: ${A.proposal}
His words on it (verbatim): ${A.approval ? `「${A.approval}」` : '(not given)'}
His ruling per item (fixed; do not reopen a DROP):
${itemLine}
Mirror pairs (source, mirror):${PAIRS.length ? '\n' + PAIRS.map(p => `  - ${p[0]}  <->  ${p[1]}`).join('\n') : ' (none)'}${ML ? `\nMirror language: ${ML}.` : ''}
Approved documents (any change is flagged for the approver and listed for his change list):
${bullet(APPROVED)}
Standard files (read first):
${bullet(STANDARD)}
Standing rulings:
${bullet(RULINGS)}
Machine outputs every number must match:
${bullet(OUTPUTS)}
Generators: a value or note printed by a generator is fixed in the generator, never in the generated file:
${bullet(GENERATORS)}

READ ONLY unless this prompt names a path you may write. Scratch work goes under ${SCR}/<your label>/.

LANDING RULES:
1. Recheck each approved item on the LIVE text: it may have changed since the proposal. If the
   defect is already gone or the item is now false, say so (decision drop, with the reason); never
   force an edit onto text that moved.
2. An edit is {file, old, new}. old is copied from the live file and occurs EXACTLY ONCE in it
   (normalize runs of whitespace to one space in both before counting). Prefer whole sentences.
3. Every source edit carries its mirror edit in the same item, same digits in the same order.
4. Two items that touch one sentence become ONE edit on the earlier item; the other says so.
5. Draft only what the item allows. A proposal field that is an instruction ("No change to the
   sentence; add a check ...", "Move the ... to ...") is NOT text: write the actual text, or no edit.
6. Never add content the author has not approved. A first-sentence change or a change to an
   approved document is flagged.`

const EDIT = {
  type: 'object',
  properties: { file: { type: 'string' }, old: { type: 'string' }, new: { type: 'string' } },
  required: ['file', 'old', 'new'],
}
const ITEM = {
  type: 'object',
  properties: {
    id: { type: 'string' }, decision: { type: 'string', enum: ['apply', 'drop'] },
    reason: { type: 'string', description: 'why apply as drafted, or why dropped (already fixed, moved, false on the live text, barred by a ruling)' },
    edits: { type: 'array', items: EDIT },
    numbers_checked: { type: 'string', description: 'every number in the new text and the output file and row it came from' },
    gates: { type: 'string', description: 'gate checks that bind the old wording or its numbers (label and line), or "none"' },
    flags: { type: 'string', description: 'first-sentence change, approved document, generator edit; "none" if none' },
  },
  required: ['id', 'decision', 'reason', 'edits', 'numbers_checked', 'gates', 'flags'],
}
const DRAFT = { type: 'object', properties: { items: { type: 'array', items: ITEM } }, required: ['items'] }
const VERDICT = {
  type: 'object',
  properties: { verdicts: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, verdict: { type: 'string', enum: ['approve', 'amend', 'reject'] }, reason: { type: 'string' },
    amended_edits: { type: 'array', items: EDIT },
  }, required: ['id', 'verdict', 'reason'] } } },
  required: ['verdicts'],
}
const FINAL = {
  type: 'object',
  properties: {
    items: { type: 'array', items: ITEM },
    open_for_author: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, question: { type: 'string' } }, required: ['id', 'question'] } },
  },
  required: ['items', 'open_for_author'],
}
const GROUPS = {
  type: 'object',
  properties: { groups: { type: 'array', items: { type: 'object', properties: {
    key: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, items: { type: 'array', items: { type: 'string' } },
    scope: { type: 'string', description: 'only when a file is split across groups: the section or line range this group may edit; empty otherwise' },
  }, required: ['key', 'files', 'items'] } } },
  required: ['groups'],
}
const CHECK = {
  type: 'object',
  properties: {
    applied: { type: 'integer' }, failed_to_apply: { type: 'array', items: { type: 'string' } },
    vocabulary_hits: { type: 'array', items: { type: 'string' } },
    stray_script_hits: { type: 'array', items: { type: 'string' } },
    unaccounted_deletions: { type: 'array', items: { type: 'string' } },
    unexplained_additions: { type: 'array', items: { type: 'string' } },
    overlaps: { type: 'array', items: { type: 'string' }, description: 'pairs of edits (item ids, file) whose old spans overlap or fall in one sentence; empty if none' },
    gate_results: { type: 'string', description: 'per gate: checks, fails; the failing check labels' },
    clean: { type: 'boolean', description: 'true only if every edit applied and the overlap, vocabulary, stray-script and accounting lists are all empty' },
    report_path: { type: 'string' },
  },
  required: ['applied', 'failed_to_apply', 'vocabulary_hits', 'stray_script_hits', 'unaccounted_deletions', 'unexplained_additions', 'overlaps', 'gate_results', 'clean', 'report_path'],
}
const LANDED = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, sha256_before: { type: 'string' }, sha256_after: { type: 'string' }, edits: { type: 'integer' } }, required: ['file', 'sha256_before', 'sha256_after', 'edits'] } },
    check: CHECK,
    written: { type: 'array', items: { type: 'string' } },
  },
  required: ['files', 'check', 'written'],
}

// ---------------------------------------------------------------- Plan
let groups = A.groups
if (!groups) {
  phase('Plan')
  const planned = await agent(`${CTX}

STAGE: PLAN. Read the proposal and list, for every item whose ruling is apply or apply-part, the
files it edits (source and mirror). Partition the items into groups so that each file belongs to
one group, a source file and its mirror are in the same group, and an approved document is a group
of its own. A file with many items may be split across groups by section or line range: then every
group that holds it gets a scope naming its section or range, the scopes do not overlap, and two
items on one sentence stay in one group. Aim for groups of similar size; keep related files (a
document and its notes or generator) together.`, opt({ label: 'plan', phase: 'Plan', schema: GROUPS }))
  groups = planned ? planned.groups : []
}
const fileOwners = {}
for (const g of groups) for (const f of g.files) (fileOwners[f] = fileOwners[f] || []).push(g.key)
const shared = Object.keys(fileOwners).filter(f => fileOwners[f].length > 1)
const unscoped = shared.filter(f => groups.some(g => g.files.includes(f) && !(g.scope && g.scope.trim())))
if (unscoped.length) throw new Error(`${NAME}: a file is in more than one group without a scope on each: ${unscoped.join(', ')}. Give every group that holds it a section or line range, or regroup.`)
if (shared.length) log(`${shared.length} file(s) split across groups by scope: ${shared.map(f => `${f} (${fileOwners[f].join(', ')})`).join('; ')}. The Check stage tests their edits for overlap.`)
if (!groups.length) throw new Error(`${NAME}: no groups to land`)
log(`${groups.length} groups: ${groups.map(g => `${g.key} (${g.items.length})`).join(', ')}`)

// ---------------------------------------------------------------- Draft -> Verify -> Finalize
const results = await pipeline(groups,
  g => agent(`${CTX}

STAGE: DRAFT, group ${g.key}. Files: ${g.files.join(', ')}. Items: ${g.items.join(', ')}.${g.scope && g.scope.trim() ? `
Scope: ${g.scope}. Other groups edit the rest of the same file in parallel: keep every old inside
this scope. If an item needs text outside it, draft the edit and write "outside scope" in its flags,
so the overlap test of the Check stage covers it.` : ''}
For each item: read it in the proposal, find the current text, decide whether the defect still
exists, and draft exact edits (rules 1-6). Recompute every number you print from the outputs and
list it in numbers_checked. Search the gate files for the old phrases and numbers and list the
checks that bind them in gates. Return every item of the group with a decision.`,
    opt({ label: `draft:${g.key}`, phase: 'Draft', schema: DRAFT, effort: E.draft || 'high' })),
  (d, g) => d ? parallel(['facts', 'rulings'].map(lens => () => agent(`${CTX}

STAGE: VERIFY (${lens}), group ${g.key}. Default to finding problems; approve only what you checked.
${lens === 'facts'
    ? `For every edit: (a) old occurs exactly once in the live file (whitespace-normalized); (b) every
number, sign, rank, significance word and star in new is true on the outputs (recompute); (c) the
claim of the new sentence is true of what it describes; (d) source and mirror say the same thing
with the same digits; (e) a cited source is in the reference list or a full entry is supplied;
(f) for a drop: is the defect really gone? If an item was dropped while its defect is still
present, verdict amend and supply the edits.`
    : `Read the standard files and the rulings first. For every edit: does it follow the author's
ruling for that item (apply, apply-part, drop) and add nothing beyond it; first-sentence
discipline (a replacement first sentence never heavier than the old); no defensive prose; a limitation said once;
one name per object across the documents (grep the other files); pointers by name; no proposal
wording written as text; approved documents changed minimally and flagged; the mirror reads as
natural prose in its own language with no added emphasis. Also: does the edit contradict another
document? (grep for the same claim.)`}

DRAFT (JSON):
${JSON.stringify(d)}

Return one verdict per item id: approve, amend (full corrected edit list in amended_edits), or
reject (say why and what should happen instead).`,
    opt({ label: `${lens}:${g.key}`, phase: 'Verify', schema: VERDICT, effort: E.verify || 'high' })))).then(([vf, vr]) => ({ d, vf, vr })) : null,
  (x, g) => x ? agent(`${CTX}

STAGE: FINALIZE, group ${g.key}. Merge the draft and the two verifier reports. An item lands if both
approve, or if amendments resolve every objection (when the two amend differently, write one edit
that satisfies both and recheck it yourself). A rejection backed by evidence (a false number, a
broken ruling) wins: drop the item or fix the edit. Every final old must occur exactly once in its
live file; two edits in one file must not overlap (merge them). Keep source and mirror in step.
Put only a genuine decision in open_for_author (rare: the author has ruled).

DRAFT: ${JSON.stringify(x.d)}
FACTS: ${JSON.stringify(x.vf)}
RULINGS: ${JSON.stringify(x.vr)}`, opt({ label: `final:${g.key}`, phase: 'Finalize', schema: FINAL, effort: E.draft || 'high' }))
    .then(f => (f ? { group: g.key, files: g.files, final: f } : null)) : null)
const finals = results.filter(Boolean)
const edits = finals.flatMap(f => f.final.items.filter(i => i.decision === 'apply').flatMap(i => i.edits.map(e => ({ item: i.id, group: f.group, ...e }))))
const stray = edits.filter(e => !(fileOwners[e.file] || []).includes(e.group))
if (stray.length) log(`WARNING: ${stray.length} edits touch a file outside their group: ${stray.map(e => `${e.item}@${e.file}`).join(', ')}`)
const open = finals.flatMap(f => f.final.open_for_author)
log(`${finals.length} of ${groups.length} groups finalized; ${edits.length} edits; ${open.length} open for the author`)
if (finals.length < groups.length) log(`WARNING: groups not finalized: ${groups.filter(g => !finals.find(f => f.group === g.key)).map(g => g.key).join(', ')}. Nothing will land until they are.`)

// ---------------------------------------------------------------- Check (scratch mirror)
const SCAN = (where, beforeRef) => `
SCANS, on every edited file ${where}:
1. PROPOSAL VOCABULARY: run python3 ${GD}/prose_audit.py <file> (with --lang zh for a Chinese file)
   and keep its proposal-leak and stray-cjk findings; also grep -n -F for each of:
   ${PROPOSAL_VOCAB.map(v => JSON.stringify(v)).join(', ')}
   and report hits that are new relative to ${beforeRef} (an occurrence already there before is not a hit).
2. STRAY SCRIPT: characters of the other language where they should not be (CJK or full-width
   punctuation in a source-language file; untranslated source-language sentences in a mirror),
   new relative to ${beforeRef}.
3. DELETION ACCOUNTING: split each file's body into sentences, before (${beforeRef}) and after.
   Every sentence present before and absent after must be covered by the old text of an approved
   edit for that file: list each one that is not as UNACCOUNTED, with the file. Every sentence
   present after and absent before must come from an edit's new text: list each one that is not
   as UNEXPLAINED. Write the accounting (deleted, added, each mapped to an edit id) to the report.`

phase('Check')
const check = (finals.length === groups.length && edits.length) ? await agent(`${CTX}

STAGE: CHECK IN A SCRATCH MIRROR. Nothing is written under ${ROOT}.
1. Check free disk space (df -h); stop and report if it is under about 10 GB.
2. Build the mirror at ${SCR}/check/mirror (it must not exist yet, and must not be ${ROOT}): copy
   (cp -R) ${(A.mirrorCopy || ['the folders that hold the edited files', 'the gate scripts', 'the outputs the gates read']).join(', ')},
   and symlink every other top-level entry. Never write through a symlink. Keep a pristine copy of
   each edited file at ${SCR}/check/before/<same relative path>.
3. OVERLAP TEST, before applying anything: in each pristine file, locate the span of every edit's old
   (whitespace-normalized). List as an overlap every pair of edits in one file whose spans overlap or
   fall in the same sentence (they come from different items or, for a file split across groups,
   from different groups; two items on one sentence must be one edit). Do not apply an edit that
   overlaps; record it under overlaps and failed_to_apply.
4. Apply the edits below in order with a small Python script that, for each edit, normalizes
   whitespace to find old, asserts it occurs exactly once, replaces it, and WRITES THE FILE AFTER
   EVERY SINGLE REPLACEMENT (a batch that dies before writing loses every edit silently). Log each
   edit as applied or failed with the reason.
${SCAN('in the mirror', `${SCR}/check/before/`)}
5. GATES: run each of these from the mirror root, wrapped in a timeout
   (perl -e 'alarm 900; exec @ARGV' <cmd>), and record checks and fails per gate:
${bullet(GATES.map(g => `${g.name}: ${g.cmd}`))}
   Red checks that bind the old wording are expected; list their labels for the retarget step.
6. Write the full report to ${SCR}/check/report.json. clean = true only if every edit applied and
   the overlap, vocabulary, stray-script, unaccounted and unexplained lists are all empty.
7. Delete ${SCR}/check/mirror before you return (keep report.json and before/).

EDITS (${edits.length}):
${JSON.stringify(edits, null, 1)}`, opt({ label: 'check', phase: 'Check', schema: CHECK, effort: E.check || 'high' })) : null
// The verdict is computed here from the lists, never taken from the agent's own clean flag.
const blockers = []
if (!check) blockers.push('the scratch check did not run (a group is missing, or nothing to apply)')
else {
  if (check.applied !== edits.length || check.failed_to_apply.length) blockers.push(`${edits.length - check.applied} edit(s) did not apply`)
  if (check.overlaps.length) blockers.push(`${check.overlaps.length} overlapping edit pair(s)`)
  if (check.vocabulary_hits.length) blockers.push(`${check.vocabulary_hits.length} proposal-vocabulary hit(s)`)
  if (check.stray_script_hits.length) blockers.push(`${check.stray_script_hits.length} stray-script hit(s)`)
  if (check.unaccounted_deletions.length) blockers.push(`${check.unaccounted_deletions.length} unaccounted deletion(s)`)
  if (check.unexplained_additions.length) blockers.push(`${check.unexplained_additions.length} unexplained addition(s)`)
  if (!check.clean) blockers.push('the check agent itself reported not clean')
}
if (open.length) blockers.push(`${open.length} question(s) open for the author`)
if (check) log(`check: ${check.applied}/${edits.length} applied; overlaps ${check.overlaps.length}, vocabulary ${check.vocabulary_hits.length}, stray ${check.stray_script_hits.length}, unaccounted ${check.unaccounted_deletions.length}, unexplained ${check.unexplained_additions.length}; gates: ${check.gate_results}`)
log(blockers.length ? `not clean: ${blockers.join('; ')}` : 'scratch check clean')

// ---------------------------------------------------------------- Land (live files, only on request and only when clean)
let landed = null
if (APPLY && !blockers.length) {
  phase('Land')
  landed = await agent(`${CTX}

STAGE: LAND. You may write ONLY the edited files listed below and files under ${RD}/ and ${BEFORE}/.
1. For each edited file, and for each gate file below, copy the live file to
   ${BEFORE}/<same relative path> unless a copy is already there. Never overwrite a before/ copy; if
   one exists and differs from the live file, STOP and report: the file changed after an earlier
   landing (a later landing pass of the same round uses its own before folder). The gate copies are
   what gate-audit diffs the retargeted gates against.
   Gate files: ${GATE_FILES.length ? GATE_FILES.join(', ') : '(none given: say so in the report; gate-audit in audit mode will stop without them)'}
2. Record the sha256 of each live file, then apply the edits exactly as in the scratch check: one
   at a time, old must occur exactly once (whitespace-normalized), and the file is written after
   every single replacement. Stop at the first failure and report it; do not continue past it.
3. Verify each new text is now present exactly once and each old text is gone.
${SCAN('in the live tree', `${BEFORE}/`)}
4. Run the gates (from ${ROOT}, each wrapped in perl -e 'alarm 900; exec @ARGV') and write their failing
   check labels to ${RD}/failing_after_landing.txt:
${bullet(GATES.map(g => `${g.name}: ${g.cmd}`))}
5. Write ${RD}/edits_applied.json (every edit with item id, file, old, new, applied true/false) and
   ${RD}/deletion_accounting.md (every deleted and added sentence, mapped to its edit id).
Report sha256 before and after per file. Do not commit.

EDITS (${edits.length}):
${JSON.stringify(edits, null, 1)}`, opt({ label: 'land', phase: 'Land', schema: LANDED, effort: E.check || 'high' }))
} else if (APPLY) {
  log('Land skipped: apply was requested but the landing is blocked (see "not clean" above). Fix and rerun.')
}

return { groups: finals, open_for_author: open, edits: edits.length, check, blockers, landed }
