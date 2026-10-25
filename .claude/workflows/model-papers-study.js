export const meta = {
  name: 'model-papers-study',
  description: 'Read N model papers in parallel, extract how each writes a given section, synthesise one template, diagnose the current draft against it and the author\'s comments, and propose a numbered paragraph outline with sample paragraphs, checked by an author-reader, a facts checker and a rulings checker.',
  whenToUse: 'A section keeps failing the author\'s reading round after round ("did you read the papers I named?"), or before writing a section of a kind the project has not written yet. Read-only on the draft; writes its study files into the round folder.',
  phases: [
    { title: 'Study', detail: 'one reader per model paper: an anatomy of the section' },
    { title: 'Synthesize', detail: 'one template: moves, sentence shapes, connectives, register, disagreements' },
    { title: 'Diagnose', detail: 'the current draft against the template and every comment' },
    { title: 'Outline', detail: 'numbered paragraph outline and sample paragraphs' },
    { title: 'Verify', detail: 'author-reader, facts, rulings' },
    { title: 'Finalize', detail: 'apply the real problems; write the proposal files' },
  ],
}

/*
 * model-papers-study: how do the papers the author points at write this section, and what does
 * that say about our draft?
 *
 * PURPOSE
 *   Study first, then rewrite. Each model paper gets its own reader, who maps the section paragraph
 *   by paragraph and extracts the moves the author keeps asking for: how a number becomes an
 *   economic (or substantive) statement, how magnitudes are judged, how other studies are related
 *   to the paper's own result, when "therefore" is licensed, how dynamics and long-horizon
 *   imprecision are worded, where limits go, and what the papers never do. One synthesizer turns
 *   the anatomies into a practical template; a diagnostician reads the current draft against it and
 *   against every comment the author has left, at root rather than sentence by sentence; an outliner
 *   proposes one number per paragraph, each with its first sentence and its contents in order, plus
 *   sample paragraphs. Three checkers (the author as reader, facts, rulings) attack the outline; a
 *   finalizer fixes it. Nothing in the draft is edited: the outline goes to the author for approval,
 *   and after approval ONE drafter writes the whole section so it reads as one argument.
 *
 * ARGS (JSON example)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "roundDir": "quality_reports/2027-01-08_results_study",
 *     "scratch": "<session scratchpad>/model-papers-study",
 *     "section": "results and discussion",
 *     "papers": [
 *       {"key": "approver", "file": "/Users/me/papers/model/approver_paper.pdf",
 *        "why": "the approver's own paper; the named model for this section"},
 *       {"key": "twin", "file": "/Users/me/papers/model/closest_twin.pdf", "why": "the closest topic twin"},
 *       {"key": "guide", "file": "/Users/me/papers/writing/guide.pdf", "why": "a writing guide: results advice only"}
 *     ],
 *     "focus": ["how a coefficient is read at an observed change", "how a dynamic path and its precision are described"],
 *     "draft": ["paper/results.tex", "paper/results_zh.tex"],
 *     "exhibits": "Table 2 baseline and IV; Table 3 heterogeneity; Figure 2 the path by horizon",
 *     "comments": ["quality_reports/2027-01-15_results_comments/annotations.json"],
 *     "verdict": "the author's overall verdict on the current draft, verbatim",
 *     "approverGuidance": ["quality_reports/approver_notes.md"],
 *     "standard": ["docs/writing/WRITING_STANDARD.md", "docs/writing/EMPIRICAL_RESULTS_WRITING.md"],
 *     "rulings": ["quality_reports/TRACKER.md"],
 *     "outputs": ["results/current/"],
 *     "context": ["paper/data.tex", "paper/framework.tex"],
 *     "samples": ["the paragraph that reports and reads the headline estimate",
 *                 "the paragraph on the dynamic path", "one discussion paragraph the comments show is failing"],
 *     "mirrorLanguage": "Chinese",
 *     "outline": true
 *   }
 *   Required: root, roundDir, scratch, section, papers, draft.
 *   A paper's file may name several files ("a.pdf AND b.pdf"). Set outline false to stop after the
 *   diagnosis.
 *
 * OUTPUTS (written by the stage that produces each; nothing else is written)
 *   <roundDir>/model_papers/anatomies.json    one anatomy per paper
 *   <roundDir>/model_papers/template.md       the synthesized template
 *   <roundDir>/model_papers/diagnosis.md      the draft against the template and the comments
 *   <roundDir>/model_papers/outline.md        the final outline and sample paragraphs (and .json)
 *   Return value: {studies, template, diagnosis, draft, problems, final}
 *
 * COST
 *   N readers + 1 + 1 (+ 1 outline + 3 checkers + 1 finalizer). The readers read whole papers:
 *   the cost is in the Study phase.
 */

const A = args || {}
const NAME = 'model-papers-study'
const REQ = ['root', 'roundDir', 'scratch', 'section', 'papers', 'draft']
const missing = REQ.filter(k => A[k] === undefined || A[k] === null || A[k] === '')
if (missing.length) throw new Error(`${NAME}: missing args: ${missing.join(', ')}. See the header comment for an example.`)
if (!Array.isArray(A.papers) || !A.papers.length) throw new Error(`${NAME}: papers must be a non-empty array of {key, file, why}`)

const ROOT = A.root
const OUTDIR = `${A.roundDir}/model_papers`
const SCR = A.scratch
const SECTION = A.section
const ML = A.mirrorLanguage || ''
const DRAFT_FILES = Array.isArray(A.draft) ? A.draft : [A.draft]
const STANDARD = A.standard || ['docs/writing/WRITING_STANDARD.md', 'docs/writing/EMPIRICAL_RESULTS_WRITING.md']
const SAMPLES = A.samples || [
  `the paragraph that reports and reads the main estimate of the ${SECTION}`,
  'the paragraph the author\'s comments mark as most confusing',
  'one paragraph that relates another study to this paper\'s own result',
]
const E = A.effort || {}

const bullet = xs => (xs && xs.length ? xs.map(x => `  - ${x}`).join('\n') : '  (none given)')
const opt = o => { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }

const BASE = `
PROJECT ROOT: ${ROOT}
READ ONLY: do not edit, create or delete any file under ${ROOT} or in the papers' folders, except
the output path this prompt names. Scratch files only under ${SCR}/<your label>/; delete them
before you return. Read PDFs with the Read tool (pages parameter) or pdftotext; read tables with
Read when pdftotext garbles them. COPYRIGHT: quote at most one short phrase (under 15 words) per
example, with its page number; describe everything else in your own words.`

const COMMENTS = `
THE AUTHOR'S COMMENTS on the current draft (read every file):
${bullet(A.comments)}
His overall verdict (verbatim): ${A.verdict ? `「${A.verdict}」` : '(none given)'}
The approver's guidance on this kind of section:
${bullet(A.approverGuidance)}
The project's standard files and standing rulings:
${bullet(STANDARD)}
${bullet(A.rulings)}`

const ANATOMY = {
  type: 'object',
  properties: {
    paper: { type: 'string' },
    section_map: { type: 'string', description: 'the section paragraph by paragraph: the job of each paragraph and its first sentence paraphrased' },
    number_interpretation: { type: 'string', description: 'how an estimate or number becomes a substantive statement: unit of change, sentence shape, percent conversion (approximate or exact), scaling to observed changes, how the table and column are referenced; 3-5 short examples with pages' },
    magnitude_and_comparison: { type: 'string', description: 'how magnitudes are judged (literature, observed changes, means) and how other studies are related to the paper\'s own estimate' },
    logic_and_connectives: { type: 'string', description: 'how one sentence leads to the next; when therefore/thus/so is used; how a claim is followed by its evidence; how a paragraph ends' },
    dynamics_language: { type: 'string', description: 'if the paper reports responses over time or horizons: how the path is described, how precision at long horizons is worded and explained, what reading is attached and how cautiously; otherwise "none"' },
    robustness_and_limits: { type: 'string', description: 'where robustness and limitations appear, how much space, the wording' },
    register: { type: 'string', description: 'technical terms used plainly, and what the paper never does' },
    focus_answers: { type: 'string', description: 'answers to the extra questions, each with pages' },
    lessons: { type: 'string', description: 'the ten most transferable lessons for this project\'s section, each concrete' },
  },
  required: ['paper', 'section_map', 'number_interpretation', 'magnitude_and_comparison', 'logic_and_connectives', 'dynamics_language', 'robustness_and_limits', 'register', 'focus_answers', 'lessons'],
}
const OUT = {
  type: 'object',
  properties: {
    outline: { type: 'array', items: { type: 'object', properties: {
      n: { type: 'integer' }, part: { type: 'string', description: 'sub-section the paragraph belongs to' },
      first_sentence: { type: 'string' }, first_sentence_mirror: { type: 'string', description: 'in the mirror language; empty if none' },
      contents: { type: 'string', description: 'in order: each claim, each number with its source (table and column, figure, output file), each comparison, each connective' },
      answers_comments: { type: 'array', items: { type: 'string' } },
      model_basis: { type: 'string', description: 'which paper does this, and where' },
      new_content: { type: 'string', description: 'anything not already in the project\'s text or outputs, flagged; empty if none' },
    }, required: ['n', 'part', 'first_sentence', 'first_sentence_mirror', 'contents', 'answers_comments', 'model_basis', 'new_content'] } },
    samples: { type: 'array', items: { type: 'object', properties: {
      n: { type: 'integer' }, text: { type: 'string' }, mirror: { type: 'string' }, notes: { type: 'string' },
    }, required: ['n', 'text', 'mirror', 'notes'] } },
    what_goes: { type: 'string', description: 'content of the current draft the outline drops or moves, and why' },
    decisions: { type: 'array', items: { type: 'string' }, description: 'choices for the author, lettered, recommended first' },
  },
  required: ['outline', 'samples', 'what_goes', 'decisions'],
}
const PROB = {
  type: 'object',
  properties: { problems: { type: 'array', items: { type: 'object', properties: {
    where: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, problem: { type: 'string' }, fix: { type: 'string' },
  }, required: ['where', 'severity', 'problem', 'fix'] } } },
  required: ['problems'],
}

// ---------------------------------------------------------------- Study
phase('Study')
const studies = (await parallel(A.papers.map(p => () => agent(`${BASE}

STAGE: STUDY ONE MODEL PAPER. File(s): ${p.file}
Why this paper: ${p.why}
You are learning how a strong paper WRITES its ${SECTION}. Read the full ${SECTION} (and the parts
of the earlier sections a reader needs to follow it). Return a precise anatomy, concrete and
faithful to the paper. It will be used to rewrite this project's draft of the ${SECTION}. The
author's verdict on the current draft (verbatim): ${A.verdict ? `「${A.verdict}」` : '(none given)'}
Extra questions to answer from this paper:
${bullet(A.focus)}`, opt({ label: `study:${p.key}`, phase: 'Study', schema: ANATOMY, effort: E.study }))))).filter(Boolean)
if (studies.length < A.papers.length) log(`WARNING: ${A.papers.length - studies.length} paper(s) not studied; the template rests on ${studies.length}.`)
if (!studies.length) throw new Error(`${NAME}: no paper was studied`)

// ---------------------------------------------------------------- Synthesize
phase('Synthesize')
const template = await agent(`${BASE}

STAGE: SYNTHESIZE. Below are anatomies of ${studies.length} model papers. First write them to
${OUTDIR}/anatomies.json. Then synthesize ONE practical template for writing this project's
${SECTION} (its exhibits: ${A.exhibits || 'read the draft to learn them'}). Give:
(1) the move sequence of the section, with the job of each paragraph;
(2) the number-interpretation pattern: sentence shapes, unit of change, percent convention, how
    tables and columns are referenced, how magnitudes are scaled to observed changes, with short
    examples (paper and page);
(3) how other studies are brought in and related to one's own result;
(4) when "therefore" and similar connectives are licensed, and how evidence follows a claim;
(5) the language for dynamic paths and long-horizon imprecision, if the papers have any;
(6) where limits and robustness go, and how much space they get;
(7) register: what these papers never do;
(8) where the papers disagree with each other.
Write it as a checklist a writer can follow sentence by sentence. Save it to ${OUTDIR}/template.md and
return the same markdown. These two files are the only ones you may write.

ANATOMIES:
${JSON.stringify(studies, null, 1)}`, opt({ label: 'synthesize', phase: 'Synthesize', effort: E.synth }))

// ---------------------------------------------------------------- Diagnose
phase('Diagnose')
const diagnosis = await agent(`${BASE}
${COMMENTS}

STAGE: DIAGNOSE the current draft (${DRAFT_FILES.join(', ')}; read the body in full) against the
template below and the author's comments. Context the draft relies on: ${(A.context || []).join(', ') || 'none given'}.
Machine outputs: ${(A.outputs || []).join(', ') || 'none given'}.
Produce: (A) for each comment of the latest round, the defect at root (not just the sentence) and
what the model papers do instead; (B) a paragraph-by-paragraph diagnosis: the paragraph's job,
whether its first sentence states it, whether every sentence serves it, where the logical chain
breaks (name the connective that is not licensed), where the language is not the field's language
(quote the phrase, give the model papers' phrase), where a number has no substantive reading;
(C) the structural verdict: is the current order and set of paragraphs right, or should the section
be re-cut, and how; (D) the section's story in five sentences, as the model papers would tell it,
using only results the project already has.
Save it to ${OUTDIR}/diagnosis.md (the only file you may write) and return the same markdown.

TEMPLATE:
${template}`, opt({ label: 'diagnose', phase: 'Diagnose', effort: E.diagnose || 'high' }))

if (A.outline === false) return { studies, template, diagnosis }

// ---------------------------------------------------------------- Outline
phase('Outline')
const outlinePrompt = `${BASE}
${COMMENTS}

STAGE: OUTLINE. Write a NEW numbered outline for the ${SECTION}: one number per paragraph, each with
its first sentence${ML ? ` (and its ${ML} mirror)` : ''} and its contents in order. A paragraph is full
and meaningful, never two sentences, and holds nothing its first sentence does not cover. Then write
complete sample paragraphs${ML ? ` (with ${ML} mirrors)` : ''} for:
${bullet(SAMPLES)}
Use only facts already in the project's text and outputs (${(A.outputs || []).join(', ') || 'the outputs'});
check every number. Anything not already in the project is NEW CONTENT and is flagged. Respect every
standing rule. A replacement first sentence is never heavier than the approved one it replaces; say
so where you replace one. Put the author's choices in decisions, lettered, recommended first.

DIAGNOSIS:
${diagnosis}

TEMPLATE:
${template}`
const draft = await agent(outlinePrompt, opt({ label: 'outline', phase: 'Outline', schema: OUT, effort: E.outline || 'high' }))
if (!draft) throw new Error(`${NAME}: the outline agent failed`)

// ---------------------------------------------------------------- Verify
phase('Verify')
const payload = JSON.stringify(draft, null, 1)
const checks = await parallel([
  () => agent(`${BASE}
${COMMENTS}

STAGE: VERIFY AS THE AUTHOR, then as the approver. Read the outline and the samples${ML ? ` in ${ML} first, then in the source language` : ''}. You
wrote every comment above and you are tired of the same problems. For every place you would comment
again (abstract, confusing, not the field's language, a connective not licensed, a paragraph whose
body does not serve its first sentence, a number with no source or no meaning, descriptive material
posing as a result, an unsupported claim, a citation whose relation to our result is unclear),
report it with a concrete fix. Judge whether the outline tells one clear story in the right order.

PROPOSAL:
${payload}`, opt({ label: 'verify:author', phase: 'Verify', schema: PROB, effort: E.verify || 'high' })),
  () => agent(`${BASE}

STAGE: VERIFY FACTS. Check every number, claim and citation in the proposal against the outputs
(${(A.outputs || []).join(', ') || 'the project outputs'}), the draft's exhibits, the context files
(${(A.context || []).join(', ') || 'none given'}) and, for cited studies, the papers themselves. Printed
operands must reproduce printed results at the printed precision; each source pointer must point at
an exhibit that shows the number. Report only real problems, with fixes.

PROPOSAL:
${payload}`, opt({ label: 'verify:facts', phase: 'Verify', schema: PROB, effort: E.verify || 'high' })),
  () => agent(`${BASE}
${COMMENTS}

STAGE: VERIFY RULINGS. Check the proposal against the standard files, the standing rulings and the
author's comments, and against the template below: every breach (a second name for one object, a
limitation said twice, a retired wording back, a heavier first sentence not flagged, NEW CONTENT not
flagged, anything the author has refused) and every place it departs from what the model papers do,
with fixes.

TEMPLATE:
${template}

PROPOSAL:
${payload}`, opt({ label: 'verify:rulings', phase: 'Verify', schema: PROB, effort: E.verify || 'high' })),
])
const problems = checks.filter(Boolean).flatMap(c => c.problems)
log(`${problems.length} problems raised by the three checkers`)

// ---------------------------------------------------------------- Finalize
phase('Finalize')
const final = await agent(`${outlinePrompt}

STAGE: FINALIZE. You produced the draft below; three checkers found the problems listed. Fix every
real problem (verify disputed facts yourself) and return the final outline and samples in the same
schema. In what_goes also list each checker problem you did not apply, and why. Then write
${OUTDIR}/outline.json (the final object) and ${OUTDIR}/outline.md (the outline as a numbered list of
first sentences with their contents, then the samples, then the decisions), the only files you may write.

DRAFT:
${payload}

PROBLEMS:
${JSON.stringify(problems, null, 1)}`, opt({ label: 'finalize', phase: 'Finalize', schema: OUT, effort: E.outline || 'high' }))

return { studies, template, diagnosis, draft, problems, final }
