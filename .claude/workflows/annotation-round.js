export const meta = {
  name: 'annotation-round',
  description: 'Turn the author\'s annotations into a checked round proposal: intake per comment, a rule per comment, a sweep per rule, old/new drafts, facts and rulings checks. Writes only the proposal and intake files.',
  whenToUse: 'The author has marked up a draft (PDF annotations or a list of comments) and the annotations are extracted to JSON. Run it before any edit; it never touches the documents.',
  phases: [
    { title: 'Intake', detail: 'one item per comment: where it points, what it asks, repeats, rulings' },
    { title: 'Distil', detail: 'a candidate rule per comment, a refuter per rule, two synthesizers and a judge' },
    { title: 'Sweep', detail: 'one sweeper per rule over every file; a refuter per unmarked instance' },
    { title: 'Draft', detail: 'one drafter per file group: old and new side by side, mirror included' },
    { title: 'Verify', detail: 'facts, rulings, first-time reader, per group' },
    { title: 'Finalize', detail: 'one finalizer per group' },
    { title: 'Critic', detail: 'collisions between edits and instances every reader missed' },
    { title: 'Gap', detail: 'the critic\'s extra edits through the facts and rulings lenses and a finalizer' },
    { title: 'Build', detail: 'optional: each lettered option applied to a scratch copy and built' },
    { title: 'Write', detail: 'intake file and proposal file in the round folder' },
  ],
}

/*
 * annotation-round: the author's comments -> a proposal he can approve in shorthand.
 *
 * PURPOSE
 *   Comments come first, one by one. Each comment is a sample of a defect class, so it is
 *   distilled into a rule and the rule is swept over every file, marked or not. Every repair is
 *   drafted as old and new side by side (and its language mirror), checked for facts, for the
 *   standing rulings and by a first-time reader, then written into one proposal file. Nothing is
 *   written to the documents. Landing is a separate step (group-landing) after approval.
 *
 * ARGS (JSON example; paths relative to root unless absolute)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "roundId": "R2",
 *     "roundDir": "quality_reports/2027-01-15_results_comments",
 *     "scratch": "<session scratchpad>/annotation-round",
 *     "authorMessage": "verbatim message that came with the annotations",
 *     "annotations": "quality_reports/2027-01-15_results_comments/annotations.json",
 *     "documents": [
 *       {"path": "paper/results.tex", "mirror": "paper/results_zh.tex"},
 *       {"path": "paper/intro.tex",   "mirror": "paper/intro_zh.tex"}
 *     ],
 *     "sweepExtra": ["paper/conclusion.tex", "paper/abstract.tex"],
 *     "mirrorLanguage": "Chinese",
 *     "replyLanguage": "Chinese",
 *     "standard": ["docs/writing/WRITING_STANDARD.md", ".claude/rules/working-rules.md"],
 *     "rulings": ["quality_reports/TRACKER.md", "quality_reports/2027-01-05_first_round/R1_landing.md"],
 *     "priorComments": ["quality_reports/2027-01-05_first_round/annotations.json"],
 *     "outputs": ["results/current/"],
 *     "gateFiles": ["scripts/gates/paper_gate.py"],
 *     "approvedDocuments": ["paper/data.tex"],
 *     "distill": "judge",
 *     "refuteSweep": true,
 *     "readerLens": true,
 *     "build": [{"name": "paper", "cmd": "latexmk -pdf -interaction=nonstopmode paper/main.tex"}],
 *     "buildCopy": ["paper", "tables", "figures"]
 *   }
 *   Required: root, roundId, roundDir, scratch, annotations, documents.
 *   documents[].mirror is optional (single-language project). sweepExtra are files swept for the
 *   rules but not edited by this round's groups (their hits come back as ripples).
 *   distill: "judge" (two synthesizers and a judge) or "simple" (one merger).
 *   annotations may be a path or an inline array of {id, page, quoted, comment, context}.
 *   build (optional): commands that build the documents. When the round has lettered decisions, a
 *   last agent applies each option (with every edit outside the decisions) to a scratch copy of
 *   buildCopy, runs each build under a timeout, and reports errors, overfull boxes and pages per
 *   option, so the proposal shows what each option looks like before the author chooses.
 *
 * OUTPUTS (written by the last agent; nothing else is written)
 *   <roundDir>/annotation_intake.md       templates/annotation-intake.md, filled
 *   <roundDir>/<roundId>_proposal.md      templates/round-proposal.md, filled
 *   <roundDir>/<roundId>_proposal.json    machine-readable edits for group-landing
 *   Return value: {intake, rules, sweep, groups, critic, written}
 *
 * COST
 *   About 1 + 2N + 3 + R + F + 5G + 2 agents for N comments, R rules, F unmarked instances and
 *   G file groups, plus 3 for the gap round when the critic adds edits and 1 for the build when
 *   build is given and there are decisions. Set refuteSweep false to drop the F refuters on a
 *   small round.
 */

const A = args || {}
const NAME = 'annotation-round'
const REQUIRED = ['root', 'roundId', 'roundDir', 'scratch', 'annotations', 'documents']
const missing = REQUIRED.filter(k => A[k] === undefined || A[k] === null || A[k] === '')
if (missing.length) throw new Error(`${NAME}: missing args: ${missing.join(', ')}. See the header comment for an example.`)
if (!Array.isArray(A.documents) || !A.documents.length) throw new Error(`${NAME}: documents must be a non-empty array of {path, mirror?}`)

const ROOT = A.root
const RD = A.roundDir
const SCR = A.scratch
const ML = A.mirrorLanguage || ''
const REPLY = A.replyLanguage || 'English'
const STANDARD = A.standard || ['docs/writing/WRITING_STANDARD.md', '.claude/rules/working-rules.md']
const RULINGS = A.rulings || []
const PRIOR = A.priorComments || []
const OUTPUTS = A.outputs || []
const GATEFILES = A.gateFiles || []
const APPROVED = A.approvedDocuments || []
const DISTILL = A.distill === 'simple' ? 'simple' : 'judge'
const REFUTE = A.refuteSweep !== false
const READER = A.readerLens !== false
const E = A.effort || {}

const bullet = xs => (xs && xs.length ? xs.map(x => `  - ${x}`).join('\n') : '  (none given)')
const opt = o => { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }
const docLines = A.documents.map(d => `  - ${d.path}${d.mirror ? `  (mirror: ${d.mirror})` : ''}`).join('\n')
const allFiles = A.documents.flatMap(d => (d.mirror ? [d.path, d.mirror] : [d.path])).concat(A.sweepExtra || [])
const annSource = Array.isArray(A.annotations)
  ? `The annotations, inline (JSON):\n${JSON.stringify(A.annotations, null, 1)}`
  : `The annotations are in ${A.annotations} (one object per comment: page, type, quoted text, comment, context).`

const CTX = `
PROJECT ROOT: ${ROOT}
READ ONLY. Do not create, edit, move or delete any file under ${ROOT}. The only exception is the
last stage of this workflow, which writes into ${RD}/ and nowhere else. Scratch work goes under
${SCR}/<your label>/; delete it before you return.

THE DOCUMENTS OF THIS ROUND (source first; the mirror moves with it in the same round):
${docLines}
Files swept for the rules but owned by no group of this round (hits there are ripples, listed, not applied):
${bullet(A.sweepExtra)}
Documents an approver has already approved (any change to them is flagged for the approver):
${bullet(APPROVED)}

READ FIRST: the standard files
${bullet(STANDARD)}
and the standing rulings (trackers, memory, earlier landing records and proposals)
${bullet(RULINGS)}
Earlier rounds' comments on the same documents:
${bullet(PRIOR)}
Machine outputs that numbers in the text must match:
${bullet(OUTPUTS)}
Gate files that bind sentences and numbers (read them to learn what is bound; do not run anything that writes):
${bullet(GATEFILES)}

THE AUTHOR'S MESSAGE (verbatim): ${A.authorMessage ? `「${A.authorMessage}」` : '(none given)'}
${annSource}

STANDING RULES FOR EVERY STAGE (the standard files above win where they are more specific):
1. Only the author's meaning. Never add a fact, claim, number or citation he has not expressed.
   A repair that needs one is marked NEW CONTENT on its own line and left to him.
2. Old and new side by side. Quote old text exactly as it stands in the file (line breaks may differ).
3. A paragraph's first sentence is its claim and is approved text. A change to it is proposed as an
   option and flagged. A replacement first sentence is never longer or more complex than the one
   it replaces; a paragraph's purpose goes in its body, not in a heavier first sentence.
4. Every sentence serves its paragraph's first sentence. One that does not moves or goes.
5. A passage the author has rejected twice is deleted, not rewritten a third time
   (「说不清宁愿不说」: if it cannot be said clearly, do not say it).
6. Never re-propose what the author has refused. When a new comment overrides an earlier ruling,
   say so explicitly: the newer instruction wins and the reversal is recorded.
7. No defensive prose: a concession, clarification or qualifier stays only if it answers a real
   logical problem.
8. Cross-document ripples are listed, not applied.
9. Every edit to a document with a mirror carries its mirror edit, saying exactly what the source
   says, with the same digits in the same order.${ML ? ` The mirror language is ${ML}.` : ''}
10. Commentary meant for the author is in ${REPLY}; proposed sentences are verbatim in the
    document's own language.`

const INTAKE = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string', description: 'C1, C2, ... in document order' },
      file: { type: 'string', description: 'the source-language file the comment points at (map a comment on the mirror to its source file)' },
      location: { type: 'string', description: 'section and paragraph, e.g. "Results, second paragraph"' },
      quoted: { type: 'string', description: 'the sentence the comment points at, verbatim from the file it was made on' },
      source_sentence: { type: 'string', description: 'the matching sentence in the source-language file, verbatim; empty if none' },
      comment: { type: 'string', description: 'the comment, verbatim' },
      asks: { type: 'string', description: 'what the author is asking for, one plain line' },
      kind: { type: 'string', enum: ['edit', 'question', 'decision', 'praise'] },
      times_raised: { type: 'integer', description: 'how many times this sentence or passage has been commented on, this round included' },
      rejected_count: { type: 'integer', description: 'how many of those comments REJECTED the passage (marked it confusing, unreadable or to be cut), this round included; a question or a request for more explanation is not a rejection' },
      earlier_rulings: { type: 'string', description: 'rulings or earlier comments that bear on it, with file; "none" if none' },
      needs_verification: { type: 'string', description: 'a claim the author asks about or asserts that must be checked against the outputs; empty if none' },
    }, required: ['id', 'file', 'location', 'quoted', 'source_sentence', 'comment', 'asks', 'kind', 'times_raised', 'rejected_count', 'earlier_rulings', 'needs_verification'] } },
    notes: { type: 'string' },
  },
  required: ['items', 'notes'],
}
const CANDIDATE = {
  type: 'object',
  properties: {
    comment_id: { type: 'string' },
    rule: { type: 'string', description: 'one testable line in the author\'s own terms' },
    test: { type: 'string', description: 'how to test one sentence against the rule' },
    fails: { type: 'string', description: 'the marked sentence, which fails the test' },
    passes: { type: 'string', description: 'a rewrite that passes, using only the author\'s meaning' },
    defect_class: { type: 'string', enum: ['term', 'sentence', 'paragraph', 'number_or_source', 'structure', 'mirror', 'other'] },
  },
  required: ['comment_id', 'rule', 'test', 'fails', 'passes', 'defect_class'],
}
const RVERDICT = {
  type: 'object',
  properties: { verdict: { type: 'string', enum: ['CONFIRMED', 'PARTIAL', 'REFUTED'] }, reason: { type: 'string' }, amended_rule: { type: 'string' } },
  required: ['verdict', 'reason'],
}
const RULESET = {
  type: 'object',
  properties: {
    reading: { type: 'string', description: 'what the comments say as a whole, tied to the author\'s words' },
    rules: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string', description: 'R-a, R-b, ...' }, name: { type: 'string' }, rule: { type: 'string' }, test: { type: 'string' },
      from_comments: { type: 'array', items: { type: 'string' } }, fails: { type: 'string' }, passes: { type: 'string' },
      supersedes: { type: 'string', description: 'which standing rule or ruling this changes, or "none"' },
    }, required: ['id', 'name', 'rule', 'test', 'from_comments', 'fails', 'passes', 'supersedes'] } },
  },
  required: ['reading', 'rules'],
}
const INSTANCES = {
  type: 'object',
  properties: {
    instances: { type: 'array', items: { type: 'object', properties: {
      file: { type: 'string' }, location: { type: 'string' },
      quote: { type: 'string', description: 'verbatim from the file' },
      marked: { type: 'boolean', description: 'true if the author marked this very sentence' },
      problem: { type: 'string' }, direction: { type: 'string' },
      is_first_sentence: { type: 'boolean' }, severity: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
    }, required: ['file', 'location', 'quote', 'marked', 'problem', 'direction', 'is_first_sentence', 'severity'] } },
    swept: { type: 'string', description: 'files and counts swept; say "no further instance" when the sweep found only the marked one' },
  },
  required: ['instances', 'swept'],
}
const VERDICT = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['refuted', 'reason'],
}
const EDIT = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    answers: { type: 'array', items: { type: 'string' }, description: 'comment ids and rule ids this edit answers' },
    file: { type: 'string' }, old: { type: 'string', description: 'exact current text, unique in the file; empty only for a pure insertion (then say where in why)' },
    new: { type: 'string', description: 'replacement; empty string to delete' },
    mirror_file: { type: 'string', description: 'empty if no mirror' }, mirror_old: { type: 'string' }, mirror_new: { type: 'string' },
    first_sentence_change: { type: 'boolean' }, new_content: { type: 'boolean' }, approved_document: { type: 'boolean' },
    why: { type: 'string', description: 'the comment or rule it answers, and the source of every number it prints' },
  },
  required: ['id', 'answers', 'file', 'old', 'new', 'mirror_file', 'mirror_old', 'mirror_new', 'first_sentence_change', 'new_content', 'approved_document', 'why'],
}
const DRAFT = {
  type: 'object',
  properties: {
    edits: { type: 'array', items: EDIT },
    answers: { type: 'array', items: { type: 'object', properties: { comment_id: { type: 'string' }, answer: { type: 'string' } }, required: ['comment_id', 'answer'] }, description: 'comments that are questions: the answer, no edit' },
    decisions: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, question: { type: 'string' },
      options: { type: 'array', items: { type: 'object', properties: { letter: { type: 'string' }, what: { type: 'string' }, cost: { type: 'string' }, edit_ids: { type: 'array', items: { type: 'string' } } }, required: ['letter', 'what', 'cost', 'edit_ids'] } },
      recommended: { type: 'string' },
    }, required: ['id', 'question', 'options', 'recommended'] } },
    ripples: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['edits', 'answers', 'decisions', 'ripples', 'notes'],
}
const PROBLEMS = {
  type: 'object',
  properties: { problems: { type: 'array', items: { type: 'object', properties: {
    edit_id: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
    problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
  }, required: ['edit_id', 'severity', 'problem', 'evidence', 'fix'] } } },
  required: ['problems'],
}
const WRITTEN = {
  type: 'object',
  properties: { intake_path: { type: 'string' }, proposal_path: { type: 'string' }, json_path: { type: 'string' }, counts: { type: 'string' }, questions: { type: 'array', items: { type: 'string' } } },
  required: ['intake_path', 'proposal_path', 'json_path', 'counts', 'questions'],
}

// ---------------------------------------------------------------- Intake
phase('Intake')
const intake = await agent(`${CTX}

STAGE: INTAKE. List every comment, one by one, before anything else. For each: the sentence it
points at (find it in the file the comment was made on, and its counterpart in the source file),
what the author asks, whether it is an edit request, a question to answer, a decision, or praise,
how many times the same sentence or passage has been commented on before (search the earlier
comments and the rulings) and how many of those comments rejected it (confusing, unreadable, cut it)
as against asking for more, and any claim the author asks about or asserts that must be checked
against the outputs. Do not propose edits here.`, opt({ label: 'intake', phase: 'Intake', schema: INTAKE, effort: E.intake }))
if (!intake || !intake.items || !intake.items.length) throw new Error(`${NAME}: intake returned no items; check the annotations path`)
const items = intake.items
log(`${items.length} comments: ${items.filter(i => i.kind === 'edit').length} edit, ${items.filter(i => i.kind === 'question').length} question, ${items.filter(i => i.times_raised >= 2).length} raised before, ${items.filter(i => i.rejected_count >= 2).length} rejected twice or more`)

// ---------------------------------------------------------------- Distil
phase('Distil')
const ruleItems = items.filter(i => i.kind === 'edit' || i.kind === 'decision')
const candidates = await pipeline(ruleItems,
  it => agent(`${CTX}

STAGE: DISTIL ONE COMMENT INTO A RULE. Comment ${it.id} on ${it.file} (${it.location}):
  quoted: ${it.quoted}
  comment: ${it.comment}
  asks: ${it.asks}
  earlier rulings: ${it.earlier_rulings}
A comment is a sample of a defect class, not a work item. State the rule it implies in the
author's own terms, so that it can be tested on any single sentence. Give the test, the marked
sentence as the failing example, and a rewrite that passes using only the author's meaning.
Do not over-read: a rule that needs a paragraph of inference from one word is not his rule.`,
    opt({ label: `distil:${it.id}`, phase: 'Distil', schema: CANDIDATE, effort: E.distil })),
  (c, it) => c ? agent(`${CTX}

STAGE: REFUTE A CANDIDATE RULE (default REFUTED). Comment ${it.id}: 「${it.comment}」 on: ${it.quoted}
Candidate rule: ${JSON.stringify(c)}
It survives only if (a) it is tied to the author's exact words, (b) it is testable on one sentence
and the failing and passing examples really fail and pass it, (c) no other comment or standing
ruling contradicts it, (d) applying it would not make the prose worse by the author's other
comments. Mark PARTIAL with an amended rule when it is right but overstated.`,
    opt({ label: `refute-rule:${it.id}`, phase: 'Distil', schema: RVERDICT, effort: E.verify || 'high' }))
    .then(v => ({ ...c, verdict: v ? v.verdict : 'UNVERIFIED', amended: v ? (v.amended_rule || '') : '', reason: v ? v.reason : '' })) : null)
const alive = candidates.filter(Boolean).filter(c => c.verdict !== 'REFUTED')
log(`${alive.length} of ${ruleItems.length} candidate rules survive refutation`)

const brief = JSON.stringify(alive.map(c => ({ comment: c.comment_id, rule: c.amended || c.rule, test: c.test, fails: c.fails, passes: c.passes, class: c.defect_class, verdict: c.verdict })), null, 1)
let rules
if (DISTILL === 'judge' && alive.length > 1) {
  const synth = await parallel([
    () => agent(`${CTX}

STAGE: SYNTHESIZER A. From the surviving candidate rules below, write a rule set: merge candidates
that are the same rule, order rules by how many comments each explains, keep each rule testable,
and say which standing rule each one supersedes.

CANDIDATES:
${brief}`, opt({ label: 'synth:A', phase: 'Distil', schema: RULESET, effort: E.synth })),
    () => agent(`${CTX}

STAGE: SYNTHESIZER B. Read the author's comments as a whole FIRST (their sequence, what repeats,
what he is tired of saying), state what kind of reader he is, then write the smallest rule set a
writer could apply while drafting, ordered by priority. Use the candidates below only to check
yourself.

CANDIDATES:
${brief}`, opt({ label: 'synth:B', phase: 'Distil', schema: RULESET, effort: E.synth })),
  ])
  rules = await agent(`${CTX}

STAGE: JUDGE. Two independent rule sets are below. Keep every rule both share; keep a rule only one
has if a comment needs it; drop any rule whose test cannot be applied to a single sentence; keep
the smallest set that covers every edit and decision comment. Every comment id must appear in some
rule's from_comments.

SET A:
${JSON.stringify(synth[0], null, 1)}

SET B:
${JSON.stringify(synth[1], null, 1)}`, opt({ label: 'judge', phase: 'Distil', schema: RULESET, effort: E.verify || 'high' }))
} else {
  rules = await agent(`${CTX}

STAGE: MERGE RULES. Merge the surviving candidate rules below into one rule set: one rule per
defect class, each testable on a single sentence, every edit and decision comment covered.

CANDIDATES:
${brief}`, opt({ label: 'merge-rules', phase: 'Distil', schema: RULESET, effort: E.synth }))
}
if (!rules || !rules.rules || !rules.rules.length) throw new Error(`${NAME}: no rule set was produced`)
log(`${rules.rules.length} rules distilled`)

// ---------------------------------------------------------------- Sweep
phase('Sweep')
const swept = await pipeline(rules.rules,
  r => agent(`${CTX}

STAGE: SWEEP ONE RULE OVER EVERY FILE. Rule ${r.id} (${r.name}): ${r.rule}
Test: ${r.test}
From comments: ${r.from_comments.join(', ')}. Failing example: ${r.fails}
Files to sweep, every sentence, notes and footnotes included:
${bullet(allFiles)}
Report every instance, the marked ones included (marked = true). Quote verbatim. Report the sweep
even when it finds no further instance: say so in swept.`,
    opt({ label: `sweep:${r.id}`, phase: 'Sweep', schema: INSTANCES, effort: E.sweep || 'high' })),
  (res, r) => {
    if (!res) return []
    const inst = res.instances.map(x => ({ ...x, rule: r.id }))
    const marked = inst.filter(x => x.marked)
    const unmarked = inst.filter(x => !x.marked)
    if (!REFUTE || !unmarked.length) return marked.concat(unmarked.map(x => ({ ...x, verdict: REFUTE ? 'NONE' : 'UNVERIFIED' })))
    return parallel(unmarked.map(x => () => agent(`${CTX}

STAGE: REFUTE A SWEEP INSTANCE (default refuted = true). Rule ${r.id}: ${r.rule}
It was distilled from these comments of the author (read them; an old approval does not refute a
new comment): ${r.from_comments.map(id => { const it = items.find(i => i.id === id); return it ? `${id} 「${it.comment}」` : id }).join('; ')}
Instance: ${JSON.stringify(x)}
Open the file and read the whole paragraph. Refute if the quote is not in the file, if the
sentence already meets the rule, if the sentence is an approved convention or approved text the
rule does not reach, or if the direction would add content or a factual error.`,
      opt({ label: `refute:${r.id}`, phase: 'Sweep', schema: VERDICT, effort: E.verify || 'high' }))
      .then(v => ({ ...x, verdict: v ? (v.refuted ? 'REFUTED' : 'SURVIVES') : 'UNVERIFIED', verify_reason: v ? v.reason : '' }))))
      .then(vs => marked.concat(vs.filter(Boolean)))
  })
const instances = swept.flat().filter(Boolean)
const kept = instances.filter(x => x.verdict !== 'REFUTED')
log(`${instances.length} instances found, ${kept.length} kept (${instances.filter(x => x.marked).length} marked)`)

// ---------------------------------------------------------------- Group (needs all instances: one group per file, so no two drafters edit one sentence)
const ownFiles = A.documents.map(d => d.path)
const mirrorOf = {}
for (const d of A.documents) if (d.mirror) mirrorOf[d.path] = d.mirror
const toSource = f => { const d = A.documents.find(x => x.mirror === f); return d ? d.path : f }
const groups = ownFiles.map(f => ({
  file: f,
  mirror: mirrorOf[f] || '',
  comments: items.filter(i => toSource(i.file) === f),
  instances: kept.filter(x => toSource(x.file) === f),
})).filter(g => g.comments.length || g.instances.length)
const ripples = kept.filter(x => !ownFiles.includes(toSource(x.file)))
const orphanComments = items.filter(i => !ownFiles.includes(toSource(i.file)))
log(`${groups.length} file groups to draft; ${ripples.length} instances in files no group owns (ripples)`)
if (orphanComments.length) log(`WARNING: ${orphanComments.length} comment(s) point at files no group owns (${orphanComments.map(i => i.id).join(', ')}); they go to the proposal as open items. Add the file to documents to draft them.`)

// ---------------------------------------------------------------- Draft -> Verify -> Finalize
const FACTS_BRIEF = `Check every number in new and mirror_new against the outputs (recompute products and percents; printed operands must reproduce the printed result at the printed precision), every pointer (does that table, column or figure show that number?), that old and mirror_old each occur exactly once in their files, and that source and mirror carry the same digits in the same order. Also recompute every answer in answers that states a number or a verification from the outputs, and check its file and row.`
const RULINGS_BRIEF = `Check every edit against the standard files and the standing rulings: first-sentence discipline (a replacement first sentence never heavier than the old), nothing the author refused brought back, no defensive prose, one name per object, a limitation said once, no new content unflagged, approved documents flagged.`
const finals = await pipeline(groups,
  g => agent(`${CTX}

STAGE: DRAFT, file ${g.file}${g.mirror ? ` with its mirror ${g.mirror}` : ''}.
Rules of this round:
${JSON.stringify(rules.rules.map(r => ({ id: r.id, rule: r.rule, test: r.test })), null, 1)}
Comments on this file:
${JSON.stringify(g.comments, null, 1)}
Sweep instances in this file (marked and unmarked):
${JSON.stringify(g.instances, null, 1)}

Read the whole file (and its mirror) first. Before drafting, answer every comment with a non-empty
needs_verification from the outputs: what they show, with file and row (or column), and say so
plainly when the outputs do not support what the author believes. Put each answer in answers (with
the comment id); do not run a new analysis: a candidate one is marked NEW CONTENT in the answer.
Then draft one edit per repair, old and new side by side, mirror old and new included. Merge two
repairs that touch one sentence into one edit. Prefer whole sentences. Copy old verbatim and check
it occurs exactly once (normalize whitespace when you count). Check every number you print against
the outputs and give its source in why. A comment that is a question gets an answer, not an edit.
A choice that is the author's goes in decisions, options lettered, the recommended one first; an
option that changes a first sentence or an approved document says so in its cost. A passage the
author has rejected twice (rejected_count 2 or more: marked confusing, unreadable or to be cut) is
proposed for deletion (rule 5). A passage he has commented on repeatedly while asking for more gets
lettered variants instead, each saying in its cost which of his past objections it answers and
which it leaves open. Hits in other files go in ripples.`,
    opt({ label: `draft:${g.file.split('/').pop()}`, phase: 'Draft', schema: DRAFT, effort: E.draft })),
  (d, g) => {
    if (!d) return null
    const payload = JSON.stringify(d, null, 1)
    const lens = (key, brief) => agent(`${CTX}

STAGE: VERIFY (${key}) the drafted edits for ${g.file}. ${brief}
Report only real problems, each tied to an edit id, with evidence and a concrete fix (exact
replacement text where possible). An empty list is fine.

DRAFT:
${payload}`, opt({ label: `verify:${key}:${g.file.split('/').pop()}`, phase: 'Verify', schema: PROBLEMS, effort: E.verify || 'high' }))
    const lenses = [
      () => lens('facts', FACTS_BRIEF),
      () => lens('rulings', `${RULINGS_BRIEF} Check that each comment of the round is answered by an edit, an answer or a decision, and say which are not.`),
    ]
    if (READER) lenses.push(() => agent(`${CTX}

STAGE: VERIFY (reader). You are the AUTHOR reading the new text for the first time, in place, in the
file he reads${g.mirror && ML ? ` (the ${ML} mirror, ${g.mirror})` : ''}, with all his comments of this
round and the earlier rounds in mind. For every place you would write a comment again (a logic
jump, a number whose source or arithmetic is not on the page, a sentence that does not serve its
paragraph's first sentence, abstract or convoluted wording), report it with a concrete fix. Be as
demanding as his comments are.

DRAFT:
${payload}`, opt({ label: `verify:reader:${g.file.split('/').pop()}`, phase: 'Verify', schema: PROBLEMS, effort: E.verify || 'high' })))
    return parallel(lenses).then(vs => ({ draft: d, problems: vs.filter(Boolean).flatMap(v => v.problems) }))
  },
  (v, g) => v ? agent(`${CTX}

STAGE: FINALIZE the edits for ${g.file}. Apply every verifier problem you judge real (check the file
and the outputs yourself when verifiers disagree), keep old and mirror_old exact and unique, keep
source and mirror in step. Return the same schema; in notes, one line per verifier problem: applied
or not, and why.

DRAFT:
${JSON.stringify(v.draft, null, 1)}

PROBLEMS:
${JSON.stringify(v.problems, null, 1)}`, opt({ label: `final:${g.file.split('/').pop()}`, phase: 'Finalize', schema: DRAFT, effort: E.draft }))
    .then(f => (f ? { file: g.file, mirror: g.mirror, final: f, problems: v.problems.length } : null)) : null)
const done = finals.filter(Boolean)
log(`${done.length} of ${groups.length} groups finalized, ${done.reduce((n, f) => n + f.final.edits.length, 0)} edits`)

// ---------------------------------------------------------------- Critic
phase('Critic')
const critic = await agent(`${CTX}

STAGE: COMPLETENESS CRITIC. Imagine every final edit below applied, source and mirror. Then:
(1) collisions: the same old text edited twice, a number moved into one paragraph and left in
another, a pointer to text another edit deletes, two edits that contradict each other;
(2) instances of the round's rules that every sweeper missed, anywhere in the files;
(3) table and figure notes or footnotes whose numbers the body no longer explains;
(4) comments left with no edit, answer or decision.
Return additional edits in the same schema (ids X1, X2, ...), and put the collisions and gaps in notes.

RULES:
${JSON.stringify(rules.rules.map(r => ({ id: r.id, rule: r.rule })), null, 1)}

FINAL EDITS:
${JSON.stringify(done.map(f => ({ file: f.file, edits: f.final.edits, decisions: f.final.decisions })), null, 1)}`,
  opt({ label: 'critic', phase: 'Critic', schema: DRAFT, effort: E.verify || 'high' }))

// ---------------------------------------------------------------- Gap (the critic's edits get the same checks as every other edit)
let gap = null
let gapLenses = 0
const criticEdits = critic && Array.isArray(critic.edits) ? critic.edits : []
if (criticEdits.length) {
  phase('Gap')
  const gpay = JSON.stringify({ edits: criticEdits, decisions: critic.decisions || [], answers: critic.answers || [] }, null, 1)
  const gapLens = (key, brief) => agent(`${CTX}

STAGE: VERIFY (${key}) the completeness critic's additional edits (gap round). ${brief}
Report only real problems, each tied to an edit id, with evidence and a concrete fix. An empty list is fine.

CRITIC EDITS:
${gpay}`, opt({ label: `gap:${key}`, phase: 'Gap', schema: PROBLEMS, effort: E.verify || 'high' }))
  const gv = (await parallel([() => gapLens('facts', FACTS_BRIEF), () => gapLens('rulings', RULINGS_BRIEF)])).filter(Boolean)
  gapLenses = gv.length
  const gproblems = gv.flatMap(v => v.problems)
  gap = await agent(`${CTX}

STAGE: FINALIZE the completeness critic's additional edits (gap round). Apply every verifier problem
you judge real (check the file and the outputs yourself), keep old and mirror_old exact and unique,
keep source and mirror in step, and drop an edit you cannot make true. Return the same schema; in
notes, one line per verifier problem: applied or not, and why.

CRITIC EDITS:
${gpay}

PROBLEMS:
${JSON.stringify(gproblems, null, 1)}`, opt({ label: 'gap:final', phase: 'Gap', schema: DRAFT, effort: E.draft }))
  log(`gap round: ${criticEdits.length} critic edit(s), ${gproblems.length} problem(s), ${gap ? gap.edits.length : 0} edit(s) kept${gv.length < 2 ? ' (a lens did not return: the kept edits are UNVERIFIED)' : ''}`)
}
const gapVerified = !!gap && gapLenses === 2
const gapEdits = gap ? gap.edits : criticEdits

// ---------------------------------------------------------------- Build (optional: what each lettered option looks like)
let built = null
const extra = gap || critic
const allDecisions = done.flatMap(f => f.final.decisions || []).concat((extra && extra.decisions) || [])
if (A.build && A.build.length && allDecisions.length) {
  phase('Build')
  const allEdits = done.flatMap(f => f.final.edits).concat(gapEdits)
  built = await agent(`${CTX}

STAGE: BUILD EACH OPTION IN SCRATCH. Nothing is written under ${ROOT}. Check free disk space first
(df -h); stop and report if it is under about 10 GB. For each decision and each of its lettered
options: make a fresh copy under ${SCR}/build/<decision id>-<letter>/ of
${(A.buildCopy || ['the folders the build needs']).join(', ')} (cp -R; symlink nothing you write to),
apply every edit that belongs to no option of any decision plus the edits of this option (other
decisions at their recommended option), with a script that requires a unique match per edit and
writes the file after every replacement, then run each build from that copy, wrapped in a timeout
(perl -e 'alarm 600; exec @ARGV' <cmd>):
${bullet(A.build.map(b => `${b.name}: ${b.cmd}`))}
Report per option: edits applied or failed, errors, overfull boxes, undefined references, pages, and
whether the output file is newer than the build start (a stale output is a failed build). Delete
every copy before you return.

DECISIONS:
${JSON.stringify(allDecisions, null, 1)}

EDITS:
${JSON.stringify(allEdits, null, 1)}`, opt({ label: 'build', phase: 'Build', effort: E.build }))
}

// ---------------------------------------------------------------- Write
phase('Write')
const written = await agent(`${CTX}

STAGE: WRITE THE ROUND FILES. You may write ONLY these three files (create ${RD}/ if needed):
  ${RD}/annotation_intake.md      fill templates/annotation-intake.md (read it) from the intake, rules and sweep below
  ${RD}/${A.roundId}_proposal.md  fill templates/round-proposal.md (read it): comments one by one, decisions
                                  lettered with the recommended option first, the rule sweep table with
                                  counts (rules with no hits reported as "swept, nothing found"), answers,
                                  ripples, then every edit as Old / New / Mirror, verbatim
  ${RD}/${A.roundId}_proposal.json {"roundId", "edits": [...all final edits incl. the gap round's X edits...],
                                  "decisions": [...], "answers": [...], "ripples": [...]} for group-landing
Status line: DRAFT, not landed. Do not edit any document. Commentary for the author in ${REPLY},
short; at most two questions, answerable by number and letter. Return the paths, the counts
(comments, rules, instances kept / refuted, edits, decisions) and the questions.

INTAKE: ${JSON.stringify(intake, null, 1)}
RULES: ${JSON.stringify(rules, null, 1)}
SWEEP (kept and refuted): ${JSON.stringify(instances, null, 1)}
RIPPLES (files no group owns): ${JSON.stringify(ripples, null, 1)}
COMMENTS ON FILES NO GROUP OWNS (list them as open items, not drafted): ${JSON.stringify(orphanComments, null, 1)}
FINALS: ${JSON.stringify(done, null, 1)}
CRITIC (collisions and gaps in notes): ${JSON.stringify(critic, null, 1)}
GAP ROUND (the critic's X edits after the facts and rulings lenses${gapVerified ? '' : '; NOT verified: mark every X edit UNVERIFIED in the proposal'}): ${JSON.stringify(gap || { edits: gapEdits }, null, 1)}
BUILD PER OPTION (show it under each decision; "not built" if empty): ${built ? JSON.stringify(built) : '(not built)'}`, opt({ label: 'write', phase: 'Write', schema: WRITTEN }))

return { intake, rules, sweep: { found: instances.length, kept: kept.length }, groups: done, critic, gap, built, written }
