# Writing Standard

The prose standard for any paper, thesis chapter, report or note written in this workflow.

**Where it comes from.** Every rule below was earned on a real manuscript: a supervisor's rulings on
drafts he could not parse, the author's own annotations on printed copies, two journal articles named
as models, and the defects that review rounds kept finding. The rules are stated here without that
manuscript's content. Each keeps its reason ("Why") and its use ("How") where the source gave one.
The source field was economics; "the field's own vocabulary" means economics there and whatever the
discipline is here.

**How to use it.**
- Hand this file to any agent that drafts, edits or reviews prose. It is the one file to read first.
- The agent's role: an experienced researcher and journal editor in the field.
- An audit finding names the rule it breaks by code (K3, S7, P2 ...), quotes the sentence, says why
  it fails the rule's test, and proposes a replacement built only from meanings already on the page.
  Anything the replacement adds that is not on the page is listed separately as NEW CONTENT.
- When one part of a manuscript is approved by its reader, that part becomes the model. Keep it as the
  canonical example and calibrate every other part against it.
- Companion files: `docs/writing/EMPIRICAL_RESULTS_WRITING.md` (how estimates and coefficients are
  reported), `docs/WORKING_METHOD.md` (rounds, approval, gates). Their one-page forms are
  `.claude/rules/empirical-results-writing.md` and `.claude/rules/working-rules.md`. The one-page
  form of this file is `.claude/rules/writing-standard.md`.

**All examples below are invented.** They illustrate a rule; they report no real study.

---

## 0. The four master rules

1. **The spoken answer replaces the sentence** (S1). Ask "what do I mean to say?", say the answer
   aloud, and write that. Most rules below are consequences of this one.
2. **「说不清宁愿不说」 ("if it cannot be said clearly, do not say it").** Clarity outranks
   completeness. Everything should aim at being concise and easy to understand, and every sentence
   that stays carries its support.
3. **「简单易懂 ≠ 大白话」 ("simple and easy is not colloquial").** Plain means short, direct, linked
   sentences in the field's own vocabulary. It never means replacing standard terms with homemade
   paraphrase.
4. **「论文不是手册」 ("a paper is not a manual").** The reader is someone interpreting the results,
   not someone redoing the work. Project history, tooling and provenance stay out of the prose.

---

## 1. The king (the topic sentence) and the outline of kings

Every paragraph opens with a king: one sentence that states what the paragraph establishes. This is
the rule readers repeat most often and the rule agents break most often.

**K1. A king names its topic and then states that topic's state.** It is a claim, not a label.
- ✗ "In addition to the length of the program, ..." (a label: it announces a topic)
- ✗ "This section turns to teacher experience." (an announcer)
- ✗ "Several studies examine training programs." (a topic with no state)
- ✓ "Training take-up is potentially endogenous in the earnings regressions: workers who expect a
  raise are more likely to enroll."
- ✓ "A large literature examines how training affects earnings; the evidence is mixed (cite)."
- Why: a reader who reads only first lines must get the argument, not a table of contents.
- How: split the king at its main verb. The subject half names a thing the reader can point to; the
  predicate half says what the paragraph establishes about it, and the body then supports it.
- Note on two formulations. "Name the object of study, then its state" and "a claim, not a topic
  label" agree once "claim" means the topic plus its state; a king that does both passes. Do not use
  the second form to rewrite a reader's own opening sentence as a defect.

**K2. The acceptance test is spoken.** Say the king aloud. If the listener has anything left to ask
("what do you mean?", "of what?", "which one?"), the king fails. Run this test before any mechanical
count, and let it overrule a count.

**K3. One claim, one subject, one main verb.**
- No ", and " joining two claims. Split it.
- No "that" or "this" pointing back at the king's own first half.
- No negation where the sentence can say what the thing is.
- ✗ "Rainfall is measured at the station, and that limits the yield estimates."
- ✓ "Rainfall is measured at the nearest weather station." (Then, in the body: the station sits up
  to 30 km from the field, so measured rainfall misstates what the crop received.)
- Why: the compound kings found in one audit carried a claim plus its justification, and the second
  clause usually restated a mechanism, rebuttal or caveat the body already gave. Where it did not,
  the clause moved into the body.

**K4. Length cap: no king over 26 words.** A king is as short as its point allows. It may be dense
(a mechanism, an inline equation, a citation), but density never licenses padding. Approved kings in
the model chapters ran about nine to ten words.
- How: if the reader must carry a clause to reach the point, cut to the point. "The comparison of
  enrolled and eligible workers identifies the earnings gain under one assumption about who enrolls:"
  becomes "The estimates require one assumption about who enrolls:" (the reader reaches the colon in
  half the words).

**K5. The king is the paragraph's literal first sentence, and it appears verbatim in the outline
file.** A paragraph break occurs only where a new king starts.

**K6. A replacement king is never longer or heavier than the king it replaces.** Before proposing a
new king, compare it with the current one on word count, number of clauses and lists. If it is
heavier, it is wrong.
- Example (invented, mirroring a real refusal): an approved king "Smaller classes go with higher
  scores in every grade." is to be replaced by "Smaller classes go with higher scores when schools of
  the same size, funding, region and intake are compared." The reader refuses it. The fix that
  stands: keep the old king and add plain body sentences saying what the section is for.
- Why: when a reader asks what a section is for, the answer belongs in the body under the approved
  king. Purpose, mechanism, scope detail and lists of characteristics go in sentences two and three.

**K7. Scope a king with one word, never with no scope.** A king with no scope is false of every
column it does not cover. Where the claim holds only in one specification, one word carries it
("In the **baseline** specification, smaller classes go with higher scores."). A clause is too
heavy; nothing is false.

**K8. Banned king forms.**
- An announcer in king position ("This section turns to ...", "Two points stand out."), even
  when it is not a factual error.
- A king that is only a count or a transition.
- A king that presupposes a question never posed ("have not produced a single answer" before anyone
  asked). Name the object of study, then its state (K1).
- A king that opens on "therefore" for an argument the paragraph never made.
- A king that restates earlier kings and then announces a further topic.
- A king that withholds its verdict (it says what a design "does to" a result instead of what the
  result is).
- Informal labels in place of formal register: not "the second strand", but the strand's content.

**K9. Promote the claim the paragraph earns.** When the claim sits in the paragraph's last sentence,
move it to the front and delete its restatement at the end. Every sentence beneath it then becomes
evidence for it.

**K10. The kings, read alone, tell a connected story.** Each king picks up something the previous
one introduced and adds one new thing ("once there was a king / the king had a horse").
- Tests for each king: one point only; real succession, not restatement; enough substance for its
  own paragraph (a hinge sentence gets merged into a neighbour); as short as the point allows.
- A king may not use a term that nothing earlier, king or body, has introduced (F8). When the kings
  are read alone, a term introduced only in an earlier paragraph's body is worth a check, not an
  automatic defect.

### The outline-of-kings method

1. Write the spine first: the kings of every paragraph, in order, before any body text.
2. Read the spine alone as a page. It must read as an argument. If it reads as a list of topics, the
   kings are labels (K1). Cramming several ideas into one topic sentence is the classic failure; an
   early outline was rejected twice for it.
3. Keep the spine in an outline file and gate it: every king in the outline appears verbatim as the
   first sentence of its paragraph, and vice versa.
4. **Send the outline with the draft.** A reader who asks for "an outline where the first line is
   the topic" wants to read the first lines as a document. In the source project the reader asked
   four times before a machine-verified outline was finally sent to him. The printed outline is one
   page, kings only, with no version or date line.
5. In review drafts, highlight the kings.
6. A king change is mirrored the same day in the outline file and in any translated mirror.

### Worked examples (invented)

| Before | After | Why |
|---|---|---|
| "Workers decide whether to enroll, and this matters for the estimates." | "Training take-up is potentially endogenous in the earnings regressions: workers who expect a raise are more likely to enroll." | The first joins two claims, and "this" points back at its own first half. The second names the problem in the field's own words, then says concretely what it is. |
| "This ratio is the standard measure of openness ..." | "Exports divided by output is the standard measure of openness ..." | "This ratio" took the wrong antecedent. Name the thing. |
| "The literature has not produced a single answer." | "A large literature examines how training affects earnings; the evidence is mixed (cite)." | Name the object of study, then its state. Do not presuppose a question nobody asked. |

---

## 2. Sentences: S1 to S11 (the reader-first rules)

These are a supervisor's rules, read off his comments on drafts he found "complex". None of the
sentences he quoted was long and every one passed the word gates. "Complex" meant three things:
terms he could not attach to a thing, grammar that hid who does what, and paragraphs whose point he
could not find. A sentence that needs the reader to already hold a definition is a defect for him,
even when it is technically exact.

**S1. The spoken answer replaces the sentence.** The master rule. The reader's instruction: "pretend
I am asking you what you mean to say, and rewrite all sentences like this with your answer."
- The subject is a thing the reader can point to (this study, the agency, the survey, the worker,
  the firm). Active voice wherever possible.
- A file, record, chapter, appendix or category takes only a verb it literally performs: reports,
  contains, identifies, divides into. Never carries, places, reads, repeats, pools, declines to name.
- "That/this + abstract noun" standing for the previous sentence is written out as a because-clause.
- A decision the author took is stated as one ("so this study drops it").
- Test: ask "who does what to what?"; write the one-breath answer; if it names an agent or action the
  sentence hid, the answer replaces the sentence.
- ✗ "The catch-all code absorbs the jobs the survey declines to classify."
- ✓ "One occupation code in the survey file means 'not elsewhere classified'. It is not an
  occupation, so this study drops it."

**S2. One object, one name, defined before use, never coined.** See section 6 for the full rule.
- Test: cover the noun phrase. Can a reader holding only the preceding text say what it denotes?
- Why: in the source project a unit of observation carried five names in two paragraphs, and the
  reader asked which one it was. A coinage that was the reader's own phrase with one word swapped
  went unrecognised by him.

**S3. The first line of every paragraph is the topic, then its state.** One topic per paragraph. Two
consecutive sentences about something else are a new paragraph. The first lines are read alone as a
page and sent to the reader (section 1).

**S4. Order: what is used, what it is, why it is here.** Role before construction.
- A paragraph introducing a data object says in its first two sentences what is used (by name), what
  it is, and what it does for the research question.
- A variable's first sentence names its role in a named regression. Construction follows as verbs in
  the order performed, one step per sentence, not as a stack of modifiers on the head noun.
- A fact about the data with no consequence for the estimation is cut. A limitation lives in the
  limitations passage, not in the sample definition.
- Test: underline the noun that names what is used and the clause that says what it is for; both
  must sit in sentences one and two. For any other sentence append "so ..." and complete it; no
  consequence, cut.

**S5. Length is not the test.** A long sentence that reads in one pass beats a short one the reader
must re-enter.
- A "because / that is / so" clause that says what a thing is, how it is measured or why it is used
  is never deleted to satisfy a word cap, the banned-word list or say-once. Split a long sentence at
  a clause boundary and keep every clause.
- A short sentence that answers none of those three questions fails however short it is.
- A word-count flag is not a finding. Two weak mechanical signals do not add up to one real finding
  when both measure the wrong thing. The reader once vetoed a "fix" of a long sentence: the short
  version pointed back ("the two changes") where the original named both objects and read in one
  pass, and it led with a stronger reading than the evidence licensed.
- A body-sentence cap of about 40 words is a place to look, not a rule.

**S6. Define every domain term where it is used, in words the reader already has.** A data source's
unit, a measurement convention (nominal or current units, survey weights), a named event or program,
a named index: each gets one plain clause at first use. Standard methods vocabulary is named, not
explained (section 5, R3, and the note under it). If the reader has refused a gloss, it stays out;
do not propose it again.

**S7. No regression vocabulary before the equation exists.** Dependent variable, explanatory
variable, control, coefficient, error term, instrument, first stage, fixed effect, panel: none of
these appears until the regression it belongs to has been displayed or named. Before that point say
"the outcome that this study models", "the test score". After that point use the standard term,
always the same one.
- ✗ "The dependent variable is the test score." (in the data section, before any equation)
- ✓ "The outcome that this study models is the test score."

**S8. Every term of a displayed equation is glossed, in a fixed order, in the sentences after it.**
See section 8.

**S9. One claim per sentence.** Two claims joined by "and" become two sentences. Merge two sentences
when one will do, in particular when the second only completes the first.

**S10. Point at parts by name, never by number.** "the data section", "the empirical model below",
"the conclusion". Never "Section X.Y" or "Chapter N" in running prose. See section 7.

**S11. No pointing back.** A sentence that makes the reader return to an earlier sentence to resolve
"the two changes", "the former", "this asymmetry" has failed, however short it is. Name the referent
in place, even when it sits one sentence away.

### More sentence rules (from the close-reading rounds)

- **S12. Deictics are named.** "These two", "this kind", "the two X": name the referent. Ambiguous
  pronouns are bugs. A footnote's "they" slides easily to a different group; name every subject.
- **S13. Every noun that names a change says what changed and in which direction.** Not "the
  deterioration" or "permanent differences" but "the fall in yields" and "a permanent gap in
  earnings". Not "of what?" left for the reader.
- **S14. A bound needs its other end.** "At most 5 percent" invites "and at least?" State both ends
  or say what the lower end is.
- **S15. Literal time spans.** Write the period ("between 2000 and 2020"), never "a generation".
- **S16. Premise plus conclusion with the step between them missing is the commonest form of "I do
  not understand".** When a reader calls a sentence unreadable and both its ends look correct, look
  for the missing middle before rewording either end.
  - ✗ "The survey changed its income question in 2010, so later incomes are not comparable."
  - ✓ "The survey changed its income question in 2010. The new question asks for take-home pay and
    the old one asked for gross pay, so incomes before and after 2010 are not comparable."
- **S17. Raise, then resolve.** A sentence that raises an alternative reading or an objection is
  followed by the sentence that answers it, or that names where it is answered. A question left
  hanging is the reader's complaint ("so how is this solved?").
- **S18. Two outcomes in one result need a word of explanation.** "Either insignificant or
  significantly positive" leaves the reader asking why there are two answers. Say which applies where.
- **S19. Universal quantifiers are verified member by member.** "Every column", "throughout", "never",
  "all three": check each member before writing it, or drop the quantifier.
- **S20. No literary or evasive phrasing.** "Bear the loss" is not economics. Say what moved, for whom,
  in which direction. Be direct: go straight to the point.
- **S21. Past tense for completed findings** of other studies ("enrollment was 4 to 6 percent
  higher").
- **S22. A comparison sets like against like.** ✗ "In contrast to the yields of irrigated farms,
  studies have also examined ..." (a thing set against an activity). ✓ "In contrast to the studies
  above, which examine the yields of irrigated farms, ..."
- **S23. Name the operation exactly.** Say what was done to what, in the terms the paper defines
  ("the index is split into the two shares it is built from"), not a loose gloss that names a
  different operation.

### Humanize: break the regularity

Machine-written prose reads too even. Introduce irregularity on purpose.
1. Vary paragraph length. Some paragraphs are long, some are two or three sentences.
2. Vary sentence length. A three-word sentence after a long one is good.
3. Vary sentence structure. Do not open sentence after sentence with "Because / Since / While /
   Although", and do not stack relative clauses. Use plain declaratives; move the main clause.
4. No em dashes.
5. Vary lists. Do not always give exactly three items or always "such as X, Y, and Z". Use two, or
   four, or one concrete case, or restructure so there is no list.
6. No symmetric twin sentences ("The first term is X: ... The second term is Y: ..."). Break the
   parallel or merge.
7. In a literature passage, do not open sentence after sentence on "The study". One rebuild cut most
   such openings by naming the authors instead.
8. Vary the paragraph's arc, not only its sentences. Sentence-level variation is not enough: what reads
   as machine-written is paragraph shape, such as every paragraph running king, two citations,
   synthesis; aphoristic one-line endings (P8); a repeated ", not X" cadence; citations all in the
   narrative form. Do not tune sentence length toward a target either: length is set by what the
   sentence carries, and variation is a by-product (S5).

---

## 3. Paragraphs: P1 to P15

**P1. An operation named in the body must be sayable in the words the reader already has.** If it
cannot be, it moves to the note where its number lives. ✗ "Residuals are winsorized at the 1st and
99th percentiles of the within-firm distribution after singleton trimming." in the body of a results
paragraph.

**P2. Every sentence serves the paragraph's king.** A sentence that justifies a design choice, or
adds a fact the king does not cover, goes to a note, to its own paragraph, or out.
- Test: state the paragraph's topic in three words; ask of each sentence "is this about that?"
- A true and needed sentence about something else goes to a footnote, a table note, or the paragraph
  whose topic it is. A sentence about something else that is not needed is cut.
- Why: the reader's own words were "I cannot see the meaning of this sentence here; it seems unrelated
  to our king sentence" and "so? what? what is the point here?". If a reader has to reconstruct why a
  sentence is present, it fails.
- The king must also be fully supported by what the body reports.

**P3. A reported fact the reader stops at is explained, or has its consequence stated, or is cut.**
No number is printed without a reason to read it.

**P4. Every restriction carries its reason where it is imposed.**
- ✗ "The sample keeps firms with at least ten employees."
- ✓ "The sample keeps firms with at least ten employees, because the survey samples smaller firms
  only in some years."

**P5. What is held constant is stated beside what varies.** If every regression carries unit fixed
effects, say so where the regressions are introduced, not by contrast later. Announcing that one
specification is run "with and without the controls" tells the reader by contrast that the others
always carry them; make sure that is true. (In a results sentence the verb is "controlling for"; see
the empirical-results standard.)

**P6. What is displayed as an equation is what the design needs.** Every estimate the text reports
corresponds to a display.

**P7. No repetition inside a paragraph, no announcers, no echo of the king at the paragraph's end.**
If the king already says it, the body does not say it again. An enumeration followed at once by its
members ("Two restrictions define the sample: ...") is not an announcer; a sentence that only
announces what comes next ("Two explanations have been tested") is. Name the things or cut the
sentence.

**P8. No aphoristic closing sentence.** ✗ "What these programs share is the goal, not the method."

**P9. Measure the paragraph before rewriting another sentence.** When a passage keeps failing the same
reader, run the diagnostic first: word count, sentence count, and a one-line label for each sentence's
job. More than about six jobs means split, not rewrite.
- Why: a paragraph in the source project failed the same reader three times. Each patch added a
  sentence; the defect was one paragraph doing far too many jobs.

**P10. Twice failed, delete.** A passage that fails the same reader twice in the same way is deleted,
not rewritten a third time, provided its facts already live elsewhere (a table, a note, an appendix).

**P11. Every section states its takeaway and reconciles its own apparent contradictions.** A
contradiction the author sees, a referee will see. Resolve it in place, in one sentence.

**P12. Consecutive pieces of evidence are linked logically, not listed.** Each block of evidence is
introduced by a connective sentence that names what changed between the studies or results: "Some
studies examine A and find X; others examine B and find Y." A category change gets its own bridge
sentence naming both categories ("In addition to laboratory experiments, field studies provide
similar evidence."). This form is a bridge inside a body; in king position it is a label (K1).

**P13. A side caveat does not sit inside an argument chain.** If a paragraph argues A, then B, then
the conclusion, a caveat about something else placed between B and the conclusion breaks the chain.
Move it before the chain starts, attach it where its topic is, or shorten it to one sentence.

**P14. Nothing sits between an argument and its "therefore".** A table pointer or an aside placed
between the evidence and the conclusion it supports breaks the inference. Swap the sentences.

**P15. Mechanism sentences are self-contained.** When a sentence invokes an identity or rule defined
elsewhere, display it inline or state the mechanism in words. Never report only the conclusions of a
calculation the reader cannot see.

---

## 4. Flow and structure

**F1. General to specific, one new object per sentence, parent before child.**

**F2. Each paragraph's opening picks up a noun from the previous paragraph.** A bridge paragraph
argues only from what is already on the table, never from objects that arrive later.

**F3. No previews.** The first paragraph develops only its own topic. The story is carried by the
kings in sequence, never by a summary paragraph that touches everything. (An earlier "first paragraph
touches everything" rule was wrong; the reader rejected it.)

**F4. Full paragraphs, not stubs.** Compress the sentences; develop the topic fully. A paragraph of two
or three lines that carries a whole topic is a stub.

**F5. Specialization is an explicit step** ("In our setting, ..."). Motivation for a later analytical
move belongs in the paragraph where the move happens.

**F6. Descriptives go shallow to deep.** A descriptive section opens with levels (the table, the means)
and then moves to variation and its analytic meaning. Never open with the analytic point.

**F7. Two deletion rules.**
1. Say each idea once. A second phrasing of the same point is repetition, not elaboration. Delete
   it, and name the concept directly instead of circling it. The common case is a body sentence
   restating its own dense king; delete the echo, keep the king, repair any orphaned antecedent.
2. Cut anything whose relevance is not clear where it sits: usually a forward reference, or a contrast
   against a concept not yet introduced.

**F8. No term appears before it is introduced.** This holds for kings too: a king may not use a term
that only a later sentence introduces.

**F9. Fix the logic before the wording.** Writing is part of the reasoning. If an argument is
unclear, the defect is usually in the argument. Clarity over elegance; no suspense; state the
research question and the main finding early. Focus on mechanism, evidence, identification and
interpretation.

**F10. The order of an argument, wherever it applies:** the setting (the economic environment), the
mechanism, why theory leaves the answer open, the empirical specification, the identification
strategy, the results, the interpretation.

**F11. No pre-announced answers.** A descriptive or data section does not announce which result the
estimates will deliver. Any reading it gives must agree with the results downstream; a section in the
source project pre-announced a verdict that its own later tables contradicted.

**F12. Numbered section headings partition the king chain.** Four to six numbered sections per
chapter, each a stretch of the king chain. The supervisor expected them and drafted his own.

---

## 5. Register

**R1. Professional register of the field, in short, logically linked sentences.** Every standard term
is kept; every metaphor is killed; one new object per sentence; a transition sentence wherever the
paragraph turns (for example from the magnitude to the specification walk).
- Why: one round replaced standard terms (significant, confidence set, first stage) with invented
  plain paraphrase ("intervals that stay valid when instruments are weak", "no lever"). The author
  rejected the whole register: no paper is written like this.

**R2. Plain is not colloquial (「简单易懂 ≠ 大白话」).** Simple means short direct sentences with explicit
connectives, never de-jargonising standard terms. A project coinage is not a standard term; replacing
it with its plain meaning is required (S2, N2).

**R3. Standard methods vocabulary is named, never explained.** Year fixed effects, unit fixed effects,
clustering, weighting, OLS, two-stage least squares, a local projection, a named test statistic: use
the term at its standard meaning. Explaining it insults an expert reader. Moving the explanation into a
table note does not make it allowed.
- An estimation exercise used in the body is called by its literature name, with a pointer to where
  its equation is displayed.
- Note on two formulations. An earlier supervisor rule, read off his model article, asked for a
  one-plain-clause gloss of each term of art at first use in a data section, methods terms included
  (fixed effects, a leave-one-out construction). The later consolidated standard names standard
  methods terms without explanation. Which holds depends on the reader; settle it per reader in the
  project's CLAUDE.md.

**R4. Euphemism is the worst register defect.** Avoiding a standard term by paraphrase ("holding the
common calendar shock fixed" for "with year fixed effects") leaves the reader with no name to look
up. In the source project this was judged the single worst defect the manuscript ever had. Use the
term and, where the reader needs it, define it once at first use.

**R5. Project-specific terms enter by their operation.** A step the field has no standard name for is
introduced as what it does ("sales converted to constant dollars with a price index"); the label
comes after, or never. A term that resists a one-clause introduction is replaced by its plain
operation or cut.

**R6. Literal verbs for non-agents** (S1). Files, tables, chapters and categories do only what they
literally do. Attribution verbs that hide a calculation ("carries", "drives") are retired; write the
exact relation ("is associated with"; "implies" for a product). How shares of an outcome's change are
reported is set in the empirical-results standard.

**R7. Never call your own estimates an effect or an impact, not even a "reduced-form effect".** In
economics "effect" reads as causal. Write "association", or the exact equilibrium term your framework
defines. Never make the regressor the subject of a causal verb (raises, lowers, drives). Fixed effects
and year effects stay: they are technical terms. Other studies' findings are reported in their own
terms. Do not stack disavowals either: a correct name ("association") needs no "rather than a causal
effect" after it.
- Where outcomes are equilibrium outcomes, a coefficient is a net equilibrium association, never a
  structural parameter (not "the productivity effect of X").
- Generalisation, not the source's wording: the rule rests on its reason, that "effect" reads as
  causal. A project whose design does identify a causal effect (a randomized experiment, say) decides
  its own term in its CLAUDE.md. The empirical-results standard and its one-line rule state the same
  scope.

**R8. One name for significance.** "Significant" and "not significant", at a stated level, everywhere.
Not "separated from zero" in one place and "significant" in another.

**R9. Explicit connectives, used only when earned.** Consecutive sentences are linked (In addition to,
For instance, By contrast, So). A connective states a logical relation; use "therefore" or "so" only
after the sentences that establish it. A "therefore" that promises something the paper does not do is
a false claim, not a style slip.

### No manual register (「论文不是手册」)

A paper is not a manual. Prose that documents the project does not belong in any section of the body.
- Out: script names, file paths, file extensions, folder names, code formatting, dataset column names
  (write the variable's symbol or its name in words), catalogue numbers in running prose.
- Out: narration of our own workflow ("This note documents how ...", "the predictor was set aside after
  examining ..."), operational narration (which file variable was read, fallbacks, suppression
  mechanics), assurance sentences ("verified", "reproduces exactly", "no number is typed by hand"),
  data-access routes, documentation of abandoned work, procedural self-reference ("this is reported
  again below").
- Out: section-level front matter whose sentence is a table of contents ("Purpose: this note documents
  ..., states ..., and reports ..."). Open on the claim.
- Out: "should be stated wherever ..." instructions to the reader.
- Out: revision history (「论文写现在是什么，不写我们怎么改的」, "the paper says what it is now, not how
  we changed it"). No "no longer", "corrected", "used before this correction", and no supersession
  notes in table notes. The history lives in the source's header comments and the round records.
- The test: does a reader need this sentence to read the results? If it exists so that someone could
  redo the work, it goes: delete it, move it to the replication package or the reference list, or
  compress it to a definition (what the variable is, not what was done to it).
- Two kinds of sentence stay because they serve the reader: a contribution claim ("this adjustment is
  our own") and a disclosure the reader needs to judge a choice ("the classification is our own and
  follows no official scheme").
- The rule holds in every language version of the text and in table notes (a note is not a landfill).

---

## 6. Names: one object, one name

**N1. One object, one name, across text, tables, figure legends and notes.** A variable, a sample, a
specification, a unit of observation each has exactly one name in the whole document. The gloss rides
once in parentheses at first use; a shorthand is declared once ("hereafter X"). Figures and tables are
regenerated from their scripts so their labels match; a stale label is a defect.

**N2. No coinages.** A term is standard in the literature, the reader's own, or defined by an "is"
clause in the same or the preceding sentence. A compound the reader cannot expand from its parts is
replaced by the sentence it abbreviates.
- Watch for near-synonyms that drift in: "size" for a variable already named, a third word for the
  unit of observation, a homemade label for a group of areas.
- A coinage written for an imagined reader (a simulated committee, an agent's guess at a referee) is
  the usual source. Two phrases the supervisor could not parse had been coined that way.

**N3. Declare the unit once.** "The unit of observation is the district; a district here means X." Then
"district" everywhere, and every other word for it is retired.

**N4. Retire a name everywhere at once.** When a name changes, sweep every file, table generator and
mirror in the same round, and bar the old name with a check.

**N5. An index is not the thing it measures.** A concentration or evenness index that stays flat does
not mean the underlying shares stayed flat; it means their measured concentration did. Write the
measure's claim, not the world's. Do not call a measure that mixes two components a measure of one of
them.

**N6. A derived measure states what it cannot detect,** once, where its small movement carries an
argument. Example: a Herfindahl index is symmetric in the shares, so sales moving from firm A to firm
B at the same spread leave it unchanged.

**N7. Separate the behavioural claim from the accounting claim.** "Y moves with A, not with B" says B
has no relationship with Y. If the data say only that B barely changed, write that: B contributed
little because it moved little, not because its coefficient is small.

**N8. One self-reference.** Pick "we" or "this study" and keep it, in examples and adapted phrases
too. The source project chose its own self-reference over its model article's "we" and adapted even
the supervisor's phrase to it: his "the outcome that we model" was written with the project's
self-reference in place of "we" (S7 uses "this study"). A model article's voice is learned for its
style and organization; its content, variables and literature are not copied.

---

## 7. Pointers

**PT1. By name, never by number.** "the data section", "the empirical model below", "the conclusion",
"the appendix on sensitivity". Gate it: no "Section N", "Chapter N" in running prose. Pick one name per
part and use it everywhere, in every language version.

**PT2. A cross-part pointer is one short sentence.** Detail lives at the destination (say once).
Brevity never overrides S1: a compressed pointer the reader cannot parse fails, however short it is.
The spoken-answer rule superseded an earlier pointer-sentence compression.

**PT3. When a mechanism already has a correct home, point to it rather than paraphrase it.** A
paraphrase drifts; in the source project a false explanation survived many rounds because one section
re-explained what another already said correctly.

**PT4. A pointer promises only what its target holds.** Check the target before writing the pointer.
After a deletion, ask what would dangle: which pointers elsewhere cite the deleted text.

---

## 8. Equations and symbols

**E1. Mechanism first, equation second, identification third.** Explain why X relates to Y in words
before any display. No equation without economic intuition. Introduce the objects verbally before the
display.

**E2. Gloss every term after the display, in a fixed order** (the order a supervisor's own published
article uses):
1. the dependent variable: its symbol, what it is, how it is measured;
2. each index and what it runs over, with the counts;
3. the regressor of interest and its coefficient, and what the coefficient measures;
4. the control vector, its symbol, what it contains, and the coefficient vector on it;
5. each fixed effect and what it absorbs;
6. the error term and what it represents ("all factors not in the regression").

Use the symbol in the sentence that explains it: "The dependent variable, $y_{it}$, is ...".
Test: list every symbol in the equation; each must appear in an explaining sentence after it.

**E3. Then a separate paragraph on what is in the control vector:** the variable of interest first,
then each control with the theory or study it comes from and its expected sign, ending with a table of
definitions, descriptive statistics and expected signs, referenced by one sentence. Where no cited
source reports a sign, do not sign it; mark it ±.

**E4. Every symbol is defined at first appearance.** Re-audit after any reordering. State
normalizations explicitly ("with the output price normalized to one").

**E5. All display equations are numbered.** Simple definitional equations go inline. A multi-step
derivation goes to an appendix; the text states the result in one sentence with a pointer. (The
trigger: "the math got really complicated and hard to understand.")

**E6. A labelled display carries its own mapping.** If a display already labels its terms (braces
naming each channel), do not restate the mapping in prose; point to the display and move to the
argument. Two adjacent symbols that share a definition are defined together.

**E7. Adopt a framework by name in one cited sentence.** Disclaimers about the model are consolidated
once, at the end of the section, followed by an explicit handoff sentence to the empirics.

**E8. Unsigned coefficients: benchmark, counter-channel, explicit conclusion.** Close with the plain
statement that theory does not predict the sign. Do not add tri-state "if positive / if negative / if
insignificant, read as ..." contracts unless the reader asks for them; a supervisor deleted both
instances in the source project.

**E9. Theory, specification and identification are kept distinct.** No causal claim without
identification support. Never claim fixed effects solve endogeneity. Name the remaining
identification concern. Do not claim the design separately identifies mechanism channels unless it
does.

**E10. No design-contradicting explanation.** Never explain an instrumented or otherwise corrected
estimate by the very bias the design removes. Name what the design does not remove.

---

## 9. Citations and literature paragraphs

**C1. Cite at the first claim or adoption.** The same source recurs for different claims; repeated
citations across paragraphs are correct practice.

**C2. One citation per claim.** When a sentence lists several claims or channels, each item carries its
own source in place. Never one stacked citation group at the end of a list. A source vouches for exactly
the item it sits next to. A claim with no source gets a verified new reference or is rewritten, never a
borrowed neighbour's citation.

**C3. Verify against the paper, not the abstract.** Check the exact section, table or equation before
citing. Report the object the source actually reports, in its terms. When the source does not report
the object you need, say so; do not substitute a proxy. A working paper and its published version can
differ on every number; cite the version you read the numbers from.

**C4. "Widely used" and "standard" are claims about the literature** and carry several citations: "It
is widely used in this literature (A; B; C)."

**C5. Every cited result names its setting:** the data, the place, the period ("Using Danish register
data, Author A (2015) ..."). This is checkable by machine: every sentence with an in-text citation
carries a place or data term.

**C6. Literature paragraphs: one study, one or two sentences.** Time, place, conclusion. "Author A
tried X and found Y." Estimation detail, intermediate magnitudes and specification order come out
unless the number is the finding. Apply "does it really matter?" to every clause.

**C7. The subject is the study or the author.** No "He" or "They" for authors. No agentless result
sentences: ✗ "A 10 percent rise lowers output by 2 percent." ✓ "The study finds that a 10 percent
rise lowers output by 2 percent." Vary the openings by naming the authors (Humanize, item 7).

**C8. Order beneath a king is an argument, not a list.** Every study under a king exists to serve that
one claim (P2, P12). A literature body is mostly reports of studies: in one rebuild, guarding that at
least half of body sentences cite a study brought a review that had drifted to mostly commentary back
to its approved shape. Mechanism, rationale, rebuttal and pointers are the minority.

**C9. Cut methodological apparatus that does not change the conclusion** ("a generalized Leontief
production function": is it necessary?).

**C10. A reference paragraph's target shape:** about eight sentences, about 135 words, longest sentence
about 32 words (a supervisor's own rewritten paragraph). A shape to aim at, not a cap (S5).

**C11. A contribution claim is no broader than what survives verification.** If a source turns out to
do part of what you claimed nobody did, narrow the claim, and sweep every place it appears.

**C12. Narrative and parenthetical citations are both correct.** "Author (Year) shows ..." when the
author is the subject; "(Author Year)" for an aside. A proofreader that flags the parenthetical form
as a missing-parenthesis error is raising a false alarm; reject it.

**C13. Citations and the reference list correspond both ways, in every document that circulates on
its own.** Every in-text citation has an entry and every entry is cited. A part sent out alone carries
a complete list of its own.
- How: after any cut, check which entries lost their last citation and remove them; after any
  restored or added sentence, check that its citations have entries. It can be checked by machine
  (`/validate-bib`).
- Why: in the source project a study cited in the body was missing from the reference list of a part
  that circulated as a standalone file, and an entry stood while the prose cited it nowhere.

**C14. After any compression, rerun the source-fidelity pass, and keep a literature library.**
Compression grinds off qualifiers (for example "slightly", "on average", "for one subgroup") and drops
references together with the sentences already verified against them.
- How: after a compression round, check every cited sentence against its source again. Keep a
  literature library: each reference grouped under the king of the current draft it serves, with one
  verified paste-ready sentence, the question it asks and the finding it reports, a tag for what it
  was checked against (abstract, full text), and a marker for whether the draft cites it now. When a
  cut study comes back, take its sentence from the library instead of writing a new one.
- Title-validate every abstract a search fetches against the reference entry. A title-search fallback
  returned the wrong paper for several references; a string-similarity check between the entry's
  title and the returned title caught every one.
- Why: in the source project compression passes dropped references again and again, each drop
  discarding sentences already checked against the source, and a fidelity pass after one compression
  round found several qualifiers ground off.

---

## 10. Evidence and numbers in prose

How coefficients are read, converted and ranked is in `docs/writing/EMPIRICAL_RESULTS_WRITING.md`.
The prose-level rules:

**V1. Every empirical assertion carries an anchor:** a number with its source, or a citation. Use
evidence, numbers and examples whenever possible. Conceptual-sounding claims ("no dominance", "an
accumulated stock") are grounded too. Translate a statistical result into its meaning in the field;
never report significance alone.

**V2. Every number in the text is generated by a script and checked.** Nothing is typed by hand from a
table. A number whose generating output is missing is not verified, however long it has been in print.

**V3. A share shows the two numbers it comes from,** and its denominator is the one the claim names.

**V4. State the estimator and the scope.** A number from a different specification is a different
number. When several statistics answer the same question with different conservatism, say which one
the sentence quotes.

**V5. A sentence explaining why something happens is an empirical claim** and needs backing exactly like
a number. Measure the mechanism before writing it.

**V6. Read the whole exhibit.** Every column and panel of a table the text cites is accounted for in the
text, or deliberately left to the note.

**V7. A comparison stays in one unit.** A magnitude in different units never sits beside a same-units
comparison. Every benchmark names its period and units.

**V8. Verify before answering.** When a reader asks "what supports this?", check the sources, the code
and the data before replying. When the reader gives a reason for softening a result, check the reason
too, and say plainly which premise does not hold.

**V9. Where your statistics will differ from official published figures** (a different sample
definition, pooling, current units), a table note says so before a reader asks.

**V10. Each table answers one question.** The text introduces a table by that question and its main
finding (the empirical-results standard has the move between tables).

---

## 11. Placement: body, note, footnote, appendix

For results, the empirical-results standard applies the same rules with results examples (its
sections on limitations, the appendix, and table notes and footnotes).

**L1. The body carries findings.** Tests, diagnostics and sensitivity checks go to the appendix. The
appendix is its own document, not a section of the chapter.

**L2. A table note says how to read the table:** the estimator, what is instrumented, the controls,
the standard errors, what the stars follow. Order: what to read, then what any alternative row is, then
why it differs. A note says what to read, not how it was typeset.

**L3. A note reads the printed cells and never contradicts them.** "The estimates in these columns are
not interpreted" under printed estimates, never "there is no estimate to report". A cell the table
prints is not read again in words. When a sentence moves into a note, re-read it under the table it
now sits beneath.

**L4. A note is not a landfill.** Moving a sentence into a note does not make it allowed. An argument
goes to the appendix with a one-clause pointer; a standard term's definition is deleted, not relocated.

**L5. A footnote answers the one question its sentence raises,** in the order a reader asks, one fact
per short sentence. Use the maximum instead of a list of yearly figures. No worked examples.
- How: before adding a sentence to a note or footnote, ask whether a reader of that table needs it to
  read the table. If not, it goes to the appendix or out.
- Guards that worked: table notes at most about 150 words, footnotes at most about 40.
- Why: notes grew by one justified sentence per round until the reader called them "too long, too
  mixed, too messy" (「太长太杂太乱」).

**L6. Derivations go to an appendix** with a one-sentence result and pointer in the text (E5).

**L7. A body paragraph states an appendix result in at most one clause, with one pointer.**

**L8. A paragraph is a finding:** sign, significance, magnitude, then the theory or the literature.

**L9. Inference machinery stays out of body prose.** Clustering, bootstrap and test statistics are
named in table notes and the appendix, not in the body's sentences (the empirical-results standard
has the full rule).

**L10. Each appendix check opens with the problem it answers.** A diagnostic or robustness item starts
with the concern a reader would raise (the confounding story), then what was done, then what came out.

---

## 12. Limitations and defensive prose

**D1. The finding comes first; its ceiling follows its evidence.** A results paragraph opens on the
result, not on what the result is not. The ceiling sentence comes after its evidence. No results
paragraph ends on a hedge about its own finding.
- ✗ "The estimates do not establish a causal link, but districts that cut class size more saw larger
  score gains."
- ✓ "Districts that cut class size more saw larger score gains." (Evidence follows; the ceiling comes
  after it, once.)

**D2. A limitation is said once.** In full in its one home, the body paragraph that reads the relevant
table, and once in the closing paragraph. Never in a preamble or section opener; the preamble states
findings. Restating a limitation across separate documents (introduction and conclusion) is genre and
allowed; the same limitation twice inside one part is not.
- Precedence: an earlier rule let a limitation recur elsewhere as a clause plus a pointer with no
  digits. The spoken-answer rule (S1) superseded that compression, and this rule leaves no "elsewhere"
  inside one part. Brevity never overrides S1: a clause-plus-pointer the reader cannot parse fails.
- Do not pack a definition inside a result sentence.
- Keep the honest limitation on exactly those two sentences, the home and the close, and never delete
  both.
- Why: a limitation repeated in five body places read to the author as the paper weakening its own
  story; his position is that caveats are shortcomings for the limits passage and the body tells the
  story.

**D3. An affirmative result is never followed, in the same breath, by the list of specifications where
it weakens.** Finding first; conditions in their own place.

**D4. A limitation is a property of the design, never a verdict on your own estimate.**
- ✓ "The two policies were adopted in the same years, so the design does not separate them."
- ✗ "The class-size estimates take no side: positive in one grade, insignificant in another, negative
  in a third."
- Do not write that an estimate "fails"; state what the design does or does not separate.

**D5. A null is a strong claim.** "X has no relationship with Y" needs the same evidence as a positive
claim. "Identified", "fragile" and "small" are three different statements; say which one holds.

**D6. No defensive prose.** State the core judgment first, then its reason and evidence. Do not
pre-empt objections a reader has not raised. Keep one centre per paragraph and put conditions only
where they are needed. Allow the text to make clear, specific, testable judgments.
- The test, for every concession, clarification and qualifier: does it answer a real logical problem
  or an imagined misunderstanding? If deleting it harms neither the facts nor the argument, delete it.
- Phrases to check: "taken at face value", "does not conflict with", "X, not Y", "still", "remains",
  "only", "is not evidence of", "is never required to agree", "rather than a causal effect".
- Two exceptions. A qualifier the author or the reader raised is real and stays. A sentence that is
  the evidence for a king is not a hedge; deleting it is a regression.
- Why: hedges defending against readers who had not objected had buried the findings.

---

## 13. Genre moves

**Introduction.** Measure the draft against named model articles, read in full. Why: a genre recited
from memory gives vague advice; a move list makes a missing move nameable. Two model journal articles,
read in full, run the same eleven moves:
1. the phenomenon, with magnitudes and citations;
2. why the object matters;
3. the mechanism or treatment introduced;
4. the literature disagrees, stated outright;
5. both signs on the table; theory does not settle it;
6. the gap, the aim and the research questions (posed explicitly, numbered if there are several);
7. what was done: sample, period, measure, the model adopted by name;
8. the main finding, stated in the introduction;
9. the identification threat named, as a mechanism (both models also sign its bias; see the refused
   moves below);
10. a contribution paragraph;
11. the roadmap, as the last paragraph, never its own section (a thesis navigated by its table of
    contents may keep a heading).

Pose the research questions in the introduction. A conclusion that opens "This study asked two
questions" needs those questions posed earlier, in those terms.

**Order of sections.** Both orders are legitimate: data and stylized facts before the model, or the
framework first. Pick one and record the choice.

**Theory or framework section.** Open inside a named standard model and build forward ("Following the
model of A (year), we consider ..."): environment first (agents, production, equilibrium), then the
object of interest inside the model, then comparative statics and channels, then measurement
implications derived from the model, then the handoff to the empirics. Organizing the section around
the measurement story with the model demoted to an appendix reads as an introduction, not a framework.
Keep the formal apparatus in the main text; it is the section's content.

**Data section.** "The data for this study are drawn from ...", then for each data object in turn:
where it comes from, what it is, how it is measured, why it is used, one object per paragraph (S4),
with the source's own definition where the source gives one.

**Conclusion.** Two legitimate shapes.
- Short (about four paragraphs): what was examined and that both signs were possible; what was shown
  and what it survived; what the findings are consistent with given the identification; a closing
  remark naming what the design leaves open, the candidate channels, and the data the next design
  needs.
- Long (about eight): adds a restated method chain, policy implications and a numbered limitations
  paragraph.

**Moves deliberately refused** (each with its reason; do not "fix" them in a later round):
- **No policy implications from a descriptive association.** Policy drawn from an association breaks
  the claim ceiling the paper sets.
- **No signed bias direction your own table contradicts.** If the paper's OLS and IV estimates do not
  order the way a signed bias claim predicts, name the threat as a mechanism and leave it unsigned.
- **No enumerated "First / Second / Third" contribution paragraph when an audit or the reader has
  asked for a narrow contribution claim.** State the contribution once, as narrowly as the verified
  evidence allows (C11).

---

## 14. Banned words and phrases

**Gated in every language of the draft:** however, thus, moreover, furthermore, can, could, may, might;
the em dash (and the full-width dash in Chinese).
- No reason is recorded with the original list. The replacements the source project made show the
  intent: state what is, with the plain verb or the field's standard term. The source rewrote "could
  be endogenous" as "potentially endogenous"; in the same way (an invented case) "neither survey can
  check the other" becomes "neither survey checks the other".
- A later diagnosis of a failed draft named "connectives asserting logic" as a defect. Make the link
  with a sentence, or with a plain connective that states the relation (R9).
- A supervisor's own model paragraph used "however", and for a time the project allowed it; the later
  consolidated standard banned it again. Settle this per project in the project's CLAUDE.md.
- Why for the em dash: it is a frequent machine-prose tell.
- A deliberate exception is recorded by name; the gate is not loosened.
- Scan every part of the file, including any text before the first heading. In the source project a
  scanner skipped everything before the first section command, and banned words sat in chapter
  preambles for many rounds.

**Avoid (style list):** filler words, needless adjectives and adverbs, and these words: just, very,
really, literally, actually, certainly, probably, basically, maybe, hence, delve, embark, enlightening,
esteemed, shed light, craft, crafting, imagine, realm, game-changer, unlock, discover, skyrocket,
abyss, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal,
intricate, elucidate, harness, exciting, groundbreaking, cutting-edge, remarkable, glimpse into,
navigating, landscape, stark, testament, in summary, in conclusion, boost, opened up, powerful,
inquiries, ever-evolving. Also no hashtags, no markdown in prose, no disclaimers.

**Retired phrasings:** "a generation" (S15); "carries" as an attribution verb (R6); "separated from
zero" beside "significant" (R8); a homemade paraphrase of a standard term (R4).

**Claims to avoid:** "This proves that ...", "It is obvious that ...", "The estimate is causal because
fixed effects are included", "We control for all confounders", "The coefficient captures productivity"
(or any structural parameter the design does not identify).

**Forms to prefer:** "The results suggest ...", "The evidence is consistent with ...", "The coefficient
captures a net equilibrium association ..." (or the exact term your framework defines), "The remaining
identification concern is ...", "The estimate should be interpreted cautiously because ..." (only when
the reason names a real logical problem; D6).

---

## 15. Bilingual drafts

Only where a prose rule depends on the second language:
- The banned words and the em dash are checked in both languages.
- Translation adds hedges the source does not have (in Chinese: 仍, 其实, 只, 就是, 正是如此, 事先).
  Sweep the mirror for them under D6.
- One name per object holds in each language. Build the glossary first, from the existing mirrors,
  before translating; parallel translators stay on one vocabulary only that way.
- A mirror is checked sentence by sentence. A check on numbers does not see a missing sentence, a
  missing paragraph or a stale king.
- Pointers by name hold in both languages.

---

## 16. Applying the standard to a draft

The round itself is in `docs/WORKING_METHOD.md` and `.claude/rules/working-rules.md`: intake; a
reader's comment is a sample of a defect class, not a work list (「不要只是说啥改啥 要把我说的提取成标准」,
"do not just fix what I point at; turn what I say into a standard"); propose, approve, apply; only
the author's meaning, with NEW CONTENT flagged; incorporation against delegated finalization; ripples
listed, not applied. What is specific to prose:

- **An "overall" comment is a document-wide requirement** (plainer language, more citations).
- **If a rule applies, it applies everywhere it applies,** including parts the round was not about.
  When something is left alone, the report gives a reason in one line the author can overrule
  ("reviewed and kept" is not a reason).
- **Sweep the sentences this round added.** A new sentence contradicts a paragraph eight sentences
  away, or carries a quantifier true of the case it was written for and false of its neighbours.
- **Write in the medium the reader edits.** The source project moved from Word to LaTeX when the
  supervisor asked for it. Send self-contained source files the reader can compile and edit (no
  external bibliography file), with the compiled file.
- **Proofread the file the reader opens** (the compiled PDF or the Word file, not only the source):
  typos, doubled words, articles, agreement, punctuation, hyphenation and capitalisation,
  dangling references, figure and table numbering, note wording. If the reader reports typos, ask for
  one example of what counted.

---

## 17. Before you say a draft is done

- [ ] Every paragraph opens with a king that names its topic and states it, at most 26 words, no ", and ".
- [ ] No replacement king is longer or heavier than the king it replaced.
- [ ] The outline file matches the kings exactly; the first lines, read alone, are an argument.
- [ ] The spoken test passes on every king: the listener has nothing left to ask.
- [ ] Every body sentence serves its king; no echo, no announcer, no aphoristic close.
- [ ] One name per object across text, tables, figures and notes; no coinages.
- [ ] No regression vocabulary before its equation; every displayed term glossed in order.
- [ ] No pointing back; every deictic named; every change says what changed and which way.
- [ ] No manual register; no section or chapter numbers as pointers.
- [ ] No estimate of ours called an effect or an impact (R7).
- [ ] Every number generated and checked; every share shows its two numbers and its denominator.
- [ ] Each limitation said once, at its home and at the close; findings before ceilings.
- [ ] Every qualifier passes the defensive-prose test.
- [ ] Notes say how to read the table; footnotes answer one question.
- [ ] No banned word, no em dash, in any language of the draft, preambles included.
- [ ] Citations: one per claim, setting named, verified against the source; every citation has an
      entry and every entry is cited.
- [ ] Each table answers one question.
- [ ] Sentences this round added have been swept; quantifiers checked member by member.
- [ ] Any language mirror is in step.
- [ ] The file the reader opens has been proofread.
- [ ] Ripples outside scope are listed, not applied; nothing committed unless the author said so.
- [ ] Gates, self-tests and the build: see the done-checklist in `docs/WORKING_METHOD.md`
      (section 13).
