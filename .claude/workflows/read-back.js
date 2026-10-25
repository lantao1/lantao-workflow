export const meta = {
  name: 'read-back',
  description: 'Fresh read-only readers, given the author\'s comments for the round, read the edited text and report what is still unclear, what the edits broke, what contradicts a ruling, and what the round dropped or left',
  whenToUse: 'Right after a round of edits lands and before the author sees it: the gates are green, and the question is whether the text now reads right. Read-only.',
  phases: [
    { title: 'Readback', detail: 'reader, facts, regression, mirror and sweep lenses per file group' },
    { title: 'Check', detail: 'optional: one adversary per lens result' },
    { title: 'Report', detail: 'optional Markdown report' },
  ],
}

/*
 * read-back.js
 *
 * PURPOSE
 *   Gates prove only what they bind. After a round of edits, fresh readers who
 *   did not write the edits read the text as it now stands, with the author's
 *   comments for the round in hand (they override any earlier approval recorded
 *   in comments, gates or trackers), and report only defects the round
 *   INTRODUCED or LEFT:
 *     reader      a first-time reader plus the house rules: kings against their
 *                 bodies, antecedents orphaned by cuts, pointers that no longer
 *                 resolve, notes that no longer read their tables, ripples into
 *                 related files;
 *     facts       every new or changed number and claim against the output; no
 *                 deleted sentence was the only home of a fact something else
 *                 needs; each limitation still said once, plainly; every cited
 *                 work has a reference entry and every entry is still cited;
 *     regression  the diff against the copies made before the round: every
 *                 change on the change list landed, nothing off the list changed
 *                 or vanished, no proposal vocabulary was pasted into the text;
 *     mirror      the translated copy aligned sentence by sentence;
 *     sweep       the rest of the text swept for the defect class the author
 *                 named, each instance marked KEEP or CUT/MOVE, kings listed only.
 *   An optional adversary per lens result filters false alarms.
 *
 * ARGS (JSON example; paths relative to root unless absolute)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "context": "The results section of a draft paper; a round of edits landed today.",
 *     "documents": [{"path": "paper/results.tex", "before": "quality_reports/2027-01-20_round/before/results.tex",
 *                    "mirror": "paper/results_zh.tex", "mirror_before": "quality_reports/2027-01-20_round/before/results_zh.tex"}],
 *     "authorMessage": "The author's comments for this round, verbatim.",
 *     "changes": "quality_reports/2027-01-20_round/proposal.md",
 *     "defectClass": "a sentence that states where a finding stops holding outside its one home",
 *     "sweepExtra": ["paper/abstract.tex", "paper/introduction.tex", "paper/conclusion.tex"],
 *     "standard": ["docs/writing/WRITING_STANDARD.md"],
 *     "rulings": ["quality_reports/TRACKER.md"],
 *     "outputs": ["results/current/"],
 *     "roundDir": "quality_reports/2027-01-20_round",
 *     "scratch": "<session scratchpad>/read-back"
 *   }
 *   Required: documents. snake_case aliases are accepted (files, instruction,
 *   defect_class, related, numbers, out_dir, scratch_dir).
 *
 *   documents          edited files: strings or {path, before?, mirror?, mirror_before?}.
 *                      "before" is the copy made before the round (needed for the
 *                      regression lens; without it that lens is skipped).
 *   authorMessage      the author's comments for this round, verbatim (strongly
 *                      recommended: readers without them defend old wording).
 *   changes            what the round did: the change list, proposal or landing
 *                      record (text or a path).
 *   defectClass        the class of defect the author named, for the sweep lens;
 *                      without it the sweep infers the class from the comments.
 *   sweepExtra         files that carry the same claims (ripples).
 *   groups             [{key, files: [paths]}] to split readers by file group;
 *                      default one group with every file. A group whose paths
 *                      match no document is dropped and logged; documents in no
 *                      group are read as one extra group, "ungrouped", and logged.
 *   lenses             subset of ["reader","facts","regression","mirror","sweep"].
 *   verify             true to add one adversary per lens result (default false).
 *   roundDir           if set, read-back.md is written there.
 *   scratch            scratch root for agents.
 *   effort             per stage, e.g. {"readback": "xhigh"}; default high.
 *
 * OUTPUT
 *   { groups: [{group, lens, findings [{location, quote, is_king, severity,
 *     action, issue, fix, status?}], summary}], counts, ripples, report }
 *
 * COST
 *   Per group: up to 5 lenses (reader, facts, regression if "before" copies
 *   exist, mirror if mirrors exist, sweep); doubled with verify. One group: 3 to 5.
 */

const RAW = (args && typeof args === 'object' && !Array.isArray(args)) ? args : {}
function pick() {
  for (let i = 0; i < arguments.length; i++) { const v = RAW[arguments[i]]; if (v !== undefined && v !== null && v !== '') return v }
  return undefined
}
const A = {
  root: pick('root'), context: pick('context'),
  files: pick('documents', 'files'), instruction: pick('authorMessage', 'instruction'),
  changes: pick('changes'), defect_class: pick('defectClass', 'defect_class'), related: pick('sweepExtra', 'related'),
  standard: pick('standard'), rulings: pick('rulings'), numbers: pick('outputs', 'numbers'),
  groups: pick('groups'), lenses: pick('lenses'), verify: pick('verify'),
  out_dir: pick('roundDir', 'outDir', 'out_dir'), scratch_dir: pick('scratch', 'scratch_dir'),
}
const E = (RAW.effort && typeof RAW.effort === 'object') ? RAW.effort : {}
const NAME = 'read-back'

function list(x) { return x == null ? [] : (Array.isArray(x) ? x : [x]) }
function isPath(x) { return typeof x === 'string' && !/\s/.test(x.trim()) && /[\/.]/.test(x) }
function opts(o) { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }
function slug(s) {
  const b = String(s || '').replace(/^.*\//, '').replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_')
  return b.slice(0, 40) || 'group'
}

const FILES = list(A.files).map(f => (typeof f === 'string' ? { path: f } : Object.assign({}, f))).filter(f => f.path)
if (!FILES.length) throw new Error(NAME + ': missing args: documents (a non-empty array of paths or {path, before?, mirror?, mirror_before?}). See the header comment for an example.')
if (!A.instruction) log('read-back: no authorMessage given; readers will judge against the standard and rulings only, and may defend wording the author has since rejected')

const STD = list(A.standard).length ? list(A.standard).join(', ') : 'docs/writing/WRITING_STANDARD.md'
const NUM = list(A.numbers).join(', ')
const OUT = A.out_dir ? String(A.out_dir).replace(/\/?$/, '/') : ''
const WANT = list(A.lenses).length ? list(A.lenses) : ['reader', 'facts', 'regression', 'mirror', 'sweep']

const GROUPS = (function () {
  if (!list(A.groups).length) return [{ key: 'all', files: FILES }]
  const given = list(A.groups).map(g => ({ key: g.key || slug(list(g.files)[0]), files: FILES.filter(f => list(g.files).indexOf(f.path) >= 0) }))
  const empty = given.filter(g => !g.files.length)
  if (empty.length) log('read-back: group(s) matching no document dropped: ' + empty.map(g => g.key).join(', ') + ' (a group\'s files must be spelled as in "documents")')
  const kept = given.filter(g => g.files.length)
  const covered = new Set(kept.flatMap(g => g.files.map(f => f.path)))
  const loose = FILES.filter(f => !covered.has(f.path))
  if (loose.length) {
    log('read-back: document(s) in no group, read as their own group "ungrouped": ' + loose.map(f => f.path).join(', '))
    kept.push({ key: 'ungrouped', files: loose })
  }
  return kept
})()

function rulingsBlock() {
  const r = list(A.rulings)
  if (!r.length) return ''
  const files = r.filter(isPath)
  const inline = r.filter(x => !isPath(x))
  return 'STANDING RULINGS (still binding where the instruction does not override them).' +
    (files.length ? ' Read: ' + files.join(', ') + '.' : '') +
    (inline.length ? '\n' + inline.map(x => '- ' + x).join('\n') : '')
}
function fileBlock(g) {
  return g.files.map(f => '- ' + f.path + (f.before ? ' (before the round: ' + f.before + ')' : '') +
    (f.mirror ? '\n  mirror: ' + f.mirror + (f.mirror_before ? ' (before: ' + f.mirror_before + ')' : '') : '')).join('\n')
}

function context(g) {
  return [
    'READ-ONLY. Never edit, create, move or delete a project file. ' + (A.root ? 'Project root: ' + A.root + '; relative paths are relative to it. ' : '') + 'Scratch work goes only ' + (A.scratch_dir ? 'under ' + A.scratch_dir + '/<your label>/' : 'in a folder of your own in your session scratchpad') + '; delete it before you finish.',
    A.context ? 'THE DOCUMENT: ' + A.context : '',
    'A round of edits has just landed in these files (read the text a reader sees; comment blocks that record revision history are not the text):\n' + fileBlock(g),
    A.instruction ? 'THE AUTHOR\'S INSTRUCTION FOR THIS ROUND (verbatim). It OVERRIDES any earlier approval recorded in comments, gates, trackers or rulings; do not defend an old wording against it:\n' + A.instruction : '',
    A.changes ? 'WHAT THE ROUND DID (the approved change list; if this is a path, read it): ' + A.changes : '',
    list(A.related).length ? 'RELATED FILES that carry the same claims: ' + list(A.related).join(', ') : '',
    'THE STANDARD: ' + STD + '.',
    rulingsBlock(),
    NUM ? 'MACHINE OUTPUT (the only source for any number): ' + NUM : '',
    'HOUSE RULES: a king (first sentence of a paragraph) is one claim, within the standard\'s length limit, no ", and ", true of its body; banned words and dashes as the standard lists them; one object, one name; parts pointed at by name, not number; said aloud, a sentence leaves the listener no further question; every sentence serves its paragraph\'s king; no wording that claims more than the design supports.',
    'Return only real defects INTRODUCED OR LEFT by this round, each with: location, the exact quoted sentence, is_king, severity HIGH/MED/LOW, action, the defect in one line, and the fix in one line (the replacement sentence if it is short; never an instruction an applier would paste into the text). Kings are reported, never rewritten without the author. If you find nothing, say so plainly in summary.',
  ].filter(Boolean).join('\n\n')
}

const ANY_BEFORE = FILES.some(f => f.before || f.mirror_before)
const ANY_MIRROR = FILES.some(f => f.mirror)

const LENS = {
  reader: 'LENS: a first-time reader plus the house rules, on the original files. Read each edited file from the top of the body to the end as an examiner meeting it for the first time. Check: every paragraph\'s king against its body; every new or changed sentence against the house rules; pronouns and "that", "those", "also", "too", "either", "again", "the two" still have antecedents after the cuts; each pointer ("the note to the table", "the appendix on ...") resolves to something that says what the pointer promises; each table and figure is still read by its note, and no note now says something its printed cells contradict; the closing paragraph still reads as an ending; each paragraph still reads as one finding. Then read the related files for any sentence the edited text now contradicts, or that points at a passage that no longer exists: report those with action "ripple".',
  facts: 'LENS: facts. Verify every NEW or CHANGED number and claim against the output (compute it; check rounding, the specification, the sample and the test behind every significance word). Check that nothing the round DELETED was the only home of a number or fact another sentence, note, related file or check needs (search for it). Check that the text is still honest: can a reader of the edited text alone still learn, once and plainly, each limitation the author keeps (name the sentence that carries it)? Check every claim about a cited study that the round touched against what the document said before and what the source says. Check the reference list of each edited file (and of its mirror) with code against the text as it now stands: after the round\'s cuts and additions, every work cited has an entry and every entry is still cited (a cut can orphan an entry; an addition can cite a work with none).',
  regression: 'LENS: regression against the copies made before the round. Diff each file against its "before" copy sentence by sentence. (1) Every change on the approved change list landed, in the right place, in both languages if there is a mirror; report any that did not (action "restore" or "fix"). (2) Every sentence NOT on the change list is unchanged: an unlisted rewording, deletion or move is a defect even if it reads well, because rewrites drop approved sentences silently and later checks then certify the drop (action "restore", with the before text). (3) No proposal vocabulary was written into the text ("King:", "NEW CONTENT", "Move the", "No change", "Wording unchanged", a language tag) and no stray script of another language sits in a file. (4) A deletion did not remove the answer to a question a reader will ask; a move did not leave the order or a pointer wrong. In summary, give the number of changed sentences you checked and how many are clean.',
  mirror: 'LENS: the mirror. For every paragraph the round touched, align the mirror with the original sentence by sentence. Report: a sentence deleted, added or moved in one language and not the other; a difference of substance (scope, sign, hedge, subject); digits that are not in the same sentence as their twin; paragraphs glued or split (compare paragraph counts before and after); terms that drifted from the mirror\'s established rendering; translationese. Write issue and fix in the mirror\'s language. Give the paragraph and sentence counts, original against mirror, in summary.',
  sweep: 'LENS: the sweep. The author\'s comments name a class of defect, not only the places he marked' + (A.defect_class ? ': ' + A.defect_class : ' (infer the class from his instruction and state it in summary)') + '. Sweep the WHOLE edited text, not only the edited sentences, for every remaining instance of that class. For each instance say KEEP (and why: it is the one home of a limitation, or it is needed for a claim to be true) or CUT or MOVE (with the target), with the fix. Include kings with is_king=true: they are listed for the author, never changed by the main thread. Propose no new content.',
}

const ACTIVE = WANT.filter(k => LENS[k])
  .filter(k => k !== 'regression' || ANY_BEFORE)
  .filter(k => k !== 'mirror' || ANY_MIRROR)
const skipped = WANT.filter(k => ACTIVE.indexOf(k) < 0)
if (skipped.length) log('read-back: lenses skipped (no input for them): ' + skipped.join(', '))

const SCHEMA = { type: 'object', properties: {
  findings: { type: 'array', items: { type: 'object', properties: {
    location: { type: 'string' }, quote: { type: 'string' }, is_king: { type: 'boolean' },
    severity: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
    action: { type: 'string', enum: ['fix', 'restore', 'cut', 'move', 'keep', 'ripple'] },
    issue: { type: 'string' }, fix: { type: 'string' } },
    required: ['location', 'quote', 'is_king', 'severity', 'action', 'issue', 'fix'] } },
  summary: { type: 'string' } },
  required: ['findings', 'summary'] }
const CHECK_SCHEMA = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: {
  index: { type: 'integer' }, refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['index', 'refuted', 'reason'] } } }, required: ['verdicts'] }

const jobs = GROUPS.flatMap(g => ACTIVE
  .filter(k => k !== 'regression' || g.files.some(f => f.before || f.mirror_before))
  .filter(k => k !== 'mirror' || g.files.some(f => f.mirror))
  .map(k => ({ g, k })))
log('read-back: ' + GROUPS.length + ' group(s), ' + jobs.length + ' readers (' + jobs.map(j => j.g.key + ':' + j.k).join(', ') + ')' + (A.verify ? ', each checked by one adversary' : ''))

phase('Readback')
const results = await pipeline(jobs,
  (j) => agent(context(j.g) + '\n\n' + LENS[j.k], opts({ label: 'readback:' + j.g.key + ':' + j.k, phase: 'Readback', schema: SCHEMA, effort: E.readback || 'high' }))
    .then(r => ({ group: j.g.key, lens: j.k, findings: (r && r.findings) || [], summary: r ? r.summary : 'reader returned nothing', failed: !r })),
  (res, j) => {
    if (!A.verify || !res.findings.length) return res
    return agent(context(j.g) + '\n\nYOU ARE AN ADVERSARY of the read-back findings below (lens ' + j.k + '). For each, by its index: is the quoted sentence really in the file as quoted (search for it; a misquote refutes it)? Is the defect real and was it introduced or left by this round, or is it a preference, a misreading in context, or something the author\'s instruction asked for? Mark refuted=true unless you can confirm the defect yourself.\n\nFINDINGS:\n' + res.findings.map((f, i) => '[' + i + '] ' + JSON.stringify(f)).join('\n'),
      opts({ label: 'check:' + j.g.key + ':' + j.k, phase: 'Check', schema: CHECK_SCHEMA, effort: E.check || 'high' }))
      .then(v => {
        const vm = {}
        ;((v && v.verdicts) || []).forEach(x => { vm[x.index] = x })
        const findings = res.findings.map((f, i) => Object.assign({}, f, {
          status: vm[i] ? (vm[i].refuted ? 'REFUTED' : 'CONFIRMED') : 'UNCHECKED', check: vm[i] ? vm[i].reason : '' }))
        return Object.assign({}, res, { findings })
      })
  })

const out = results.filter(Boolean)
const standing = out.flatMap(r => r.findings.filter(f => f.status !== 'REFUTED').map(f => Object.assign({ group: r.group, lens: r.lens }, f)))
const live = standing.filter(f => f.action !== 'keep')
const counts = {
  readers: out.length,
  failed: out.filter(r => r.failed).map(r => r.group + ':' + r.lens),
  findings: live.length,
  kept_by_sweep: standing.length - live.length,
  high: live.filter(f => f.severity === 'HIGH').length,
  kings: live.filter(f => f.is_king).length,
  restore: live.filter(f => f.action === 'restore').length,
  ripples: live.filter(f => f.action === 'ripple').length,
  refuted: out.reduce((n, r) => n + r.findings.filter(f => f.status === 'REFUTED').length, 0),
}
log('read-back: ' + counts.findings + ' findings stand (' + counts.high + ' HIGH, ' + counts.kings + ' on kings, ' + counts.restore + ' restores, ' + counts.ripples + ' ripples)')

let report = null
if (OUT) {
  phase('Report')
  report = await agent([
    'You write ONE report file and return its path. ' + (A.root ? 'Project root: ' + A.root + '.' : ''),
    'WRITE ' + OUT + 'read-back.md with the Write tool, in Markdown and English (mirror-language issues quoted as they are). Sections: "# Read-back"; "## Counts"; "## Restore (changes the round should not have made)"; "## HIGH"; "## MED and LOW"; "## Kings (for the author; not changed)"; "## Mirror"; "## Ripples (listed, not applied)"; "## Sweep: kept and why"; "## Reader summaries" (one paragraph per lens). Each finding as location | quote | issue | fix. Use only the data below.',
    'RESULTS (JSON):\n' + JSON.stringify(out),
  ].join('\n\n'), { label: 'report', phase: 'Report', schema: { type: 'object', properties: { report_path: { type: 'string' } }, required: ['report_path'] }, agentType: 'general-purpose' })
}

return { groups: out, counts, ripples: live.filter(f => f.action === 'ripple'), report }
