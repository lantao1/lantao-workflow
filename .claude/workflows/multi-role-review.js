export const meta = {
  name: 'multi-role-review',
  description: 'Supervisor, examiner and journal-editor roles plus sentence-level auditors of every concession, clarification and qualifier; each finding must pass 2 of 3 lenses (facts, rulings, reader); one drafter per paragraph then proposes the edits as old and new',
  whenToUse: 'A section reads defensive, hedged or unfocused, or must satisfy the supervisor, an examiner and a journal editor at once. Read-only: returns verified findings and drafted old/new edits per paragraph; nothing lands without the author.',
  phases: [
    { title: 'Review', detail: 'three roles, sentence auditors, structure, facts and mirror lenses; on a second round, a regression reader on the first round\'s changes' },
    { title: 'Verify', detail: 'facts, rulings and reader lenses per paragraph' },
    { title: 'Draft', detail: 'one drafter per paragraph, edits as old and new' },
    { title: 'Report', detail: 'optional Markdown report' },
  ],
}

/*
 * multi-role-review.js
 *
 * PURPOSE
 *   Read a section the way the people who will judge it read it, and strip the
 *   prose that defends itself against readers who have not objected. Three role
 *   reviewers (the supervisor, an external examiner, a journal editor) give a
 *   verdict, the questions they would ask, and sentence-level findings.
 *   Sentence auditors name the job of every sentence and run the strict test on
 *   every concession, clarification, qualifier, denial and pre-emption: does it
 *   answer a real logical problem, and would deleting it harm the facts or the
 *   argument? A structure lens checks one centre per paragraph and where each
 *   limitation sits; a facts lens checks numbers and cited studies; a mirror lens
 *   checks a translated copy. Findings are grouped by paragraph; three lenses
 *   (facts, rulings, reader) judge each one, and only findings that at least
 *   minPass lenses uphold or modify go to the drafter, who writes the edits as
 *   old/new text. King changes and new content are returned separately for the
 *   author. Nothing in the project is edited.
 *
 *   SECOND ROUND. After the first round's edits land, run it again on the revised
 *   text with "changes" (the first round's diff or change list) and each
 *   document's "before" copy. The roles then also judge the first round's edits,
 *   and a regression reader walks the diff: a cut that removed the answer to a
 *   real question, a scope lost so that a remaining claim is now false, a new
 *   wording that is untrue, a pointer or antecedent orphaned. Such a finding is
 *   category "regression" with action "restore" (the before sentence, or a
 *   tighter version) and goes through the same three lenses.
 *
 * ARGS (JSON example; paths relative to root unless absolute)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "context": "The results section of a draft paper on <topic>.",
 *     "documents": [
 *       {"path": "paper/results.tex", "numbered": "quality_reports/2027-01-20_roles/results_numbered.txt",
 *        "mirror": "paper/results_zh.tex", "mirror_numbered": "quality_reports/2027-01-20_roles/results_zh_numbered.txt"},
 *       {"path": "paper/appendix.tex", "numbered": "quality_reports/2027-01-20_roles/appendix_numbered.txt",
 *        "appendix": true}
 *     ],
 *     "sweepExtra": ["paper/abstract.tex", "paper/introduction.tex", "paper/conclusion.tex"],
 *     "mirrorLanguage": "Chinese",
 *     "standard": ["docs/writing/WRITING_STANDARD.md"],
 *     "rulings": ["quality_reports/TRACKER.md"],
 *     "authorMessage": "The author's rule or comments for this round, verbatim.",
 *     "outputs": ["results/current/"],
 *     "sourcesDir": "master_supporting_docs/supporting_papers/",
 *     "supervisorProfile": "docs/supervisor_habits.md",
 *     "field": "applied microeconomics, instrumental-variable designs",
 *     "journal": "a field journal in applied economics",
 *     "modelPaper": "the supervisor's own article, its results section",
 *     "auditorGroups": [{"key": "first_half", "scope": "paragraphs P01 to P12 of paper/results.tex"},
 *                       {"key": "second_half", "scope": "paragraphs P13 to P27 of paper/results.tex"},
 *                       {"key": "appendix", "scope": "every paragraph of paper/appendix.tex", "appendix": true}],
 *     "roundDir": "quality_reports/2027-01-20_roles",
 *     "scratch": "<session scratchpad>/multi-role-review"
 *   }
 *   Second round: the same, run on the revised files, plus
 *     "changes": "quality_reports/2027-01-20_roles/round1_diff.txt",
 *   and "before" (and "mirror_before") on each document.
 *   Required: documents. snake_case aliases are accepted (files, related,
 *   instruction, numbers, sources_dir, supervisor_profile, model_paper,
 *   auditor_groups, min_pass, out_dir, scratch_dir, previous_round).
 *
 *   documents          the section(s) under review: strings or {path, numbered?,
 *                      mirror?, mirror_numbered?, key?, appendix?, before?,
 *                      mirror_before?}. "numbered" is a text file with one
 *                      paragraph per id (P01, P02, ...), made before the run so
 *                      every reviewer uses the same ids. Without it reviewers
 *                      count paragraphs themselves and ids can drift.
 *                      appendix = true: test and diagnostic detail belongs there,
 *                      and its auditor judges only whether a sentence defends
 *                      against an objection nobody raised or restates what a
 *                      number is not. before / mirror_before = the copies made
 *                      before the previous round (second round only).
 *   changes            second round only: the previous round's diff or change list
 *                      (a path or text). With it, or with any "before" copy, the
 *                      roles also judge the previous round's edits and a
 *                      regression reader is added.
 *   sweepExtra         other files that carry the same claims (for ripples).
 *   authorMessage      the author's rule or comments for this round, verbatim. If
 *                      absent, the strict test against defensive prose is the rule.
 *   roles              override the three roles: [{key, prompt}].
 *   auditorGroups      sentence auditors by scope: [{key, scope, appendix?, note?}];
 *                      default one per document (appendix taken from the document).
 *   extra              subset of ["structure","facts","mirror"] (default: all that apply).
 *   minPass            lenses that must uphold a finding (default 2 of 3).
 *   draft              false to stop after verification (default true).
 *   roundDir           if set, a Markdown report multi-role-review.md is written there.
 *   scratch            scratch root for agents.
 *   effort             per stage, e.g. {"review": "high"}; verify defaults to high.
 *
 * OUTPUT
 *   { reviews: [{key, verdict, questions, kept, on_previous_round, n_findings}],
 *     global (findings not tied to a paragraph), units: [{unit, findings with pass
 *     counts and lens verdicts, draft: {edits [{old, new, old_mirror, new_mirror,
 *     finding_ids, why}], rejected, king_proposal, new_content, new_paragraph,
 *     check_phrases, ripples}}], counts, report }
 *
 * COST
 *   Review: 3 roles + one auditor per group + structure + facts (+ mirror)
 *   (+ regression on a second round). Then, per paragraph with findings:
 *   3 verifiers + 1 drafter. One file with 20 paragraphs touched: about 87 agents.
 */

const RAW = (args && typeof args === 'object' && !Array.isArray(args)) ? args : {}
function pick() {
  for (let i = 0; i < arguments.length; i++) { const v = RAW[arguments[i]]; if (v !== undefined && v !== null && v !== '') return v }
  return undefined
}
const A = {
  root: pick('root'), context: pick('context'),
  files: pick('documents', 'files'), related: pick('sweepExtra', 'related'),
  standard: pick('standard'), rulings: pick('rulings'), instruction: pick('authorMessage', 'instruction'),
  numbers: pick('outputs', 'numbers'), sources_dir: pick('sourcesDir', 'sources_dir'),
  supervisor_profile: pick('supervisorProfile', 'supervisor_profile'), field: pick('field'), journal: pick('journal'),
  model_paper: pick('modelPaper', 'model_paper'), roles: pick('roles'), auditor_groups: pick('auditorGroups', 'auditor_groups'),
  extra: pick('extra'), min_pass: pick('minPass', 'min_pass'), draft: pick('draft'),
  mirror_language: pick('mirrorLanguage', 'mirror_language'), changes: pick('changes', 'previousRound', 'previous_round'),
  out_dir: pick('roundDir', 'outDir', 'out_dir'), scratch_dir: pick('scratch', 'scratch_dir'),
}
const E = (RAW.effort && typeof RAW.effort === 'object') ? RAW.effort : {}
const NAME = 'multi-role-review'

function list(x) { return x == null ? [] : (Array.isArray(x) ? x : [x]) }
function isPath(x) { return typeof x === 'string' && !/\s/.test(x.trim()) && /[\/.]/.test(x) }
function opts(o) { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }
function slug(s) {
  const b = String(s || '').replace(/^.*\//, '').replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_')
  return b.slice(0, 40) || 'file'
}


const FILES = (function () {
  const seen = {}
  return list(A.files).map((f, i) => {
    const o = typeof f === 'string' ? { path: f } : Object.assign({}, f)
    let key = o.key || slug(o.path || ('file' + (i + 1)))
    while (seen[key]) key = key + '_' + (i + 1)
    seen[key] = true
    o.key = key
    return o
  }).filter(o => o.path)
})()
if (!FILES.length) throw new Error(NAME + ': missing args: documents (a non-empty array of paths or {path, numbered?, mirror?, mirror_numbered?}). See the header comment for an example.')

const STD = list(A.standard).length ? list(A.standard).join(', ') : 'docs/writing/WRITING_STANDARD.md'
const NUM = list(A.numbers).join(', ')
const MIRROR_IS_CHINESE = !A.mirror_language || /chinese|zh|中文/i.test(String(A.mirror_language))
const MIN_PASS = A.min_pass || 2
const ANY_MIRROR = FILES.some(f => f.mirror)
const OUT = A.out_dir ? String(A.out_dir).replace(/\/?$/, '/') : ''
const EXTRA = list(A.extra).length ? list(A.extra) : ['structure', 'facts', 'mirror']
const ROUND2 = !!A.changes || FILES.some(f => f.before || f.mirror_before)
const APPENDIX_NOTE = 'In an appendix, test and diagnostic detail belongs; the test there is whether a sentence defends against an objection nobody raised or restates what a number is not.'

function fileLine(f) {
  return '- ' + f.path + (f.appendix ? ' (an appendix)' : '') + (f.numbered ? ' (paragraphs numbered in ' + f.numbered + ')' : '') +
    (f.before ? ' (before the previous round: ' + f.before + ')' : '') +
    (f.mirror ? '; mirror: ' + f.mirror + (f.mirror_numbered ? ' (numbered in ' + f.mirror_numbered + ', same ids)' : '') + (f.mirror_before ? ' (before: ' + f.mirror_before + ')' : '') : '')
}

function rulingsBlock() {
  const r = list(A.rulings)
  if (!r.length) return 'STANDING RULINGS: none were supplied. Do not invent any.'
  const files = r.filter(isPath)
  const inline = r.filter(x => !isPath(x))
  return 'THE AUTHOR\'S STANDING RULINGS (a proposal that breaks one is wrong unless the instruction for this round plainly supersedes it; qualifiers the author himself asked for are REAL: they may be tightened or said once, never removed).' +
    (files.length ? ' Read these files first: ' + files.join(', ') + '.' : '') +
    (inline.length ? '\n' + inline.map(x => '- ' + x).join('\n') : '')
}

const STRICT = 'THE STRICT TEST (the author\'s rule against defensive prose, 「先直接陈述核心判断，再给出原因和证据」: state the core judgment first, then the reason and the evidence; do not pre-empt objections the reader has not raised). Each paragraph keeps one centre; limitations sit where they are truly necessary; the text makes clear, specific, testable judgments instead of accommodating every position to look comprehensive. For every concession, clarification, qualifier, denial ("X, not Y", "does not", "is not") or pre-emption ask: (a) does it answer a real logical problem (a remaining claim would be false or misread without it; an examiner would actually raise it; the author himself asked for it), or a misunderstanding nobody has? (b) if it is deleted, does factual accuracy or the completeness of the argument suffer? Delete when (a) is imagined and (b) is no. When it is real, check placement (is this its home, is it said once?) and length. A sentence that is the evidence for its paragraph\'s king is not a hedge, even when it contains "only" or "not". English forms to look for: contrasts that answer a misreading nobody made ("X, not Y", "rather than", "not from ... but from"); "does not say which ..."; "is not evidence of ..."; "taken at face value"; "does not conflict with"; "only", "still", "remains" used to reassure; "therefore" chains that justify; sentences that restate what an estimate is not; a scope repeated after it was given; a second statement of a limitation; set phrases such as "it should be emphasized that", "it is worth noting that", "this does not mean", "one cannot simply".' +
  (ANY_MIRROR && MIRROR_IS_CHINESE ? ' In a Chinese mirror the same moves read 需要强调的是, 值得注意的是, 这并不意味着, 不能简单地, 并非……而是……, 而不是, 并不, 并没有, 只是, 不说明, 不过, 当然, 事实上, 照字面理解, 之所以……是因为 used to justify, 正是如此, and a reassuring 仍, 仍然, 依然, 其实, 只 or 就是; a translation can add them where the original has none.' : '')

const UNIT_RULE = 'UNITS. Every finding carries "file" (the path of the original file, not the mirror) and "unit" = the id of the paragraph it is in. ' +
  (FILES.some(f => f.numbered) ? 'Use the ids of the numbered paragraph files listed above. ' : '') +
  'For a file without a numbered copy, number its prose paragraphs P01, P02, ... from the first paragraph of the body, counting each table note, figure note and footnote as its own paragraph where it stands. A finding that spans paragraphs is split; "GLOBAL" only for a finding that cannot be tied to one paragraph.'

const CTX = [
  'CONTEXT. You review a section of a written document. ' + (A.root ? 'Project root: ' + A.root + '; relative paths are relative to it. ' : '') + 'You are READ-ONLY: never edit, create, move or delete a project file.' + (A.context ? '\nTHE DOCUMENT: ' + A.context : ''),
  'FILES UNDER REVIEW:\n' + FILES.map(fileLine).join('\n'),
  list(A.related).length ? 'RELATED FILES (they carry the same claims; read them for ripples): ' + list(A.related).join(', ') : '',
  'THE WRITING STANDARD: ' + STD + ' (read its parts on topic sentences, sentences, paragraphs, register, placement and limitations).',
  NUM ? 'MACHINE OUTPUT (the only source for any number): ' + NUM : '',
  A.sources_dir ? 'CITED SOURCES: ' + A.sources_dir : '',
  'Audit only the text a reader sees; comment blocks that record revision history are read only to check a past ruling. They also record why things were removed: a proposal that puts removed content back must engage the reason recorded there, or it is a wasted finding.',
  ROUND2 ? 'THIS IS A SECOND ROUND. The files under review are the text as revised by the previous round.' + (A.changes ? ' What the previous round changed (if this is a path, read it): ' + A.changes + '.' : '') + (FILES.some(f => f.before || f.mirror_before) ? ' The copies from before that round are listed beside each file; diff against them with code where you need to.' : '') : '',
  A.instruction ? 'THE AUTHOR\'S INSTRUCTION FOR THIS ROUND (verbatim; it wins over an older approval or a check whose only purpose was to keep a wording, but not over a ruling that protects a fact):\n' + A.instruction : '',
  rulingsBlock(),
  'HOUSE RULES. Topic sentences (kings) are author-approved: a king changes only with his approval, is never longer or heavier than the one it replaces, and carries scope as one word. Only the author\'s meaning: deleting and tightening are allowed; a rewrite may use only facts already in the document or its output; anything else is NEW CONTENT and is flagged, never written in. One object, one name; parts of the document pointed at by name, not number; no wording that claims more than the design supports. Say a sentence aloud: the listener must have nothing left to ask; length is not the test. A mirror moves with the original: same facts, same order, same digits.',
  'SCRATCH: ' + (A.scratch_dir ? 'only under ' + A.scratch_dir + '/<your label>/' : 'only in a folder of your own in your session scratchpad') + '; delete it before you finish.',
].filter(Boolean).join('\n\n')

const FINDING_ITEM = { type: 'object', properties: {
  file: { type: 'string' },
  unit: { type: 'string', description: 'the paragraph id, e.g. P05; GLOBAL only when no paragraph applies' },
  sentence: { type: 'string', description: 'the current sentence(s), copied verbatim' },
  sentence_mirror: { type: 'string', description: 'the mirror sentence(s), verbatim, or ""' },
  category: { type: 'string', enum: ['defensive', 'regression', 'one_centre', 'limitation_placement', 'clarity', 'story', 'overclaim', 'underclaim', 'fact_error', 'king', 'structure', 'mirror_only', 'other'] },
  problem: { type: 'string', description: 'one or two sentences: what is wrong' },
  rule_test: { type: 'string', description: 'for a concession, clarification, qualifier, denial, pre-emption or scope: real_logic | imagined | author_requested | ruling, then one line on what it answers and whether deleting it harms facts or argument; else n/a' },
  action: { type: 'string', enum: ['delete', 'rewrite', 'move', 'merge', 'restore', 'add', 'flag'] },
  proposal: { type: 'string', description: 'the exact replacement text, or "" for a deletion; for a move, say where; for a restore, the sentence from before the previous round or a tighter version of it' },
  proposal_mirror: { type: 'string', description: 'the exact replacement mirror text, or ""' },
  is_king: { type: 'boolean' },
  new_content: { type: 'boolean' },
  ripple: { type: 'string' },
  severity: { type: 'string', enum: ['critical', 'major', 'minor'] } },
  required: ['file', 'unit', 'sentence', 'category', 'problem', 'rule_test', 'action', 'proposal', 'is_king', 'new_content', 'severity'] }

const REVIEW_SCHEMA = { type: 'object', properties: {
  verdict: { type: 'string', description: '2 to 5 sentences: your overall judgment in your role' },
  questions: { type: 'array', items: { type: 'string' } },
  findings: { type: 'array', items: FINDING_ITEM },
  kept: { type: 'array', items: { type: 'object', properties: {
    file: { type: 'string' }, unit: { type: 'string' }, sentence: { type: 'string' }, why_kept: { type: 'string' } },
    required: ['unit', 'sentence', 'why_kept'] } },
  on_previous_round: { type: 'array', items: { type: 'string' }, description: 'second round only: previous-round edits or king proposals you would not accept or would change, and why, one line each; else []' } },
  required: ['verdict', 'questions', 'findings', 'kept'] }

const VERDICT_SCHEMA = { type: 'object', properties: {
  verdicts: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'integer' }, verdict: { type: 'string', enum: ['uphold', 'modify', 'refute'] }, reason: { type: 'string' },
    modified: { type: 'string', description: 'for modify: the wording you would accept' },
    modified_mirror: { type: 'string' } },
    required: ['id', 'verdict', 'reason'] } },
  missed: { type: 'array', items: { type: 'string' }, description: 'defensive or misplaced sentences in this paragraph that no finding covers (quote them)' } },
  required: ['verdicts', 'missed'] }

const DRAFT_SCHEMA = { type: 'object', properties: {
  unit: { type: 'string' },
  edits: { type: 'array', items: { type: 'object', properties: {
    old: { type: 'string', description: 'exact substring of the current file, unique in it' },
    new: { type: 'string' },
    old_mirror: { type: 'string', description: 'exact substring of the mirror, unique, or ""' },
    new_mirror: { type: 'string' },
    finding_ids: { type: 'array', items: { type: 'integer' } },
    why: { type: 'string' } },
    required: ['old', 'new', 'old_mirror', 'new_mirror', 'finding_ids', 'why'] } },
  rejected: { type: 'array', items: { type: 'object', properties: { finding_id: { type: 'integer' }, why: { type: 'string' } }, required: ['finding_id', 'why'] } },
  king_proposal: { type: 'object', description: 'only if an upheld finding changes the first sentence; else leave the fields empty',
    properties: { old: { type: 'string' }, new: { type: 'string' }, old_mirror: { type: 'string' }, new_mirror: { type: 'string' }, why: { type: 'string' } } },
  new_content: { type: 'array', items: { type: 'object', properties: { finding_id: { type: 'integer' }, text: { type: 'string' }, why: { type: 'string' } }, required: ['finding_id', 'text', 'why'] } },
  new_paragraph: { type: 'string', description: 'the whole paragraph as it reads after your edits' },
  new_paragraph_mirror: { type: 'string' },
  check_phrases: { type: 'array', items: { type: 'string' }, description: 'distinctive phrases of every sentence you deleted or changed, for a later check' },
  ripples: { type: 'array', items: { type: 'string' } } },
  required: ['unit', 'edits', 'rejected', 'new_content', 'new_paragraph', 'check_phrases', 'ripples'] }

const AUDIT_TASK = 'TASK. For EVERY sentence of your units (the original first, then its mirror if there is one), name its job: core judgment / evidence / reason / mechanism / pointer / concession / clarification / qualification / denial / pre-emption / scope. Run the strict test on every sentence whose job is concession, clarification, qualification, denial, pre-emption or scope. For each paragraph also check: does it open on its core judgment, then reason and evidence? Does it carry one centre? Output a finding for every sentence that fails, with exact proposals in the author\'s own meaning. Put every qualifier you KEEP into "kept" with the reason: the sweep is reported, including what survived it. Do not re-propose anything the rulings protect, and do not touch the facts of source-verified characterizations (descriptions of cited studies already checked against the studies themselves).'

function profileLine() {
  if (!A.supervisor_profile) return ''
  return ' The author describes your habits here (if this is a file path, read it): ' + A.supervisor_profile + '.'
}

const ROUND2_ROLE = {
  supervisor: ' SECOND ROUND: in "on_previous_round", list any edit or king proposal of the previous round you would not accept, and why.',
  examiner: ' SECOND ROUND: read the previous round\'s changes. For each of its deletions, ask whether it removed the answer to a question you would actually ask; if so, that is a regression: category regression, action restore, with the before sentence or a tighter version. In "on_previous_round", one line per previous-round edit you would reverse or change.',
  editor: ' SECOND ROUND: after the previous round, has the text become so bare that a referee would now ask a question it used to answer? In "on_previous_round", the previous-round edits you would reverse or change.',
}

const ROLES = list(A.roles).length ? list(A.roles) : [
  { key: 'supervisor', prompt: 'ROLE. You are the author\'s supervisor.' + profileLine() + ' Your habits: you read the first line of every paragraph as an outline and expect each to be the topic stated as a claim; at every sentence you ask "what do you mean?" and want the plain spoken answer in its place; one object, one name; say what is used, what it is and why it is here; the writing is simple while staying in the field\'s register. You are busy, so the next thing you see must be right.' + (A.model_paper ? ' The model for this section is ' + A.model_paper + '; read how its corresponding section is written.' : '') + ' Read the files under review in full, as you would the printed text, and other files only where they point. Mark every sentence you would query and give the author\'s own answer in its place (no new claims). Read with the strict test in mind: you want the findings stated plainly, without arguing with readers who have not objected. In "questions", put the outline test (the kings read alone, in order, and whether they make an argument), then any question you would write in the margin. In "verdict": is this ready to send to you?' },
  { key: 'examiner', prompt: 'ROLE. You are the external examiner' + (A.field ? ', an expert in ' + A.field : '') + '. You will examine the author on this text. Read the files under review in full; check against the output any number a claim hinges on. Job 1: in "questions", list the questions you will actually ask, and for each say whether the text answers it, answers it in the right place, or answers it more than once. Job 2: run the strict test on every concession, clarification and qualifier: one that answers a question you would actually ask stays (tightened, or moved to its home); one that answers a question no examiner would ask goes. Watch for proposals that would cut evidence: a sentence that carries the support for a king must stay. Also flag overclaims (a judgment the evidence does not support) and underclaims (a judgment the evidence supports that the text hedges away), with the numbers. Do not demand new analyses; a gap that needs new content gets new_content = true. In "verdict": would the text survive your examination, and what is its weakest sentence?' },
  { key: 'editor', prompt: 'ROLE. You are a co-editor at ' + (A.journal || 'a field journal in this area') + ', reading the files under review as the corresponding section of a submitted paper. You decide desk reject or send to referees, and you judge the prose as the journal would print it. Ask: is the main result stated clearly, specifically and testably in the first lines? Is each comparison with prior work stated as a clear finding? Does the prose defend itself against objections nobody raised (throat-clearing, over-hedging, restating what an estimate is not)? Does each paragraph carry one point? Are table and figure notes self-contained and no longer than a reader needs? In "verdict": desk reject or send out, with two or three reasons; in "questions", the points you would put to referees. Give sentence-level findings with exact proposals in the author\'s meaning.' },
]

const ROLES_RUN = ROLES.map(r => (ROUND2 && ROUND2_ROLE[r.key]) ? Object.assign({}, r, { prompt: r.prompt + ROUND2_ROLE[r.key] }) : r)

const GROUPS = list(A.auditor_groups).length ? list(A.auditor_groups) : FILES.map(f => ({ key: f.key, appendix: !!f.appendix, scope: 'every paragraph of ' + f.path + (f.mirror ? ' and of its mirror ' + f.mirror : '') + ', including table notes, figure notes and footnotes' }))
const AUDITORS = GROUPS.map(g => ({ key: 'audit_' + (g.key || slug(g.scope)), prompt: 'ROLE. Sentence-level auditor' + (g.appendix ? ' of an appendix' : '') + '. Your units: ' + g.scope + '. ' + AUDIT_TASK + (g.appendix ? ' ' + APPENDIX_NOTE : '') + (g.note ? ' ' + g.note : '') }))

const EXTRAS = []
if (EXTRA.indexOf('structure') >= 0) EXTRAS.push({ key: 'structure', prompt: 'ROLE. Paragraph and limitation auditor. (1) Read the kings (first sentences) of every paragraph alone, in order, as an outline: do they make the argument as clear, specific, testable judgments? Put the outline and your judgment in "questions". (2) For each paragraph: one centre? Which sentences serve a second centre, and where should they go (another paragraph, a note, an appendix, out)? (3) Limitations: list every place in the files under review, their notes and any appendix where a limitation is stated, and judge the set against "said once in its home paragraph and once at the close; table notes read the printed cells; limitations concentrated where necessary". Propose the moves and deletions that leave each limitation where it is necessary, once. (4) Flag any paragraph that weighs all positions equally instead of making a judgment.' })
if (EXTRA.indexOf('facts') >= 0) EXTRAS.push({ key: 'facts', prompt: 'ROLE. Fact checker. Verify every number and factual claim in the files under review (including notes and footnotes) against the machine output' + (NUM ? ' (' + NUM + ')' : '') + ', and every description of a cited study against the source' + (A.sources_dir ? ' in ' + A.sources_dir : '') + ' (read the relevant pages). Check rounding exactly, and check that each number is described with the right specification, sample and estimator. Report only discrepancies, as findings with category fact_error and the evidence (file, row, value or page) in "problem". In "verdict", state how many numbers and claims you checked. "kept" may be empty.' })
if (ROUND2) EXTRAS.push({ key: 'regression', prompt: 'ROLE. Regression checker for the previous round. Go through ' + (A.changes ? 'its changes (' + A.changes + ') line by line' : 'the diff of each file against its "before" copy, line by line (make it with code)') + ', every file and mirror. For every deleted or changed sentence: (1) is any fact now missing that the section, its appendix or the related files rely on (search them), or did a scope disappear so that a remaining claim is now false or ambiguous (a remaining sentence now reads as covering a case it does not)? (2) is the new wording true (check the output for every number and every significance word)? (3) did a pointer, a "this", "that" or "the two", a table reference or a note lose its antecedent or its printed cell? (4) does the mirror say exactly what the original says (same facts, order, digits)? (5) did a move leave the order of a section or a pointer wrong? (6) any banned word or dash, causal wording for an association, or a coinage? Report each defect as a finding (category regression or fact_error, action restore or rewrite) with the exact fix. "kept" lists the previous-round edits you checked and found clean, one line each. In "verdict", how many edits you checked and how many are clean.' })
if (EXTRA.indexOf('mirror') >= 0 && ANY_MIRROR) EXTRAS.push({ key: 'mirror', prompt: 'ROLE. Mirror auditor. Read each mirror in full beside its original. Find the mirror forms of the defensive move. For each: if the same move is in the original, give a finding with both proposals (category defensive); if it exists only in the mirror (the translation added a defensive turn, or states the caveat before the judgment where the original states the judgment first), category mirror_only with the mirror fix only and proposal "" . Also flag any mirror sentence whose content differs from its original.' })

const REVIEWERS = ROLES_RUN.concat(AUDITORS).concat(EXTRAS)

function keyForPath(p) {
  const s = String(p || '')
  const hit = FILES.find(f => f.path === s || f.mirror === s || (s && (s.endsWith(f.path) || f.path.endsWith(s))))
  return hit ? hit.key : (FILES.length === 1 ? FILES[0].key : slug(s))
}
function normUnit(f) {
  const s = String(f.unit || '').trim().toUpperCase()
  if (!s || s === 'GLOBAL') return 'GLOBAL'
  const m = s.match(/([A-Z]{1,3})\s*0*(\d{1,3})/)
  if (!m) return 'GLOBAL'
  return keyForPath(f.file) + ':' + m[1] + (m[2].length === 1 ? '0' + m[2] : m[2])
}

phase('Review')
log('multi-role-review: ' + REVIEWERS.length + ' reviewers over ' + FILES.length + ' file(s)')
const reviews = await parallel(REVIEWERS.map(r => () =>
  agent(CTX + '\n\n' + STRICT + '\n\n' + UNIT_RULE + '\n\n' + r.prompt, opts({ label: 'review:' + r.key, phase: 'Review', schema: REVIEW_SCHEMA, effort: E.review }))
    .then(out => (out ? { key: r.key, out } : null))))
const got = reviews.filter(Boolean)
log('reviews returned: ' + got.length + '/' + REVIEWERS.length + (got.length < REVIEWERS.length ? ' (missing: ' + REVIEWERS.filter(r => !got.some(g => g.key === r.key)).map(r => r.key).join(', ') + ')' : ''))

const byUnit = {}
const globalFindings = []
for (const r of got) {
  for (const f of (r.out.findings || [])) {
    const u = normUnit(f)
    const item = Object.assign({}, f, { unit: u, source: r.key })
    if (u === 'GLOBAL') { globalFindings.push(item); continue }
    if (!byUnit[u]) byUnit[u] = []
    byUnit[u].push(item)
  }
}
const units = Object.keys(byUnit).sort()
log('findings: ' + units.reduce((a, u) => a + byUnit[u].length, 0) + ' in ' + units.length + ' paragraphs, ' + globalFindings.length + ' not tied to a paragraph')

const LENSES = [
  { key: 'facts', prompt: 'LENS: facts and argument completeness. For each finding, if its proposal were applied: (1) would a fact disappear that the text needs (a number another sentence, note or file relies on; a scope without which a remaining claim becomes false; the evidence for the paragraph\'s king)? Read the rest of the paragraph and the files that point at it. (2) would the new wording assert anything false or stronger than the evidence (check the output)? (3) would it break a pointer or make a note stop reading the printed cells? (4) for a restore: is the restored sentence true, and is it needed? Verdict uphold / modify (give the wording you would accept, original and mirror) / refute (name the fact or claim it would break).' },
  { key: 'rulings', prompt: 'LENS: the author\'s rulings and the standard. For each finding: does the proposal break a standing ruling (remove something the author asked for, put a limitation into a preamble, delete both the home and the close of a limitation, change a king without flagging it, make a king longer or heavier, add a banned word, write an association as an effect, coin a second name, point at a part by number, write in content the document does not contain)? If the sentence is guarded by a check or gate, read why it was put there. The instruction for this round wins over a check whose only purpose was to keep a wording; it does not win over one that protects a fact or a ruling the author restated. Verdict uphold / modify / refute, with the ruling named.' },
  { key: 'reader', prompt: 'LENS: the reader the strict test is written for. Read the paragraph as it would stand after ALL its proposals together. For each finding: is the targeted sentence really defensive (it answers a misunderstanding nobody has), or does it carry the reasoning (a reason, a mechanism, the meaning of a number, a real objection, the evidence for the king)? For a restore: was the deleted sentence really carrying reasoning a reader needs? After the change, does the paragraph open on its core judgment and then give reason and evidence, with one centre? Does it read in one pass when said aloud? Would a careful reader in the field see the change as an improvement? Where two findings touch the same sentence, say which wording is better. Verdict uphold / modify / refute. In "missed", quote any defensive or misplaced sentence in this paragraph that no finding covers.' },
]

function listFindings(fs) {
  return fs.map((f, i) => '[' + i + '] source=' + f.source + '; category=' + f.category + '; action=' + f.action + '; severity=' + f.severity + '; king=' + f.is_king + '; new_content=' + f.new_content +
    '\n  SENTENCE: ' + f.sentence +
    '\n  MIRROR SENTENCE: ' + (f.sentence_mirror || '') +
    '\n  PROBLEM: ' + f.problem +
    '\n  RULE TEST: ' + f.rule_test +
    '\n  PROPOSAL: ' + (f.proposal || '(delete)') +
    '\n  MIRROR PROPOSAL: ' + (f.proposal_mirror || '(none)') +
    '\n  RIPPLE: ' + (f.ripple || '')).join('\n\n')
}
function unitWhere(unit) {
  const key = unit.split(':')[0]
  const f = FILES.find(x => x.key === key) || FILES[0]
  return { file: f, where: 'paragraph ' + unit.split(':')[1] + ' of ' + f.path + (f.numbered ? ' (see ' + f.numbered + ')' : '') + (f.mirror ? ', mirror ' + f.mirror + (f.mirror_numbered ? ' (see ' + f.mirror_numbered + ')' : '') : '') }
}

const unitsOut = await pipeline(units,
  async (unit) => {
    const fs = byUnit[unit]
    const w = unitWhere(unit)
    const vs = await parallel(LENSES.map(l => () =>
      agent(CTX + '\n\n' + STRICT + '\n\n' + l.prompt + '\n\nUNIT: ' + w.where + '. Read it, the paragraphs around it, and the rest of the file as needed.\n\nFINDINGS FOR THIS UNIT (ids in brackets):\n' + listFindings(fs),
        opts({ label: 'verify:' + unit + ':' + l.key, phase: 'Verify', schema: VERDICT_SCHEMA, effort: E.verify || 'high' }))))
    const scored = fs.map((f, i) => {
      const per = LENSES.map((l, j) => {
        const v = vs[j] && vs[j].verdicts ? vs[j].verdicts.find(y => y.id === i) : null
        return { lens: l.key, verdict: v ? v.verdict : 'none', reason: v ? v.reason : '(no verdict)', modified: v ? (v.modified || '') : '', modified_mirror: v ? (v.modified_mirror || '') : '' }
      })
      const passes = per.filter(p => p.verdict === 'uphold' || p.verdict === 'modify').length
      return Object.assign({}, f, { id: i, passes, lens_verdicts: per })
    })
    const missed = vs.flatMap((v, j) => (v && v.missed ? v.missed.map(m => LENSES[j].key + ': ' + m) : []))
    return { unit, w, findings: scored, missed }
  },
  async (res) => {
    const passing = res.findings.filter(f => f.passes >= MIN_PASS)
    if (A.draft === false || (!passing.length && !res.missed.length)) return { unit: res.unit, findings: res.findings, missed: res.missed, draft: null }
    const tally = res.findings.map(f => '[' + f.id + '] passes=' + f.passes + '/3\n   ' + f.lens_verdicts.map(p =>
      p.lens + ': ' + p.verdict.toUpperCase() + ' (' + p.reason + ')' + (p.modified ? ' | modified: ' + p.modified : '') + (p.modified_mirror ? ' | modified mirror: ' + p.modified_mirror : '')).join('\n   ')).join('\n')
    const draft = await agent(CTX + '\n\n' + STRICT + '\n\nTASK. Draft the landing for ' + res.w.where + '.\n' +
      'Rules: apply a finding only if at least ' + MIN_PASS + ' of the three lenses upheld or modified it (passes >= ' + MIN_PASS + '). Where lenses modified it, use a wording that meets every lens\'s reason. Merge findings that touch the same sentence into one coherent edit. Never change the king (the paragraph\'s first sentence) inside "edits": put an upheld king change into king_proposal for the author. Never write in new content: list it under new_content. A "missed" item may be applied only if it is a pure deletion of a sentence that passes the strict test, harms no fact and breaks no ruling; say so in "why".\n' +
      'If there is a mirror, it must say exactly what the original says (same facts, same order, same digits) in its established terms. "old" and "old_mirror" are copied character for character from the files and are long enough to be unique there; a deletion takes the following space with it. After your edits, re-read the whole paragraph in both languages: it opens on its judgment, reads in one pass, leaves no "this", "that" or "the two" whose antecedent you deleted, and contains no banned word or dash. check_phrases: distinctive phrases of every sentence you deleted or changed. ripples: the same sentence or claim elsewhere (grep the related files and their mirrors) that would now be out of step.\n\n' +
      'FINDINGS:\n' + listFindings(res.findings) + '\n\nLENS VERDICTS:\n' + tally + '\n\nMISSED (from the lenses):\n' + (res.missed.join('\n') || '(none)'),
      opts({ label: 'draft:' + res.unit, phase: 'Draft', schema: DRAFT_SCHEMA, effort: E.draft }))
    return { unit: res.unit, findings: res.findings, missed: res.missed, draft }
  })

const done = unitsOut.filter(Boolean)
const counts = {
  reviewers: REVIEWERS.length,
  reviews_returned: got.length,
  paragraphs: units.length,
  findings: done.reduce((a, u) => a + u.findings.length, 0),
  passing: done.reduce((a, u) => a + u.findings.filter(f => f.passes >= MIN_PASS).length, 0),
  restores: done.reduce((a, u) => a + u.findings.filter(f => f.passes >= MIN_PASS && f.action === 'restore').length, 0),
  edits: done.reduce((a, u) => a + (u.draft && u.draft.edits ? u.draft.edits.length : 0), 0),
  king_proposals: done.filter(u => u.draft && u.draft.king_proposal && u.draft.king_proposal.new).length,
  new_content: done.reduce((a, u) => a + (u.draft && u.draft.new_content ? u.draft.new_content.length : 0), 0),
  global: globalFindings.length,
}
log('verified: ' + counts.passing + ' of ' + counts.findings + ' findings passed ' + MIN_PASS + ' of 3 lenses; ' + counts.edits + ' edits drafted; ' + counts.king_proposals + ' king proposals for the author')

const reviewsOut = got.map(r => ({ key: r.key, verdict: r.out.verdict, questions: r.out.questions, kept: r.out.kept, on_previous_round: r.out.on_previous_round || [], n_findings: (r.out.findings || []).length }))

let report = null
if (OUT) {
  phase('Report')
  report = await agent([
    'You write ONE report file and return its path. ' + (A.root ? 'Project root: ' + A.root + '.' : ''),
    'WRITE ' + OUT + 'multi-role-review.md with the Write tool, in Markdown and English (mirror sentences quoted as they are). Sections: "# Multi-role review"; "## Verdicts" (each role in two or three lines, with the questions it would ask); "## The outline test" (from the supervisor and the structure lens); "## King proposals (nothing lands without the author)" (old | new | why); "## New content (the author decides)"; "## Edits by paragraph" (for each paragraph: a table old | new | why with the finding ids and pass counts; mirror edits beneath); "## Rejected and refuted" (one line each with the reason); "## Qualifiers examined and kept" (one line each); ' + (ROUND2 ? '"## On the previous round" (each reviewer\'s on_previous_round lines, and every restore edit); ' : '') + '"## Not tied to a paragraph"; "## Ripples (listed, not applied)". Use only the data below; do not change any proposed text.',
    'REVIEWS (JSON):\n' + JSON.stringify(reviewsOut),
    'UNITS (JSON):\n' + JSON.stringify(done),
    'GLOBAL (JSON):\n' + JSON.stringify(globalFindings),
  ].join('\n\n'), { label: 'report', phase: 'Report', schema: { type: 'object', properties: { report_path: { type: 'string' } }, required: ['report_path'] }, agentType: 'general-purpose' })
}

return { reviews: reviewsOut, global: globalFindings, units: done, counts, report }
