#!/usr/bin/env python3
"""Example claims gate for the toy two-language paper in this folder.

Every number and the paper is invented. It shows how a project gate binds the
text to the output with claims_gate_template.py:

    python3 example_gate.py            # every check green on the shipped files
    python3 example_gate.py --loose    # the school-count check retargeted to a
                                       # substring test under the same label: a
                                       # loosened gate, used by
                                       # perturbations_loose.json to show what
                                       # gate_selftest.py reports for it

Paths are resolved from this file's own folder, never from an absolute path,
so the gate reads whatever copy it sits in (a self-test mirror included).
The template is imported from GATES_DIR when set (gate_selftest.py sets it),
else from the scripts/gates folder two levels up.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ.get("GATES_DIR") or os.path.normpath(os.path.join(HERE, "..", "..")))
from claims_gate_template import Gate, Table, fmt  # noqa: E402

LOOSE = "--loose" in sys.argv[1:]
LEVEL_EN = ((0.01, "one"), (0.05, "five"), (0.10, "ten"))
LEVEL_ZH = ((0.01, "一"), (0.05, "五"), (0.10, "十"))


def level(p, words):
    """The significance level a sentence must name for this p value. A p value
    that is not significant (or a lookup that failed) gives a word no sentence
    contains, so the sentence check fails and the run goes on."""
    for cut, w in words:
        if p < cut:
            return w
    return "<not significant: p=%s>" % p


g = Gate(root=HERE)
g.load("en", "paper.tex")
g.load("zh", "paper_zh.tex", cjk=True)
est = Table(g.path("results/current/estimates.csv"))
desc = Table(g.path("results/current/descriptives.csv"))

M = "$-$"                                             # the minus sign the text prints
BASE_OLS = {"spec": "baseline", "est": "OLS"}
BASE_IV = {"spec": "baseline", "est": "IV"}
CTRL_IV = {"spec": "controls", "est": "IV"}
ols = g.get(est, "coef", BASE_OLS)
iv = g.get(est, "coef", BASE_IV)
ivc = g.get(est, "coef", CTRL_IV)
se_iv = g.get(est, "se", BASE_IV)
p_ols = g.get(est, "p", BASE_OLS)
p_iv = g.get(est, "p", BASE_IV)
p_ivc = g.get(est, "p", CTRL_IV)
mean = g.get(desc, "value", {"stat": "mean_score"})
n_pupils = fmt(g.get(desc, "value", {"stat": "n_pupils"}), ",.0f")
n_schools = fmt(g.get(desc, "value", {"stat": "n_schools"}), ".0f")

# the magnitude, computed from the unrounded coefficient and shown with its arithmetic
gain = 5 * abs(iv)
lo, hi = 5 * (abs(iv) - 1.96 * se_iv), 5 * (abs(iv) + 1.96 * se_iv)
V = {
    "ols": fmt(ols, ".3f", M), "iv": fmt(iv, ".3f", M), "ivc": fmt(ivc, ".3f", M),
    "coef4": fmt(abs(iv), ".4f"), "gain": fmt(gain, ".2f"),
    "pct": fmt(100 * gain / mean, ".1f"), "mean": fmt(mean, ".2f"),
    "lo": fmt(lo, ".2f"), "hi": fmt(hi, ".2f"),
    "n": n_pupils, "s": n_schools,
}

# ---- English ---------------------------------------------------------------
KING = "Smaller classes go with higher test scores."
S_OLS = r"In the baseline the coefficient on class size is {ols} (Table~\ref{{tab:main}}, column (1))."
S_IV = "With the instrument it is {iv}, significant at the {lvl} percent level."
S_GAIN = (r"A class smaller by five pupils is associated with a score higher by {gain} points "
          r"(5 $\times$ {coef4}), about {pct}\% of the mean score.\footnote{{The mean score is {mean} points.}}")
S_CTRL = "With the control variables the instrumented coefficient is {ivc}, significant at the {lvl} percent level."
S_CI = r"In the baseline, the 95\% confidence interval of the five-pupil score gain is [{lo},\,{hi}] points."

g.count("en", "the king once", KING, 1)
g.sentence("en", "baseline OLS in its sentence", S_OLS, **V)
g.sentence("en", "IV with its significance word", S_IV, lvl=level(p_iv, LEVEL_EN), **V)
g.in_sentence("en", "IV inside the instrument sentence", "With the instrument it is", V["iv"])
g.sentence("en", "magnitude with its arithmetic", S_GAIN, **V)
g.closed_paragraph("en", "the results paragraph is closed", [
    KING, S_OLS.format(**V), S_IV.format(lvl=level(p_iv, LEVEL_EN), **V), S_GAIN.format(**V)],
    followed_by="With the control variables")
g.footnote_only("en", "the mean lives in the footnote", "The mean score is {mean} points.".format(**V))
g.sentence("en", "controls IV with its significance word", S_CTRL, lvl=level(p_ivc, LEVEL_EN), **V)
g.sentence("en", "interval in its sentence", S_CI, **V)
for end in ("lo", "hi"):
    g.in_sentence("en", "interval %s inside its sentence" % end, "confidence interval of the five-pupil", V[end])
g.number("en", "IV printed exactly twice (prose, table)", V["iv"], n=2)
g.value("en", "first-stage F, baseline", est, "kpF", BASE_IV, ".2f")
g.value("en", "first-stage F, controls", est, "kpF", CTRL_IV, ".2f")
g.number("en", "pupils", V["n"])
if LOOSE:
    # the retarget a careless edit would make: same label, a substring test, true of "1,416" too
    g.check("en", "schools", V["s"], V["s"] in g.docs["en"].text())
else:
    g.number("en", "schools", V["s"])
g.sentence("en", "sample in its sentence", "The sample holds {n} pupils in {s} schools.", **V)
for label, c, p in (("stars OLS", ols, p_ols), ("stars IV", iv, p_iv), ("stars IV controls", ivc, p_ivc)):
    g.stars("en", label, fmt(c, ".3f", M), p)
g.absence("en", "retired wording (causal verb)", "Smaller classes raise test scores.")
g.absence("en", "no hedge on a significant estimate", r"(?i)\bonly (?:marginally|weakly) significant\b", regex=True)

# ---- the translated mirror (checked on its own; English never matches it) ---
ZKING = "班级越小，考试成绩越高。"
Z_OLS = r"基准估计中班级规模的系数为{ols}（表~\ref{{tab:main}}第(1)列）。"
Z_IV = "使用工具变量后系数为{iv}，在百分之{lvl}水平显著。"
Z_GAIN = (r"班级人数少五人，对应的成绩高出{gain}分（5 $\times$ {coef4}），约为平均成绩的{pct}\%。"
          r"\footnote{{平均成绩为{mean}分。}}")
Z_CI = r"基准估计中，班级人数少五人对应的成绩增益的95\%置信区间为[{lo}, {hi}]分。"
g.sentence("zh", "baseline OLS in its sentence", Z_OLS, **V)
g.sentence("zh", "IV with its significance word", Z_IV, lvl=level(p_iv, LEVEL_ZH), **V)
g.sentence("zh", "magnitude with its arithmetic", Z_GAIN, **V)
g.closed_paragraph("zh", "the results paragraph is closed", [
    ZKING, Z_OLS.format(**V), Z_IV.format(lvl=level(p_iv, LEVEL_ZH), **V), Z_GAIN.format(**V)],
    followed_by="加入控制变量后")
g.footnote_only("zh", "the mean lives in the footnote", "平均成绩为{mean}分。".format(**V))
g.sentence("zh", "controls IV with its significance word",
           "加入控制变量后，工具变量估计的系数为{ivc}，在百分之{lvl}水平显著。", lvl=level(p_ivc, LEVEL_ZH), **V)
g.sentence("zh", "interval in its sentence", Z_CI, **V)
for end in ("lo", "hi"):    # whitespace-blind: [0.45, 1.70] is read as [0.45,1.70]
    g.in_sentence("zh", "interval %s inside its sentence" % end, "置信区间", V[end])
g.sentence("zh", "sample in its sentence", "样本包括{s}所学校的{n}名学生。", **V)

sys.exit(g.report())
