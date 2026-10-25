---
title: Irrigation Canals and Farm Yields
note: example input for prose_audit.py and outline_check.py (invented content)
---

# Irrigation Canals and Farm Yields

Districts with more irrigated land report higher grain yields. The association holds in every
survey year and with district fixed effects.

<!-- however --- a comment is not prose and is never audited. -->

Irrigation is the main public input in dryland farming. Governments spend more on canals than on
any other rural asset. This paper asks how yields move with irrigated area.

## Data

Yields come from an annual farm survey of U.S. districts.[^1] The survey reports output and
planted area for each farm. Dividing output by area gives the yield in tonnes per hectare.

The estimating equation relates the log yield to the irrigated share $s_{dt}$ of district $d$ in
year $t$:
$$
\ln y_{dt} = \beta s_{dt} + \alpha_d + \tau_t + \varepsilon_{dt}.
$$
Here $\alpha_d$ is a district fixed effect, $\tau_t$ a year effect and $\varepsilon_{dt}$ the
error term.

The sample keeps three kinds of districts:

- districts observed in every survey year;
- districts with at least ten sampled farms;
- districts whose borders did not change.
  Each restriction removes fewer than five percent of the farms.

## Results

A higher irrigated share goes with higher yields. Table 1 reports the estimates. The estimate is
0.42 with district and year effects, e.g. a rise of ten points in the share goes with a yield
about four percent higher. Rainfall cannot explain the pattern, because the estimate is the same
in wet and dry years.

| Variable        | (1)    | (2)  |
|-----------------|--------|------|
| Irrigated share | 0.42   | 0.39 |
|                 | (0.08) | ---  |

The estimates come from the survey waves of May 2010 to 2020. The data section describes the
waves in full.

> However, as one reviewer wrote --- a quotation is not audited.

```text
however --- code is not audited
```

[^1]: The survey samples about *one farm in forty*. Weights restore the population totals.
