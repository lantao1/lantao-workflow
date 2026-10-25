---
paths:
  - "paper/**"
  - "manuscript/**"
  - "drafts/**"
---

# Empirical Results Writing (one-line rules)

Applies wherever an estimate is printed or restated: results and appendix, introduction, conclusion,
abstract. Full rules, reasons and invented examples: `docs/writing/EMPIRICAL_RESULTS_WRITING.md`.
It loads on the same manuscript folders as `writing-standard.md` (add the project's own folder to both);
slides follow the slide rules.

## The tests
- A first-time reader derives every number from what is on the page; said aloud, a sentence leaves nothing to ask.
- Read coefficients at observed changes; anchor each one's meaning in the final table; no adjectives, only economics and evidence.

## Causal language
- Own estimates are reduced-form equilibrium associations: "is associated with", never "effect", "impact" or "reduced-form effect", unless CLAUDE.md declares a design that identifies a causal effect; then CLAUDE.md names the term.
- Fixed effects and year effects stay as technical terms; other studies keep their own terms.
- No regressor is the subject of a causal verb (raise, lower, affect, drive, push up, carry); no "elasticity" for a bounded index.
- Never say a regressor "explains" or "accounts for" a share of the outcome's rise.
- Keep distinct regressors apart; say "each controlling for the other" once, where they enter together.
- IV estimates are labelled as such and described by what the instrument addresses, never "causal".
- State the theory anchor before the sign; where theory allows either sign, no "as expected" or "confirms"; one hedge at most.

## Reading a coefficient
- Fix the unit of change once (the observed change over the sample), in the data section; reuse it everywhere.
- No reading per 0.01, per unit or per standard deviation; results cite the change, never the levels.
- Headline paragraph: finding (no number), specification once, variation used, number + source + significance, change, magnitude.
- No table tour, no textbook sentence on reading a coefficient, no explanation or euphemism of a standard tool.
- One magnitude sentence per coefficient family, baseline only: "a rise of [change] in X is associated with a rise of about [p] percent in Y ([b] × [change])".
- Name each change by its number, never "the same rise"; never add component magnitudes against the aggregate.
- Percent, converted exactly; one footnote per magnitude sentence, in words, at most 40 words, no formula.
- Each quantity once, in one unit. No "log points", no fractions, no "point estimate". A ratio shows its division.
- The printed factors reproduce the printed result; if rounding breaks it, print fewer digits.
- Name the specification in words; the column number goes only in the parenthesis.
- The source goes in parentheses right after every number, never in a trailing sentence; a number no exhibit shows comes out.

## Significance and the number budget
- Four phrases: significant at the one / five / ten percent level, or not significant; sign and significance together.
- The word follows the printed stars of that cell; a note gives no second verdict on a cell the prose reads.
- No standard errors, p values, intervals, stars, test statistics, clustering or bootstrap in body prose.
- Not significant is not zero; never "insignificant", "marginally", "separated from zero"; do not read its size.
- A paragraph prints only the numbers its topic sentence needs; a number with no reading is cut; controls get no magnitudes.

## Columns, rankings, IV, theory, other studies
- Column move: "With [term], the estimate falls to [b] ([source]) and [stays / is not] significant", then one reason with evidence on the page.
- Before citing a control's mean change as that reason, check that it holds across units.
- Walk columns in printed order; a rival story comes first, then what would be seen, what is seen, the verdict; past three sentences it gets its own paragraph.
- "Controlling for", never "holding fixed".
- No per-unit ranking across differently scaled regressors; compare at own changes or by firmness.
- A ranking answers a question, and its basis follows it directly; a claim that two coefficients differ needs a gated test kept out of the prose.
- Tables print OLS and IV side by side; prose reads an OLS cell only as evidence; give the direction in words, do not sign the bias.
- One Discussion paragraph per estimate: what a positive net means, each force with its source, the reading, one hedge.
- Recall the framework, do not retell it; no count of mechanisms the sources do not make; routes do not "come out".
- A cited study gets setting and design, the design difference or like-for-like column, and a verdict verb; synthesize groups.
- Never compare coefficients across specifications; "match" only for the same measure, sample and period.
- Explain disagreement with another study by design or measurement, never dismiss it.

## Connectives and dynamics
- "Therefore", "so", "because" need their premise in the same or the previous sentence; at most one per paragraph, never chained.
- Dynamic path: pose the question, say what the projection compares, give the path in time order; never "permanent", "response", "shock".
- Overlapping intervals license "persists" only (a shape claim needs a joint test); explain long-horizon imprecision by the observations left.
- Name a persistent regressor and its consequence; check the instrument's serial correlation.
- A dynamic or economic reading is written only if it survives a co-trend test; if it fails, tell the author plainly.

## Shared rules, not repeated here
- `writing-standard.md`: numbers V1-V9 (generated, a share shows its two numbers, estimator and scope, verify before answering); placement and notes L1-L10; limitations D1-D2; one-word scope K7; register R1 and R3.
- `working-rules.md`, Gates: bind the whole sentence to its output row; self-test every gate red in a scratch mirror, each language.

## Numbers
- Check how a variable is recorded (rounding, top-coding, replacement codes) before explaining a jump in it.
- A claim flipped by a specification change is retired everywhere and gated as absent, in every section and language.
- After a rerun, scan the text for values only the retired output explains.
- List every restatement a results change touches (preview, conclusion, abstract) for the author; apply them only after approval.

## Structure
- Study 5 to 10 model papers first: one anatomy each, a template, a diagnosis, a five-sentence story from existing results, then sample paragraphs.
- Story order, not estimation order; a paragraph is a finding: sign, significance, magnitude, then theory or literature; no twins.
- Each subsection opens on the question the last one left and ends on a verdict, a magnitude or a hand-off.
- The preamble states findings only: no limitation, no method, no definitions.
- Each standalone part (abstract, introduction, conclusion) defines the baseline once and uses that one name.
- The body says once that results survive the sensitivity checks; appendix pointers are few and each approved; no "not shown".
- The Discussion states the paper's own answer directly and keeps components apart; run a fresh read-back after a rewrite.
- The close ranks findings by firmness, states the one limit once more, repeats no number from the first results subsection.
- No kitchen-sink table tours, policy "should" or evaluative adverbs.

## Notes and footnotes
- Scope a "not interpreted" note to the estimator it covers; other rows of those columns may be read as evidence.
