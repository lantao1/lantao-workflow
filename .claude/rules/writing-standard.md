---
paths:
  - "paper/**"
  - "manuscript/**"
  - "drafts/**"
---

# Writing Standard (one-line rules)

Applies to all manuscript prose. Codes match `docs/writing/WRITING_STANDARD.md`, which has the reasons
and invented examples. This file is the one home for the rules both standards share;
`.claude/rules/empirical-results-writing.md` loads on the same paths and adds the rules for reporting
estimates. Both load on the manuscript folders named above: a project whose manuscript lives elsewhere
adds that folder to the `paths:` of both files. Slides (`Slides/`, `Quarto/`, `Preambles/`, TikZ
snippets) follow the slide rules, not this standard.

## Master rules
- The spoken answer replaces the sentence: say aloud what you mean, write that.
- 「说不清宁愿不说」: if it cannot be said clearly, cut it; every sentence kept carries its support.
- 「简单易懂 ≠ 大白话」: plain means short linked sentences in the field's terms, never homemade paraphrase.
- 「论文不是手册」: a paper is not a manual; no project history, tooling or provenance in the prose.

## Kings (topic sentences)
- K1 First sentence names the topic, then its state: a claim, never a label or an announcer.
- K2 Spoken test first: said aloud, the listener has nothing left to ask; it overrules any count.
- K3 One claim, one subject, one main verb; no ", and "; no "this/that" pointing at its own first half.
- K4 At most 26 words; dense is fine, padded is not. K5 Literal first sentence, verbatim in the outline.
- K6 A replacement king is never longer or heavier than the one it replaces; purpose goes in the body.
- K7 A claim that holds in one specification takes a one-word scope in its king ("In the baseline ...");
  no scope is false of the other columns, a clause is too heavy.
- K8 No count-only, "therefore"-without-argument, presupposing, verdict-withholding or informal kings.
- K9 Promote the earned claim from the last sentence to the first. K10 Kings alone tell a connected story.
- Write the spine of kings first; send the one-page kings-only outline with the draft.

## Sentences
- S1 Subject is a thing the reader can point to; files and chapters take only literal verbs.
- S2 One object, one name, defined before use, never coined.
- S3 One topic per paragraph; two sentences on something else start a new paragraph.
- S4 What is used, what it is, why it is here, in sentences one and two; role before construction.
- S5 Length is not the test; never cut a because-clause to meet a cap; a word-count flag is not a finding.
- S6 Define each domain term in one plain clause at first use, unless the reader refused that gloss.
- S7 No regression vocabulary before its equation exists ("the outcome that this study models").
- S9 One claim per sentence; merge two when one will do. S10 Point at parts by name, never by number.
- S11/S12 No pointing back; name every deictic and subject. S16 True ends, missing middle: add the step.
- S13 A change noun says what changed and which way. S14 Both ends of a bound. S15 Literal time spans.
- S17 Raise, then resolve. S18 Explain two outcomes in one result. S19 Verify quantifiers member by member.
- S20 No literary phrasing. S21 Past tense for others' findings. S22 Like with like. S23 Exact operations.
- Humanize: vary paragraph and sentence length and structure; no twin sentences; vary list length;
  vary the paragraph's arc (not every paragraph king, two citations, synthesis); no length targets.

## Paragraphs and flow
- P1 An operation named in the body is sayable in the reader's words, or it moves to the note.
- P2 Every sentence serves the king; off-topic but needed goes to a note or its own paragraph.
- P3 A fact the reader stops at is explained or cut. P4 Every restriction carries its reason in place.
- P5 What is held constant is stated beside what varies. P6 Display what the design needs.
- P7 No repetition, no announcers, no echo of the king. P8 No aphoristic closing sentence.
- P9 A failing passage: measure the paragraph's jobs first. P10 Twice failed: delete if facts live elsewhere.
- P11 A section states its takeaway, resolves its own contradictions. P12 Link evidence by what changed.
- P13 No side caveat inside an argument chain. P14 Nothing between an argument and its "therefore".
- P15 Mechanism sentences are self-contained; never only the conclusion of an unseen calculation.
- F1-F5 General to specific; pick up a noun from the previous paragraph; no previews; no stubs.
- F6 Levels before variation. F7 Say each idea once. F8 No term before its introduction. F9 Logic first.
- F10 Setting, mechanism, ambiguity, specification, identification, results, interpretation.
- F11 Do not pre-announce answers. F12 Four to six numbered sections partition the kings.

## Register and names
- R1 Field's standard terms in short linked sentences; every metaphor is a defect.
- R3 Standard methods terms (fixed effects, clustering, two-stage least squares, a named test) are named,
  never explained, not even in a table note. Whether a reader gets a one-clause gloss of a term of art
  is settled per reader in CLAUDE.md (the note under R3).
- R4 Euphemism is the worst defect. R5 Project-specific steps enter by their operation.
- R6 No verbs hiding a calculation ("carries"). R9 Connectives only when earned, after their premise.
- No manual register: no script, file, column or catalogue names, workflow narration or assurances;
  no revision history ("no longer", "corrected"): the text says what the work is now.
- N1-N4 One name per object everywhere; no coinages; declare the unit once; retire a name everywhere.
- N5 An index is not the thing it measures. N6 A derived measure states what it cannot detect.
- N7 Separate the behavioural claim from the accounting claim. N8 One self-reference, examples included.
- PT1-PT4 Pointers by name, one short sentence, to the correct home, promising only what it holds;
  brevity never overrides S1.

## Equations, citations, evidence
- E1 Mechanism, then equation, then identification. E2 Gloss every term after a display, in fixed order.
- E3 Control-vector paragraph with sources and expected signs; unsigned (±) where no source signs it.
- E4 Define symbols at first use. E5 Number displays; derivations to appendix. E6 No restated mappings.
- E7 Adopt a framework by name in one cited sentence; model disclaimers once, then hand off.
- E8 Unsigned coefficient: benchmark, counter-channel, "theory does not predict the sign". No tri-states.
- E9 Keep theory, specification and identification apart. E10 No explanation by a bias the design removes.
- C1-C2 Cite at first use; one citation per claim, in place. C3 Verify against the paper itself.
- C4 "Widely used" needs several citations. C5 Name each setting. C6-C7 One study, one or two sentences.
- C8 Studies under a king argue, not list. C11 Claim no more novelty than verified. C12 Both cite forms ok.
- C13 Citations and reference list match both ways in every standalone document (`/validate-bib`).
- C14 After any compression, rerun the source-fidelity pass; restore cut studies from a literature library
  (one verified sentence each); title-validate every fetched abstract.
- V1 Every assertion anchored; use evidence, numbers and examples. V5 A mechanism sentence is a claim.
- V2 Every number in the text is generated by a script and checked; one whose output is missing is unverified.
- V3 A share shows the two numbers it comes from, and its denominator is the one the claim names.
- V4 State the estimator and the scope; when several statistics answer one question, say which one is quoted.
- V8 Verify before answering "what supports this?"; check a reason offered for softening a result too.
- V6 Read the whole exhibit. V7 One unit per comparison. V9 Say where figures differ from official ones.
- V10 Each table answers one question.

## Placement, notes, limitations, defensive prose
- L1 The body carries findings; tests, diagnostics and sensitivity checks go to the appendix, its own document.
- L2 A table note says how to read the table: estimator, what is instrumented, controls, standard errors,
  what the stars follow. Order: what to read, what any other row is, why it differs.
- L3 A note reads the printed cells and never contradicts them; a cell the table prints is not read again in words.
- L4 A note is not a landfill: an argument goes to the appendix with a one-clause pointer; a standard term's
  definition is deleted, not relocated.
- L5 A footnote answers the one question its sentence raises, one fact per short sentence. Guards that
  worked: table notes at most about 150 words, footnotes at most about 40.
- L6 Derivations to appendix. L7 Appendix result: one clause, one pointer. L10 A check opens on its problem.
- L8 A paragraph is a finding: sign, significance, magnitude, then the theory or the literature.
- L9 Inference machinery (clustering, bootstrap, test statistics) stays out of body prose.
- D1 The finding comes first; its ceiling follows its evidence; no results paragraph ends on a hedge about it.
- D2 A limitation is said once inside a part: in full in its home paragraph and once at the close, never in a
  preamble. Across separate parts (introduction, conclusion) restating it is genre.
- D3 No weaker-specification list beside a result. D4 A limit is a design property, not a verdict.
- D5 A null is a strong claim. D6 No defensive prose: a qualifier must answer a real logical problem.

## Stated in empirical-results-writing.md (hold for all prose; one home)
- R7 never "effect" or "impact" for own estimates; R8 one name for significance (four phrases).

## Genre and words
- Introduction runs the eleven moves; research questions posed there; roadmap is the last paragraph.
- Refused: policy from an association; a bias sign your table contradicts; a forced contribution list.
- Banned: however, thus, moreover, furthermore, can, could, may, might, the em dash; scan every part.
- Avoid filler and the style list (delve, pivotal, landscape, utilize ...); no hashtags or disclaimers.

## Process
- Rounds, approval, NEW CONTENT and ripples: `.claude/rules/working-rules.md`.
- Prose only: sweep the sentences this round added; proofread the file the reader opens.

Full standard, reasons, examples and the done-checklist: `docs/writing/WRITING_STANDARD.md`.
