export const meta = {
  name: 'bilingual-mirror',
  description: 'Keep a language mirror in step with its source: build the glossary first from the existing mirrors, translate sections in parallel (or mirror approved source edits as exact pairs), then check terminology, omissions and digit fidelity. Writes drafts into the round folder, never over the live mirror.',
  whenToUse: 'A document has (or needs) a second-language version: a new mirror, a mirror of a restructured source, or the mirror half of a round of approved source edits.',
  phases: [
    { title: 'Glossary', detail: 'term map, file skeleton, sentence patterns, punctuation, from the existing mirrors' },
    { title: 'Scout', detail: 'list the source sections (skipped when sections are given)' },
    { title: 'Translate', detail: 'one translator per section (sections mode) or one editor per file (edits mode)' },
    { title: 'Check', detail: 'per section or file: digits, completeness, meaning, terms; a fixer when needed' },
    { title: 'Assemble', detail: 'one file, the digit gate run on it' },
    { title: 'Verify', detail: 'whole-file checkers: digits and markup, terminology across sections, meaning' },
    { title: 'Reconcile', detail: 'apply the real problems to the draft and rerun the digit gate' },
  ],
}

/*
 * bilingual-mirror: a source document -> its mirror in another language, in step, checked.
 *
 * PURPOSE
 *   The mirror is the same argument, sentence for sentence, in the register the existing mirrors
 *   already use. Parallel translators drift onto different words for one term, so the glossary is
 *   built FIRST from the existing mirrors and every translator works from it. Digits must agree with
 *   the source as a multiset and in order; a number the source spells out stays spelled out; a
 *   reference list with identifiers is copied byte for byte. Sentence alignment catches what a digit
 *   check cannot: a sentence with no digits that was dropped, a first sentence passed over, a
 *   translator's status line left in the body.
 *
 * MODES
 *   "sections": translate the source section by section into a new mirror draft. With oldSource
 *               and oldMirror given, every source sentence unchanged since oldSource reuses its old
 *               mirror sentence word for word, and only new or reworded sentences are translated.
 *   "edits":    mirror a list of approved source edits (already applied to the source) as exact
 *               replacement pairs on the existing mirror, one editor and one verifier per file.
 *
 * ARGS (JSON example, sections mode)
 *   {
 *     "root": "/Users/me/projects/class-size-paper",
 *     "roundDir": "quality_reports/2027-01-20_results_mirror",
 *     "scratch": "<session scratchpad>/bilingual-mirror",
 *     "mode": "sections",
 *     "language": "Chinese",
 *     "source": "paper/results.tex",
 *     "oldSource": "quality_reports/2027-01-20_results_mirror/before/results.tex",
 *     "oldMirror": "paper/results_zh.tex",
 *     "existingMirrors": [["paper/intro.tex", "paper/intro_zh.tex"], ["paper/data.tex", "paper/data_zh.tex"]],
 *     "glossary": "docs/glossary_zh.md",
 *     "sections": [{"id": "s1", "heading": "Results", "paragraphs": 4, "hint": "the number-dense one"}],
 *     "mirrorRules": ["Never use the full-width dash pair.", "Author names, years and journal titles stay in the source language."],
 *     "gatesDir": "scripts/gates",
 *     "out": "quality_reports/2027-01-20_results_mirror/results_zh_draft.tex"
 *   }
 *   Edits mode replaces source/sections with
 *     "files": [{"source": "paper/results.tex", "mirror": "paper/results_zh.tex",
 *                "edits": "quality_reports/2027-01-15_results_comments/edits_applied.json"}]
 *   where each edit is {id, old, new, why?} on the source (old and new as approved).
 *   Required: root, roundDir, scratch, mode, language, and source (sections) or files (edits).
 *
 * OUTPUTS
 *   <roundDir>/glossary.md                       the glossary the translators used
 *   sections mode: <out> (default <roundDir>/mirror_draft.tex), checked and reconciled
 *   edits mode:    <roundDir>/mirror_edits.json  {mirror file: [{id, old, new, note}]} verified pairs
 *   The live mirror is never written; the main thread reads the draft and lands it.
 *   Return value: {glossaryPath, sections | files, verification, reconciled}
 *
 * COST
 *   sections mode: 1 + (1) + up to 3 per section + 1 + 3 + 1. edits mode: 2 + 2 per file
 *   (glossary, an editor and a verifier per file, reconcile).
 */

const A = args || {}
const NAME = 'bilingual-mirror'
const MODE = A.mode || 'sections'
const REQ = ['root', 'roundDir', 'scratch', 'language'].concat(MODE === 'edits' ? ['files'] : ['source'])
const missing = REQ.filter(k => A[k] === undefined || A[k] === null || A[k] === '')
if (missing.length) throw new Error(`${NAME}: missing args: ${missing.join(', ')}. See the header comment for an example.`)
if (!['sections', 'edits'].includes(MODE)) throw new Error(`${NAME}: mode must be "sections" or "edits"`)
if (MODE === 'edits' && (!Array.isArray(A.files) || !A.files.length)) throw new Error(`${NAME}: files must be a non-empty array of {source, mirror, edits}`)

const ROOT = A.root
const RD = A.roundDir
const SCR = A.scratch
const LANG = A.language
const GD = A.gatesDir || 'scripts/gates'
const PAIRS = A.existingMirrors || []
const OUT = A.out || `${RD}/mirror_draft.tex`
const GLOSS_OUT = `${RD}/glossary.md`
const E = A.effort || {}

const bullet = xs => (xs && xs.length ? xs.map(x => `  - ${x}`).join('\n') : '  (none given)')
const opt = o => { const r = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k]; return r }
const zh = /chinese|japanese|korean/i.test(LANG)

const HOUSE = `
PROJECT ROOT: ${ROOT}
READ ONLY. Do not create, edit or delete any file under ${ROOT} except a path this prompt names as
your output. Scratch work goes under ${SCR}/<your label>/; delete it before you return.

WHAT A MIRROR IS HERE. Not a paraphrase and not a literal gloss: the same argument, sentence for
sentence, in the register the existing ${LANG} mirrors already use (short declarative sentences,
the field's professional vocabulary, explicit connectives). A reader with the source open beside
it can follow sentence by sentence. The mirror adds nothing and drops nothing.

MACHINE-CHECKED RULES (getting them wrong fails a gate):
1. DIGITS. Every number the source writes in digits appears in the mirror in digits, in the same
   order (the digit gate compares the sequence: ${GD}/mirror_digit_fidelity.py). A number the source
   spells out in words stays in words. The mirror never adds a digit the source does not have (no
   date or unit format that adds digits).
2. MARKUP. Every LaTeX command, cross-reference, math span, escaped percent and en dash survives
   untouched. No command is invented.
3. REFERENCES. Author names, years, journal titles, DOIs and reference-list entries are copied
   byte for byte from the source.
4. TERMS. The glossary fixes one ${LANG} rendering per term. Never invent a synonym, even where one
   reads better.${zh ? '\n5. No full-width em-dash pair in the mirror; use a full stop, a colon or a comma.' : ''}
Project-specific mirror rules:
${bullet(A.mirrorRules)}`

const PARAS = {
  type: 'object',
  properties: {
    paragraphs: { type: 'array', items: { type: 'object', properties: {
      para_id: { type: 'string', description: 'P1..Pn in printed order' },
      text: { type: 'string', description: 'the whole mirror paragraph, LaTeX, one line' },
      reused_share: { type: 'string', description: 'roughly what share of sentences was copied unchanged from the old mirror; "0" when there is none' },
    }, required: ['para_id', 'text', 'reused_share'] } },
    heading: { type: 'string', description: 'the mirror section heading line, e.g. \\section{...}; empty for an unheaded opening' },
  },
  required: ['paragraphs', 'heading'],
}
const PROBLEMS = {
  type: 'object',
  properties: { problems: { type: 'array', items: { type: 'object', properties: {
    where: { type: 'string', description: 'para_id or section id' },
    kind: { type: 'string', enum: ['digits', 'omission', 'addition', 'meaning', 'terms', 'markup', 'banned', 'register', 'alignment'] },
    problem: { type: 'string', description: 'quote the offending text' }, fix: { type: 'string' },
  }, required: ['where', 'kind', 'problem', 'fix'] } }, alignment: { type: 'string', description: 'source vs mirror paragraph and sentence counts' } },
  required: ['problems', 'alignment'],
}
const SECTIONS = {
  type: 'object',
  properties: { sections: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, heading: { type: 'string' }, paragraphs: { type: 'integer' }, hint: { type: 'string' },
  }, required: ['id', 'heading', 'paragraphs', 'hint'] } } },
  required: ['sections'],
}
const PAIRS_OUT = {
  type: 'object',
  properties: {
    edits: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, old: { type: 'string' }, new: { type: 'string' }, note: { type: 'string' } }, required: ['id', 'old', 'new', 'note'] } },
    unchanged: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'reason'] } },
  },
  required: ['edits', 'unchanged'],
}
const PAIR_VERDICTS = {
  type: 'object',
  properties: {
    verdicts: { type: 'array', items: { type: 'object', properties: { idx: { type: 'integer' }, ok: { type: 'boolean' }, corrected_new: { type: 'string' }, reason: { type: 'string' } }, required: ['idx', 'ok', 'corrected_new', 'reason'] } },
    unchanged_disputes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, old: { type: 'string' }, new: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'old', 'new', 'reason'] } },
  },
  required: ['verdicts', 'unchanged_disputes'],
}
const ASSEMBLED = {
  type: 'object',
  properties: { path: { type: 'string' }, digit_gate: { type: 'string' }, paragraphs: { type: 'string' } },
  required: ['path', 'digit_gate', 'paragraphs'],
}

// ---------------------------------------------------------------- Glossary (first, before any translator starts)
phase('Glossary')
const pairList = PAIRS.map(p => `  - ${p[0]}  <->  ${p[1]}`).join('\n') || '  (none: derive terms from the old mirror, if any)'
const glossary = await agent(`${HOUSE}

STAGE: GLOSSARY. Build the glossary the translators will work from, BEFORE any translation. Read
the existing mirror pairs side by side:
${pairList}
${A.glossary ? `Start from the existing glossary ${A.glossary} and extend it.` : ''}
${A.oldMirror ? `Also read the old mirror of this document: ${A.oldMirror}.` : ''}
Extract:
(a) THE TERM MAP: every term of art the documents use, source to ${LANG}, as the existing mirrors
    actually render it, each with file and line so a translator can check. Where two renderings
    exist, say which one the most recent mirror uses and flag the conflict.
(b) THE FILE SKELETON: preamble, title block, heading style, reference-block markup and the end of
    the document, copied verbatim from one mirror.
(c) SENTENCE PATTERNS: five or six recurring constructions with one example each (introducing a
    study, reporting a number, stating a limitation, a pointer to another part).
(d) PUNCTUATION actually used in the mirror files: brackets, citations inside punctuation, ranges, percentages.
(e) BANNED in the mirror: retired terms (search the rulings and the files for one-object-one-name
    decisions) and forbidden punctuation.
Write it as markdown to ${GLOSS_OUT} (the only file you may write) and return the same markdown.
Make it complete and short enough to be pasted into every translator prompt.`, opt({ label: 'glossary', phase: 'Glossary', effort: E.glossary }))
if (!glossary) throw new Error(`${NAME}: the glossary agent failed; nothing was translated`)

// ---------------------------------------------------------------- edits mode
if (MODE === 'edits') {
  phase('Translate')
  const out = await pipeline(A.files,
    f => agent(`${HOUSE}

GLOSSARY:
${glossary}

STAGE: MIRROR APPROVED SOURCE EDITS. Source ${f.source} (the edits below are already applied to it);
mirror ${f.mirror}. Edits: ${typeof f.edits === 'string' ? `read ${f.edits}` : JSON.stringify(f.edits)}
For each edit, find the mirror sentence that mirrors the source OLD text and write the mirror
replacement that mirrors the source NEW text. old must be copied verbatim from the mirror file, on
a non-comment line, and occur exactly once; keep each pair as small as possible while unique. One
source edit may need several pairs. If the mirror already says what the new source says (a
grammar-only source fix: an article, a comma, a spelling), make NO pair and list it under unchanged
with the reason. Digits follow the source change exactly. A reference-list line equals the source
line byte for byte.`, opt({ label: `edit:${f.mirror.split('/').pop()}`, phase: 'Translate', schema: PAIRS_OUT, effort: E.translate || 'high' })),
    (ed, f) => ed ? agent(`${HOUSE}

GLOSSARY:
${glossary}

STAGE: VERIFY THE MIRROR PAIRS for ${f.mirror} (source ${f.source}).
Source edits: ${typeof f.edits === 'string' ? `read ${f.edits}` : JSON.stringify(f.edits)}
Proposed pairs:
${ed.edits.map((e, k) => `[${k}] ${e.id}\n  OLD: ${e.old}\n  NEW: ${e.new}\n  NOTE: ${e.note}`).join('\n\n')}
Left unchanged:
${ed.unchanged.map(u => `${u.id}: ${u.reason}`).join('\n') || '(none)'}
For each pair ok = true only if (1) OLD occurs verbatim exactly once in the mirror on a non-comment
line (count it), (2) NEW says what the source NEW says, no more and no less, in natural prose and
the glossary's terms, (3) digits follow the source change, (4) no banned term or punctuation, (5) a
reference line equals the source line byte for byte. If right in intent but flawed, ok = false
with corrected_new. For each item left unchanged, check that the mirror really already says what
the new source says; if not, give the pair under unchanged_disputes. Default to ok = false when
uncertain, and say why.`, opt({ label: `check:${f.mirror.split('/').pop()}`, phase: 'Check', schema: PAIR_VERDICTS, effort: E.verify || 'high' }))
      .then(v => ({ mirror: f.mirror, source: f.source, pairs: ed.edits, unchanged: ed.unchanged, verdicts: v })) : null)
  const files = out.filter(Boolean)
  phase('Reconcile')
  const reconciled = await agent(`${HOUSE}

STAGE: RECONCILE THE PAIRS. For each mirror file below, take every pair with ok = true, replace
each ok = false pair by its corrected_new, and add the unchanged_disputes as pairs. Then apply all
pairs to a COPY of each mirror under ${SCR}/reconcile/ (old exactly once; write after each
replacement) and run python3 ${GD}/mirror_digit_fidelity.py --pair <source> <copy> from ${ROOT}.
Write ${RD}/mirror_edits.json as {"<mirror path>": [{id, old, new, note}]} (the only file you may
write under ${ROOT}). Return the digit gate output per file and any pair that failed to apply.

RESULTS:
${JSON.stringify(files, null, 1)}`, opt({ label: 'reconcile', phase: 'Reconcile', effort: E.verify }))
  return { glossaryPath: GLOSS_OUT, files, reconciled }
}

// ---------------------------------------------------------------- sections mode
let sections = A.sections
if (!sections) {
  phase('Scout')
  const sc = await agent(`${HOUSE}

STAGE: SCOUT. List the sections of ${A.source} in printed order: an unheaded opening block (if any)
as id "s0", then every top-level section with its heading and its paragraph count (a paragraph is
a block separated by a blank line in the body; floats and displayed equations are not paragraphs).
Give each a one-line hint: what is delicate about it (number-dense, defines terms, carries
approved text, holds equations).`, opt({ label: 'scout', phase: 'Scout', schema: SECTIONS }))
  sections = sc ? sc.sections : []
}
if (!sections.length) throw new Error(`${NAME}: no sections to translate`)
log(`${sections.length} sections: ${sections.map(s => `${s.id} (${s.paragraphs})`).join(', ')}`)

const reuse = A.oldSource && A.oldMirror
  ? `REUSE FIRST. The old source ${A.oldSource} is the version the old mirror ${A.oldMirror} matches.
For each source sentence, if the old source has it unchanged, copy its old mirror sentence WORD FOR
WORD. Only new or reworded sentences get new ${LANG}. Paragraphs may have moved between sections:
find each paragraph's old mirror by its content, wherever it sat.`
  : 'There is no old mirror to reuse: translate in full.'

phase('Translate')
const translated = await pipeline(sections,
  s => agent(`${HOUSE}

GLOSSARY:
${glossary}

STAGE: TRANSLATE ONE SECTION. Source ${A.source}, section "${s.heading}" (id ${s.id}),
${s.paragraphs} paragraph(s). ${s.hint || ''}
${reuse}
Read the source section in full from the file. Return one entry per paragraph, P1..P${s.paragraphs},
in printed order, each the whole ${LANG} paragraph on one line, plus the ${LANG} heading line.
Before you return, check your own work: every source digit present in order, no extra digit, no
banned term, every LaTeX command intact.`, opt({ label: `translate:${s.id}`, phase: 'Translate', schema: PARAS, effort: E.translate })),
  (res, s) => res ? agent(`${HOUSE}

GLOSSARY:
${glossary}

STAGE: CHECK ONE SECTION (default: assume a defect is present). Source ${A.source}, section
"${s.heading}". Mirror produced:
${JSON.stringify(res, null, 1)}
Paragraph by paragraph: (1) DIGITS: list the digit sequence of the source paragraph and of the
mirror paragraph; report every mismatch either way, including digits the mirror adds;
(2) COMPLETENESS and ALIGNMENT: every source sentence has a mirror counterpart (count sentences per
paragraph; a merge or split is reported); no study, number, author or finding missing; nothing
added; no translator's note left in the text; (3) MEANING: negations, "not significant", hedges,
the direction of a comparison, which object a result is about, a causal reading the source does
not have; (4) TERMS: the glossary rendering, one rendering per term within the section;
(5) BANNED terms, punctuation, damaged markup, a translated author name. Quote the offending text.`,
    opt({ label: `check:${s.id}`, phase: 'Check', schema: PROBLEMS, effort: E.verify || 'high' }))
    .then(chk => {
      const probs = (chk && chk.problems) || []
      if (!probs.length) return { id: s.id, heading: res.heading, paragraphs: res.paragraphs, problems: 0 }
      return agent(`${HOUSE}

GLOSSARY:
${glossary}

STAGE: FIX ONE SECTION ("${s.heading}"). Apply every problem below that is real; if one rests on a
misreading of the source, leave the text and say so in the reused_share field of that paragraph
("kept: <reason>"). Return every paragraph, same para_ids, same order.

CURRENT:
${JSON.stringify(res, null, 1)}

PROBLEMS:
${JSON.stringify(probs, null, 1)}`, opt({ label: `fix:${s.id}`, phase: 'Check', schema: PARAS, effort: E.translate }))
        .then(fx => ({ id: s.id, heading: (fx || res).heading, paragraphs: (fx || res).paragraphs, problems: probs.length }))
    }) : null)
const done = translated.filter(Boolean)
const lost = sections.filter(s => !done.find(d => d.id === s.id))
if (lost.length) log(`WARNING: sections not translated: ${lost.map(s => s.id).join(', ')}. The draft will be incomplete; rerun with resume.`)

phase('Assemble')
const assembled = await agent(`${HOUSE}

GLOSSARY (its section (b) is the file skeleton):
${glossary}

STAGE: ASSEMBLE. Write ${OUT} (the only file you may write): the skeleton from the glossary, then
the sections below in this order, each heading line followed by its paragraphs separated by blank
lines, then the reference block copied byte for byte from ${A.source}. Then run, from ${ROOT}:
  python3 ${GD}/mirror_digit_fidelity.py --pair ${A.source} ${OUT}
and report its output, and the paragraph count per section against the source.
${lost.length ? `Sections missing from this run (leave a LaTeX comment line where each belongs, nothing else): ${lost.map(s => s.id).join(', ')}` : ''}

SECTIONS:
${JSON.stringify(done.map(d => ({ id: d.id, heading: d.heading, paragraphs: d.paragraphs.map(p => p.text) })), null, 1)}`,
  opt({ label: 'assemble', phase: 'Assemble', schema: ASSEMBLED }))

phase('Verify')
const draftRef = `the assembled mirror draft at ${OUT}`
const verification = (await parallel([
  () => agent(`${HOUSE}

STAGE: VERIFY DIGITS AND MARKUP, the last line before the gate. Compare ${A.source} with ${draftRef},
paragraph by paragraph. Report: (1) every number in one and not the other, with its sentence, and
every number the source spells out that the mirror turned into digits (or the reverse); (2) every
LaTeX command, reference, escaped percent or en dash lost, damaged or invented, and any unbalanced
brace; (3) banned punctuation and terms; (4) paragraph count and order per section. Be mechanical
and complete.`, opt({ label: 'verify:digits', phase: 'Verify', schema: PROBLEMS, effort: E.verify || 'high' })),
  () => agent(`${HOUSE}

GLOSSARY:
${glossary}

STAGE: VERIFY TERMINOLOGY ACROSS SECTIONS. The translators worked in parallel and could not see
each other. In ${draftRef}, report: (1) every term rendered differently in different sections, with
each rendering and where; (2) every departure from the glossary; (3) every ${LANG} term the existing
mirrors never use where they have an established one (check the files, not memory); (4) anything
that reads as translation rather than as the field's prose: a calque, an over-long sentence, a
construction the other mirrors do not use. Give the correction for each.`, opt({ label: 'verify:terms', phase: 'Verify', schema: PROBLEMS, effort: E.verify || 'high' })),
  () => agent(`${HOUSE}

STAGE: VERIFY MEANING (default: assume a mistranslation is present). Read ${A.source} section by
section against ${draftRef}. Find every place the mirror says something the source does not, or
fails to say something it does: a result attributed to the wrong study, a scope widened or
narrowed, a sign or significance changed, two named objects swapped, a hedge dropped or added, a
causal reading introduced, the direction of a comparison reversed, a first sentence passed over
while its paragraph was updated. Report the source sentence, the mirror sentence and what changed.`,
    opt({ label: 'verify:meaning', phase: 'Verify', schema: PROBLEMS, effort: E.verify || 'high' })),
])).filter(Boolean)
const allProblems = verification.flatMap(v => v.problems)
log(`whole-file verification: ${allProblems.length} problems`)

phase('Reconcile')
const reconciled = allProblems.length ? await agent(`${HOUSE}

GLOSSARY:
${glossary}

STAGE: RECONCILE. Apply to ${OUT} (the only file you may write) every problem below that is real;
check each against ${A.source} first and leave the text where a problem rests on a misreading. Write
the file after each change. Then rerun python3 ${GD}/mirror_digit_fidelity.py --pair ${A.source} ${OUT}
from ${ROOT}. Return one line per problem (applied or not, and why) and the gate output.

PROBLEMS:
${JSON.stringify(allProblems, null, 1)}`, opt({ label: 'reconcile', phase: 'Reconcile', effort: E.verify })) : 'no problems to reconcile'

return { glossaryPath: GLOSS_OUT, sections: done.map(d => ({ id: d.id, fixed: d.problems })), assembled, verification, reconciled }
