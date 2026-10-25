export const meta = {
  name: 'source-verification',
  description: 'Check every claim a document makes about a cited source against the source itself (full text first), adversarially refute each finding, check reference entries, and name what was not checked',
  whenToUse: 'Before a literature section or a whole draft goes out, after sources were added or rewritten by an agent, or when a claim about a study looks doubtful. Read-only: returns verified findings and corrected sentences; nothing lands without the author.',
  phases: [
    { title: 'Inventory', detail: 'list every cited work, its citing sentences and its local file (skipped when a source list is given)' },
    { title: 'Verify', detail: 'one verifier per source, reading the source itself' },
    { title: 'Refute', detail: 'each source\'s findings attacked by an independent agent' },
    { title: 'Close', detail: 'completeness critic, and a refuter for what it raises' },
    { title: 'Report', detail: 'optional Markdown report' },
  ],
}

/*
 * source-verification.js
 *
 * PURPOSE
 *   Every sentence that reports a study must be true of that study in its own
 *   terms: setting, period, unit of observation, design, sample, direction and
 *   size of the finding, every qualifier. One verifier per source finds every
 *   sentence citing it (in every file, and in mirrors), obtains the source by the
 *   best route (local file first, then a connected literature tool, then an
 *   open-access copy, then the abstract), checks each claim and the reference
 *   entry, and reports what it found correct as well as what is wrong. Each
 *   source with findings then gets an adversarial refuter whose default is that
 *   every finding is wrong. A completeness critic names what the round did not
 *   check; its findings are refuted too. Status is honest: FULLTEXT, ABSTRACT or
 *   UNVERIFIED, and the version read (working paper or published article) is named.
 *
 * ARGS (JSON example; paths relative to root unless absolute)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "context": "The literature review of a draft paper on <topic>.",
 *     "documents": [{"path": "paper/literature.tex", "mirror": "paper/literature_zh.tex"},
 *                   "paper/introduction.tex", "paper/results.tex"],
 *     "sourcesDir": "master_supporting_docs/supporting_papers/",
 *     "bib": "Bibliography_base.bib",
 *     "sources": [
 *       {"label": "Author and Other (2014)", "local": "Author_Other_2014_published.pdf"},
 *       {"label": "Writer (2019)", "doi": "10.0000/example", "note": "only the working paper is held locally",
 *        "special": "check the sample period and which table the headline number comes from"}
 *     ],
 *     "verificationLog": "quality_reports/source_log.csv",
 *     "libraryHint": "a connected literature tool, workspace <id>",
 *     "rulings": ["quality_reports/TRACKER.md"],
 *     "authorMessage": "The author's latest comments, verbatim.",
 *     "standard": ["docs/writing/WRITING_STANDARD.md"],
 *     "roundDir": "quality_reports/2027-01-20_sources",
 *     "scratch": "<session scratchpad>/source-verification"
 *   }
 *   Required: documents. snake_case aliases are accepted (files, sources_dir,
 *   verification_log, library_hint, only_local, instruction, out_dir, scratch_dir).
 *
 *   documents          the files whose citations are checked: strings or {path, mirror?}.
 *   sources            optional list {label, local?, key?, doi?, note?, special?}.
 *                      Without it an inventory agent builds the list from the files.
 *                      "special" names a claim that needs a hard look.
 *   sourcesDir         folder of local source files (PDFs).
 *   bib                bibliography file, for reference-entry checks.
 *   verificationLog    an earlier per-source status log, if any.
 *   libraryHint        how to reach a connected literature tool, if the session has one.
 *   web                false to forbid web lookups (default true: open-access copies,
 *                      OpenAlex or Semantic Scholar abstracts, Crossref metadata).
 *   onlyLocal          true to verify only sources with a local file (the rest are listed).
 *   rulings            files to read and/or rulings written inline.
 *   authorMessage      the author's newest comments, verbatim; they override older
 *                      approvals they contradict. Verifiers, refuters and the
 *                      critic all see rulings and authorMessage.
 *   standard           the writing standard, for findings of category "rule"
 *                      (optional; without it those are judged by the rulings alone).
 *   roundDir           if set, a Markdown report source-verification.md is written there.
 *   scratch            scratch root for agents (extracted text, rendered pages).
 *   effort             per stage, e.g. {"inventory": "medium"}; verify, refute and
 *                      critic default to high.
 *
 * OUTPUT
 *   { counts {sources, FULLTEXT, ABSTRACT, UNVERIFIED, raised, survived},
 *     surviving (findings with the source label), refuted, verified_ok,
 *     reference_entries, unverifiable (ask the author for these sources),
 *     not_run, critic {raised, surviving}, report }
 *
 * COST
 *   1 inventory (if no list) + 1 verifier per source + 1 refuter per source with
 *   findings + 1 critic + 1 critic refuter (+1 reporter). Thirty sources: about 60.
 */

const RAW = (args && typeof args === 'object' && !Array.isArray(args)) ? args : {}
function pick() {
  for (let i = 0; i < arguments.length; i++) { const v = RAW[arguments[i]]; if (v !== undefined && v !== null && v !== '') return v }
  return undefined
}
const A = {
  root: pick('root'), context: pick('context'),
  files: pick('documents', 'files'), sources: pick('sources'),
  sources_dir: pick('sourcesDir', 'sources_dir'), bib: pick('bib'),
  verification_log: pick('verificationLog', 'verification_log'), library_hint: pick('libraryHint', 'library_hint'),
  web: pick('web'), only_local: pick('onlyLocal', 'only_local'), rulings: pick('rulings'),
  instruction: pick('authorMessage', 'instruction'), standard: pick('standard'),
  out_dir: pick('roundDir', 'outDir', 'out_dir'), scratch_dir: pick('scratch', 'scratch_dir'),
}
const E = (RAW.effort && typeof RAW.effort === 'object') ? RAW.effort : {}
const NAME = 'source-verification'

function list(x) { return x == null ? [] : (Array.isArray(x) ? x : [x]) }
function isPath(x) { return typeof x === 'string' && !/\s/.test(x.trim()) && /[\/.]/.test(x) }
function opts(o) { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }

const FILES = list(A.files).map(f => (typeof f === 'string' ? { path: f } : Object.assign({}, f))).filter(f => f.path)
if (!FILES.length) throw new Error(NAME + ': missing args: documents (a non-empty array of paths or {path, mirror?}). See the header comment for an example.')

const SRC = A.sources_dir ? String(A.sources_dir).replace(/\/?$/, '/') : ''
const WEB = A.web !== false
const OUT = A.out_dir ? String(A.out_dir).replace(/\/?$/, '/') : ''
const FILE_LIST = FILES.map(f => f.path + (f.mirror ? ' (mirror: ' + f.mirror + ')' : '')).join(', ')

function rulingsBlock() {
  const r = list(A.rulings)
  if (!r.length) return ''
  const files = r.filter(isPath)
  const inline = r.filter(x => !isPath(x))
  return 'THE AUTHOR\'S STANDING RULINGS (a correction that breaks one is wrong).' +
    (files.length ? ' Read: ' + files.join(', ') + '.' : '') +
    (inline.length ? '\n' + inline.map(x => '- ' + x).join('\n') : '')
}

const COMMON = [
  'You check what a written document says about the works it cites. ' + (A.root ? 'Project root: ' + A.root + '; relative paths are relative to it. ' : '') + 'READ-ONLY: never edit, create, move or delete a project file.',
  A.context ? 'THE DOCUMENT: ' + A.context : '',
  'FILES THAT CITE SOURCES: ' + FILE_LIST + '. Audit only the text a reader sees; comment blocks that record revision history are not the text.',
  'THE STANDARD OF PROOF. Every sentence that reports a study must be true of the study in the study\'s own terms: setting (country, region, industry), period, unit of observation, design and estimator, sample, direction and size of the finding, and every qualifier. A number is right only if the source says it at the cited page or table (rounding to the printed precision is fine; a percent is not a percentage point). An abstract is not the paper, and a working paper is not the published article: numbers, signs, and even which regression a table reports can differ between versions. Ground every finding in the source or in the document\'s own words, with a page or table. If you cannot ground it, do not raise it: three grounded findings beat fifteen speculative ones. Report what you checked and found CORRECT too.',
  'FORM OF A CORRECTION. Correct only what the source contradicts or does not support. Keep the document\'s form (the study as subject, a literal verb, its setting and period named). Never rewrite for style. Never invent a number: if the source is unavailable, the claim is unverifiable and no correction is proposed. A topic sentence (the first sentence of a paragraph) that a correction makes false is flagged is_king=true and is never rewritten silently.',
  rulingsBlock(),
  A.instruction ? 'THE AUTHOR\'S LATEST INSTRUCTION (verbatim). It overrides any earlier approval it contradicts; never use an older approval to refute it:\n' + A.instruction : '',
  list(A.standard).length ? 'THE WRITING STANDARD (for findings of category "rule"): ' + list(A.standard).join(', ') + '.' : '',
  'SCRATCH: ' + (A.scratch_dir ? 'only under ' + A.scratch_dir + '/<your label>/' : 'only in a folder of your own in your session scratchpad') + ' (extracted text, rendered pages); delete it before you finish.',
].filter(Boolean).join('\n\n')

const ROUTES = [
  'HOW TO OBTAIN THE SOURCE, in this order:',
  '(1) a local file' + (SRC ? ' under ' + SRC : '') + ' when one is named or can be matched by author and year: read it with the Read tool in page ranges, or extract the text with pdftotext. A scanned file has no text layer: render pages to images (for example with PyMuPDF) and read them visually, starting with the abstract and the conclusion. A cover sheet (a repository or archive page) can shift the page count: cite the article\'s own page or folio.',
  A.library_hint ? '(2) the connected literature tool: ' + A.library_hint + '. Ask it precise questions and have it quote the table or page for each number. Load its tools with ToolSearch if they are deferred.' : '(2) a connected literature tool, if this session has one (search for it with ToolSearch); ask it to quote the table or page for each number.',
  WEB ? '(3) an open-access copy via WebFetch: the publisher\'s open-access page, NBER, SSRN, IZA, RePEc, CEPR or the authors\' own pages. (4) failing full text, the abstract from https://api.openalex.org/works/doi:<DOI> (abstract_inverted_index) or https://api.semanticscholar.org/graph/v1/paper/DOI:<DOI>?fields=title,abstract,year,venue. Check reference-entry fields against https://api.crossref.org/works/<DOI> when a DOI exists.' : 'Web lookups are not allowed in this run: use only local files and connected tools; anything else is UNVERIFIED.',
  'STATUS: FULLTEXT only if you read the full text of the version you name; ABSTRACT if only an abstract; UNVERIFIED if nothing. If the version you read differs from the one the reference entry cites, say so and flag every number that could differ.',
].join('\n')

const INVENTORY_SCHEMA = { type: 'object', properties: {
  sources: { type: 'array', items: { type: 'object', properties: {
    label: { type: 'string', description: 'as cited, e.g. "Author and Other (2014)"' },
    entry: { type: 'string', description: 'the reference-list entry, verbatim, or ""' },
    local: { type: 'string', description: 'the matching local file name, or ""' },
    doi: { type: 'string' },
    n_sentences: { type: 'integer' } },
    required: ['label', 'entry', 'local', 'n_sentences'] } },
  total_citations: { type: 'integer' },
  uncited_entries: { type: 'array', items: { type: 'string' } },
  cited_without_entry: { type: 'array', items: { type: 'string' } } },
  required: ['sources', 'total_citations'] }

const RESULT_SCHEMA = { type: 'object', properties: {
  label: { type: 'string' },
  status: { type: 'string', enum: ['FULLTEXT', 'ABSTRACT', 'UNVERIFIED'] },
  route: { type: 'string', description: 'exactly how the text was obtained (file path, tool, URL)' },
  version_read: { type: 'string', description: 'published article / which working paper / abstract only' },
  findings: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' },
    severity: { type: 'string', enum: ['CRITICAL', 'MAJOR', 'MINOR'] },
    category: { type: 'string', enum: ['contradicted', 'unsupported', 'imprecise', 'version', 'cross_file', 'reference_entry', 'rule'] },
    file: { type: 'string' }, location: { type: 'string' },
    quote: { type: 'string', description: 'the document sentence, verbatim' },
    claim: { type: 'string' },
    source_says: { type: 'string', description: 'page or table, and a short quote (under 25 words)' },
    why_wrong: { type: 'string' },
    proposed_fix: { type: 'string', description: 'the corrected sentence (or the corrected entry), or "" if nothing can be proposed' },
    is_king: { type: 'boolean' } },
    required: ['id', 'severity', 'category', 'file', 'location', 'quote', 'claim', 'source_says', 'why_wrong', 'proposed_fix', 'is_king'] } },
  verified_ok: { type: 'array', items: { type: 'string' }, description: 'claims checked and found correct, each with its page or table' },
  unverifiable: { type: 'array', items: { type: 'string' } },
  reference_entry_check: { type: 'string', description: 'field-by-field result for the entry: authors, year, title, venue, volume, issue, pages, DOI' },
  summary: { type: 'string' } },
  required: ['label', 'status', 'route', 'findings', 'verified_ok', 'unverifiable', 'reference_entry_check', 'summary'] }

const VERDICT_SCHEMA = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: {
  id: { type: 'string' }, refuted: { type: 'boolean' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, reason: { type: 'string' },
  better_fix: { type: 'string', description: 'if the defect is real but the fix is wrong: the fix the source supports; else ""' } },
  required: ['id', 'refuted', 'confidence', 'reason'] } } }, required: ['verdicts'] }

const CRITIC_SCHEMA = { type: 'object', properties: {
  findings: RESULT_SCHEMA.properties.findings,
  not_checked: { type: 'array', items: { type: 'string' }, description: 'what this round did not check and why, including sources the author should supply' } },
  required: ['findings', 'not_checked'] }

let SOURCES = list(A.sources).map(s => (typeof s === 'string' ? { label: s } : Object.assign({}, s))).filter(s => s.label)
let inventory = null
if (!SOURCES.length) {
  phase('Inventory')
  inventory = await agent([COMMON,
    'TASK: build the inventory of cited works. With code (grep or python), find every citation in ' + FILE_LIST + ' and every entry in the reference lists' + (A.bib ? ' and in ' + A.bib : '') + '. For each cited work return its label as cited, its reference entry, its DOI if the entry has one, the number of sentences that cite it, and the matching local file in ' + (SRC || 'the project\'s source folder (find it)') + ' (match by author and year; "" if none). Also list entries no file cites and citations with no entry. Count the citations and give the total. Do not verify anything yet.',
  ].join('\n\n'), opts({ label: 'inventory', phase: 'Inventory', schema: INVENTORY_SCHEMA, effort: E.inventory }))
  SOURCES = inventory && inventory.sources ? inventory.sources.map(s => ({ label: s.label, local: s.local, doi: s.doi, note: s.entry ? 'reference entry: ' + s.entry : '' })) : []
  log('inventory: ' + SOURCES.length + ' cited works' + (inventory ? ', ' + inventory.total_citations + ' citations' : ' (inventory agent did not return)'))
}
if (!SOURCES.length) throw new Error(NAME + ': no sources to verify: the inventory returned nothing and args.sources is empty.')

let notRun = []
if (A.only_local) {
  notRun = SOURCES.filter(s => !s.local).map(s => s.label)
  SOURCES = SOURCES.filter(s => s.local)
  if (notRun.length) log('only_local: ' + notRun.length + ' sources without a local file are listed, not verified')
}

function sourceLine(s) {
  return 'SOURCE: ' + s.label +
    (s.local ? '\n  Local file: ' + (s.local.indexOf('/') >= 0 ? s.local : SRC + s.local) : '') +
    (s.key ? '\n  Key in the literature tool: ' + s.key : '') +
    (s.doi ? '\n  DOI: ' + s.doi : '') +
    (s.note ? '\n  Note: ' + s.note : '') +
    (s.special ? '\n  SPECIAL CHECK: ' + s.special : '')
}

phase('Verify')
const rows = await pipeline(SOURCES,
  (s, _item, idx) => agent([COMMON, ROUTES, sourceLine(s),
    'PROCEDURE. (1) With code, find EVERY sentence in ' + FILE_LIST + ' that cites this source, and the sentence after it when it continues the report without a new citation. A source cited in several files must be described the same way in each: a disagreement is a finding (category cross_file). A mirror must say what the original says. (2)' + (A.verification_log ? ' Read this source\'s line in ' + A.verification_log + ' (its earlier status and note).' : ' Note any earlier status recorded in the document\'s comments.') + ' (3) Obtain the source by the routes above and read it: the tables and passages, not only the abstract. (4) Check every claim: setting, period, unit, design, sample, direction, size, units of the number, which specification it comes from, and every qualifier. (5) Check the reference entry field by field (authors and spelling, year, title, venue, volume, issue, pages, DOI)' + (A.bib ? ' in the files and in ' + A.bib : '') + '; a problem there is a finding with category reference_entry and proposed_fix = the corrected entry. (6) Check the document\'s own rules where a sentence breaks them (category rule).',
    'SEVERITY. CRITICAL = the source contradicts the document, a number is wrong, a claim true of one specification is stated generally, or a topic sentence is false. MAJOR = unsupported, over-generalised, attributed to the wrong party, or read from a different version than the one cited. MINOR = imprecision that changes nothing for a reader.',
    'Give each finding any short id (they are renumbered). Return the schema. Be exhaustive on this source and silent about every other.',
  ].join('\n\n'), opts({ label: 'verify:' + String(s.label).slice(0, 30), phase: 'Verify', schema: RESULT_SCHEMA, effort: E.verify || 'high' }))
    .then(r => {
      if (r && r.findings) r.findings = r.findings.map((f, i) => Object.assign({}, f, { id: 'S' + (idx + 1) + '-' + (i + 1) }))
      return { source: s, result: r }
    }),
  (v) => {
    const r = v.result
    if (!r || !r.findings || !r.findings.length) return Object.assign({}, v, { verdicts: [] })
    return agent([COMMON, ROUTES, sourceLine(v.source),
      'YOU ARE THE ADVERSARIAL VERIFIER. Another agent checked the document\'s claims about this source and raised the findings below. YOUR DEFAULT IS THAT EACH IS WRONG. Open the document and the source yourself.',
      'For each finding: (1) is the quoted sentence in the document verbatim? Search for it; a misquote refutes the finding. (2) does the source really say what the verifier claims? Verifiers invent source content as readily as authors do. (3) is the document\'s sentence defensible under a reasonable reading the verifier did not consider? Imprecise is not false. (4) is it only a preference for different wording? (5) does the proposed fix add a number or qualifier the source does not state, or change the meaning beyond what the evidence forces? If the defect is real but the fix is wrong, keep it and give better_fix. (6) for a reference-entry complaint, check the article and the metadata yourself: a cover sheet or a database record can be the one that is wrong.',
      'Mark refuted=true unless you can independently confirm the defect. When in doubt, refute. Keep the document\'s original sentence when the source does not clearly force the change.',
      'FINDINGS (JSON):\n' + JSON.stringify(r.findings),
    ].join('\n\n'), opts({ label: 'refute:' + String(v.source.label).slice(0, 30), phase: 'Refute', schema: VERDICT_SCHEMA, effort: E.refute || 'high' }))
      .then(x => Object.assign({}, v, { verdicts: (x && x.verdicts) || [], refuter_failed: !x }))
  })

const done = rows.filter(Boolean)
function split(findings, verdicts, label) {
  const vm = {}
  verdicts.forEach(v => { vm[v.id] = v })
  const surviving = []
  const refuted = []
  for (const f of findings) {
    const v = vm[f.id]
    const item = Object.assign({}, f, { source_label: label, refuter: v ? v.reason : 'NOT VERIFIED (no verdict returned)' })
    if (v && v.better_fix) item.proposed_fix = v.better_fix
    if (v && v.refuted) refuted.push(item)
    else surviving.push(Object.assign(item, { status: v ? 'CONFIRMED' : 'UNVERIFIED' }))
  }
  return { surviving, refuted }
}
let surviving = []
let refuted = []
for (const d of done) {
  const r = d.result
  if (!r) continue
  const s = split(r.findings || [], d.verdicts || [], d.source.label)
  surviving = surviving.concat(s.surviving)
  refuted = refuted.concat(s.refuted)
}
const failedSources = done.filter(d => !d.result).map(d => d.source.label)
const raised = done.reduce((n, d) => n + (d.result && d.result.findings ? d.result.findings.length : 0), 0)
const count = st => done.filter(d => d.result && d.result.status === st).length
log('verified ' + done.length + ' sources: FULLTEXT ' + count('FULLTEXT') + ', ABSTRACT ' + count('ABSTRACT') + ', UNVERIFIED ' + count('UNVERIFIED') + (failedSources.length ? ', no result for ' + failedSources.length : '') + '; raised ' + raised + ', survived ' + surviving.length)

phase('Close')
const critic = await agent([COMMON,
  'You are the COMPLETENESS CRITIC of a source-verification round over ' + FILE_LIST + '. ' + done.length + ' sources were verified, each followed by an adversarial refuter; ' + raised + ' findings were raised and ' + surviving.length + ' survived.',
  'Read the files yourself. Then answer: WHAT DID THIS ROUND NOT CHECK? Look for: sentences citing a source that no verifier was assigned (compare the citations in the files with the list below); assertions that carry no citation and need one; claims about what "the literature" shows collectively; a load-bearing claim verified only from an abstract (the author should supply the full text); a study described differently in two files; a version mismatch nobody checked; and the argument rather than the citations: what would an examiner attack first now that the citations are checked? Raise findings ONLY where you can ground them (same fields as the verifiers; id prefix "critic-"). Put everything you could not check, and why, in not_checked.',
  'SOURCES VERIFIED (label, status, version):\n' + JSON.stringify(done.map(d => ({ label: d.source.label, status: d.result ? d.result.status : 'NO RESULT', version: d.result ? d.result.version_read : '' }))),
  'SURVIVING FINDINGS (JSON):\n' + JSON.stringify(surviving.map(f => ({ source: f.source_label, severity: f.severity, location: f.location, claim: f.claim }))),
  'STILL UNVERIFIABLE:\n' + JSON.stringify(done.flatMap(d => (d.result && d.result.unverifiable) || [])),
].join('\n\n'), opts({ label: 'completeness critic', phase: 'Close', schema: CRITIC_SCHEMA, effort: E.critic || 'high' }))

let criticSurviving = []
const criticFindings = ((critic && critic.findings) || []).map((f, i) => Object.assign({}, f, { id: 'critic-' + (i + 1) }))
if (criticFindings.length) {
  const cv = await agent([COMMON, ROUTES,
    'YOU ARE THE ADVERSARIAL VERIFIER of findings a completeness critic raised. YOUR DEFAULT IS THAT EACH IS WRONG. Open the document and, where one is named, the source yourself. A misquote refutes a finding; an imprecision is not an error; a claim that the document needs a citation is refuted if the sentence is the author\'s own argument rather than a report of evidence. Mark refuted=true unless you can independently confirm the defect.',
    'FINDINGS (JSON):\n' + JSON.stringify(criticFindings),
  ].join('\n\n'), opts({ label: 'refute:critic', phase: 'Close', schema: VERDICT_SCHEMA, effort: E.refute || 'high' }))
  const s = split(criticFindings, (cv && cv.verdicts) || [], 'critic')
  criticSurviving = s.surviving
  refuted = refuted.concat(s.refuted)
}

const SEVR = { CRITICAL: 0, MAJOR: 1, MINOR: 2 }
surviving.sort((a, b) => (b.is_king ? 1 : 0) - (a.is_king ? 1 : 0) || (SEVR[a.severity] || 0) - (SEVR[b.severity] || 0))
const unverifiable = done.flatMap(d => ((d.result && d.result.unverifiable) || []).map(u => d.source.label + ': ' + u))
  .concat(done.filter(d => d.result && d.result.status === 'UNVERIFIED').map(d => d.source.label + ': source not obtained'))
  .concat(failedSources.map(l => l + ': verifier returned nothing'))
const result = {
  counts: {
    sources: done.length, FULLTEXT: count('FULLTEXT'), ABSTRACT: count('ABSTRACT'), UNVERIFIED: count('UNVERIFIED'),
    no_result: failedSources.length, raised, survived: surviving.length, critic_raised: criticFindings.length, critic_survived: criticSurviving.length,
  },
  surviving,
  refuted: refuted.map(f => ({ source: f.source_label, location: f.location, quote: f.quote, why_wrong: f.why_wrong, refuter: f.refuter })),
  verified_ok: done.flatMap(d => ((d.result && d.result.verified_ok) || []).map(x => d.source.label + ': ' + x)),
  reference_entries: done.map(d => ({ source: d.source.label, check: d.result ? d.result.reference_entry_check : 'no result' })),
  sources: done.map(d => ({ label: d.source.label, status: d.result ? d.result.status : 'NO RESULT', route: d.result ? d.result.route : '', version: d.result ? d.result.version_read : '', summary: d.result ? d.result.summary : '' })),
  unverifiable,
  not_run: notRun,
  inventory: inventory ? { total_citations: inventory.total_citations, uncited_entries: inventory.uncited_entries || [], cited_without_entry: inventory.cited_without_entry || [] } : null,
  critic: { surviving: criticSurviving, not_checked: (critic && critic.not_checked) || [] },
  report: null,
}

if (OUT) {
  phase('Report')
  result.report = await agent([
    'You write ONE report file and return its path. ' + (A.root ? 'Project root: ' + A.root + '.' : ''),
    'WRITE ' + OUT + 'source-verification.md with the Write tool, in Markdown and English. Sections: "# Source verification"; "## Counts" (sources by status, raised, survived); "## Corrections that survived" (a table: source | location | current sentence | the source says (page) | corrected sentence | severity; topic-sentence cases marked for the author); "## Reference entries" (only those with problems); "## Ask the author for these sources" (unverifiable and abstract-only load-bearing claims); "## What the round did not check"; "## Checked and correct" (one line each); "## Raised and refuted" (one line each with the reason). Use only the data below; do not change any proposed text.',
    'DATA (JSON):\n' + JSON.stringify(Object.assign({}, result, { report: undefined })),
  ].join('\n\n'), { label: 'report', phase: 'Report', schema: { type: 'object', properties: { report_path: { type: 'string' } }, required: ['report_path'] }, agentType: 'general-purpose' })
}

return result
