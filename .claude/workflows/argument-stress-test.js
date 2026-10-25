export const meta = {
  name: 'argument-stress-test',
  description: 'Adversarial domain-expert lenses try to break the document\'s argument; an independent tester rebuts each objection against the data and the text (sustained, partly, overruled); a second reader writes the verdict the author needs',
  whenToUse: 'Before a supervisor meeting, a defence, or a submission, when the question is whether the story holds up rather than whether the prose is clean. Read-only.',
  phases: [
    { title: 'Referee', detail: 'domain-expert lenses, each told to break the story' },
    { title: 'Rebut', detail: 'each objection tested against the data and the text' },
    { title: 'Verdict', detail: 'what survives, what must change, what to tell the supervisor' },
  ],
}

/*
 * argument-stress-test.js
 *
 * PURPOSE
 *   Find out whether the argument survives the strongest objections a field
 *   expert would raise, before someone raises them in a meeting or a report.
 *   Each lens (identification, magnitudes, the claimed contribution, measurement
 *   and sample, coherence of the story, literature positioning, or lenses you
 *   supply) attacks the claims, measuring things itself rather than asserting
 *   them. Every objection then goes to an independent tester whose job is to
 *   test it, not to agree: is it factually right, does the text already answer
 *   it (quote where), is the severity right for this kind of document, does the
 *   remedy really need new analysis? Verdicts: SUSTAINED, PARTLY, OVERRULED.
 *   A final reader writes the verdict for the author: does the story hold, what
 *   is load-bearing and sound, what will be attacked in order of danger
 *   (writing-only fixes separated from fixes that need new analysis), the
 *   questions the author must be able to answer, the one change to make, and
 *   what to tell the supervisor.
 *
 * ARGS (JSON example; paths relative to root unless absolute)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "context": "A draft paper on <topic>; the results section is the focus.",
 *     "documents": ["paper/results.tex", "paper/design.tex", "paper/introduction.tex", "paper/conclusion.tex"],
 *     "focus": "paper/results.tex",
 *     "story": ["Smaller classes are associated with higher test scores.",
 *               "The association is larger in schools with more low-income pupils."],
 *     "design": "Unit, periods, outcome, regressors, instruments, controls, fixed effects, inference.",
 *     "outputs": ["results/current/"],
 *     "sourcesDir": "master_supporting_docs/supporting_papers/",
 *     "constraints": ["The supervisor has ruled out new estimation for this draft."],
 *     "rulings": ["quality_reports/TRACKER.md", "Test scores are reported in standard-deviation units."],
 *     "authorMessage": "The author's latest comments, verbatim.",
 *     "level": "a master's thesis, not a job-market paper",
 *     "field": "applied microeconomics",
 *     "roundDir": "quality_reports/2027-01-20_stress_test",
 *     "scratch": "<session scratchpad>/argument-stress-test"
 *   }
 *   Required: documents. snake_case aliases are accepted (files, numbers,
 *   sources_dir, instruction, out_dir, scratch_dir).
 *
 *   documents          the document files (the focus and the files it relies on).
 *   focus              the file under the most pressure (default: the first).
 *   story              the claims the author wants to tell (array or string).
 *   design             a short description of the design, so lenses start informed.
 *   outputs            machine output: the only source of truth for any number.
 *   sourcesDir         cited sources, for the literature lens.
 *   constraints        facts about the situation that are not defects (array).
 *   rulings            files to read (any entry that looks like a path) and/or
 *                      rulings written inline: decisions the author has settled.
 *   authorMessage      the author's newest comments, verbatim; they override older
 *                      approvals they contradict. Referees, testers and the verdict
 *                      writer all see rulings and authorMessage.
 *   level              what kind of document, so severity is calibrated.
 *   field              the expertise of the referees.
 *   lenses             override the default six: [{key, prompt}]. For a field
 *                      outside empirical economics, supply its own lenses.
 *   roundDir           if set, the verdict is also written to argument-stress-test.md.
 *   scratch            scratch root for measurements.
 *   effort             per stage, e.g. {"verdict": "xhigh"}; referee and rebut
 *                      default to high.
 *
 * OUTPUT
 *   { tested, standing, by_lens [{lens, overall, n}], objections [{lens, attack,
 *     verdict}], verdict (Markdown text), report }
 *
 * COST
 *   One referee per lens + one tester per objection + 1 verdict. Six lenses
 *   raising six to eight objections each: about 45 to 55 agents.
 */

const RAW = (args && typeof args === 'object' && !Array.isArray(args)) ? args : {}
function pick() {
  for (let i = 0; i < arguments.length; i++) { const v = RAW[arguments[i]]; if (v !== undefined && v !== null && v !== '') return v }
  return undefined
}
const A = {
  root: pick('root'), context: pick('context'),
  files: pick('documents', 'files'), focus: pick('focus'), story: pick('story'), design: pick('design'),
  numbers: pick('outputs', 'numbers'), sources_dir: pick('sourcesDir', 'sources_dir'),
  constraints: pick('constraints'), level: pick('level'), field: pick('field'), lenses: pick('lenses'),
  rulings: pick('rulings'), instruction: pick('authorMessage', 'instruction'),
  out_dir: pick('roundDir', 'outDir', 'out_dir'), scratch_dir: pick('scratch', 'scratch_dir'),
}
const E = (RAW.effort && typeof RAW.effort === 'object') ? RAW.effort : {}
const NAME = 'argument-stress-test'

function list(x) { return x == null ? [] : (Array.isArray(x) ? x : [x]) }
function isPath(x) { return typeof x === 'string' && !/\s/.test(x.trim()) && /[\/.]/.test(x) }
function opts(o) { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }

function rulingsBlock() {
  const r = list(A.rulings)
  if (!r.length) return ''
  const files = r.filter(isPath)
  const inline = r.filter(x => !isPath(x))
  return 'THE AUTHOR\'S STANDING RULINGS (settled decisions: an objection that only reopens one is not a defect; a remedy that undoes one must say so and why).' +
    (files.length ? ' Read: ' + files.join(', ') + '.' : '') +
    (inline.length ? '\n' + inline.map(x => '- ' + x).join('\n') : '')
}

const FILES = list(A.files).map(f => (typeof f === 'string' ? f : f && f.path)).filter(Boolean)
if (!FILES.length) throw new Error(NAME + ': missing args: documents (a non-empty array of paths). See the header comment for an example.')
const NUM = list(A.numbers).join(', ')

const FOCUS = A.focus || FILES[0]
const OUT = A.out_dir ? String(A.out_dir).replace(/\/?$/, '/') : ''
const STORY = list(A.story)
const LEVEL = A.level || 'the stage this document is at (state the level you assume)'

const CTX = [
  'You are refereeing a written argument. ' + (A.root ? 'Project root: ' + A.root + '; relative paths are relative to it. ' : '') + 'READ-ONLY: never edit, create, move or delete a project file. Write scratch files only ' + (A.scratch_dir ? 'under ' + A.scratch_dir + '/<your label>/' : 'in a folder of your own in your session scratchpad') + ', and delete it before you finish.',
  A.context ? 'THE DOCUMENT: ' + A.context : '',
  'FILES (audit only the text a reader sees; comment blocks that record revision history quote old text that is already fixed):\n  ' + FILES.map(f => f + (f === FOCUS ? '   <- THE FOCUS' : '')).join('\n  '),
  'Those revision-history comments also record why things were removed. Something removed was usually removed for a stated reason: a remedy that puts it back must engage that reason, or it is a wasted objection.',
  rulingsBlock(),
  A.instruction ? 'THE AUTHOR\'S LATEST INSTRUCTION (verbatim). It overrides any earlier approval it contradicts; do not use an older approval to dismiss it:\n' + A.instruction : '',
  NUM ? 'MACHINE OUTPUT (the only source of truth for any number): ' + NUM + '. You may run read-only code on it to measure anything.' : 'No machine output was named: where a number matters, find the output the document is built from and say where you found it.',
  A.sources_dir ? 'CITED SOURCES: ' + A.sources_dir : '',
  A.design ? 'THE DESIGN (verify it yourself against the files):\n' + A.design : '',
  STORY.length ? 'THE STORY THE AUTHOR WANTS TO TELL:\n' + STORY.map((s, i) => '  ' + (i + 1) + '. ' + s).join('\n') : '',
  'CONSTRAINTS THAT ARE NOT DEFECTS:\n' + list(A.constraints).map(c => '  - ' + c).concat(['  - A remedy that needs new estimation or new data is expensive: say so explicitly and say what it would cost.']).join('\n'),
  'CALIBRATION: the document is ' + LEVEL + '. Calibrate what is fatal against that.',
].filter(Boolean).join('\n\n')

const ATTACK_SCHEMA = { type: 'object', properties: {
  overall: { type: 'string', description: '3 to 5 sentences: does the story hold up on your lens?' },
  attacks: { type: 'array', items: { type: 'object', properties: {
    claim: { type: 'string', description: 'the claim under attack, quoted if possible, with its file' },
    attack: { type: 'string', description: 'the strongest objection an expert would raise' },
    evidence: { type: 'string', description: 'what you measured yourself that supports the attack' },
    severity: { type: 'string', enum: ['FATAL', 'SERIOUS', 'ADDRESSABLE', 'COSMETIC'] },
    remedy: { type: 'string', description: 'what the author should do; say if it needs new analysis' },
    needs_new_estimation: { type: 'boolean' } },
    required: ['claim', 'attack', 'evidence', 'severity', 'remedy', 'needs_new_estimation'] } } },
  required: ['overall', 'attacks'] }

const REBUT_SCHEMA = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['SUSTAINED', 'PARTLY', 'OVERRULED'] },
  reasoning: { type: 'string' },
  corrected_severity: { type: 'string', enum: ['FATAL', 'SERIOUS', 'ADDRESSABLE', 'COSMETIC'] },
  where_answered: { type: 'string', description: 'quote the passage, with its file, if the document already answers it' },
  remedy_needs_new_estimation: { type: 'boolean' } },
  required: ['verdict', 'reasoning', 'corrected_severity', 'where_answered'] }

const FIELD = A.field ? ' You are an expert in ' + A.field + '.' : ''
const LENSES = list(A.lenses).length ? list(A.lenses) : [
  { key: 'identification', prompt: 'LENS 1, IDENTIFICATION.' + FIELD + ' Attack the design and what the coefficients can mean. (a) What variation actually identifies each coefficient? Measure it: for example, split the variation the estimate uses into the part common to all units in a period and the part specific to each unit. If the common part dominates, say in plain words what the estimate then is. (b) Compare estimators the document reports side by side (for example least squares against instrumental variables): does the direction of the gap match what the document\'s own story of the bias predicts, and if not, is it explicable (measurement error, a local effect, weak instruments) and does the document owe the reader that explanation? Measure the first stages yourself. (c) Exactly identified systems allow no overidentification test: is the exclusion restriction credible for each regressor separately? (d) Does any claim exceed what the design identifies?' },
  { key: 'magnitudes', prompt: 'LENS 2, MAGNITUDES AND PLAUSIBILITY.' + FIELD + ' Attack the size of the estimates as an expert reading the model. (a) Compute what each coefficient implies over the observed range of its regressor and over the changes actually used, in units a reader understands (percent where the outcome is in logs). Are they plausible? (b) Does the document lead with a number it elsewhere disowns, or explain away its own headline? (c) Benchmarks: is each comparison with another study made in the same units, on the same dependent variable, with the same estimator and the same controls or fixed effects? Find the column of this document that matches the benchmark\'s specification, and argue both for and against leading with it. (d) When components and an aggregate are estimated separately, do their implied contributions add up, and does the document say which a reader should believe?' },
  { key: 'contribution', prompt: 'LENS 3, IS THE CONTRIBUTION REAL?' + FIELD + ' Attack the claimed novelty. (a) If the document splits an aggregate into parts, is the split informative or a relabelling? If two instruments or measures are built from the same base, in what sense are they two? Measure their correlation, raw and after the fixed effects. (b) Can a reader interpret a one-unit change in each regressor, and does the document give that reading? (c) Claims that two estimates are "comparable" or "different": is there a test, or only overlapping intervals? A near-equality that looks too exact may be mechanical: investigate it. (d) When a specification change makes part of the system weak or unidentified, what does that mean for the contribution?' },
  { key: 'measurement', prompt: 'LENS 4, THE OUTCOME, THE MEASURES AND THE SAMPLE.' + FIELD + ' (a) Does the outcome measure what the research question asks about, on the population it asks about? (b) Transformations that are equivalent to a fixed effect (for example deflating by one national price index is a period effect): are two robustness checks in fact one check reported twice? Measure how close they are. (c) Changes in who is in the sample over time could drive the outcome: what do the controls absorb, and why does one estimate move with them and another not? (d) Units, periods, clusters: is anything powered, and does the inference suit the number of clusters?' },
  { key: 'coherence', prompt: 'LENS 5, DOES THE STORY COHERE?' + FIELD + ' Read the focus end to end, then the introduction and the conclusion, as the supervisor would. (a) Is there one sentence a reader could repeat as "the finding"? Quote it and judge it. (b) Is the hedging so heavy that the contribution disappears, or so light that the claims outrun the evidence? Say plainly whether you would sign off on it at this level. (c) Is the novelty claim stated where a reader will find it? (d) Do the introduction, the results and the conclusion promise and claim the same thing? Quote every mismatch. (e) After many subtractive rounds, is the document too quiet at exactly the points where the room will push: evidence computed and not printed, an interval printed and not read, a comparison promised early and never kept?' },
  { key: 'literature', prompt: 'LENS 6, LITERATURE POSITIONING AND COMPARATIVE CLAIMS.' + FIELD + ' (a) For each comparison with another study, read the source' + (A.sources_dir ? ' in ' + A.sources_dir : '') + ' and judge whether the comparison is accurate and like for like (setting, estimator, controls, dependent variable, units, and whether the source\'s result is conditional on something the document leaves out). (b) Is the characterisation of the closest prior work accurate, and is the novelty claim safe against it? (c) Is there an obvious paper the document should engage and does not? Name it only if you are confident it exists and is relevant.' },
]

phase('Referee')
log('argument-stress-test: ' + LENSES.length + ' lenses over ' + FILES.length + ' file(s), focus ' + FOCUS)
const lensOut = await pipeline(LENSES,
  (l) => agent(CTX + '\n\n' + l.prompt + '\n\nReturn your attacks. Be specific and quantitative: measure things yourself rather than asserting them. Rank severity honestly for this level: reserve FATAL for something that would make the focus indefensible as written, and do not inflate. If your lens finds the story sound, say so and return few or no attacks.',
    opts({ label: 'ref:' + l.key, phase: 'Referee', schema: ATTACK_SCHEMA, effort: E.referee || 'high' }))
    .then(r => ({ key: l.key, overall: (r && r.overall) || (r ? '' : 'LENS FAILED'), attacks: (r && r.attacks) || [], failed: !r })),
  (r) => {
    if (!r || !r.attacks.length) return Object.assign({}, r, { tested: [] })
    return parallel(r.attacks.map((a, i) => () =>
      agent(CTX + '\n\nREBUTTAL DUTY. A referee raised the objection below against this document. Your job is to TEST it against the data and the text, not to agree with it:\n  1. Is the objection factually right? Measure it yourself from the output.\n  2. Does the document already answer it somewhere (body, table note, footnote, appendix, another file)? Quote the passage if so: documents are long and referees miss things.\n  3. Is the severity right for this level?\n  4. Is the proposed remedy sound, and does it really need new analysis?\nReturn SUSTAINED (the objection stands), PARTLY (right in substance, wrong in degree, or already partly answered), or OVERRULED (wrong, or already fully answered: say where).\n\nOBJECTION (lens ' + r.key + '):\n' + JSON.stringify(a, null, 1),
        opts({ label: 'rebut:' + r.key + '#' + (i + 1), phase: 'Rebut', schema: REBUT_SCHEMA, effort: E.rebut || 'high' }))
        .then(v => ({ attack: a, verdict: v }))))
      .then(pairs => Object.assign({}, r, { tested: pairs.filter(Boolean) }))
  })

const lenses = lensOut.filter(Boolean)
const tested = lenses.flatMap(l => (l.tested || []).map(t => Object.assign({ lens: l.key }, t)))
const untested = tested.filter(t => !t.verdict)
const standing = tested.filter(t => t.verdict && t.verdict.verdict !== 'OVERRULED')
const tally = { SUSTAINED: 0, PARTLY: 0, OVERRULED: 0, untested: untested.length }
tested.forEach(t => { if (t.verdict) tally[t.verdict.verdict] = (tally[t.verdict.verdict] || 0) + 1 })
log(tested.length + ' objections tested: ' + JSON.stringify(tally) + (lenses.some(l => l.failed) ? '; failed lenses: ' + lenses.filter(l => l.failed).map(l => l.key).join(', ') : ''))

phase('Verdict')
const VERDICT_SHAPE = [
  '## Does the story hold up?', 'One paragraph. Answer the question directly. No hedging about hedging.',
  '## What is load-bearing and sound', 'The parts a referee will not break. Be specific.',
  '## What will be attacked, in order of danger', 'For each: the objection, what the data actually say, whether the document already answers it (and where), and what the author should do. Mark clearly which remedies need NEW ANALYSIS and which are writing-only.',
  '## Questions the author must be able to answer', 'Each question as it would be put in the room, with the answer the document can already give, or a note that it cannot yet.',
  '## The one thing I would change', 'A single highest-value change, with the actual old and new wording if it is a sentence.',
  '## What to tell the supervisor', 'Three to five sentences the author could send, in his register: plain, one idea per sentence.',
].join('\n')
const verdictPrompt = CTX + '\n\nYou are the supervisor\'s trusted second reader. Below are the referee lenses on this document, each objection already tested by an independent tester. Write the verdict the AUTHOR needs, in Markdown, in exactly this shape:\n\n' + VERDICT_SHAPE +
  '\n\nRules: quote numbers you have verified. Do not invent findings. If the referees disagree with each other, say so and adjudicate. Distinguish "an examiner at this level will accept this" from "a journal referee would not". Overruled objections appear only if the author should be ready for them anyway.' +
  (OUT ? '\n\nAlso WRITE the verdict to ' + OUT + 'argument-stress-test.md with the Write tool, then return the same Markdown as your final text.' : '\n\nReturn the Markdown as your final text.') +
  '\n\nLENS SUMMARIES:\n' + JSON.stringify(lenses.map(l => ({ lens: l.key, overall: l.overall, n: (l.attacks || []).length })), null, 1) +
  '\n\nTESTED OBJECTIONS (not overruled):\n' + JSON.stringify(standing, null, 1) +
  '\n\nOVERRULED (one line each):\n' + tested.filter(t => t.verdict && t.verdict.verdict === 'OVERRULED').map(t => '- [' + t.lens + '] ' + String(t.attack.attack).slice(0, 200) + ' :: ' + String(t.verdict.reasoning).slice(0, 200)).join('\n')
const verdict = await agent(verdictPrompt, opts({ label: 'verdict', phase: 'Verdict', agentType: OUT ? 'general-purpose' : undefined, effort: E.verdict }))

return {
  tested: tested.length,
  standing: standing.length,
  tally,
  by_lens: lenses.map(l => ({ lens: l.key, overall: l.overall, n: (l.attacks || []).length, failed: !!l.failed })),
  objections: tested,
  verdict,
  report: OUT ? OUT + 'argument-stress-test.md' : null,
}
