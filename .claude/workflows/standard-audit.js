export const meta = {
  name: 'standard-audit',
  description: 'Read-only audit of document files against a writing standard: readers per file and lens, two adversarial refuters per finding, a replacement check, an optional mirror checker, a completeness critic, a per-file reconciliation of proposals that touch the same paragraph, and one deduped list of what survives',
  whenToUse: 'A draft or a set of files must be held to the writing standard before it goes to the supervisor or a co-author, or after a large rewrite. It proposes old and new sentences and edits nothing.',
  phases: [
    { title: 'Find', detail: 'one reader per file and lens, plus cross-file readers' },
    { title: 'Refute', detail: 'two adversaries per batch, each given the rulings and the instruction' },
    { title: 'Replace', detail: 'every surviving replacement tested against the standard' },
    { title: 'Gaps', detail: 'a completeness critic, then one round on what it found' },
    { title: 'Reconcile', detail: 'per file: proposals on the same paragraph read together and against the rulings' },
    { title: 'Report', detail: 'deduped list; optional Markdown report per file' },
  ],
}

/*
 * standard-audit.js
 *
 * PURPOSE
 *   Hold one or more document files to a written standard (default
 *   docs/writing/WRITING_STANDARD.md). For every file, one reader per lens finds
 *   defects and proposes old/new text; two adversarial refuters attack each batch
 *   (each sees the standing rulings AND the author's latest message, so a finding
 *   cannot reopen a settled ruling and a refuter cannot refute a new comment with
 *   an old approval); a checker tests every surviving replacement; an optional
 *   mirror lens aligns a translated copy sentence by sentence; cross-file readers
 *   check names, consistency, the outline of first lines and citations; a
 *   completeness critic names what nobody read and one gap round reads it. Plain
 *   code then dedupes the survivors; one reconciler per file reads every standing
 *   proposal for that file together (proposals from different lenses on the same
 *   paragraph must work together, none may contradict another or a ruling), and
 *   the result is one ranked list. Nothing in the project is edited. Reports are
 *   written only if roundDir is set.
 *
 * ARGS (JSON example; paths relative to root unless absolute)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "context": "A draft paper on <topic>; the results section was rewritten this week.",
 *     "documents": [
 *       "paper/introduction.tex",
 *       {"path": "paper/results.tex", "mirror": "paper/results_zh.tex",
 *        "status": "rewritten this week after the supervisor's comments"},
 *       "paper/data.tex",
 *       {"path": "paper/abstract.tex", "short": true}
 *     ],
 *     "approvedDocuments": ["paper/data.tex"],
 *     "standard": ["docs/writing/WRITING_STANDARD.md"],
 *     "rulings": ["quality_reports/TRACKER.md", "Never add a hedge to a results paragraph."],
 *     "authorMessage": "The author's latest comments, verbatim.",
 *     "openItems": ["quality_reports/2027-01-15_review/decisions.md"],
 *     "outputs": ["results/current/"],
 *     "glossary": "docs/glossary.md",
 *     "mechanical": "python3 scripts/gates/prose_audit.py --echo",
 *     "roundDir": "quality_reports/audits/2027-01-20_standard_audit",
 *     "scratch": "<session scratchpad>/standard-audit"
 *   }
 *   Required: documents. Everything else is optional but rulings and authorMessage
 *   are strongly recommended (without them refuters cannot tell a settled ruling
 *   from a defect). snake_case aliases are accepted: files, approved, instruction,
 *   numbers, out_dir, scratch_dir, king_max, kill_on, cross_file, cross_lenses, max_gaps,
 *   open_items.
 *
 *   documents          strings or {path, mirror?, key?, title?, scope?, status?,
 *                      approved?, short?, lenses?, deferred?}. short = one combined
 *                      lens instead of four; lenses = override, any of K S R P C A;
 *                      deferred = the author has set this file aside for now: it is
 *                      still audited, but every finding there is tagged DEFERRED.
 *   approvedDocuments  the supervisor-approved model file(s): only factual errors,
 *                      contradictions and unambiguous breaches are raised there,
 *                      and their names win in the one-object-one-name table.
 *   standard           file(s) every agent reads in full first.
 *   rulings            files to read (any entry that looks like a path) and/or
 *                      rulings written inline.
 *   authorMessage      the author's newest comments, verbatim; they override
 *                      older approvals they contradict.
 *   openItems          the items already waiting in the author's open-decision
 *                      table (file paths and/or inline items). A finding that only
 *                      repeats one, with no new evidence, is marked DUPLICATE and
 *                      not raised again.
 *   outputs            machine output (for NUMBER-CHECK findings; never retyped).
 *   glossary           term list for the mirror lens.
 *   mechanical         a mechanical scan readers run first and do not recount.
 *   ear                the author's complaint phrases, used as the readers' ear.
 *   kingMax            word limit for a topic sentence (default 26).
 *   refuters           1 to 3 adversaries per batch (default 2).
 *   killOn             "majority" (default: refuted when more than half of the
 *                      returned votes refute; with 2 adversaries that is both, with
 *                      3 it is 2 of 3; a minority refutation leaves it CONTESTED),
 *                      "all" (only when every vote refutes) or "any" (one refutation
 *                      is enough). Whatever the rule, a misquote refutes outright:
 *                      an adversary that cannot find the "old" text in the file
 *                      (old_verbatim false) and refutes kills the finding.
 *   crossFile          default true when there is more than one document.
 *   crossLenses        subset of ["names","consistency","first_lines","citations"].
 *   maxGaps            gap units run after the critic (default 8; the rest are listed).
 *   reconcile          false to skip the per-file reconciliation (default true).
 *   roundDir           if set, one Markdown report per file plus 00_summary.md.
 *   scratch            scratch root for agents (each deletes its own folder).
 *   effort             per stage, e.g. {"find": "medium", "refute": "high"};
 *                      refute, critic and reconcile default to high, the rest inherit.
 *
 * OUTPUT
 *   { standard, counts, findings (deduped, ranked: kings first, then HIGH/MED/LOW,
 *     CONFIRMED before CONTESTED, DEFERRED last), refuted (including DUPLICATE),
 *     dropped, sweep (clean notes and outline notes per unit and lens), gaps
 *     {found, run, not_run}, conflicts (per file, from the reconciler), reports }
 *   Each finding: file, where, is_king, rules, severity, status, old, final_new,
 *   alternatives, why, derives_from, new_content, ripple, check_note,
 *   reconcile_note, votes, lenses, deferred.
 *
 * COST
 *   Per file: lenses x (1 reader + refuters + 1 replacement check), usually 4 or 5
 *   lenses. Cross-file: 4 units x the same. Plus 1 critic, up to maxGaps gap units,
 *   one reconciler per file with standing findings, and (with roundDir) one
 *   reporter per file with findings plus one summary.
 *   Five files with mirrors: about 150 agents.
 */

const RAW = (args && typeof args === 'object' && !Array.isArray(args)) ? args : {}
function pick() {
  for (let i = 0; i < arguments.length; i++) { const v = RAW[arguments[i]]; if (v !== undefined && v !== null && v !== '') return v }
  return undefined
}
const A = {
  root: pick('root'), context: pick('context'),
  files: pick('documents', 'files'), approved: pick('approvedDocuments', 'approved'),
  standard: pick('standard'), rulings: pick('rulings'), instruction: pick('authorMessage', 'instruction'),
  numbers: pick('outputs', 'numbers'), glossary: pick('glossary'), mechanical: pick('mechanical'), ear: pick('ear'),
  king_max: pick('kingMax', 'king_max'), refuters: pick('refuters'), kill_on: pick('killOn', 'kill_on'),
  cross_file: pick('crossFile', 'cross_file'), cross_lenses: pick('crossLenses', 'cross_lenses'),
  max_gaps: pick('maxGaps', 'max_gaps'), open_items: pick('openItems', 'open_items'), reconcile: pick('reconcile'),
  out_dir: pick('roundDir', 'outDir', 'out_dir'), scratch_dir: pick('scratch', 'scratch_dir'),
}
const E = (RAW.effort && typeof RAW.effort === 'object') ? RAW.effort : {}
const NAME = 'standard-audit'

function list(x) { return x == null ? [] : (Array.isArray(x) ? x : [x]) }
function isPath(x) { return typeof x === 'string' && !/\s/.test(x.trim()) && /[\/.]/.test(x) }
function opts(o) { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }
function slug(s) {
  const b = String(s || '').replace(/^.*\//, '').replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_')
  return b.slice(0, 40) || 'file'
}
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase() }


const FILES = (function () {
  const seen = {}
  return list(A.files).map((f, i) => {
    const o = typeof f === 'string' ? { path: f } : Object.assign({}, f)
    let key = o.key || slug(o.path || ('file' + (i + 1)))
    while (seen[key]) key = key + '_' + (i + 1)
    seen[key] = true
    o.key = key
    o.title = o.title || o.path
    o.approved = !!o.approved || list(A.approved).indexOf(o.path) >= 0
    return o
  }).filter(o => o.path)
})()

if (!FILES.length) throw new Error(NAME + ': missing args: documents (a non-empty array of paths or {path, mirror?}). See the header comment for an example.')

const STD = list(A.standard).length ? list(A.standard).join(', ') : 'docs/writing/WRITING_STANDARD.md'
const NUM = list(A.numbers).join(', ')
const KING_MAX = A.king_max || 26
const N_REF = Math.max(1, Math.min(3, A.refuters || 2))
const KILL_ON = (A.kill_on === 'any' || A.kill_on === 'all') ? A.kill_on : 'majority'
const MAX_GAPS = A.max_gaps == null ? 8 : A.max_gaps
const RECONCILE = A.reconcile !== false
const CROSS = A.cross_file == null ? FILES.length > 1 : !!A.cross_file
const OUT = A.out_dir ? String(A.out_dir).replace(/\/?$/, '/') : ''
const ANY_MIRROR = FILES.some(f => f.mirror)
const APPROVED = FILES.filter(f => f.approved).map(f => f.path)
const ALL_PATHS = FILES.map(f => f.path + (f.mirror ? ' (mirror: ' + f.mirror + ')' : '')).join('\n  ')

const EAR = list(A.ear).length ? list(A.ear) : [
  '「太绕」 roundabout', '「看不懂」 cannot parse it', '「不直接」 not direct',
  '「削弱我们的故事」 weakens the story', '「太技术细节」 too much machinery',
]

function rulingsBlock() {
  const r = list(A.rulings)
  if (!r.length) return 'STANDING RULINGS: none were supplied. Do not invent any; judge by the standard and the instruction alone.'
  const files = r.filter(isPath)
  const inline = r.filter(x => !isPath(x))
  return 'THE AUTHOR\'S STANDING RULINGS (binding; a proposal that undoes one is wrong however good it sounds).' +
    (files.length ? ' Read these files before you judge anything: ' + files.join(', ') + '.' : '') +
    (inline.length ? '\n' + inline.map(x => '- ' + x).join('\n') : '')
}

function instructionBlock() {
  if (!A.instruction) return ''
  return 'THE AUTHOR\'S LATEST INSTRUCTION (verbatim). It overrides any earlier approval recorded in comments, gates, trackers or rulings that it contradicts; never defend an old wording against it:\n' + A.instruction
}

function openItemsBlock() {
  const r = list(A.open_items)
  if (!r.length) return ''
  const files = r.filter(isPath)
  const inline = r.filter(x => !isPath(x))
  return 'ITEMS ALREADY WAITING IN THE AUTHOR\'S OPEN-DECISION TABLE (he has them; do not raise them again).' +
    (files.length ? ' Read: ' + files.join(', ') + '.' : '') +
    (inline.length ? '\n' + inline.map(x => '- ' + x).join('\n') : '') +
    '\nIf a finding merely repeats one of these items and brings no new evidence, set duplicate_of to that item (its id, or its first words) and REFUTE. If it brings new evidence, judge it on its merits and leave duplicate_of empty.'
}

const COMMON = [
  'You are a READ-ONLY reviewer of a written document. Never edit, create, move or delete a project file. ' +
    (A.root ? 'Project root: ' + A.root + '; relative paths are relative to it.' : 'Relative paths are relative to the session working directory.'),
  A.context ? 'THE DOCUMENT: ' + A.context : '',
  'FIRST read the writing standard in full: ' + STD + '. It is binding.',
  A.mechanical ? 'A mechanical scan exists: run "' + A.mechanical + ' <file>" on your target if it has not been run. Do not recount what it counts; judge what it cannot (whether a flagged line is a real topic sentence, whether a long sentence reads in one pass).' : '',
  'Audit only the text a reader sees. Skip comment blocks that record revision history (LaTeX % lines, HTML comments) except to check a past ruling.',
  NUM ? 'Machine output (the only source for any number): ' + NUM + '. Use code to read it.' : '',
  rulingsBlock(),
  instructionBlock(),
  'How the author complains when prose fails: ' + EAR.join('; ') + '. Use these as your ear.',
  'ONLY THE AUTHOR\'S MEANING: a proposal never adds a fact, claim, number, citation or caveat that is not already in the document. If a repair needs one, set new_content=true and say exactly what is new.',
  'NUMBERS are never retyped by a reviewer. If a number looks wrong or inconsistent, write NUMBER-CHECK in "rule", quote both places, and name the output file and row that would settle it.',
  'LENGTH IS NOT THE TEST: never flag a sentence because it is long; flag it only if a reader must read it twice. Fixing a mechanical flag can make prose worse.',
  'A replacement topic sentence (king) is never longer or heavier than the one it replaces. Missing purpose goes in the body.',
  'SCRATCH: ' + (A.scratch_dir ? 'write scratch files only under ' + A.scratch_dir + '/<your label>/' : 'write scratch files only in a folder of your own in your session scratchpad') + '; delete it before you finish. Never copy the whole project.',
].filter(Boolean).join('\n\n')

const LENS = {
  K: 'LENS K, kings (topic sentences). For EVERY prose paragraph of the target, list its king (first sentence). Judge each: (a) a claim, not a label and not an announcer ("This section turns to ..."); (b) the spoken test: said aloud, is the listener left asking "what do you mean?", "which one?", "in what sense?"; (c) true of everything beneath it, including every column of any table it sits over; scope is carried by ONE word, never by a clause; (d) at most ' + KING_MAX + ' words and no ", and " (if a mechanical scan counts these, read it and do not recount; a scan cannot tell a real king from a line that continues a paragraph after a display); (e) read ALL the kings of the target in order as one document: do they make an argument on their own? Put that verdict, naming the place where it breaks, in outline_note (at most 120 words). A proposed king is NO LONGER and NO HEAVIER than the king it replaces, one claim, no ", and ". If one paragraph holds two topics, write SPLIT in "rule" and give both kings in "new".',
  S: 'LENS S, sentences and paragraphs. For every body sentence ask: is it the spoken answer to "what do you mean?", or must the reader read it twice; is the role of a thing stated before its construction; is every term of art defined where it is first used, in words the reader already has (unless the author refused that gloss); is technical vocabulary used before the equation that defines it is displayed; is every term of every displayed equation glossed, in a fixed order, the error term included; one claim per sentence; no pointing back ("the former", "the two changes", a "this" or "it" whose antecedent is lost or wrong). Paragraphs: every sentence serves the king; a design justification or an extra fact goes to a note, to its own paragraph, or out; a number the reader stops at is explained or has its consequence stated, or it is cut; every restriction carries its reason where it is imposed; what is held constant is stated beside what varies; every reported estimate corresponds to a displayed equation. No repetition inside a paragraph, no announcer, no echo of the king at the paragraph\'s end, no sentence that repeats what another paragraph of the same file already said (say once).',
  R: 'LENS R, register, names and pointers. (a) The project\'s interpretation rules (in the standard, the rulings and the project instructions you were given), above all wording that claims more than the design supports, such as calling an association an effect or making a measured variable the subject of a causal verb; statements about other studies keep those studies\' own terms. Statements of what the model\'s or the framework\'s own forces do (its comparative statics) may use causal language when the sentence marks them as the model\'s or the framework\'s; list the borderline ones in clean_note rather than as findings. (b) One object, one name INSIDE this target: report every object that has two names here (another reviewer builds the table across files). (c) Standard technical terms are named, not explained at length, and never replaced by a euphemism. (d) A paper is not a manual (「论文不是手册」, "a paper is not a manual"): no script, file, path or column names, no narration of the authors\' own workflow ("was examined and set aside", "this note documents"), no catalogue numbers in prose. (e) Parts of the document are pointed at by name, never by number. (f) One word for statistical significance throughout. (g) No metaphors, coinages or journalistic verbs where the field has a standard term. (h) Banned words and dashes as the standard lists them.',
  P: 'LENS P, placement, numbers and consistency. (a) List every sentence that states a limitation. Each limitation is said ONCE in its home paragraph and once at the close, never in a preamble or a section opener: mark the repeats. (b) Table and figure notes and captions: each note reads the printed cells and holds only what a note holds (a note is not a landfill); open the table files and figures where needed. (c) Tests, diagnostics and sensitivity detail belong in an appendix; the body carries findings. (d) A paragraph that reports a finding runs sign, significance, magnitude, then theory or literature. (e) A share shows the two numbers it comes from and names its denominator; an estimate states its estimator and its scope. (f) CONSISTENCY, the most valuable part: every statement in the target about the project\'s own data, design, framework or results must agree with the other files as they stand today. When two places disagree, quote both sentences and say which one the output or the source file supports; check numbers with code.',
  C: 'LENS C, the mirror (a translated copy kept in step with the target). Compare the target and its mirror paragraph by paragraph and sentence by sentence: a missing or added sentence; a dropped qualifier or scope word; a hedge turned into an assertion or the reverse; a changed number or unit; a causal verb in the mirror where the original states an association; original-language text left untranslated in running prose; terminology drift' + (A.glossary ? ' against the glossary ' + A.glossary : ' (build the term list from the two files and hold each object to one rendering)') + '. Also flag mirror sentences that are translationese or that a reader of that language must read twice, with a plainer sentence of identical meaning. The first sentence of every mirror paragraph mirrors the king and is short and direct. A gate that compares digits cannot see a missing sentence that has no digits: look for those first. For this lens "old" is the MIRROR sentence verbatim, "new" the corrected mirror sentence, "file" the mirror path; put the original sentence in "why".',
}
LENS.A = 'LENS A, everything in one pass because this target is short. Apply all four of the following.\n' + LENS.K + '\n' + LENS.S + '\n' + LENS.R + '\n' + LENS.P

const CROSS_BRIEF = {
  names: 'Build the usage table for the whole document. For every object the files name in more than one way (a variable, a sample, a specification, a group of units, an outcome, a pointer to a part of the document, the word for significance), count with code, FILE BY FILE, how often each name is used' + (ANY_MIRROR ? '; do the same for the mirrors' + (A.glossary ? ' against ' + A.glossary : ' against one rendering per object') : '') + '. The canonical name is the one the approved model file uses' + (APPROVED.length ? ' (' + APPROVED.join(', ') + ')' : ' (if none is approved, the most frequent name in the results)') + ', unless a ruling says otherwise; where the model file itself uses two names for one object, report a question for the author rather than choosing. Put the compact table in clean_note and list EVERY site of a non-canonical name as a finding with old and new. Legitimate distinctions are not defects: a definition that states how something is measured, and other studies\' own variable names, stay.',
  consistency: 'Corrections tend to land in one file and not sweep. Read every file. Extract every statement about (i) the framework or model, (ii) the data and design, (iii) the results as the results file states them TODAY, (iv) what each cited study found, wherever the same study is described in more than one file. Report every pair of sentences that disagree, quote both with their files, and say which one the output or the source supports. Check the summary or abstract, the introduction\'s preview and the conclusion against the results sentence by sentence, including claims the results file no longer makes.',
  first_lines: 'The supervisor reads the first line of every paragraph as an outline. Extract the king of every prose paragraph in reading order across the files (skip blocks that continue a paragraph after a display or introduce a table inside a paragraph). Read them as one text. Report: every king that is a label or an announcer rather than a claim; every king that leaves the listener with a question; every place where the argument breaks between consecutive kings or between files (do later files carry forward the questions the introduction poses, and does the conclusion answer them in its first lines?); kings that say the same thing in two files in different words. Put the complete numbered outline of first lines, file by file, in clean_note so it can be handed to the supervisor; findings carry old and new king (never longer or heavier).',
  citations: 'For each file check with code that every work cited in its text has an entry in its reference list and every entry is cited (files that circulate alone need their own complete list), and that each mirror\'s list matches. For every study cited in MORE THAN ONE file, compare how it is described (setting, data, years, estimator, the finding and its numbers) and report disagreements with both sentences. Check author-name spelling and year suffixes for consistency, and that every sentence reporting an empirical finding says where the data come from. Where the source is held locally and a claim looks doubtful, check it and say what you found; otherwise mark it unverified rather than guessing (the source-verification workflow does this properly).',
}

const UNITS = FILES.map(f => {
  let lenses = list(f.lenses).length ? list(f.lenses) : (f.short ? ['A'] : ['K', 'S', 'R', 'P'])
  if (f.mirror && lenses.indexOf('C') < 0) lenses = lenses.concat(['C'])
  if (!f.mirror) lenses = lenses.filter(l => l !== 'C')
  return { key: f.key, title: f.title, path: f.path, mirror: f.mirror, scope: f.scope, status: f.status, approved: !!f.approved, deferred: !!f.deferred, lenses }
})
const XUNITS = !CROSS ? [] : (list(A.cross_lenses).length ? list(A.cross_lenses) : ['names', 'consistency', 'first_lines', 'citations'])
  .filter(k => CROSS_BRIEF[k])
  .map(k => ({ key: 'X_' + k, title: 'Across files: ' + k.replace('_', ' '), cross: true, brief: CROSS_BRIEF[k], lenses: ['X'] }))

const FIND_SCHEMA = { type: 'object', properties: {
  outline_note: { type: 'string', description: 'kings lens only: the verdict on the kings read in order as one text, at most 120 words; else ""' },
  clean_note: { type: 'string', description: 'rule by rule, what you swept and found clean (at most 150 words); required even when nothing was found' },
  findings: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' },
    file: { type: 'string', description: 'path of the file the "old" text is in' },
    where: { type: 'string' },
    is_king: { type: 'boolean' },
    rule: { type: 'string' },
    derives_from: { type: 'string', description: 'the rule of the standard, the ruling or the author comment this finding rests on' },
    severity: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
    old: { type: 'string' }, new: { type: 'string' }, why: { type: 'string' },
    new_content: { type: 'boolean' }, ripple: { type: 'string' } },
    required: ['file', 'where', 'is_king', 'rule', 'derives_from', 'severity', 'old', 'new', 'why', 'new_content'] } } },
  required: ['findings', 'clean_note'] }
const VERDICT_SCHEMA = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: {
  id: { type: 'string' }, verdict: { type: 'string', enum: ['KEEP', 'REFUTE'] }, old_verbatim: { type: 'boolean' }, reason: { type: 'string' },
  duplicate_of: { type: 'string', description: 'the open item this finding merely repeats without new evidence, else ""' } },
  required: ['id', 'verdict', 'reason'] } } }, required: ['verdicts'] }
const RECON_SCHEMA = { type: 'object', properties: {
  items: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, status: { type: 'string', enum: ['OK', 'REVISED', 'NEEDS_AUTHOR'] },
    final_new: { type: 'string', description: 'for REVISED: the reconciled replacement; else ""' },
    note: { type: 'string' } },
    required: ['id', 'status', 'note'] } },
  conflicts: { type: 'array', items: { type: 'string' }, description: 'each conflict found and how it was resolved, one line each' } },
  required: ['items', 'conflicts'] }
const REPL_SCHEMA = { type: 'object', properties: { final: { type: 'array', items: { type: 'object', properties: {
  id: { type: 'string' }, status: { type: 'string', enum: ['OK', 'REVISED', 'NEEDS_AUTHOR', 'DROP'] }, final_new: { type: 'string' }, check_note: { type: 'string' } },
  required: ['id', 'status', 'final_new', 'check_note'] } } }, required: ['final'] }
const GAP_SCHEMA = { type: 'object', properties: { gaps: { type: 'array', items: { type: 'object', properties: {
  id: { type: 'string' }, what: { type: 'string' }, files: { type: 'string' }, instruction: { type: 'string' } },
  required: ['id', 'what', 'files', 'instruction'] } } }, required: ['gaps'] }
const REPORT_SCHEMA = { type: 'object', properties: { report_path: { type: 'string' }, verdict: { type: 'string' } }, required: ['report_path', 'verdict'] }

const ANGLES = [
  { key: 'text', brief: 'YOUR ANGLE: the text and the facts. (1) Search the file for the "old" text (grep or python3; tolerate line breaks and runs of spaces). If it is not there, set old_verbatim=false and REFUTE (a misquote refutes the finding outright, whatever the other adversaries say), unless you find the sentence it clearly means; then set old_verbatim=true, KEEP, and give the exact text in "reason". (2) Read the whole paragraph, the table it sits over and any file it points at: is the finding a misreading in context? (3) For a claimed contradiction or a number, open the other file or the output and check it yourself with code.' },
  { key: 'standard', brief: 'YOUR ANGLE: the standard and the rulings. (1) Is the defect real under the standard and the author\'s latest instruction, or is it a style preference, a mechanical false alarm, or a rule misapplied? (2) Does the proposal undo a standing ruling, restyle approved prose without a factual reason, re-propose something the author refused, or add content without flagging it? (3) Does the finding rest on the rule or comment it names in derives_from? The newest instruction wins over an older approval: never refute a finding only because the current wording was approved in an earlier round, if the latest instruction condemns it.' },
  { key: 'reader', brief: 'YOUR ANGLE: the reader. Read the paragraph aloud as its intended reader would. Does the finding name a question a careful reader is actually left with? Would the proposed text read in one pass and leave nothing to ask, or does it only move the problem?' },
].slice(0, N_REF)

function targetBlock(u) {
  if (u.cross) return 'TARGET: ' + u.title + '\n  Files:\n  ' + ALL_PATHS
  return [
    'TARGET: ' + u.title,
    '  File: ' + u.path,
    u.mirror ? '  Mirror: ' + u.mirror : '',
    '  Scope: ' + (u.scope || 'the whole file'),
    u.status ? '  Status: ' + u.status : '',
    u.approved ? '  APPROVED MODEL: the supervisor approved this file. Raise only a factual error, a contradiction with another file, or an unambiguous breach of the standard; never restyle it.' : '',
    u.deferred ? '  DEFERRED: the author has set this file aside for now. Audit it all the same, but begin every finding\'s "where" with "DEFERRED: ".' : '',
    FILES.length > 1 ? '  Other files of the document (for consistency and ripples):\n  ' + ALL_PATHS : '',
  ].filter(Boolean).join('\n')
}

function finderPrompt(u, lk) {
  return [COMMON, targetBlock(u), lk === 'X' ? u.brief : LENS[lk],
    'SEVERITY. HIGH: a false or contradicted statement; a king that fails the spoken test, is a label, or is false of its own paragraph or table; a second name for an object; an association written as an effect, or a causal verb on a measured variable; manual register; a repeated limitation; a sentence missing from the mirror. MED: a body sentence that leaves a question, does not serve its king, repeats, or prints a number without a reason to read it. LOW: polish.',
    'OUTPUT. Return findings, most severe first. "file" = the path of the file the "old" text is in. "where" = section title, paragraph number and the first five words of the paragraph. "old" = the current sentence (or the smallest span) copied VERBATIM, markup and all, so it can be found by search. "new" = your replacement, already obeying the standard (or "DELETE", or "MOVE TO NOTE: <target note>"); never an instruction such as "No change" or "add a check", which an applier would paste into the text. "why" = one line: the question the reader is left with, or the rule breached, in plain words. "derives_from" = the rule of the standard, the ruling or the author\'s comment the finding rests on. "ripple" = other files that would have to change with it, or "". Report only what you can defend: a false alarm costs the author a round. In clean_note say, rule by rule, what you swept and found clean (at most 150 words). No limit on the number of findings; do not pad.',
  ].join('\n\n')
}

function refutePrompt(u, lk, findings, angle) {
  return [COMMON, targetBlock(u),
    'YOU ARE AN ADVERSARY of the findings below, raised by another reviewer under ' + (lk === 'X' ? 'the cross-file brief "' + u.title + '"' : 'lens ' + lk) + '. You serve the standard and the author\'s latest instruction, not the existing text and not the reviewer. Refute any proposal that undoes a standing ruling, restyles approved prose without a factual reason, or adds content without saying so.',
    angle.brief,
    (angle.key === 'standard' || ANGLES.length === 1) ? openItemsBlock() : '',
    'Default: REFUTE when the defect is taste, uncertain, or LOW and debatable. KEEP when you can say in one sentence which question the reader is left with or which rule is breached. "reason" is one or two specific sentences. Return one verdict per id.',
    'FINDINGS (JSON):\n' + JSON.stringify(findings.map(f => ({ id: f.id, file: f.file, where: f.where, is_king: f.is_king, rule: f.rule, derives_from: f.derives_from, severity: f.severity, old: f.old, new: f.new, why: f.why, new_content: f.new_content }))),
  ].filter(Boolean).join('\n\n')
}

function replacePrompt(u, kept) {
  return [COMMON, targetBlock(u),
    'YOU TEST REPLACEMENT TEXT. The findings below survived adversaries (status CONFIRMED, or CONTESTED when one adversary disagreed: read its reason in votes). Your job is the "new" text of each. Test it: (1) read aloud, does it go in one pass and leave the listener nothing to ask; (2) does it say exactly what the old text meant, no more: no new fact, claim, number, citation or caveat; (3) numbers, citations, cross-references and markup intact; (4) no banned word, no banned dash; (5) for a king: count the words of old and new with code; the new king is at most ' + KING_MAX + ' words, has no ", and ", is one claim, and is NOT longer or heavier than the old king; (6) one name per object, no causal wording for an association, pointers by name, one word for significance; (7) it fits the sentences before and after it in the file (read them); (8) for a mirror sentence: natural in that language, the same meaning as the original, the agreed terms; (9) it is text, not an instruction to an editor.',
    'Return for each id: status OK (copy the proposed text into final_new), REVISED (give a better one in final_new), NEEDS_AUTHOR (no honest replacement exists without a decision or new content from the author; say in check_note exactly what he must decide; final_new holds your best candidate or ""), or DROP (the change makes the prose worse; say why).',
    'FINDINGS (JSON):\n' + JSON.stringify(kept.map(f => ({ id: f.id, file: f.file, where: f.where, is_king: f.is_king, rule: f.rule, old: f.old, new: f.new, why: f.why, status: f.status, votes: f.votes }))),
  ].join('\n\n')
}

function combine(f, votes) {
  const vs = votes.filter(Boolean).map(v => (v.verdicts || []).find(x => x.id === f.id)).filter(Boolean)
  const ref = vs.filter(v => v.verdict === 'REFUTE').length
  const misquote = vs.some(v => v.verdict === 'REFUTE' && v.old_verbatim === false)
  const isDup = v => !!(v.duplicate_of && String(v.duplicate_of).trim())
  const dup = vs.find(isDup)
  const keeps = vs.filter(v => v.verdict === 'KEEP' && !isDup(v)).length
  const killed = KILL_ON === 'all' ? ref === vs.length : (KILL_ON === 'any' ? ref > 0 : ref > vs.length / 2)
  let status = 'CONFIRMED'
  if (!vs.length) status = 'UNVERIFIED'
  else if (misquote) status = 'REFUTED'
  else if (dup && keeps === 0) status = 'DUPLICATE'
  else if (killed) status = 'REFUTED'
  else if (ref > 0) status = 'CONTESTED'
  const votesOut = vs.map(v => v.verdict + (v.old_verbatim === false ? ' (old text not found)' : '') + (isDup(v) ? ' (repeats open item: ' + v.duplicate_of + ')' : '') + ': ' + v.reason)
  return Object.assign({}, f, { status, votes: votesOut })
}

async function chain(u, lk) {
  const tag = u.key + ':' + lk
  const f = await agent(finderPrompt(u, lk), opts({ label: 'find ' + tag, phase: 'Find', schema: FIND_SCHEMA, effort: E.find }))
  if (!f) return { unit: u.key, lens: lk, failed: true, clean_note: 'reader did not return', outline_note: '', final: [], refuted: [] }
  const findings = (f.findings || []).map((x, i) => {
    const where = String(x.where || '')
    return Object.assign({}, x, {
      id: u.key + '-' + lk + '-' + (i + 1), file: x.file || u.path || '', lens: lk, unit: u.key,
      deferred: !!u.deferred,
      where: u.deferred && !/^DEFERRED/i.test(where) ? 'DEFERRED: ' + where : where })
  })
  const base = { unit: u.key, lens: lk, clean_note: f.clean_note || '', outline_note: f.outline_note || '' }
  if (!findings.length) return Object.assign(base, { final: [], refuted: [] })
  const votes = await parallel(ANGLES.map(a => () =>
    agent(refutePrompt(u, lk, findings, a), opts({ label: 'refute ' + tag + ' (' + a.key + ')', phase: 'Refute', schema: VERDICT_SCHEMA, effort: E.refute || 'high' }))))
  if (!votes.filter(Boolean).length) log(tag + ': no adversary returned; findings stay UNVERIFIED')
  const judged = findings.map(x => combine(x, votes))
  const kept = judged.filter(x => x.status !== 'REFUTED' && x.status !== 'DUPLICATE')
  const refuted = judged.filter(x => kept.indexOf(x) < 0)
  if (!kept.length) {
    log(tag + ': ' + findings.length + ' raised, all refuted')
    return Object.assign(base, { final: [], refuted })
  }
  const r = await agent(replacePrompt(u, kept), opts({ label: 'replace ' + tag, phase: 'Replace', schema: REPL_SCHEMA, effort: E.replace }))
  const rmap = {}
  if (r && r.final) r.final.forEach(x => { rmap[x.id] = x })
  const final = kept.map(x => {
    const rr = rmap[x.id]
    return Object.assign({}, x, {
      repl_status: rr ? rr.status : 'UNCHECKED',
      final_new: rr && rr.final_new ? rr.final_new : x.new,
      check_note: rr ? rr.check_note : 'replacement not checked' })
  })
  log(tag + ': ' + findings.length + ' raised, ' + refuted.length + ' refuted, ' + final.filter(x => x.repl_status !== 'DROP').length + ' stand')
  return Object.assign(base, { final, refuted })
}

phase('Find')
const pairs = UNITS.concat(XUNITS).flatMap(u => u.lenses.map(lk => ({ u, lk })))
log('standard-audit: ' + FILES.length + ' file(s), ' + XUNITS.length + ' cross-file unit(s), ' + pairs.length + ' reader chains, ' + ANGLES.length + ' adversaries per batch, kill rule "' + KILL_ON + '" (a misquote always refutes)')
const results = (await parallel(pairs.map(p => () => chain(p.u, p.lk)))).filter(Boolean)

phase('Gaps')
const digest = results.map(r => ({
  unit: r.unit, lens: r.lens, failed: !!r.failed,
  raised: r.final.length + r.refuted.length,
  stand: r.final.filter(x => x.repl_status !== 'DROP').length,
  clean_note: String(r.clean_note || '').slice(0, 600),
}))
const critic = await agent([
  COMMON,
  'You are the COMPLETENESS CRITIC of a read-only audit of these files against the standard:\n  ' + ALL_PATHS,
  'Below is what each reader covered (unit, lens, counts, its clean note). Ask what was NOT looked at, or looked at too thinly to trust. Candidates: table and figure captions and notes; footnotes; equation glosses; symbol lists; front matter; section titles (do they name what the section claims, are they consistent in form); outline files; units whose lens failed or whose findings are suspiciously few for their length; a rule of the standard no reader mentions; a HIGH finding in one file whose twin in another file nobody checked (corrections that land in one file and do not sweep). Return at most ' + Math.max(1, MAX_GAPS) + ' gaps, each with a precise instruction for one reviewer (which files, which rule, what to return). If more exist, put the rest in the last gap\'s "what" so nothing is dropped silently.',
  'COVERAGE (JSON):\n' + JSON.stringify(digest),
].join('\n\n'), opts({ label: 'completeness critic', phase: 'Gaps', schema: GAP_SCHEMA, effort: E.critic || 'high' }))

const gapsFound = (critic && critic.gaps) ? critic.gaps : []
const gapsRun = gapsFound.slice(0, MAX_GAPS)
const gapsNotRun = gapsFound.slice(MAX_GAPS)
if (gapsNotRun.length) log('critic found ' + gapsFound.length + ' gaps; ' + gapsRun.length + ' run, ' + gapsNotRun.length + ' listed in the return value and not run')
const gapResults = (await parallel(gapsRun.map((g, i) => () => chain({
  key: 'gap' + (i + 1), title: 'Gap: ' + g.what, cross: true, lenses: ['X'],
  brief: 'GAP TO CLOSE: ' + g.what + '\nFILES: ' + g.files + '\nINSTRUCTION: ' + g.instruction,
}, 'X')))).filter(Boolean)

const all = results.concat(gapResults)
const SEV = { HIGH: 0, MED: 1, LOW: 2 }
const ST = { CONFIRMED: 0, CONTESTED: 1, UNVERIFIED: 2 }
const standing = all.flatMap(r => r.final).filter(x => x.repl_status !== 'DROP')
const dropped = all.flatMap(r => r.final).filter(x => x.repl_status === 'DROP')
const refutedAll = all.flatMap(r => r.refuted)

const merged = {}
for (const x of standing) {
  const k = norm(x.file) + '|' + norm(x.old)
  const m = merged[k]
  if (!m) {
    merged[k] = Object.assign({}, x, { lenses: [x.lens], rules: [x.rule], ids: [x.id], alternatives: [] })
    continue
  }
  m.lenses.push(x.lens); m.rules.push(x.rule); m.ids.push(x.id)
  const better = (SEV[x.severity] < SEV[m.severity]) || (SEV[x.severity] === SEV[m.severity] && (ST[x.status] || 0) < (ST[m.status] || 0))
  if (x.final_new && norm(x.final_new) !== norm(m.final_new)) m.alternatives.push(better ? m.final_new : x.final_new)
  if (better) { m.severity = x.severity; m.status = x.status; m.final_new = x.final_new; m.why = x.why; m.repl_status = x.repl_status }
  m.is_king = m.is_king || x.is_king
  m.new_content = m.new_content || x.new_content
}
const findings = Object.values(merged)
log('deduped: ' + standing.length + ' standing findings into ' + findings.length + ' sites; ' + refutedAll.length + ' refuted (' + refutedAll.filter(x => x.status === 'DUPLICATE').length + ' as duplicates of open items), ' + dropped.length + ' dropped at the replacement check')

function reconcilePrompt(file, fs) {
  return [COMMON,
    'FILE: ' + file + (FILES.length > 1 ? '\nOther files of the document:\n  ' + ALL_PATHS : ''),
    'YOU RECONCILE THE STANDING PROPOSALS FOR THIS ONE FILE. They come from different lenses and gap readers, and each was checked one lens at a time: nobody has yet read them together. Read the file, then: (1) group the proposals by paragraph ("where", and the text itself). Where two touch the same paragraph or overlapping text (for example one lens splits a paragraph while another rewrites a sentence in it, or one deletes a sentence that another rewrites), make them work together: give each a final_new that still applies once the others have landed (every "old" must still be found verbatim in the file as the others leave it), or mark NEEDS_AUTHOR when both cannot stand and say in "note" what he must choose. (2) No two proposals may contradict each other, here or in the names the other files use (two different names chosen for one object; a scope word removed in one place and required in another). (3) None may undo a standing ruling or go against the author\'s latest instruction: mark such a proposal NEEDS_AUTHOR and name the ruling in "note". (4) A proposal with no conflict is OK and unchanged.',
    'Do not add proposals, do not restyle, never make a king longer or heavier than the king it replaces, never add a fact, claim, number, citation or caveat. Return one item per id. List every conflict you found and how you resolved it in "conflicts" (one line each; [] if none).',
    'PROPOSALS (JSON):\n' + JSON.stringify(fs.map(f => ({ id: f.id, where: f.where, is_king: f.is_king, rules: f.rules, lenses: f.lenses, severity: f.severity, status: f.status, old: f.old, final_new: f.final_new, why: f.why, new_content: f.new_content, ripple: f.ripple }))),
  ].join('\n\n')
}

const conflicts = []
if (RECONCILE && findings.length) {
  phase('Reconcile')
  const byFileR = {}
  for (const f of findings) { (byFileR[f.file] = byFileR[f.file] || []).push(f) }
  const recs = await parallel(Object.keys(byFileR).map(file => () =>
    agent(reconcilePrompt(file, byFileR[file]), opts({ label: 'reconcile ' + slug(file), phase: 'Reconcile', schema: RECON_SCHEMA, effort: E.reconcile || 'high' }))
      .then(r => ({ file, r }))))
  let revised = 0
  let toAuthor = 0
  for (const x of recs.filter(Boolean)) {
    const fs = byFileR[x.file] || []
    if (!x.r) {
      log('reconcile ' + x.file + ': reconciler did not return; its ' + fs.length + ' proposal(s) stand unreconciled')
      fs.forEach(f => { f.reconcile_note = 'not reconciled (reconciler did not return)' })
      continue
    }
    const m = {}
    ;(x.r.items || []).forEach(i => { m[i.id] = i })
    for (const f of fs) {
      const it = m[f.id]
      if (!it) { f.reconcile_note = 'no reconciler verdict'; continue }
      f.reconcile_note = it.note || ''
      if (it.status === 'REVISED' && it.final_new && norm(it.final_new) !== norm(f.final_new)) {
        f.alternatives.push(f.final_new)
        f.final_new = it.final_new
        revised++
      } else if (it.status === 'NEEDS_AUTHOR') {
        f.repl_status = 'NEEDS_AUTHOR'
        toAuthor++
      }
    }
    ;(x.r.conflicts || []).forEach(c => conflicts.push(x.file + ': ' + c))
  }
  log('reconcile: ' + conflicts.length + ' conflict(s) found; ' + revised + ' proposal(s) revised to work together, ' + toAuthor + ' sent to the author')
}

findings.sort((a, b) =>
  (a.deferred ? 1 : 0) - (b.deferred ? 1 : 0) || (b.is_king ? 1 : 0) - (a.is_king ? 1 : 0) || SEV[a.severity] - SEV[b.severity] || (ST[a.status] || 0) - (ST[b.status] || 0))

phase('Report')
const sweep = all.map(r => ({ unit: r.unit, lens: r.lens, failed: !!r.failed, clean_note: r.clean_note, outline_note: r.outline_note }))
const reports = []
if (OUT) {
  const byFile = {}
  for (const f of findings) { (byFile[f.file] = byFile[f.file] || []).push(f) }
  const reportJobs = Object.keys(byFile).map(file => () => agent([
    'You write ONE report file and return a short summary. Read the standard first: ' + STD + '. ' + (A.root ? 'Project root: ' + A.root + '.' : ''),
    'FILE AUDITED: ' + file,
    'Below are the deduped findings for this file that survived the adversaries, a replacement check and a reconciliation of proposals on the same paragraph (status CONFIRMED, CONTESTED or UNVERIFIED; final_new is the checked replacement; repl_status NEEDS_AUTHOR means a decision or new content is needed, and reconcile_note says why when the reconciler sent it; findings whose "where" begins DEFERRED are in a file the author has set aside), the reconciler\'s conflicts, the findings refuted for this file (DUPLICATE = already in the author\'s open-decision table), and the sweep notes.',
    'WRITE the report to ' + OUT + slug(file) + '.md with the Write tool, in Markdown and English, quoting mirror-language sentences as they are. Sections in this order: "# Standard audit: ' + file + '"; "## Verdict" (five lines at most: is this file at the standard, what two or three things matter); "## First lines" (the kings outline verdict, if any); "## A. King-level proposals (nothing lands without the author)" as a table where | old | new | why | rule; "## B. HIGH"; "## C. MED"; "## D. LOW", each a table where | old | new | why | rule | status; "## E. Needs the author (new content or a decision, including conflicts the reconciler could not resolve)"; "## F. Mirror"; "## G. Ripples (listed, not applied)"; "## H. Deferred (file set aside by the author)" if any; "## I. Swept and found clean" (the clean notes, rule by rule); "## J. Raised and refuted" (one line each with the reason; duplicates of open items marked as such). Tables carry the FULL old and new text. Do not add findings of your own and do not change any proposed text. Return report_path and a one-sentence verdict.',
    'FINDINGS (JSON):\n' + JSON.stringify(byFile[file]),
    'CONFLICTS (JSON):\n' + JSON.stringify(conflicts.filter(c => c.indexOf(file + ': ') === 0)),
    'REFUTED (JSON):\n' + JSON.stringify(refutedAll.filter(x => x.file === file).map(x => ({ where: x.where, status: x.status, old: x.old, why: x.why, votes: x.votes }))),
    'SWEEP NOTES (JSON):\n' + JSON.stringify(sweep),
  ].join('\n\n'), { label: 'report ' + slug(file), phase: 'Report', schema: REPORT_SCHEMA, agentType: 'general-purpose' }))
  reportJobs.push(() => agent([
    'You write ONE summary file and return its path. ' + (A.root ? 'Project root: ' + A.root + '.' : ''),
    'WRITE ' + OUT + '00_summary.md with the Write tool, in Markdown and English: "# Standard audit: summary"; "## Counts" (per file and lens: raised, refuted, standing); "## The outline of first lines" (copy the first-lines unit\'s clean note verbatim if present); "## Names across files" (copy the names unit\'s table if present); "## Top items" (at most 10, kings first, full old and new); "## Conflicts the reconciler found"; "## Gaps the critic found" (which ran, which did not); "## Units that failed". Use only the data below.',
    'COUNTS AND SWEEP (JSON):\n' + JSON.stringify({ digest, sweep }),
    'CONFLICTS (JSON):\n' + JSON.stringify(conflicts),
    'TOP FINDINGS (JSON):\n' + JSON.stringify(findings.slice(0, 10)),
    'GAPS (JSON):\n' + JSON.stringify({ run: gapsRun, not_run: gapsNotRun }),
  ].join('\n\n'), { label: 'report summary', phase: 'Report', schema: REPORT_SCHEMA, agentType: 'general-purpose' }))
  const rs = await parallel(reportJobs)
  rs.filter(Boolean).forEach(r => reports.push(r))
}

return {
  standard: STD,
  counts: {
    raised: all.reduce((n, r) => n + r.final.length + r.refuted.length, 0),
    refuted: refutedAll.length,
    duplicates: refutedAll.filter(x => x.status === 'DUPLICATE').length,
    dropped: dropped.length,
    standing: standing.length,
    sites: findings.length,
    kings: findings.filter(f => f.is_king).length,
    needs_author: findings.filter(f => f.repl_status === 'NEEDS_AUTHOR' || f.new_content).length,
    contested: findings.filter(f => f.status === 'CONTESTED').length,
    deferred: findings.filter(f => f.deferred).length,
    conflicts: conflicts.length,
    failed_units: sweep.filter(s => s.failed).map(s => s.unit + ':' + s.lens),
  },
  findings,
  conflicts,
  refuted: refutedAll.map(x => ({ id: x.id, file: x.file, where: x.where, status: x.status, old: x.old, why: x.why, votes: x.votes })),
  dropped: dropped.map(x => ({ id: x.id, file: x.file, old: x.old, new: x.new, check_note: x.check_note })),
  sweep,
  gaps: { found: gapsFound, run: gapsRun, not_run: gapsNotRun },
  reports,
}
