# Writing Empirical Results

How to report, read and discuss regression estimates. This file covers the results section (or
chapter) and its appendix, and every other place an estimate is printed or restated: the
introduction's findings preview, the conclusion and the abstract.

**Where it comes from.** The rules were earned on a real manuscript, an applied-economics thesis:
the author's annotations on printed drafts, the supervisor's standing instructions, and a study of
nine model papers. Every rule traces to a ruling, an annotation or that study. The thesis's content is
not here. The **Why** lines record the failure that produced a rule; **How** lines say how to apply it.

- One-line version, loaded on manuscript files: `.claude/rules/empirical-results-writing.md`.
- Topic sentences (kings), sentence rules, register, banned words and placement:
  `docs/writing/WRITING_STANDARD.md` and its summary `.claude/rules/writing-standard.md`.
- Process (rounds, gates, landing records): `.claude/rules/working-rules.md`.
- Gate tools: `scripts/gates/` (claims gate, mirror digit fidelity, stale-value scan).
- Precedence. Where a model paper's habit conflicts with a rule here, the rule wins. Where a rule
  here conflicts with a ruling the author makes on the current paper, the author's ruling wins and is
  recorded.

---

## 0. The toy design used in every example

All examples in this file are **invented**. They use one toy design so the numbers can be followed.
They report no real study.

> **Toy design (invented).** A panel of 32 counties, 2000 to 2020, observed every five years (five
> waves, 160 county-wave observations). The outcome is the mean log revenue of firms in a county.
> The aggregate regressor is a broadband index between 0 and 1. It has two components: *coverage*
> (the share of firms connected) and *speed* (an index between 0 and 1). Table 1 reports the
> aggregate index; Table 2 enters the two components together. Column (1) is the baseline: county
> fixed effects, no year effects, no controls. Column (2) adds controls; columns (3) and (4) add year
> effects, without and with the controls. Each column prints an IV row and an OLS row. Between 2000
> and 2020 the mean index rose by 0.150, coverage by 0.120 and speed by 0.200 (Figure 1 of the data
> section). The baseline IV estimate on the index is 2.40; least squares gives 1.90.

---

## 1. The tests every results sentence must pass

- **The first-time reader test.** A reader who has never seen the paper derives every number from
  what is on the page. Any number or step that is not derivable is a place where the reader stops.
  - **Why:** the author's margin notes on results drafts asked, again and again, "where does this
    number come from?" (「怎么来的」, 「数据哪里来的 要标明」).
- **The spoken-answer test.** Said aloud, the sentence leaves the listener nothing to ask ("no further
  question"). If a listener would answer with "what do you mean?", the sentence fails.
- **The supervisor's three standing instructions for results:**
  1. Read coefficients at the observed changes over the sample period, not at a one-unit change.
  2. Anchor the economic interpretation of each coefficient in the final table. Do not interpret
     coefficients on the spot.
  3. No platitudes and no adjectives: economics and evidence.

---

## 2. Causal-language discipline

### 2.1 The paper's own estimates are associations

- Reduced-form estimates are **equilibrium relationships**, not structural parameters. They bundle
  every adjustment margin the design does not separate.
- Write "is associated with", "went with", "rose with", "the net equilibrium association".
- **Never "effect" or "impact" for the paper's own estimates**, not even "reduced-form effect".
  The author's slogan: 「econ里面 用effect 默认在说因果 要谨慎」 (in economics "effect" reads as
  causal; be careful).
  - "Reduced-form effect" is not a safe middle ground: it still reads as causal. Do not use it.
- **Allowed:** "fixed effects", "year effects", "county effects". These are technical terms.
- **Other studies are reported in their own terms.** If they write "effect", it stays theirs.
- **Why:** the design does not identify the separate channels (supply, demand, productivity). A
  structural word claims what the design does not deliver.
- **Scope:** these defaults hold for a reduced-form design. A project whose design identifies a causal
  effect (a randomized experiment, say) declares it in its CLAUDE.md, which then names the term
  (writing standard, R7).

### 2.2 No regressor is the subject of a causal verb

| ✗ | ✓ |
|---|---|
| "Broadband raises firm revenue." | "A rise in the broadband index is associated with higher firm revenue." |
| "the productivity effect of broadband" | "the net equilibrium association between broadband and revenue" |
| "Coverage carries most of the revenue growth." | Retire "carries" as an attribution verb. Report each component at its own observed change (§3.3). |
| "The index explains 80 percent of the revenue rise." | Never. See §3.3. |
| "Coverage drives / pushes up / changes revenue." | "Counties whose coverage rose more had larger revenue gains." |

- Banned verbs with a regressor as subject: raise, lower, affect, change, drive, push up, carry.
- The subject is the outcome, the unit or the estimate. The verb is "is associated with".
- **Never "elasticity"** for a coefficient on a level index bounded between 0 and 1. Name the
  coefficient by what it is.
- **How to apply:** before a paragraph that discusses coefficients is final, check every verb whose
  subject is a regressor.

### 2.3 Keep conceptually distinct regressors apart

- When a design separates two dimensions of one phenomenon (how much of something, against what kind
  or mix of it), label them separately everywhere. Never collapse them into one "X effect".
- When one is read conditional on the other, say so once, in the coefficient sentence: "each
  controlling for the other".
- A sentence in a decomposition names which component it is about. "Both estimates" in one sentence
  blurs the distinction the design exists to make.
- **Why:** the contribution of such a design is the separation. Prose that merges the two undoes it.

### 2.4 Label IV estimates by what the instrument addresses

- Call them "IV estimates", "two-stage least squares estimates" or "instrumented estimates".
- Describe the instrument by the threat it addresses, for example "the instrument addresses the
  selection of counties into early adoption, not the growth all counties share".
- **Never** "causal effect", "corrects the bias", "the true association".
- Report OLS and IV side by side in the tables, clearly labelled (§3.11).
- **Why:** a causal reading needs the exclusion restriction, which the paper cannot test in full.
  Say what the instrument achieves and stop there.

### 2.5 Signs, theory and dynamics

- Where the conceptual framework allows either sign, never write "as expected", "as predicted" or
  "confirms". The estimate is "consistent with" one reading, with one hedge at most.
- For dynamic paths, never "response", "shock", "impulse", "effect" or "permanent" for the paper's
  own estimates (§3.15).

---

## 3. Reading a coefficient

### 3.1 Fix the unit of change once

- **The unit is the observed change** of each regressor over the sample period, averaged over the
  units: in the toy design, 0.150 for the index, 0.120 for coverage, 0.200 for speed.
- **Fix it once, in the data section**, beside the descriptive exhibit that shows the levels. That
  paragraph gives the levels, the changes, and each change as a percent of its starting level.
- **The results section cites the change, never the levels:** "(Figure 1 of the data section)".
- **One unit, everywhere**, for every coefficient family and every section of the paper.
- **No other unit:** not 0.01, not one unit, not one standard deviation.
  - **Why:** a rise of 0.01 in a share and a rise of 0.01 in a bounded index are not the same
    economic unit. Per-0.01 readings were tried, approved, and then retired after the author could
    not follow them.
  - An alternative some model papers use is a named contrast between two real units (the gap between
    two named places). Choose one approach per paper and keep it. Adding a named contrast later is
    new content and needs the author's approval.
- **Model habit:** the best model papers fix their unit once, before the first table, and never
  change it.

✗ "A rise of 0.01 in the index is associated with a mean log revenue higher by 0.024 (2.40 × 0.01),
  about 2.4 percent."

✓ "Between 2000 and 2020 the mean broadband index of the counties rose by 0.150 (Figure 1 of the
  data section)."

### 3.2 The headline paragraph: the first report of a coefficient

One job per sentence, in this order. The paragraph ends on the magnitude.

1. **Topic sentence:** the finding in words. Its scope is one word ("baseline"). It carries no
   number.
2. **The specification, once.** This is the only sentence in which a column is the grammatical
   subject: "Column (1) of Table 1 is the baseline specification: county fixed effects, with no year
   effects and no controls."
3. **What variation the estimate comes from:** "With county fixed effects, the estimate comes from
   the changes within each county across waves." This says what is compared. It does not teach how
   the tool works.
4. **The economic label**, for components only (§3.12).
5. **The number:** specification in words + estimate + (source) + significance in words. "The
   baseline estimate is 2.40 (Table 1, column (1)), significant at the one percent level."
6. **The observed change** (§3.1).
7. **The magnitude** (§3.3), with its footnote (§3.4).

**Never in the headline paragraph:**
- **A table tour.** The source parenthesis already says where the number is.
  ✗ "Table 1 reports the instrumented estimates of the coefficient on the index, with the
  least-squares estimates for comparison."
- **A textbook sentence.** No model paper explains how to read a semi-log coefficient.
  ✗ "The outcome is the mean log revenue, so the coefficient times a change in the index gives the
  change in the mean log revenue associated with it." (The author: 「nobody can understand」.)
- **An explanation of a standard tool.** Standard apparatus is named, never explained.
  ✗ "Year effects remove the growth every county shares by comparing counties within the same
  year."
- **A euphemism for a standard tool.** Calling year effects "the common trend held fixed" leaves the
  reader with no name to look up. Use the term.
- **A hedge on the headline.**

### 3.3 Reading at the observed change: the magnitude sentence

- **One step per sentence, each with its source:** the change (§3.1), then the magnitude, then the
  conversion in a footnote (§3.4).
- **The subject is a change in the regressor; the verb is "is associated with".**

✓ "In the baseline, a rise of 0.150 in a county's index is associated with a rise of about 43 percent
  in the mean revenue of its firms (2.40 × 0.150)."

- **One magnitude sentence per coefficient family, baseline only.** Other columns are read by how
  they move (§3.8).
- **Coefficients entered together:** say what is controlled for once, in the coefficient sentence.
  The magnitude sentence names each change by its number.

  ✓ "Entered together, each controlling for the other, coverage and speed have coefficients of
  1.80 and 0.85 (Table 2, column (1)), each significant at the one percent level. ... In the
  baseline, a rise of 0.120 in a county's coverage is associated with a rise of about 24 percent in
  the mean revenue of its firms (1.80 × 0.120)." The speed sentence has the same shape: 0.200,
  about 19 percent (0.85 × 0.200).

  ✗ "the same rise in speed". Read right after the other component, it means "the same rise as
  coverage". Name the change by its number.

  Where a section prints no coefficient sentence (a conclusion, say), the controlling clause stays in
  the magnitude sentence, and the change is still named by its number.

- **Comparing with the outcome's own change** is allowed only where the next topic sentence needs it
  to explain why the number is that size, and then in one unit (§3.4).
- **Never say a regressor "explains" or "accounts for" a share of the outcome's rise.** "80 percent
  of the revenue rise" reads as broadband explaining revenue growth, which is the causal claim §2
  bans.
- **Never add the component magnitudes** (24 + 19) and set the sum against the aggregate's 43
  percent. The components are not on the index's scale.

### 3.4 Converting to percent

- **The body prints the percent once, with its factors:** "about 43 percent (2.40 × 0.150)".
- **The conversion is exact.** A log rise of 0.36 is a revenue rise of 43 percent, not 36.
  - The log approximation is close for small changes and understates large ones. The model papers
    use it because their products stay small. Convert exactly anyway: one rule for every magnitude.
- **One footnote at each magnitude sentence**, in words, with the reader's own numbers, at most 40
  words. Not one shared footnote after the second sentence: the reader meets the product before the
  footnote explains it.

  ✓ Footnote: "2.40 × 0.150 = 0.36, the rise in the mean log revenue. A log revenue higher by 0.36
  means revenue 1.43 times as high, 43 percent higher; for changes this large the percent rise
  exceeds the log rise."

- **No formula in the footnote.**
  ✗ "A rise of $x$ in the log is a rise of $100(e^{x}-1)$ percent, so 0.024 gives 2.4 percent."
  (The author: 「这又是什么东西 根本看不懂」.)
- **Each quantity once, in one unit.** The log number lives in the footnote.
  ✗ "... 0.216 for coverage (1.80 × 0.120) and 0.17 for speed (0.85 × 0.200). These correspond to
  revenue about 24 and 19 percent higher." Two numbers for one quantity, and a pointer back.
- **Two outcome changes are compared in one unit**, never a log against a percent.
- **No "log points".** Write "a rise of 0.36 in the mean log revenue".
- **Percent, never fractions.** 「分数 … 这个是大忌」 (fractions are a cardinal sin): no "three
  fifths", "about a seventh", "less than half", "only a fraction". A ratio shows its division:
  "79 percent (1.90 ÷ 2.40)".
- **The printed factors reproduce the printed result.** If rounding breaks the arithmetic, print
  fewer digits ("about 0.36").

### 3.5 The source goes in parentheses right after the number

This holds for every number, the paper's own coefficients included. The author: 「每引一个数据就括号
… 而不是后面加一句」 (put the source in brackets after every number, not in a sentence after it).

| Source | Form |
|---|---|
| Own coefficient | 2.40 (Table 1, column (1)) |
| A least-squares cell | 0.75 (Table 1, column (3), OLS row) |
| Another section | 0.150 (Figure 1 of the data section) |
| A figure note | (Figure 2, notes) |
| Another study | (their Table 3) |
| Arithmetic | (2.40 × 0.150), (1.90 ÷ 2.40) |

- In LaTeX, own tables are `Table~\ref{tab:main}`, with no digit typed.
- **Name the specification in words; the column number goes only in the parenthesis.**
  ✓ "With year effects the estimate falls to 0.45 (Table 1, column (3)) and is not significant."
- **No trailing pointer sentence** ("Figure 1 plots ...") and **no table tour**.
- **A number that no exhibit shows needs an exhibit, or it comes out.**
- **Clutter is cut by cutting numbers, not sources** (§3.7).
- **Point at sections by name, never by number:** "the data section", not "Section 4.3".

### 3.6 Significance in words

- **Four phrases only:** "significant at the one percent level", "... at the five percent level",
  "... at the ten percent level", "not significant". For a pair: "each significant at ...".
- **Sign and significance travel together:** "positive and significant", "positive and not
  significant".
- **The word follows the printed stars of that cell.** The stars follow whatever inference method
  the table note names. Never read significance from a different p value (for example one computed
  with another variance estimator and left in an output file).
- **Never in the body prose:** standard errors, p values, t statistics, confidence intervals or
  sets, stars, named weak-instrument statistics, clustering, the bootstrap. These belong to tables,
  notes and the appendix.
  - **Why:** the author twice found results drafts 「太技术细节」 (too technical) and 「不是econ 论文」
    (not an economics paper), quoting sentences about which test separated which coefficient from
    zero.
- **One name for significance.** Not "separated from zero" in one place and "significant" in
  another. Not "insignificant", "marginally", "highly significant".
- **Not significant is not zero.** ✗ "falls to zero". ✓ "is not significant".
- **A note gives no second verdict on a cell the prose reads.** The prose reads significance from
  the stars; the note does not add a test that reads the same cell another way.
  - A case to bring to the author, not to settle alone: the body says "significant at the ten
    percent level" and the note adds an interval for the same cell that contains zero.

### 3.7 The number budget

- **Headline paragraph:** the coefficient, the observed change and the magnitude, plus the
  arithmetic and one footnote.
- **Any other paragraph:** only the numbers its topic sentence needs. Each number is read in the
  sentence that prints it.
- **A number with no reading is cut.** A ratio computed and never used is clutter.
- **Levels stay in the data section.** The results do not restate starting and ending levels of the
  regressors or the outcome. The author: 「这不应该是描述性统计的内容吗」 (isn't this descriptive
  statistics?).
  - **One exception:** the reason a column move happens may cite levels from the data section, with
    the exhibit that prints them (§3.8).
- **Controls are never read with magnitudes.**
- **Model habit:** strong results sections print very few numbers in prose. One model printed a
  single regression coefficient in its whole results section; another printed five numbers; a third
  had three in its headline paragraph.

### 3.8 Column moves: what is added, the new number, one reason

- **Shape:** "With [the added term, in words], the estimate falls to [b′] ([source]) and [stays
  significant / is not significant]." One sentence of reason follows.
- **The reason needs its evidence on the page.** The author: 「这句话的依据呢 你不能凭空就说啊」
  (where is the evidence for this sentence? you cannot just assert it). A claim about the data (a
  control "moves with the period") needs its numbers like any estimate.
- **Walk the columns in printed order.** A column that answers a rival story is read in that story's
  paragraph.
- **The rival story comes first:** what would be seen if it held, then what is seen, then the
  verdict.
  - Invented example of the move: a county's mean revenue also rises when its firms grow older or
    larger. Firm-level regressions with firm controls answer that story. Report their estimates
    against the county-level ones, then the verdict: the association does not come from changes in
    which firms the county holds.
- **"Controlling for", never "holding fixed".** The author: 「把他们固定住是啥啊 … 这么不专业的词汇」
  (what does "freeze them" mean? that is not professional vocabulary).

✗ "With the controls the estimate falls to 1.45, because the controls remove part of the growth
  every county shares." The "because" has no evidence on the page.

✓ (invented) "With the controls, the estimate is 1.45 (Table 1, column (2)), significant at the five
  percent level. It is smaller than in the baseline. One of the controls fell as the index and
  revenue rose: the share of firms older than twenty years fell from 55 to 42 percent between 2000
  and 2020 (the descriptive table of the data section). In least squares without year effects the controls lower
  the estimate from 1.90 to 1.10 (Table 1, columns (1) and (2), OLS row). With year effects they
  lower it much less, from 0.75 to 0.70 (Table 1, columns (3) and (4), OLS row). The controls
  therefore lower the estimate mainly by absorbing part of the growth every county shares."

- **Why the long version:** the four OLS cells show *that* the controls take up the common growth.
  The author still asked *why* (「为啥呢 理由不够充分」, the reason is not sufficient). The level
  change of the control, with its exhibit, is the why. Then the cells, then the "therefore".
- **General lesson:** a control that moves mostly with the common time trend acts partly like a time
  effect. When adding a control lowers an estimate, check how much of its within-unit variation the
  period explains, and show it on the page through the printed cells. A table of variance shares is
  not the way: the author found it abstract.
- **Before citing a control's mean change as the reason, check that it holds across units.** A
  share that fell in the average county is not thereby shown to fall in every county.
- **Unit-level control shares and firm-level controls lower an estimate by different amounts.**
  Firm controls vary almost entirely within county-wave cells, so they compare like firms in the
  same county and wave. A county's control share is free to pick up anything that trends with it,
  including the growth every county shares.

### 3.9 A result that is not significant

- **State it flat:** "With year effects the estimate falls to 0.45 (Table 1, column (3)) and is not
  significant."
- **Give its reason as a property of the design's variation, never as a verdict on the estimate:**
  "The baseline has no year effects, so the estimate keeps the growth every county shares."
- **Say it once in its home paragraph and once at the close** (§5.5).
- **Do not read its size. Do not call it zero.** No "is not evidence of a small association", no
  "the point estimate is unchanged".
- **A cell of the estimator a note excludes is not read** in the prose. Scope that note to its
  estimator (§6): other rows of the same columns may still be read as evidence.

### 3.10 Ranking two coefficients

- **No per-unit ranking across regressors on different scales.**
  ✗ "A rise of 0.01 in coverage is associated with higher revenue than a rise of 0.01 in speed."
  A per-0.01 ranking compares a share with an index in raw units. Against their starting levels,
  equal raw rises may differ several-fold.
- **Compare two components in two ways only:**
  1. At their own observed changes, in parallel sentences: about 24 and 19 percent (§3.3). Stop
     there, without "so coverage's is larger".
  2. By firmness across specifications, after both significance levels are stated: "..., so
     coverage is the firmer of the two components."
- **A ranking answers a question.** ✗ "The rise in coverage is associated with more revenue growth
  than the rise in speed." The author: 「so what？？ 我们是results 不是descriptive statistics」.
  If both changes are close, the ranking of the products only repeats the ranking of the
  coefficients.
- **Where a comparative claim rests on the ranking, its basis follows directly after it**, in one
  sentence with both numbers. That is the one licensed second printing of the magnitudes.
- **Do not say whether a gap comes from the coefficients or from the changes** when the regressors
  are on different scales. Neither compares on its own.
- **No "point estimate".** The author: 「点估计更大是什么意思我不懂」 (I do not understand what "the
  point estimate is larger" means). No ranking read from overlapping intervals.
- **A claim that two coefficients on one scale differ needs a test**, run, gated, and kept out of
  the prose.
- **No fraction.** "only a fraction" becomes both numbers.

### 3.11 IV against least squares

- **The tables print both, labelled.**
- **The prose reads a least-squares cell only as evidence**, in two places:
  - the like-for-like comparison with another study (§3.13);
  - a column move (§3.8).
- **Side by side, give the direction in words only:** "Least squares gives 1.90 (Table 1, column
  (1), OLS row); the instrumented estimate is the larger."
  - Do not sign the bias unless the paper argues its direction. Any further reading is new content
    for the author.
- **Describe the instrument by what it addresses** (§2.4).
- **Name the estimator wherever two estimates meet:** "Least squares with year effects gives 0.75
  here (Table 1, column (3), OLS row), significant at the ten percent level."

### 3.12 Reading signs through the conceptual framework

- **State the theory anchor before the sign.** Either give the predicted signs in advance, or say
  that the framework allows either sign. Then read the estimate.
- **Anchor each coefficient's meaning once, in the framework's own words**, where it is first
  reported. Never interpret on the spot.
  - Invented example: "In the conceptual framework the coverage coefficient combines a market-access
    route and a competition route. The speed coefficient isolates the productivity route."
- **For an aggregate measure**, in the Discussion's first paragraph: "The index rises with both
  coverage and speed, so its coefficient mixes the forces behind both."
- **Where the framework allows either sign** (each route pulls both ways), never "as expected".
- **One Discussion paragraph per estimate:**
  1. Topic sentence: "For [component], a positive estimate means [the gains outweighed the costs]."
  2. Each force, one sentence, with the framework's source.
  3. The reading, on named estimates, with one hedge: "The coverage estimate is positive and
     significant at the one percent level in the baseline and with the controls (Table 2, columns
     (1) and (2)), which is consistent with market access outweighing competition."
  4. "It is a net equilibrium association."
  5. The study that bears on it (§3.13).
- **Recall the framework; do not retell it.** One sentence ("Recall that ..."), not a twin of the
  framework section.
- **No count the sources do not make.** ✗ "The gains are of three kinds." The author: 「这个说法
  怎么来的 谁提出的 … cite呢」 (where does this come from? who proposed it? cite it). Each gain gets
  one sentence with its source.
- **Routes do not "come out".** ✗ "the two routes together came out positive". ✓ "a positive
  estimate means the gains outweighed the losses."

### 3.13 Bringing in another study

- **Place the study at the result it bears on**, not in a block at the end.
- **Give three parts:**
  1. its setting and design (country, unit, period, estimator, fixed effects);
  2. the design difference, or the paper's like-for-like column;
  3. a verdict verb.
  A short comparison may open on the verdict ("The estimates here are consistent with X. X
  relates ...").
- **An in-depth comparison takes five steps:**
  1. the other study's finding and setting;
  2. its mechanism, in two or three sentences;
  3. the design difference, named first ("Despite the different design, ...");
  4. the relation, in a verdict verb;
  5. where needed, the condition under which the two estimates are comparable ("if we can assume
     ...").
  - **Why:** a comparison paragraph that brought in foreign studies without the reason they were its
    benchmark left the author asking "why that country?".
- **Never leave a study without its relation to the paper's result.** The author: 「引用别人论文之后
  … 什么就没说了」 (you cite a paper and then say nothing about it). A citation is there to bear on
  the paper's conclusion: say whether the study agrees, differs, and why.
- **Never compare coefficients across specifications.** An IV estimate without year effects is
  never set against another study's least squares with time effects. Find the like-for-like column.
- **"match" only for the same measure, sample and period.**
- **Report other studies in their own terms.** Their "effect" stays theirs.
- **Synthesize a group of studies:** one sentence on what they are evidence of, one on their
  findings with countries and years, one on their design. Do not list them one per sentence.
- **Verdict verbs:** "is consistent with"; "is also positive and not significant"; "sits below";
  "sits above"; "does not show the pattern found in X"; "does not conflict with".
  - "does not conflict with" reads as defensive. Use it only where the author asked for it, and run
    the defensive-prose test on it (`docs/writing/WRITING_STANDARD.md`, limitations and defensive
    prose).
- **Disagreement is explained by design or measurement, never dismissed.**

### 3.14 "Therefore" and other connectives

- **"Therefore", "so" and "because" are claims.** The premise sits in the same sentence or the one
  directly before.
- **At most one "therefore" per paragraph.** Never between two descriptive facts. Never in a chain
  ("therefore ... so ... therefore").
- **Licensed uses:**
  - after a test (switching estimator after a specification test);
  - after a data fact that makes the result expected;
  - in a closing inference that adds to the topic sentence (not an echo of it).
- **Turns:** "By contrast", "but", "Yet". **Strengthening:** "Even with ...", "In fact".
  **Closing:** "In sum", never used to restate the topic sentence. Banned connectives are in the
  writing standard.
- **Prediction before result:** say what would be seen if a rival story held, then what is seen.
- **Raise, then resolve:** name the departure, give one explanation, close it with evidence.

✗ "Least squares with year effects gives 0.75, a little below Study X's 0.85. The gap between 2.40
  and their 0.85 therefore comes from leaving out year effects." The premise compares like with
  like; the gap it explains mixes instrumenting (2.40 against 1.90) with year effects (1.90 against
  0.75). Delete, or give it its own premise.

✓ "The persistence in the baseline therefore reflects the growth every county shares, not a
  recovery from a single shock." Its premise is the sentence directly before it, which shows that
  with the controls no later estimate is significant.

### 3.15 Dynamic and local-projection paths

1. **Pose the question.** Does the association fade or last after the base date?
2. **Say what the projection compares, before the path:** "Figure 2 plots local projections of the
   baseline specification, which relate a county's mean log revenue at the base date and five, ten
   and fifteen years later to its index at the base date, instrumented as in Table 1."
3. **Give the path in time order, and claim no shape.**
   ✓ "The estimates are 2.40 at the base date and 2.55, 2.50 and 2.10 five, ten and fifteen years
   later (Figure 2), each significant at the one percent level."
   - Overlapping intervals license "persists", and nothing else.
   - They do not license "rises then falls", "close to the first", "fades" or "begins to weaken".
   - A shape claim needs a joint test across horizons. Without one, a shape claim is new content.
   - Check on a common sample before calling later horizons "close" to the first: estimates on
     shrinking samples are not comparable cell by cell.
4. **Explain imprecision by the observations left.**
   ✗ "Revenue fifteen years later pairs with the index of only two waves, so the fifteen-year
   estimate has the widest interval."
   ✓ "The fifteen-year estimate is the least precise of the four, because each further horizon
   drops one wave from the sample. Fifteen years ahead the sample keeps 64 county-wave observations
   against 160 at the base date (Figure 2, notes)."
5. **Name a persistent regressor and its consequence.** If the regressor keeps rising after the base
   date, each later estimate also reflects those later rises (the local-projection literature calls
   this the treatment plan). If the instrument is highly serially correlated, the estimate mixes the
   association with current and earlier shocks, and pre-trend tests are hard to read when shocks
   repeat; check the serial correlation before reading the path.
6. **State the control scope once**, in the figure note, if the path changes with controls.
7. **Put the reading in the Discussion, and only a reading that survives a co-trend test.** Build
   the outcome from unit levels plus the common period means. If that series reproduces the path,
   the path carries only the growth the units shared. Stories that need a unit-specific path
   (capital adjustment, mobility, a lasting equilibrium) fail whenever the co-trend series
   reproduces the path.
   - **Why:** a dynamic story that a co-trend test kills would be overturned by an examiner.
   - **How:** when a requested story fails the test, tell the author plainly in the reply, not only
     in a landing note. Once, a dropped story was recorded only in a note, and the author asked for
     it again.
8. **Where the literature on the question has single-shock studies and the paper's setting is a
   continuing change, contrast with them in the Discussion**, each in its own terms, synthesized in
   one sentence, with the design difference named (they compare units that received one shock with
   units that did not; a within-unit panel under a continuing change compares each unit with
   itself).
9. **Never:** "permanent"; "response", "shock", "impulse" or "effect" for the paper's own
   estimates; a narrated path the estimates do not separate.

### 3.16 What is never done

- A reading per 0.01, per unit or per standard deviation.
- A textbook sentence on how a coefficient is read; an explanation of a standard tool; a euphemism
  for one.
- A formula footnote; "log points"; a fraction; "point estimate".
- The same quantity in two units; a number that is never read.
- A share of the outcome's rise "explained" by a regressor; a sum of component magnitudes.
- Levels in the results; magnitudes for controls, for non-baseline columns, or for robustness
  variants.
- "effect", "impact", "raises", "drives" or "elasticity" for the paper's own estimates.
- Test statistics or inference machinery in the body prose.
- "insignificant", "separated from zero", or "zero" for a non-significant estimate.
- "holding fixed"; arithmetic narrated in prose ("multiplying each rise by its coefficient gives",
  "the product", "pairs with").
- An evaluative adjective on a number (strong, sizable, modest, substantial). Where an approved
  topic sentence says "large", its body supplies the comparison.
- Comparing across specifications; "match" across designs; citing a study with no relation stated.
- A count of mechanisms that no source makes; a mechanism invented at the point of reporting.
- A shape claim on overlapping intervals; "permanent"; an adjustment story a co-trend test kills.
- A "therefore", "so" or "because" without its premise directly before it.
- A hedge on the headline; a limitation outside its home paragraph and the close.

---

## 4. Numbers: generated, gated, verified

- **Every number in the paper is generated by a script and gated.** Nothing is typed by hand from a
  table. If a number has no generating script, write one before using it.
- **Gate every printed number against its output row**, in every language version. Tool:
  `scripts/gates/claims_gate_template.py`.
  - **Gate the sentence, not just the digits.** A substring check is not a gate: "52" matches inside
    "152", and a value can pass on a coincidence when the same digits name something else on the
    page.
  - **Self-test each gate in a scratch mirror, never on live files**, with
    `scripts/gates/gate_selftest.py`, each language separately (`.claude/rules/working-rules.md`,
    Gates). A gate that has never been seen red is not a gate.
- **Verify before answering.** When the author asks "what supports this?", check the sources, the
  code and the data before replying. The check can cost a claim: once, neither cited source reported
  the expected sign of a control, so the paper stopped signing it.
- **A share shows the two numbers it comes from**, and its denominator is the one the claim names.
- **State the estimator and the scope.** A number from a different specification is a different
  number.
- **Check how a variable is recorded before explaining a pattern in it.** A dip in a mean log
  outcome once turned out to be a change in the files: from one wave on, the data provider rounded
  the variable to a coarser base and recorded values that would round to zero as 1, whose log is
  zero. The "fall" was a recording change.
  - **How to apply:** before writing an economic story about a jump or a dip, count distinct values
    by period, read the user guide for rounding, top-coding and replacement codes, and look at the
    lower and upper tails, not just the mean.
  - If a fix is needed, define it once, apply it balanced across the break, state the threshold and
    its reason where it is imposed, and prove the switch inert (off reproduces the old build
    exactly).
- **When a specification change flips a claim, retire the claim everywhere.** List each retired
  sentence, remove it from every section (introduction, conclusion, abstract too), and gate its
  absence so it cannot return in another wording.
- **A correction sweeps.** After changing a claim, search the whole paper and every language version
  for it. A correction that lands in one section and not the others is a repeated failure.
- **A results change ripples.** List every restatement it touches (findings preview, conclusion,
  abstract) for the author. Apply them only after the author approves
  (`.claude/rules/working-rules.md`, The round, item 7).
- **Compare the live text against both the old and the new outputs** after a rebuild. A value that
  only the retired output explains is a stale number, even when every existing gate is green. Tool:
  `scripts/gates/stale_value_scan.py`.
- **A mirror in another language passes a digit-fidelity check** after every numeric edit
  (`scripts/gates/mirror_digit_fidelity.py`).
- **An economic reading must survive a co-trend test** before it is written (§3.15).

---

## 5. Structure of a results section

### 5.1 Study the model papers first

Before writing or rewriting a results section, read how the field writes one. The author's
complaint that triggered this method: 「你到底有没有看我说的那些论文 他们怎么讨论results 部分的」
(did you actually read how those papers discuss results?).

1. **Collect 5 to 10 model papers:** the supervisor's own papers, the closest papers in the field,
   one or two methods primers for any special tool (for example local projections), and the writing
   guides the author uses.
2. **Write one anatomy per paper**, citing printed page numbers:
   - the move sequence of its results section;
   - how it reports a headline coefficient (unit, magnitude, benchmark);
   - how it walks columns, reports a non-significant result, ranks coefficients, sets IV against
     OLS;
   - how it brings in other studies;
   - where its limits and robustness sit;
   - its connectives, register, and the count of numbers in its prose.
3. **Synthesize a template:** the move sequence, sentence shapes, connective rules, dynamics
   language, register, and a paragraph checklist.
4. **Mark every point where a model conflicts with a standing ruling of the author.** The ruling
   wins; label it as a house rule.
5. **List where the models disagree** and what the paper chooses (§5.8). Take each choice to the
   author once.
6. **Write the paper's economic story in about five sentences, using only existing results.** Then
   list three things separately for the author: the changes they must rule on, the NEW CONTENT, and
   the ripples.
7. **Diagnose the current draft against the template** (§5.9), then propose a numbered outline in
   the supervisor's format: one paragraph per number, each with one topic sentence, no two-sentence
   paragraphs.
8. **Show sample paragraphs before rewriting the whole section.**
9. **Keep the models' numbers honest too.** Model papers have slips (a text value that differs from
   its own table). The paper matches every number to its gated row.

### 5.2 Six properties the model papers share

A section that breaks the first two reads as a list of numbers even when every sentence is true.

1. **Each section answers the question the previous one left open.**
2. **A paragraph is one finding about one exhibit, and the finding comes first.**
3. **The unit is fixed once, before the first table, and never changes.**
4. **Few numbers appear in the prose.** Every other estimate is read against the baseline in words.
5. **Every move across columns gets "how much" and "why" in one sentence.**
6. **Each limitation is said once, beside the number that shows it, with its reason.**

### 5.3 Move sequence

**Preamble** (unnumbered, 3 to 5 sentences).
- The answers, in the order of the paper's questions. Findings only.
- No limitation, no method, no definitions, at most the headline number.
- No "This section reports".

**Each results subsection uses the same engine:**
1. Open on the question the previous subsection left. The first sentences say what the subsection
   is for in the story.
2. A headline paragraph (§3.2).
3. One paragraph for each rival story a column answers: the story, the column that tests it, what
   would be seen if it held, what is seen, the verdict. A rival story read inside another paragraph
   gets its own paragraph once it needs more than three sentences.
4. Other studies inside the paragraph of the result they bear on.
5. A last sentence that hands the reader the fact the next subsection builds on.

**Moving between tables:** introduce each table by its purpose and finding in one sentence. No
announcer paragraphs, no "This section turns to".

**How a paragraph ends:** on a verdict, a translated magnitude, or the fact the next paragraph uses.
Never on a hedge about the headline, a bare citation, or an echo of the topic sentence.

**Discussion.**
1. What the signs mean, through the framework, once (§3.12).
2. One paragraph per estimate.
3. The comparison with other countries or settings: open on the paper's own answer, stated in
   full, then what each study measures, the like-for-like column, sign and ranking, the one
   difference and its reason.
4. Dynamics, if any (§3.15).
5. **The close:** rank the findings by firmness (first, second, then a third that is more tentative),
   state the one limit once more, then the one robustness sentence. Repeat no number from the first
   results subsection.

### 5.4 Story order, finding first

- **The body tells the economic story, in story order, not estimation order.**
- **A paragraph is a finding:** sign, significance, magnitude, then the theory or the literature.
- **Before writing a paragraph, ask what the reader learns about the economics from each sentence.**
  If the answer is "which test did what", the sentence moves to the appendix.
- **The finding leads; the ceiling follows its evidence.** A results paragraph never opens on the
  denial and never ends on a hedge about its own finding.
- **The results describe; the Discussion reads.** If the paper keeps a separate Discussion, the
  results subsections do not pre-empt it.
- **No twins.** A results paragraph does not repeat the data section, the framework or the
  literature review. Recall in one sentence; do not retell.
- **Voice:** the estimate, the unit or the outcome is the subject. The text does not narrate its own
  steps.
- **One name per object:** the aggregate measure, each component, the controls, the baseline, each
  level of analysis.
- **Each standalone part (abstract, introduction, conclusion) defines the baseline once**, in one
  sentence, then uses that one name. These parts circulate on their own, so none relies on the
  results section's definition.

### 5.5 A limitation is said once

The general rule, with its reason, is D1 and D2 of `docs/writing/WRITING_STANDARD.md`: the finding
first; a limitation in full once in its home paragraph and once at the close; never in the preamble;
never deleted from both places. In a results section:

- **Where a finding stops holding** (with year effects, with controls, "not significant", or two
  components no longer distinguished) **has its home in the paragraph that reads that table.**
- **Scope a topic sentence with one word** ("baseline"), as K7 of the writing standard says.
- **Do not pack a definition inside a result sentence.**
  ✗ "With year effects, which compare counties within the same year, the estimate falls to 0.45
  and is not significant."
- **Shape of a limitation:** name the alternative mechanism, give its direction or why it matters
  little, say what would settle it. One sentence, stated once, in plain words. Never "we cannot rule
  out", "caution should be exercised", or stacked hedges.
- **Placement map:**

| Kind of limit | Where it goes |
|---|---|
| Data limits | The data section |
| The identifying assumption | The identification part of the data section |
| Inference limits | Beside the number that shows them |
| The one limit that could overturn a conclusion | Its home paragraph, with its mechanism, quantified where possible |
| The close | The findings ranked by firmness; that limit said once more |

### 5.6 Tests and sensitivity go to the appendix

- **Weak-instrument tests, clustering, the bootstrap, first-stage statistics, confidence sets,
  deletion checks and re-weighting belong to the appendix.**
- **The body says once that the results survive the sensitivity checks**, with one pointer.
- **Shape of a robustness sentence** (in the appendix, or the one body sentence): the concern, what
  changes, the result against the baseline, a verdict word ("similar", "changes little", "falls to
  [x] and stays significant", "is not significant").
- **A difference is information, not something to explain away.** If dropping two large units lowers
  an estimate, read it as those units mattering.
- **Detail rows** (dropping one period, capping one variable) go in the appendix table. The body and
  the cross-section summaries (introduction, conclusion, abstract) do not name them. The author:
  「是细节问题 不是主要econ 故事」 (a detail, not the main economic story).
- **The appendix is its own document**, not sections of the results file.
- **Appendix pointers are few, and each is approved.** Do not scatter "(see the appendix)" through
  the body. Introduction, conclusion and abstract carry none unless the author allows it.
- **When the author limits a secondary result to one sentence, keep exactly one**, where its result
  is read, and gate the count. Its other numbers stay in the appendix.
- **Never move appendix content into the body to satisfy a rule about one part of the body.** When
  an instruction names one part of a section, check whether the author means the whole section.
- **No "not shown" or "available on request".** The appendix exists.

### 5.7 The Discussion is the centrepiece

- **It is what an examiner or referee reads for.** The author: 「这部分应该是本章的重点 我们的econ
  故事 怎么站得住 怎么符合理论啥的 都要表达出来」 (this is the core: how the economic story stands up
  and fits the theory must all be said).
- **One paragraph per estimate:** theory's two sides, the estimate, what a positive net means.
- **State the paper's own answer directly.** A comparison paragraph that never says the paper's
  answer leaves the reader asking.
- **Keep the components apart** (§2.3).
- **Say a thing itself, not through the measure's machinery.** No index arithmetic in the body.
  Cite the change from its data-section exhibit; levels stay in the data section (§3.1, §3.7).
- **Compare components only in the two ways of §3.10**, never through "the growth the components
  imply".
- **Run a read-back by fresh readers after any body rewrite.** Give them the author's comments.
  Read-backs caught real errors each time they were run (a misstated framework route, a misreported
  number from another study).

### 5.8 Decisions to make once per paper

The model papers disagree on these. Pick one answer per paper with the author, record it, and keep
it.

| Question | The range in the models | Default in this workflow |
|---|---|---|
| Where the claim sits | First (most); last after a column walk (some) | First |
| Closing restatement | Some guides want the opener restated | No echo; a closing inference only |
| Unit of change | Abstract units, or observed / named-unit changes | The observed change, fixed once |
| Magnitude benchmark | Outcome mean; observed change; own specifications; a model benchmark | The observed change and own specifications |
| Percent conversion | Log approximation | Exact conversion, one footnote per magnitude |
| Numbers in prose | From one to every column | Few, plus the gated magnitude chain |
| Source citation | Once per paragraph, or after every claim | After every number |
| Robustness | Separate subsection, inline, footnotes, or appendix | Appendix plus one body sentence |
| Literature in results | Inline, introduction only, or conclusion | Inline at the result; one comparison paragraph in the Discussion |
| Numeric comparison with another study | In a common unit, or by sign and pattern only | One like-for-like numeric comparison; sign and ranking for the rest |
| Separate Discussion | Some weave interpretation into each subsection | A Discussion; results do not pre-empt it |
| Limits | Several caveats at the end, or none | One limit at the close, findings ranked by firmness |
| Hedging | One hedge per claim at most | One hedge, none on the headline |
| IV against OLS | Most read the gap as a bias direction | Direction in words; no bias sign unless argued |
| Voice | "we" or "I" | The estimate, the unit or the outcome as subject |

### 5.9 Six ways a results section goes wrong

Use these to diagnose a draft before rewriting it.

1. **Accretion.** Each review round answers a marked sentence by adding sentences or numbers in
   place. A headline paragraph ends up with a dozen quantities. **Fix:** re-cut paragraph by
   paragraph against the template; do not patch.
2. **Logic asserted by connectives.** Many "so" and "therefore", several unlicensed. **Fix:** §3.14.
3. **The central reading is never established once.** It is asserted in several places, each with
   partial evidence. **Fix:** show it once, with its evidence visible, then use it.
4. **The section is built around a summary measure, not the paper's questions.** **Fix:** answer
   the introduction's questions as questions, and anchor each coefficient's meaning in the final
   table.
5. **A lay register.** Mechanics narrated in everyday words ("multiplying ... gives", "holding them
   fixed", "came out positive") while a standard tool gets explained. **Fix:** the field's terms,
   named and not explained.
6. **Twins of other sections.** Paragraphs that repeat the data section, the framework or the
   literature review. **Fix:** recall in one sentence and point by name.

### 5.10 Register of a results section

- **Name standard terms; do not explain them:** fixed effects, year effects, least squares,
  instrumented, first stage, local projection, controlling for, significant at the X percent level,
  net equilibrium association. No euphemism for any of them.
- **What the model papers avoid, and so does the paper:** metaphors; announcer paragraphs; reading
  every cell of a table (the "kitchen sink"); Greek letters or variable names without saying what
  they mean; "should" and policy prescriptions; evaluative adverbs (remarkably, interestingly,
  surprisingly, notably); stacked hedges; repeated caveats.
- **Model habits the paper overrides:** "effect" for their own estimates; "point estimate";
  fractions; section numbers as pointers.
- **Sentence openings:** keep a small, stable set of subjects (the estimate, the baseline, each
  regressor by its one name, the outcome, the units). Begin each sentence with what the reader just
  saw; end it on the new number.

---

## 6. Table notes and footnotes

The general rules, with their reasons, are L2 to L5 of `docs/writing/WRITING_STANDARD.md`: a note
says how to read the table, reads the printed cells and never contradicts them, and is not a
landfill; a footnote answers the one question its sentence raises; table notes at most about 150
words, footnotes at most 40. A results table adds:

- **Scope a "not interpreted" note to the estimator it covers** when other rows of the same columns
  are read as evidence.
  - ✓ "the instrumented estimates in those columns are not interpreted", under columns whose OLS
    row the prose reads for a column move (§3.8) or a like-for-like comparison (§3.11).
  - ✗ "the estimates in those columns are not interpreted": it bars the OLS cells the comparison
    rests on.
  - ✗ "no estimate to report" under four printed numbers.
- **A note gives no second verdict on a cell the prose reads** (§3.6).
- **A conversion footnote** is in words, with the reader's own numbers and no formula (§3.4).
- **Name every subject in a footnote** (S12 of the writing standard). A footnote's "they" slides to
  a different group.

---

## 7. If the paper keeps a Chinese mirror

- "is associated with": 对应 (「一个县的指数上升0.150，对应其企业平均收入上升约43%」). 与……相关联 reads
  as abstract.
- "controlling for": 控制……后 / 加入控制变量后. Never 固定住.
- Significance: 在百分之一水平显著 / 在百分之五水平显著 / 在百分之十水平显著 / 不显著.
- The mirror moves in the same round as the English, and the digit-fidelity check passes.

---

## 8. Before a coefficient sentence lands

- [ ] The coefficient's meaning was anchored once, and the magnitude is read at the observed change,
      in percent.
- [ ] Every number carries its source in parentheses and its arithmetic, and the arithmetic
      reproduces.
- [ ] Each quantity appears once, in one unit. Any conversion footnote is in words, at most 40
      words, with no formula.
- [ ] Significance is in words and matches the printed stars.
- [ ] Every column move, every cited study and every "therefore" has its evidence on the page.
- [ ] No causal verb with a regressor as subject; no "effect" of ours; no "point estimate"; no
      fraction; no "log points"; no test statistic in the prose.
- [ ] The limitation, if any, sits only in its home paragraph and the close.
- [ ] The sentence is gated, bound to its output row, in every language version, and the gate was
      self-tested red.
- [ ] Every restatement of the changed result (preview, conclusion, abstract) is listed for the
      author; none is applied before approval.
