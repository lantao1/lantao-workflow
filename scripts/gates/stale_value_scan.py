#!/usr/bin/env python3
"""Find numbers left behind by a rerun: values only the retired output explains.

When the estimation is rerun (new data, a corrected variable, a new
specification), every number in the text has to move to the new output. A
claims gate checks only the numbers someone wrote a check for, so an
unchecked number from the old run can stand in the text with every gate
green. A mirror check does not help either: if both languages were updated
before the rerun, they agree with each other and both are stale.

This scan is the general test for that failure. It reads every value in the
CURRENT output and every value in the RETIRED output, then reports each
number printed in the text that the retired output explains and the current
output does not. Such a number is either stale or a coincidence, and both are
worth a look.

Usage
-----
    python3 stale_value_scan.py --text paper.tex --text paper_zh.tex \\
        --current output/run_new --retired output/run_old \\
        [--current extra_current.csv] [--follow-inputs] [--min-decimals 2] \\
        [--min-abs 1] [--ignore REGEX] [--exceptions exceptions.json]

--current and --retired take a directory (every *.csv in it, not recursive)
or a single CSV file, and both can be repeated. Pass every source the text
legitimately draws on as --current: descriptive tables, values derived from
the panel and never exported, products and percents a script computes. A
quantity the pipeline computes but never writes to a CSV is out of scope
until it is written to one, and the scan cannot say so on its own.

exceptions.json maps a printed value to the reason it is not stale:

    {"2,000": "a count fixed by the sample design, not read from any output;
               it matches a retired diagnostic only by chance"}

Every exception must name the quantity the text means and why the retired
output matches it. An exception without a reason is refused.

Exit code 0 when nothing stale is found, 1 when something is, 2 on a usage
or file error. Python 3 standard library only.

How a printed number is matched
-------------------------------
* Precision. A token printed with d decimals is compared with every output
  value rounded to d decimals, both as a float formats it and rounded half
  up from its shortest decimal form, since generators differ. Signs are
  ignored, since a text may print a minus as $-$ or a dash.
* Counts. Comma-grouped integers (12,480) are compared with whole-number
  output values of 1,000 or more, comma-grouped. A count followed by a comma
  ("N = 12,480, of whom ...") is scanned too: that is where a stale sample
  size sits.
* Intervals. A CSV cell such as "[-.512, 2.904]" contributes both endpoints.
  In the text, a decimal after a list or thin-space comma ([0.12,\\,0.34]) is
  scanned; a digit-comma before it is read as a thousands separator only
  when the digits after it form a group of exactly three (1,416.5).
* Skipped: comments, LaTeX dimensions (3.5cm), and plain integers without
  commas (years, counts in words). A percent is escaped only after an odd
  number of backslashes: 10\\% is text, while a\\\\% note after a line break
  is a comment, and a comment that records an old value is the project's
  history, not a claim. A sentence-final period is not read as a decimal
  point.

Known limits
------------
* A value printed at one decimal is often explained by both runs by chance.
  Raise --min-decimals, or bind such a value by name in the claims gate.
* Shares and p values below one collide often. --min-abs 1 drops them when
  the noise outweighs the signal.
* A share printed as a percent (35 percent from 0.352) is not matched here.
  Bind it in the claims gate, where the arithmetic is written out.
* A comma-grouped decimal (1,416.5) is not scanned at all.
* A gate that cries wolf gets switched off. Keep the ignore list short, and
  give every exception its reason.
* A reported line number is the line in the file, preamble included. With
  --follow-inputs, lines from an \\input onward are counted in the text with
  the fragment spliced in, so they are shifted by the fragment's length.
"""
import argparse
import csv
import decimal
import json
import os
import re
import sys

# A decimal: no digit or point on either side; a digit-comma before it only when
# it would be the three-digit tail of a thousands group (1,416.5). A comma after a
# decimal cannot continue it, so both ends of [0.12,0.34] and [0.12,\,0.34] are scanned.
DEC = re.compile(r"(?<![\d.])(?!(?<=\d,)\d{3}\.)\d+\.\d+(?!\d)(?!\.\d)")
# A comma-grouped count; a comma after it is allowed unless a digit follows,
# so "12,480, of whom" is scanned.
CNT = re.compile(r"(?<![\d.])(?<!\d,)\d{1,3}(?:,\d{3})+(?!\d)(?!,\d)(?!\.\d)")
DIM = re.compile(r"\d+(?:\.\d+)?(?:cm|mm|in|pt|em|ex|bp|sp)\b")
INPUT = re.compile(r"\\input\{([^}]+)\}")


def csv_files(src):
    if os.path.isdir(src):
        return sorted(os.path.join(src, f) for f in os.listdir(src) if f.endswith(".csv"))
    if os.path.isfile(src):
        return [src]
    raise FileNotFoundError(src)


def output_values(sources):
    """Every number in the CSVs, as absolute values (float, shortest text)."""
    vals = {}
    for src in sources:
        for path in csv_files(src):
            with open(path, newline="", encoding="utf-8") as fh:
                for row in csv.reader(fh):
                    for c in row:
                        toks = [c.strip()]
                        try:
                            float(toks[0])
                        except ValueError:
                            toks = re.findall(r"-?\d*\.\d+|-?\d+", c)
                        for tok in toks:
                            try:
                                v = abs(float(tok))
                            except ValueError:
                                continue
                            if v == v and v != float("inf"):
                                vals[v] = tok.lstrip("+-")
    return vals


def _half_up(text, d):
    try:
        q = decimal.Decimal(text).quantize(decimal.Decimal(1).scaleb(-d), rounding=decimal.ROUND_HALF_UP)
    except (decimal.InvalidOperation, ValueError):
        return None
    return format(q, "f")


class Family:
    """Printed forms of one run's values, built lazily per precision."""

    def __init__(self, values):
        self.values = values
        self._dec = {}
        self.counts = {format(int(v), ",") for v in values if v == int(v) and v >= 1000}

    def at(self, d):
        if d not in self._dec:
            forms = set()
            for v, text in self.values.items():
                forms.add(format(v, ".%df" % d))
                h = _half_up(text, d)
                if h is not None:
                    forms.add(h)
            self._dec[d] = forms
        return self._dec[d]

    def explains(self, token):
        if "," in token:
            return token in self.counts
        return token in self.at(len(token.split(".")[1]))


def code_only(line):
    """The part of a LaTeX line before its first comment. A percent is escaped
    only after an odd number of backslashes (10\\% is text, \\\\% starts a
    comment after a line break)."""
    i = 0
    while True:
        j = line.find("%", i)
        if j < 0:
            return line
        k = j
        while k > 0 and line[k - 1] == "\\":
            k -= 1
        if (j - k) % 2:
            i = j + 1
            continue
        return line[:j]


def expand_inputs(text, base, depth=0):
    if depth > 5:
        return text

    def sub(m):
        p = os.path.normpath(os.path.join(base, m.group(1)))
        if not p.endswith(".tex"):
            p += ".tex"
        try:
            with open(p, encoding="utf-8") as fh:
                return expand_inputs(fh.read(), os.path.dirname(p), depth + 1)
        except OSError:
            return m.group(0)
    return INPUT.sub(sub, text)


def text_lines(path, follow_inputs):
    with open(path, encoding="utf-8") as fh:
        raw = fh.read()
    # the preamble is kept as blank lines, so a reported line number is the file's
    if r"\begin{document}" in raw:
        pre, post = raw.split(r"\begin{document}", 1)
        body = "\n" * pre.count("\n") + post
    else:
        body = raw
    # strip comments line by line first, so a commented \input is not followed
    lines = [code_only(line) for line in body.split("\n")]
    if follow_inputs:
        joined = expand_inputs("\n".join(lines), os.path.dirname(os.path.abspath(path)))
        lines = [code_only(line) for line in joined.split("\n")]
    return lines


def main(argv=None):
    ap = argparse.ArgumentParser(description="Report numbers that only the retired output explains.")
    ap.add_argument("--text", action="append", required=True, help="a manuscript file; repeat for more")
    ap.add_argument("--current", action="append", required=True, help="current output: a dir of CSVs or a CSV")
    ap.add_argument("--retired", action="append", required=True, help="retired output: a dir of CSVs or a CSV")
    ap.add_argument("--follow-inputs", action="store_true", help="splice \\input{} fragments into the text")
    ap.add_argument("--min-decimals", type=int, default=1, help="scan decimals with at least this many places")
    ap.add_argument("--min-abs", type=float, default=0.0, help="skip printed values below this magnitude")
    ap.add_argument("--no-counts", action="store_true", help="do not scan comma-grouped counts")
    ap.add_argument("--ignore", action="append", default=[], help="regex of printed values never reported")
    ap.add_argument("--exceptions", help="JSON {value: reason} of values checked by hand")
    args = ap.parse_args(argv)

    try:
        cur = Family(output_values(args.current))
        old = Family(output_values(args.retired))
    except FileNotFoundError as e:
        print("error: output not found: %s" % e, file=sys.stderr)
        return 2
    exceptions = {}
    if args.exceptions:
        try:
            with open(args.exceptions, encoding="utf-8") as fh:
                exceptions = json.load(fh)
        except (OSError, ValueError) as e:
            print("error: cannot read exceptions %s: %s" % (args.exceptions, e), file=sys.stderr)
            return 2
        empty = [k for k, v in exceptions.items() if not str(v).strip()]
        if empty:
            print("error: exceptions without a reason: %s" % ", ".join(empty), file=sys.stderr)
            return 2
    ignore = [re.compile(r) for r in args.ignore]

    hits, scanned, excused = 0, 0, set()
    for path in args.text:
        if not os.path.isfile(path):
            print("error: file not found: %s" % path, file=sys.stderr)
            return 2
        seen = set()
        for n, line in enumerate(text_lines(path, args.follow_inputs), 1):
            code = DIM.sub("", line)
            toks = [m for m in DEC.finditer(code) if len(m.group(0).split(".")[1]) >= args.min_decimals]
            if not args.no_counts:
                toks += list(CNT.finditer(code))
            for m in toks:
                v = m.group(0)
                if float(v.replace(",", "")) < args.min_abs:
                    continue
                scanned += 1
                if cur.explains(v) or not old.explains(v):
                    continue
                if any(r.fullmatch(v) for r in ignore):
                    continue
                if v in exceptions:
                    excused.add(v)
                    continue
                ctx = " ".join(code[max(0, m.start() - 70):m.end() + 50].split())
                if (v, ctx) in seen:
                    continue
                seen.add((v, ctx))
                hits += 1
                print("STALE %s:%d [%s] ...%s..." % (os.path.basename(path), n, v, ctx))
    for v in sorted(excused):
        print("EXCUSED [%s] %s" % (v, exceptions[v]))
    print("\n%d numbers scanned in %d file(s); %d value(s) explained only by the retired output"
          % (scanned, len(args.text), hits))
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main())
