export const meta = {
  name: 'gate-audit',
  description: 'Audit or retarget the gates that bind a text to its sources. Audit: independent lenses try to loosen or perturb each gate group, every finding must be demonstrated by a perturbation in a private mirror, a fixer proposes tested patches. Retarget: per group a drafter, two loosening auditors and a finalizer; a merge agent tests the union. Self-tests run in mirrors under the system temp dir, never on live files; patches are proposed, not applied.',
  whenToUse: 'After a landing broke gates (retarget), and after any retarget or new gate block (audit), before the round is called done. Also when another tool or session changed text and gates together, so green proves nothing.',
  phases: [
    { title: 'Prepare', detail: 'diffs of the gate files since before/ (audit stops without them), baseline counts, failing checks located' },
    { title: 'Audit', detail: 'loosening per diff part, coverage per document, conflicts and vacuity, binding correctness, optional read-back' },
    { title: 'Verify', detail: 'each finding demonstrated or refuted in the verifier\'s own mirror' },
    { title: 'Fix', detail: 'one fixer drafts and self-tests patches for the confirmed findings' },
    { title: 'Draft', detail: 'retarget mode: one drafter per group' },
    { title: 'Review', detail: 'retarget mode: two loosening auditors per group' },
    { title: 'Finalize', detail: 'retarget mode: one finalizer per group' },
    { title: 'Merge', detail: 'retarget mode: the union applied, tested, cross-audited and self-tested' },
  ],
}

/*
 * gate-audit: keep the gates honest.
 *
 * PURPOSE
 *   A gate binds a printed fact (a number and its output row, a sentence and its place, a retired
 *   wording's absence) so that a change turns it red. Gates loosen silently: a retarget drops a
 *   binding, a section split returns "" when a heading changes so an absence passes vacuously, a
 *   condition becomes always true, a substring test passes on a coincidence, two groups bind the
 *   same sentence to different wording. A tool that rewrites text and gates together makes green
 *   prove nothing. This workflow attacks the gates, never the live files:
 *     audit     independent auditors per lens; a finding counts only with a concrete perturbation
 *               (an exact unique edit to a copied file, or a data edit) that a correct gate set
 *               would catch and the live gates pass. A verifier rebuilds it in its own mirror.
 *               A fixer drafts patches for confirmed findings and self-tests them.
 *     retarget  after a landing broke gates: groups draft in-place retargets (never loosening) and
 *               new check blocks; two auditors per group; a finalizer; a merge agent applies the
 *               union in a fresh mirror, compares every old check's verdict, fixes cross-group
 *               conflicts and self-tests every new binding. Earlier self-tests are rerun.
 *   "Loosened" means: a fact an old check bound is bound by no check of the live gate set while the
 *   text still states it, or a retired wording can return with every gate green. A retarget that
 *   moves a binding to new wording is not loosening. Where a round removed a fact on purpose, the
 *   old presence check becomes an absence check; it is never simply dropped.
 *
 * ARGS (JSON example)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "roundId": "R2",
 *     "roundDir": "quality_reports/2027-01-15_results_comments",
 *     "scratch": "<session scratchpad>/gate-audit",
 *     "mode": "audit",
 *     "gates": [{"name": "claims", "file": "scripts/gates/paper_gate.py", "cmd": "python3 scripts/gates/paper_gate.py",
 *                "anchor": "sys.exit(g.report())", "prefix": "_r2"}],
 *     "before": "quality_reports/2027-01-15_results_comments/before",
 *     "documents": ["paper/results.tex", "paper/results_zh.tex", "paper/intro.tex"],
 *     "dataDirs": ["results/current", "tables"],
 *     "roundChanges": "quality_reports/2027-01-15_results_comments/edits_applied.json",
 *     "removedOnPurpose": ["The results hold in every specification."],
 *     "addedOnPurpose": ["the class-size magnitude sentence in the results"],
 *     "reopenedOnPurpose": [{"wording": "the 1990 and 2010 class-size means",
 *                            "sentence": "the second sentence of the results' third paragraph"}],
 *     "untouched": ["paper/data.tex"],
 *     "standard": ["docs/writing/WRITING_STANDARD.md", ".claude/rules/working-rules.md"],
 *     "rulings": ["quality_reports/TRACKER.md"],
 *     "comments": ["quality_reports/2027-01-15_results_comments/annotations.json"],
 *     "diffParts": 3,
 *     "lenses": ["loosen", "cover", "conflict", "binding", "readback"],
 *     "selftests": ["quality_reports/2027-01-05_first_round/selftest_r1.json"],
 *     "gatesDir": "scripts/gates",
 *     "mirrorCopy": ["paper", "scripts", "results/current", "tables"]
 *   }
 *   Retarget mode adds:
 *     "mode": "retarget",
 *     "failing": "quality_reports/2027-01-15_results_comments/failing_after_landing.txt",
 *     "groups": [{"key": "g1", "scope": "paper_gate.py lines 1-400"}, {"key": "new", "scope": "new facts block"}]
 *   Required: root, roundId, roundDir, scratch, gates, documents; before (audit); failing (retarget).
 *   before must hold the pre-round copies of the gate files (group-landing writes them with the
 *   texts): audit mode stops after Prepare when one is missing, since the loosening lens has no diff.
 *   gates[].anchor is the line before which new check blocks are inserted; gates[].prefix the
 *   helper-name prefix this round's new code must use (each group appends its own letter).
 *   groups is optional in retarget mode: without it, Prepare splits the failing checks by line range.
 *   reopenedOnPurpose: a bar an approved change reverses. It is reopened ONLY for the one sentence
 *   named; every other retired form stays barred, and the auditors test the reopened wording in
 *   every other place, file and language.
 *   standard, rulings and comments (the author's comments of the round) are given to the read-back
 *   lens and its verifier. selftests (earlier rounds' self-test specs) are rerun in both modes: by
 *   the merge agent in retarget mode and by the fixer on its patched mirror in audit mode.
 *
 * OUTPUTS (patches are proposed, never applied to the live gate files)
 *   <scratch>/prepare/   gate diffs (whole and in parts), baseline counts
 *   audit:    return {all, confirmed, refuted, fix}; the fixer writes
 *             <roundDir>/gate_audit_patches.json and <roundDir>/selftest_<roundId>_audit.json
 *   retarget: return {groups, merged}; the merge agent writes
 *             <roundDir>/gates_<roundId>_merged_patches.json, <roundDir>/gates_<roundId>_changes.md and
 *             <roundDir>/selftest_<roundId>.json
 *   The self-test specs are for scripts/gates/gate_selftest.py, which copies what the gates read into
 *   a temporary mirror under the system temp dir and deletes it at the end.
 *
 * COST
 *   audit: 1 + (diffParts + documents + conflict + binding + readback) auditors + 1 verifier per
 *   finding + 1 fixer; with the default lenses, 1 + diffParts + documents + 2 + verifiers + 1.
 *   retarget: 1 + 4 per group + 1 merge.
 */

const A = args || {}
const NAME = 'gate-audit'
const MODE = A.mode || 'audit'
const REQ = ['root', 'roundId', 'roundDir', 'scratch', 'gates', 'documents'].concat(MODE === 'retarget' ? ['failing'] : ['before'])
const missing = REQ.filter(k => A[k] === undefined || A[k] === null || A[k] === '')
if (missing.length) throw new Error(`${NAME}: missing args: ${missing.join(', ')}. See the header comment for an example.`)
if (!['audit', 'retarget'].includes(MODE)) throw new Error(`${NAME}: mode must be "audit" or "retarget"`)
if (!Array.isArray(A.gates) || !A.gates.length) throw new Error(`${NAME}: gates must be a non-empty array of {name, file, cmd}`)

const ROOT = A.root
const RD = A.roundDir
const SCR = A.scratch
const RID = A.roundId
const BEFORE = A.before || `${RD}/before`
const GD = A.gatesDir || 'scripts/gates'
const PARTS = Math.max(1, Math.min(8, A.diffParts || 3))
const LENSES = A.lenses || ['loosen', 'cover', 'conflict', 'binding']
const STANDARD = A.standard || ['docs/writing/WRITING_STANDARD.md', '.claude/rules/working-rules.md']
const RULINGS = A.rulings || []
const COMMENTS = A.comments || []
const REOPENED = A.reopenedOnPurpose || []
const E = A.effort || {}

const bullet = xs => (xs && xs.length ? xs.map(x => `  - ${x}`).join('\n') : '  (none given)')
const reopenedLines = REOPENED.length
  ? REOPENED.map(r => `  - ${r.wording}: legal ONLY in ${r.sentence}`).join('\n')
  : '  (none given)'
const opt = o => { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }
const gateLines = A.gates.map(g => `  - ${g.name}: ${g.file} (run: ${g.cmd})${g.anchor ? ` [new blocks go before: ${g.anchor}]` : ''}${g.prefix ? ` [helper prefix: ${g.prefix}]` : ''}`).join('\n')
const copyList = (A.mirrorCopy || ['the document folders', 'the gate scripts', 'every output or data file the gates read']).join(', ')

const CTX = `
PROJECT ROOT: ${ROOT}. Round ${RID}; round folder ${RD}.
THE GATES:
${gateLines}
Pre-round copies of the gate files and the texts: ${BEFORE}/
THE DOCUMENTS THE GATES READ (each language separately):
${bullet(A.documents)}
Data the gates bind to (perturb only copies):
${bullet(A.dataDirs)}
What the round changed: ${A.roundChanges || '(see the diffs)'}
Removed on purpose (an old presence check on these becomes an absence check, never a drop):
${bullet(A.removedOnPurpose)}
Added on purpose (each must be bound to its source row and its place):
${bullet(A.addedOnPurpose)}
Reopened on purpose (an approved change reverses an earlier bar, but ONLY for the one sentence
named; every other retired form stays barred, and the reopened wording stays barred in every other
place, file and language, variants included):
${reopenedLines}
Documents the round did NOT touch (any change to a binding of their text is suspicious):
${bullet(A.untouched)}
Standard files: ${STANDARD.join(', ')}. Standing rulings: ${RULINGS.length ? RULINGS.join(', ') : '(none given)'}.
The author's comments of the round: ${COMMENTS.length ? COMMENTS.join(', ') : '(none given)'}.

NEVER WRITE UNDER ${ROOT}, except an output path this prompt names. All testing happens in a private mirror:
- Check free disk space first (df -h); stop and report if it is under about 10 GB.
- Mirror root: ${SCR}/<your label>/mirror. Assert it is not ${ROOT} and does not exist yet, and that
  no destination exists before you link it (a link into an existing directory lands inside it).
- Copy (cp -R): ${copyList}. Symlink every other top-level entry. A directory you will perturb
  must be a real copy: perturbing data through a symlink writes the live repository.
- Run gates from the mirror root, each wrapped in a timeout: perl -e 'alarm 900; exec @ARGV' <cmd>.
  A gate that reads the live root by absolute path passes every mirror test; check that first when
  a perturbation is a miss.
- Delete your mirror before you return (guarded, so an empty variable can never widen the delete).
- For a self-test, prefer ${GD}/gate_selftest.py with a JSON spec: it copies what the gates read
  into a temporary mirror under the system temp dir, applies each perturbation, restores, checks the
  live files did not change, and deletes the mirror. Set the spec's "root" to a patched mirror to
  test patched gates. Its "compare" option runs the same perturbations against the pre-round gate
  file and reports every one the old version catches and the new one misses as LOOSENED.

PERTURBATION = an exact old string, unique in one copied file (text, gate input or data), and its
replacement; or a CSV edit {file, match, column, value}. Test each language separately: a phrase
in one language never matches the other's file.`

const PERT = { type: 'object', properties: { file: { type: 'string' }, old: { type: 'string' }, new: { type: 'string' } }, required: ['file', 'old', 'new'] }
const FINDINGS = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, kind: { type: 'string', enum: ['loosening', 'unbound', 'conflict', 'vacuous', 'wrong_binding', 'other'] },
      gate_label: { type: 'string' }, live_line: { type: 'string' },
      fact: { type: 'string', description: 'the fact no longer bound, unbound, wrongly computed or in conflict' },
      evidence: { type: 'string' }, perturbation: PERT,
      ran: { type: 'string', description: 'what you ran in your mirror and what it printed' },
      severity: { type: 'string', enum: ['major', 'minor'], description: 'major: a printed fact or a retired wording can change or return with the gates green; minor: a weaker binding of order or scope' },
    }, required: ['id', 'kind', 'fact', 'evidence', 'perturbation', 'ran', 'severity'] } },
    covered: { type: 'string', description: 'what you checked and found sound' },
  },
  required: ['findings', 'covered'],
}
const TEXTF = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, file: { type: 'string' }, quote: { type: 'string' }, problem: { type: 'string' },
      evidence: { type: 'string' }, proposal: { type: 'string' }, round_caused: { type: 'boolean' }, severity: { type: 'string', enum: ['major', 'minor'] },
    }, required: ['id', 'file', 'quote', 'problem', 'evidence', 'proposal', 'round_caused', 'severity'] } },
    covered: { type: 'string' },
  },
  required: ['findings', 'covered'],
}
const VERDICT = {
  type: 'object',
  properties: { confirmed: { type: 'boolean' }, demonstrated: { type: 'boolean' }, perturbation_used: PERT, note: { type: 'string' } },
  required: ['confirmed', 'demonstrated', 'note'],
}
const TVERDICT = { type: 'object', properties: { confirmed: { type: 'boolean' }, note: { type: 'string' }, better_proposal: { type: 'string' } }, required: ['confirmed', 'note'] }
const PATCH = {
  type: 'object',
  properties: { file: { type: 'string' }, gate: { type: 'string' }, old_code: { type: 'string', description: 'exact and unique in the LIVE gate file' }, new_code: { type: 'string' }, facts_bound: { type: 'string' } },
  required: ['file', 'gate', 'old_code', 'new_code', 'facts_bound'],
}
const FIX = {
  type: 'object',
  properties: {
    patches_path: { type: 'string' }, n_patches: { type: 'integer' }, selftest_path: { type: 'string' },
    tested_sha256: { type: 'string', description: 'sha256 of each patched gate file as tested' },
    tested: { type: 'string', description: 'live text: checks and fails on the patched copy; each confirmed perturbation now red; old checks unchanged' },
    selftests: { type: 'string', description: 'earlier self-tests rerun on the patched mirror: red / total each; perturbations whose anchor no longer exists, by name; "none given" if none' },
    not_fixed: { type: 'array', items: { type: 'string' } }, text_defects: { type: 'array', items: { type: 'string' } },
  },
  required: ['patches_path', 'n_patches', 'selftest_path', 'tested_sha256', 'tested', 'selftests', 'not_fixed', 'text_defects'],
}
const PREP = {
  type: 'object',
  properties: {
    diff_whole: { type: 'string' }, diff_parts: { type: 'array', items: { type: 'string' } },
    missing_pre_round: { type: 'array', items: { type: 'string' }, description: 'gate files with no pre-round copy under the before folder; empty if every one has a copy' },
    baseline: { type: 'string', description: 'per gate: checks and fails, live gates on live texts; and pre-round gates on pre-round texts' },
    failing_located: { type: 'string', description: 'retarget: path of a JSON list {gate_file, label, line}' },
    groups: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, scope: { type: 'string' } }, required: ['key', 'scope'] } },
  },
  required: ['diff_whole', 'diff_parts', 'missing_pre_round', 'baseline', 'failing_located', 'groups'],
}
const DPATCHES = {
  type: 'object',
  properties: {
    patches: { type: 'array', items: { type: 'object', properties: {
      file: { type: 'string' }, gate: { type: 'string' }, old_code: { type: 'string' }, new_code: { type: 'string' },
      kind: { type: 'string', enum: ['retarget', 'to_absence', 'count', 'helper'] }, facts_bound: { type: 'string' },
    }, required: ['file', 'gate', 'old_code', 'new_code', 'kind', 'facts_bound'] } },
    blocks: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, code: { type: 'string' }, facts_bound: { type: 'string' } }, required: ['file', 'code', 'facts_bound'] } },
    tested: { type: 'string' },
    text_defects: { type: 'array', items: { type: 'string' } },
  },
  required: ['patches', 'blocks', 'tested', 'text_defects'],
}
const AUDITP = {
  type: 'object',
  properties: { problems: { type: 'array', items: { type: 'object', properties: {
    item: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' }, demonstrated: { type: 'string' },
  }, required: ['item', 'problem', 'fix', 'demonstrated'] } }, sound: { type: 'string' } },
  required: ['problems', 'sound'],
}
const MERGED = {
  type: 'object',
  properties: {
    patches_path: { type: 'string' }, n_patches: { type: 'integer' },
    counts: { type: 'string', description: 'per gate: checks and fails on the live texts with the merged gates' },
    preexisting_identical: { type: 'string', description: 'old checks whose verdict differs between pre-round gates on pre-round texts and merged gates on live texts, each explained or fixed' },
    conflicts_fixed: { type: 'array', items: { type: 'string' } },
    selftest_path: { type: 'string' }, selftests: { type: 'string', description: 'perturbations red / total; earlier self-tests rerun; anchors that no longer exist, by name' },
    tested_sha256: { type: 'string' }, changes_log: { type: 'string' }, notes: { type: 'string' },
  },
  required: ['patches_path', 'n_patches', 'counts', 'preexisting_identical', 'conflicts_fixed', 'selftest_path', 'selftests', 'tested_sha256', 'changes_log', 'notes'],
}

// ---------------------------------------------------------------- Prepare
phase('Prepare')
const prep = await agent(`${CTX}

STAGE: PREPARE. Work in ${SCR}/prepare/ (you may write there).
1. For each gate file, write the unified diff from ${BEFORE}/ (the pre-round copy) to the live file:
   ${SCR}/prepare/gates.diff, and split it into ${PARTS} parts of similar size at hunk boundaries:
   ${SCR}/prepare/gates_part1.diff ... gates_part${PARTS}.diff. List every gate file that has no
   pre-round copy under missing_pre_round (do not substitute another version for it).${MODE === 'audit' ? ' This\n   audit stops when the list is not empty: without the pre-round copies the loosening lens has nothing to diff.' : ''}
2. Baseline: run every gate on the live texts in a mirror; if pre-round copies of the texts and
   gates exist, also run the pre-round gates on the pre-round texts. Report checks and fails per gate.
${MODE === 'retarget' ? `3. Locate every failing check listed in ${A.failing}: gate file, label, line number of the check in
   the live gate file. Write them to ${SCR}/prepare/failing_located.json.
4. ${A.groups ? `Groups are given: ${JSON.stringify(A.groups)}; return them unchanged.` : `Propose groups: contiguous line ranges of each gate file with similar numbers of failing checks
   (about ten per group), plus one group "new" for checks the round's added facts need. Return them
   as {key, scope} with the scope stated as file and line range.`}` : '3. Return groups as an empty list.'}`,
  opt({ label: 'prepare', phase: 'Prepare', schema: PREP, effort: E.prepare }))
if (!prep) throw new Error(`${NAME}: prepare failed`)
const noCopy = prep.missing_pre_round || []
if (noCopy.length && MODE === 'audit') throw new Error(`${NAME}: no pre-round copy in ${BEFORE}/ of: ${noCopy.join(', ')}. The loosening lens needs the diff from the pre-round gate files. Copy them into before/ when landing (group-landing does this) and rerun.`)
if (noCopy.length) log(`WARNING: no pre-round copy of ${noCopy.join(', ')}; the merge cannot compare old checks against the pre-round gates for these files.`)
log(`baseline: ${prep.baseline}`)

// ================================================================= AUDIT MODE
if (MODE === 'audit') {
  const lenses = []
  if (LENSES.includes('loosen')) {
    const parts = prep.diff_parts.length ? prep.diff_parts : [prep.diff_whole]
    parts.forEach((p, i) => lenses.push({ label: `loosen:${i + 1}`, prompt: `LENS: LOOSENING, diff part ${i + 1} (${p}). For every hunk, list each fact the removed (-) lines bound and find where the live gates bind it now (run the pre-round gates on the pre-round texts and the live gates on the live texts and compare). For added code, check each new check can fail: no split that returns "" or the whole text when a heading changes, no always-true condition, no bare-number substring test that matches inside a longer number, no absence that misses the obvious variants (case, line breaks, the other language, a synonym the round retired). For each bar reopened on purpose, check it is reopened ONLY for the sentence named: put the reopened wording in another sentence, another document and the other language, in variants, and confirm a check turns red. Report every fact no longer bound.` }))
  }
  if (LENSES.includes('cover')) {
    A.documents.forEach(d => lenses.push({ label: `cover:${d.split('/').pop()}`, prompt: `LENS: COVERAGE of ${d}, every sentence, notes and footnotes included. For each sentence that carries a number, a source pointer, a paragraph's first sentence, a claim of significance, or a claim the round added, find the check(s) that would turn red if it were altered, moved or deleted. Report every such sentence no check binds, every number bound only as a literal where an output row exists, and every number bound in one language only.` }))
  }
  if (LENSES.includes('conflict')) {
    lenses.push({ label: 'conflict', prompt: `LENS: CONFLICTS AND VACUITY across all live gate files. (a) one check requiring wording another bars, or two groups binding one sentence to different wording; (b) helper names defined twice with different meanings (a later definition shadows an earlier one); (c) splits that silently return "" or the whole text when a heading changes; (d) a bar that matches legitimate text in any file it reads (grep every file it reads); (e) bindings of the documents the round did not touch that changed anyway. Each with a perturbation (for a false red, the legitimate edit it blocks).` })
  }
  if (LENSES.includes('binding')) {
    lenses.push({ label: 'binding', prompt: `LENS: CORRECTNESS OF THE BINDINGS THEMSELVES, for every new or retargeted check in the diffs (${prep.diff_whole}). Recompute each bound value from the output rows and columns the check names: does the gate compute the printed number (a level, a product, a percent, a share) from the right rows and columns? Does the gate's rounding match the rounding printed in the text? Flag dead checks: a condition that is always true, a string compared with itself, a check that reads a value it also writes. Demonstrate each with a data perturbation on a copied output file (the printed text unchanged) that a correct binding would catch.` })
  }
  const auditors = lenses.map(l => () => agent(`${CTX}

STAGE: AUDIT. ${l.prompt}
Diffs: ${prep.diff_whole}. Baseline: ${prep.baseline}
Return only findings you demonstrated with a perturbation in your own mirror (label a-${l.label.replace(/[^a-z0-9]+/gi, '-')}).`,
    opt({ label: l.label, phase: 'Audit', schema: FINDINGS, effort: E.audit || 'high' }))
    .then(res => (res ? parallel(res.findings.map(f => () => agent(`${CTX}

STAGE: VERIFY (try to refute). Auditor ${l.label} reports:
${JSON.stringify(f, null, 1)}
Build your own mirror (label v-${l.label.replace(/[^a-z0-9]+/gi, '-')}-${f.id}) and run the perturbation, or a corrected one if
theirs is not unique or does not express the claim. confirmed = true only if the live gates stay
green on a perturbation that changes a fact the text states (or brings back a retired wording, or,
for a conflict, legitimate text is blocked) AND the gates should bind it. If a check already turns
red, or the perturbed fact is not one the text states, refute. Default to confirmed = false if uncertain.`,
      opt({ label: `verify:${l.label}:${f.id}`, phase: 'Verify', schema: VERDICT, effort: E.verify || 'high' }))
      .then(v => ({ ...f, lens: l.label, verdict: v })))) : [])))
  let readback = null
  if (LENSES.includes('readback')) {
    auditors.push(() => agent(`${CTX}

STAGE: READ-BACK (text, not gates; read only). Read the sentences the round changed, in place, in
each document and each language, against these files (read them first):
  standard: ${STANDARD.join(', ')}
  standing rulings: ${RULINGS.length ? RULINGS.join(', ') : '(none given)'}
  the author's comments of the round: ${COMMENTS.length ? COMMENTS.join(', ') : '(none given)'}
Report text defects the gates cannot see: a number not derivable from what is on the page, a claim
the data do not support, a mirror that says something else, a sentence that no longer serves its
paragraph's first sentence, a sentence that does not do what the author's comment asked. Quote,
give evidence (with the rule or comment it breaks) and a proposal.`, opt({ label: 'read-back', phase: 'Audit', schema: TEXTF, effort: E.audit || 'high' }))
      .then(res => (res ? parallel(res.findings.map(f => () => agent(`${CTX}

STAGE: VERIFY A READ-BACK FINDING (try to refute):
${JSON.stringify(f, null, 1)}
Read the instruction the finding derives from before you judge it: the standard (${STANDARD.join(', ')}),
the standing rulings (${RULINGS.length ? RULINGS.join(', ') : 'none given'}) and the author's comments of
the round (${COMMENTS.length ? COMMENTS.join(', ') : 'none given'}); an older approval does not refute a
newer comment. Check the quote in the live file and the data it concerns. confirmed = true only if the
defect is real, not a preference, and the proposal is correct. Default to false if uncertain.`,
        opt({ label: `verify:text:${f.id}`, phase: 'Verify', schema: TVERDICT, effort: E.verify || 'high' }))
        .then(v => ({ ...f, lens: 'read-back', verdict: v, text: true })))) : [])))
  }
  const results = (await parallel(auditors)).filter(Boolean).flat().filter(Boolean)
  const gateFindings = results.filter(f => !f.text)
  const textFindings = results.filter(f => f.text)
  const confirmed = gateFindings.filter(f => f.verdict && f.verdict.confirmed && f.verdict.demonstrated)
  const textConfirmed = textFindings.filter(f => f.verdict && f.verdict.confirmed)
  log(`${gateFindings.length} gate findings, ${confirmed.length} confirmed; ${textFindings.length} read-back findings, ${textConfirmed.length} confirmed`)

  phase('Fix')
  let fix = null
  if (confirmed.length) {
    fix = await agent(`${CTX}

STAGE: FIX. These gate gaps were confirmed by an independent verifier, each with a perturbation:
${JSON.stringify(confirmed.map(f => ({ id: f.id, lens: f.lens, kind: f.kind, gate_label: f.gate_label, live_line: f.live_line, fact: f.fact, evidence: f.evidence, perturbation: (f.verdict && f.verdict.perturbation_used) || f.perturbation, note: f.verdict && f.verdict.note })), null, 1)}
Dedupe findings that are the same gap. Draft patches to the LIVE gate files: old_code exact and
unique, no overlapping spans, the file's own idiom, each patch commented with the round id and
"gate audit". Bind each fact to its output row where it has one, and to its sentence, in each
language. Never loosen anything; for a conflict narrow only the bar that blocks legitimate text, and
show the retired wording is still caught (one perturbation that brings it back must stay red).
Test in your own mirror (label fix): the live texts give 0 fails with the patched gates (state the
counts); every confirmed perturbation now turns red; every old check's pass/fail line is unchanged
between the live and the patched run. Rerun the earlier self-tests on your patched mirror:
${bullet(A.selftests)}
and report their red counts, naming every perturbation whose anchor no longer exists. Then write a
self-test spec with every confirmed perturbation (and one "expect": "green" re-wrap per patched
sentence) to ${RD}/selftest_${RID}_audit.json, set its root to your patched mirror, and run
python3 ${GD}/gate_selftest.py on it (with "compare" against the pre-round gate where one exists).
Write the patch list to ${RD}/gate_audit_patches.json (the only files you may write under ${ROOT}).
Report what you could not fix and why, and any text defect you noticed (not fixed).`,
      opt({ label: 'fix', phase: 'Fix', schema: FIX, effort: E.fix || 'high' }))
  }
  return {
    all: gateFindings.map(f => ({ id: f.id, lens: f.lens, kind: f.kind, fact: f.fact, confirmed: !!(f.verdict && f.verdict.confirmed && f.verdict.demonstrated), note: f.verdict && f.verdict.note })),
    confirmed: confirmed.map(f => `${f.lens} ${f.id}: ${f.fact}`),
    text: textFindings.map(f => ({ id: f.id, file: f.file, quote: f.quote, problem: f.problem, confirmed: !!(f.verdict && f.verdict.confirmed), proposal: (f.verdict && f.verdict.better_proposal) || f.proposal })),
    fix,
  }
}

// ================================================================= RETARGET MODE
const groups = A.groups || prep.groups
if (!groups || !groups.length) throw new Error(`${NAME}: no retarget groups (pass groups or check ${A.failing})`)
const RULES = `
RETARGET RULES:
1. Never loosen. Every fact an old check bound stays bound: an output value, a band, a sentence's
   presence (in its new wording) and place, a retired wording's absence, each language the old
   check read. Never delete an absence check that still makes sense; never weaken a condition.
2. Where the round removed a check's subject on purpose, the presence check becomes an ABSENCE
   check of the removed wording (each language); bindings of the same fact in other documents stay.
3. Where the wording changed, rebind to the exact new wording, built from the output values with
   the formatting the text uses, so a changed digit turns the check red.
4. Structural counts (paragraphs, first sentences, footnotes, pointers) change only where an
   approved decision changed them.
5. A failing check that reveals a real defect in the TEXT is reported under text_defects with the
   exact fix, not retargeted.
6. Each patch is an exact, unique substring replacement inside your group's scope. New checks go in
   'blocks' (inserted by the merge agent before each gate's anchor line, in group order); new helper
   names use the round prefix plus your group key.
7. Comment every change with the round id and the reason. Test: patched copy in your mirror, your
   checks pass, no other check changes state, and each retargeted check turns red under a
   perturbation of its bound digit or word, in each language.
8. A bar reopened on purpose is narrowed to the one sentence named, never dropped: the reopened
   wording stays barred everywhere else (every other sentence, file and language), and every other
   retired form stays barred. Test the reopened wording outside its sentence and in variants.`
phase('Draft')
const fins = await pipeline(groups,
  g => agent(`${CTX}
${RULES}

STAGE: DRAFT, group ${g.key}: ${g.scope}. Failing checks located: ${prep.failing_located}.
Other groups patch other scopes in parallel, so keep every old_code inside yours. Save your list to
${SCR}/${g.key}/patches.json.`, opt({ label: `draft:${g.key}`, phase: 'Draft', schema: DPATCHES, effort: E.draft || 'high' })),
  (dr, g) => dr ? parallel([0, 1].map(i => () => agent(`${CTX}
${RULES}

STAGE: REVIEW group ${g.key} (${SCR}/${g.key}/patches.json), auditor ${i + 1}.
${i === 0
    ? 'Look for loosening: diff old and new code line by line; a fact the old code bound and the text still states, now unbound; a retired wording no longer barred; an absence that misses obvious variants; a vacuous split; an always-true condition; a check on an untouched document that changed.'
    : 'Try to break each binding with two perturbations of your own (each language, and the data where there is a row), and check that no bar fires on legitimate text in any file it reads.'}
Demonstrate every problem in your own mirror (label r-${g.key}-${i}).
DRAFT: ${JSON.stringify({ patches: dr.patches.map(p => ({ file: p.file, gate: p.gate, kind: p.kind, facts_bound: p.facts_bound })), blocks: dr.blocks.map(b => ({ file: b.file, facts_bound: b.facts_bound })), tested: dr.tested })}`,
    opt({ label: `review:${g.key}:${i + 1}`, phase: 'Review', schema: AUDITP, effort: E.verify || 'high' })))).then(a => ({ dr, a })) : null,
  (x, g) => x ? agent(`${CTX}
${RULES}

STAGE: FINALIZE group ${g.key}. Drafter's list: ${SCR}/${g.key}/patches.json. Reviews:
${JSON.stringify(x.a.filter(Boolean))}
Fix every real problem (check it yourself), retest in a fresh mirror (label f-${g.key}), save the
final list to ${SCR}/${g.key}/final.json and return it.`, opt({ label: `final:${g.key}`, phase: 'Finalize', schema: DPATCHES, effort: E.draft || 'high' }))
    .then(f => (f ? { key: g.key, final: f } : null)) : null)
const done = fins.filter(Boolean)
if (done.length < groups.length) log(`WARNING: groups not finalized: ${groups.filter(g => !done.find(d => d.key === g.key)).map(g => g.key).join(', ')}. The merge covers only the finalized groups.`)

phase('Merge')
const merged = await agent(`${CTX}
${RULES}

STAGE: MERGE AND AUDIT THE UNION. Final lists: ${done.map(d => `${SCR}/${d.key}/final.json`).join(', ')}.
1. In a fresh mirror (label merge), apply all patches to copies of the LIVE gate files: each old_code
   unique, no overlapping spans (merge two groups' patches on one span into one); then insert the
   blocks, in group order, before each gate's anchor line. Express the whole result as patches only
   (a block insertion is a patch whose old_code is the anchor line). Run every gate: 0 fails on the
   live texts (state counts); run the digit gate on each mirror pair.
2. Old checks: run the PRE-ROUND gates on the PRE-ROUND texts (${BEFORE}/) and the MERGED gates on the
   live texts. List every check whose verdict differs and that is not one of the failing checks;
   explain or fix each.
3. Cross-group conflicts: one check requiring what another bars; a helper defined twice; a bar
   matching legitimate text in any file it reads; fix each.
4. Self-test: write ${RD}/selftest_${RID}.json for ${GD}/gate_selftest.py (root = your merged mirror)
   with perturbations of every sentence and value the round bound, each language, and of the data
   rows where they exist: every one must be RED; restored, 0 fails. Use "compare" against the
   pre-round gate files. Then rerun the earlier self-tests on the merged gates:
${bullet(A.selftests)}
   and report their red counts, naming every perturbation whose anchor no longer exists or which the
   round made legal on purpose. Do not count those as passes; retarget them to the live text where
   they should still bite, as copies next to the originals.
5. Write ${RD}/gates_${RID}_merged_patches.json (old_code exact in the LIVE files) and
   ${RD}/gates_${RID}_changes.md (per check: label, before, now, why it is not a loosening). These and
   the self-test spec are the only files you may write under ${ROOT}. Return the sha256 of the merged
   gate files you tested, so the landing can confirm the live files equal them.`,
  opt({ label: 'merge', phase: 'Merge', schema: MERGED, effort: E.merge || 'high' }))
return { groups: done.map(d => ({ key: d.key, patches: d.final.patches.length, blocks: d.final.blocks.length, text_defects: d.final.text_defects })), merged }
