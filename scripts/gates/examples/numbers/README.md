# Number and claim gates: a worked example

A toy two-language paper with its output, used to run and self-test the four tools in
`scripts/gates/`. Every number here is invented.

| File | What it is |
|------|------------|
| `paper.tex`, `paper_zh.tex` | the paper and its translated mirror; both `\input` the same table |
| `tables/tab_main.tex` | a generated table fragment |
| `results/current/` | the current output: estimates, descriptives, and the derived values the text computes |
| `results/retired/` | the output of an earlier run, for the stale-value scan |
| `example_gate.py` | a claims gate built on `claims_gate_template.py` |
| `digit_pairs.json` | the pair list for `mirror_digit_fidelity.py` |
| `perturbations.json` | a self-test of all the gates: eighteen breaks that must go red, four edits that must stay green |
| `perturbations_loose.json` | a self-test that must FAIL: a retargeted copy of the gate has loosened one check |

Run from this folder:

```bash
python3 example_gate.py                                    # claims gate: 32 checks, 0 failed
python3 ../../mirror_digit_fidelity.py --config digit_pairs.json
python3 ../../mirror_digit_fidelity.py --config digit_pairs.json --strict-order
python3 ../../stale_value_scan.py --text paper.tex --text paper_zh.tex \
    --current results/current --retired results/retired --follow-inputs
python3 ../../gate_selftest.py perturbations.json          # all as expected, exit 0
python3 ../../gate_selftest.py perturbations_loose.json    # RED + LOOSENED, exit 1
```

What each break shows:

- A number changed in one language: the claims gate and the digit check go red.
- A retired value back in BOTH languages: the digit check stays green (the languages agree); only the
  claims gate and the stale-value scan see it.
- Two values swapped in the mirror a paragraph apart: the multisets match; the digit check's order test
  catches it. Two NEIGHBOURING values swapped: the default order test skips it, because a translation may
  legitimately state two values in the other order; `--strict-order` and the claims gate catch it.
- A sentence pasted twice, a sentence slipped into a closed paragraph, a sentence put behind a blank line
  right after it, a footnote detail moved into the body, a value re-stated a third time: only structure
  checks (count, closed paragraph with `followed_by`, footnote-only, exact occurrences) see these.
- `416` grown into `1,416`: a substring test passes on it; a number check with digit boundaries does not.
- Retired wording back with a tie and a capital (`Smaller Classes raise~test scores.`): the absence check
  reads the text as it typesets, so the variant is caught.
- The output moved while the text stood still: the claims gate goes red, and the stale scan reports the
  printed value that now only the retired run explains.
- An output row renamed: the claims gate records the failed lookup as a FAIL line and runs every other
  check; the self-test reports RED, not CRASH.
- A retired count followed by a comma (`12,512, pooled`) and a retired value at the end of a thin-spaced
  interval (`[35.10,\,36.97]`), both in the shared table: only the stale scan sees them.
- A re-wrapped paragraph, a comment that records an old value, a thin space added inside the mirror's
  interval, and a regex edit whose replacement holds `\times` must stay green. A gate that goes red on them
  gets switched off; a harness that read `\t` in a replacement as a tab would report a false red.
- The baseline itself carries two traps that must stay green: a comment after a line break (`\\%` in the
  table note of `paper.tex`, recording an old count) and a confidence interval that the CJK mirror reads
  whitespace-blind as `[0.45,1.70]`.
- `perturbations_loose.json`: the retargeted gate keeps the label `schools` but tests it as a substring.
  It still goes red on `1,416` through the sentence check, yet the self-test compares check by check and
  reports the school-count check as LOOSENED.
