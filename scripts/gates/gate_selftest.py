#!/usr/bin/env python3
"""Self-test a gate: break what it guards, in a throwaway mirror, and watch it go red.

A gate that has never been seen red is not a gate. This harness copies only
the files a gate reads into a temporary mirror under the system temp
directory, confirms every gate is green there, then applies each perturbation
from a JSON spec, runs the gates, and restores the files. Each perturbation
must turn at least one gate red. Right after every restore, each file the
perturbation touched must be byte for byte what it was; at the end the whole
mirror is compared with its starting state, any file a gate created in it is
listed, and a last run must be green again. The mirror is deleted at the end.
The live files are never written, and the harness checks that they did not
change.

Usage
-----
    python3 gate_selftest.py spec.json [--keep] [--only LABEL_REGEX]

Exit code 0 when every perturbation behaved as expected and the mirror came
back green, 1 on any gap (a MISS, a false red, a loosened check, a failed
restore), 2 on a spec or setup error (including a baseline that is not
green: a red gate cannot be self-tested). Python 3 standard library only.

The spec
--------
    {
      "root": ".",                        # the live project root, relative to this JSON file
      "copy": ["paper.tex", "tables/", "results/", "example_gate.py"],
      "gates": [
        {"name": "claims", "cmd": ["{python}", "example_gate.py"]},
        {"name": "digits", "cmd": ["{python}", "{gates}/mirror_digit_fidelity.py",
                                   "--pair", "paper.tex", "paper_zh.tex"]}
      ],
      "timeout": 900,                     # seconds per gate run
      "max_mb": 200,                      # refuse to build a bigger mirror
      "compare": [["claims_before", "claims"]],   # optional, see below
      "perturbations": [
        {"label": "coefficient changed in the prose",
         "file": "paper.tex", "old": "is $-$0.215,", "new": "is $-$0.225,"},
        {"label": "a paragraph re-wrapped", "expect": "green",
         "file": "paper.tex", "old": "on class size", "new": "on\\nclass size"},
        {"label": "the same stale count in both languages",
         "edits": [{"file": "paper.tex", "old": "12,480 pupils", "new": "12,512 pupils"},
                   {"file": "paper_zh.tex", "old": "12,480名", "new": "12,512名"}]},
        {"label": "a regex edit", "file": "paper.tex", "regex": "0\\.215(?=\\$\\^)", "new": "0.205"},
        {"label": "the output moved",
         "csv": "results/current/estimates.csv", "match": {"spec": "baseline", "est": "IV"},
         "column": "coef", "value": "-0.2253"}
      ]
    }

Each gate runs with the mirror as its working directory. In "cmd", {python}
is this interpreter, {gates} is the folder that holds this script, and
{mirror} is the mirror root. The environment carries GATES_DIR (the same
folder, so a gate file can import claims_gate_template) and
PYTHONDONTWRITEBYTECODE=1 (nothing is written next to the live tools).

A gate's verdict is its exit code: 0 green, 1 red, anything else (a timeout,
or exit 1 with a Python traceback) a crash. A crash still counts as red, so
the perturbation is not called a MISS, but it is labelled CRASH: a crash
hides every other check's result, so a gate should record a lost anchor as a
FAIL and go on (claims_gate_template does). A gate that prints mismatches
and exits 0 can never be red here: fix the gate.

An edit given as "old"/"new" must match exactly once ("count" to change
that), with any run of whitespace in "old" matching any run of whitespace in
the file, so a re-wrapped paragraph still matches. "regex" edits use Python
re syntax with re.M; their "new" is inserted literally, so LaTeX such as
\\times or \\footnote survives as written. Set "groups": true to expand \\1
and \\g<name> in "new" instead (then double every other backslash). A "csv"
edit sets one column on the single row whose key columns equal "match"; zero
or two matching rows is a spec error. "expect": "green" marks a perturbation
that must NOT turn any gate red (a re-wrap, a reordered comment): it tests
for false reds.

Testing a retarget for loosening
--------------------------------
Gates marked "counts": false run and are reported but do not decide the
verdict. Keep the approved version of a gate as such a reference and list
[approved, retargeted] under "compare". The comparison is per check, not per
gate: for each perturbation, every check that fails under the approved gate
and passes under the retargeted one is reported as LOOSENED, even when some
other check still turns the retargeted gate red. A failing check is keyed by
its FAIL line: by default "FAIL <where> <label>" as claims_gate_template
prints it (the text after two spaces is the shown value and is ignored);
give a gate "fail_key": a regex whose first group is the key, matched against
each line of its output, for another format. Keep a check's label when you
retarget it: a renamed check is reported as loosened. A perturbation the
approved gate catches and the retargeted one passes as a whole is LOOSENED
too, whatever the keys.

Guards
------
* A gate command that names the live root by absolute path is refused. A
  gate that reads the main checkout passes every mirror test because it never
  reads the mirror. If a perturbation is a MISS, check that first.
* Files are copied, never symlinked, so no edit can reach the live tree
  through a link; a perturbed path that resolves outside the mirror is refused.
* The mirror is bounded by max_mb. Mirrors left behind fill a disk fast: this
  one is deleted at the end unless --keep is given.
"""
import argparse
import csv
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SUMMARY = re.compile(r"\d+\s+(?:checks?|pairs?|numbers scanned)\b.*", re.I)
FAIL_KEY = r"^FAIL\s+(\S+\s+.*?)(?:\s{2,}|$)"
TRACEBACK = "Traceback (most recent call last):"


class SpecError(Exception):
    pass


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def walk_files(top):
    for d, _, files in os.walk(top):
        for f in files:
            yield os.path.join(d, f)


# ---------------------------------------------------------------- the mirror
def plan_copy(root, entries):
    """[(live path, relative path)] for every file the spec asks for."""
    out = []
    for e in entries:
        src = os.path.normpath(os.path.join(root, e))
        if not (src == root or src.startswith(root + os.sep)):
            raise SpecError("copy entry outside the root: %s" % e)
        if os.path.isdir(src):
            for f in walk_files(src):
                if "__pycache__" in f.split(os.sep):
                    continue
                out.append((f, os.path.relpath(f, root)))
        elif os.path.isfile(src):
            out.append((src, os.path.relpath(src, root)))
        else:
            raise SpecError("copy entry not found: %s" % e)
    return out


def build_mirror(files, max_mb):
    size = sum(os.path.getsize(f) for f, _ in files)
    if size > max_mb * 1024 * 1024:
        raise SpecError("mirror would be %.3f MB, above max_mb %s; copy fewer files" % (size / 1048576.0, max_mb))
    mirror = tempfile.mkdtemp(prefix="gate_selftest_")
    for src, rel in files:
        dst = os.path.join(mirror, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)   # follows a symlink: the mirror holds a private copy
    return mirror, size


def inside(mirror, rel):
    p = os.path.realpath(os.path.join(mirror, rel))
    m = os.path.realpath(mirror)
    if not p.startswith(m + os.sep):
        raise SpecError("perturbed path resolves outside the mirror: %s" % rel)
    if not os.path.isfile(p):
        raise SpecError("perturbed file is not in the mirror (add it to 'copy'): %s" % rel)
    return p


# ---------------------------------------------------------------- the gates
def gate_cmd(cmd, mirror):
    return [t.replace("{python}", sys.executable).replace("{gates}", HERE).replace("{mirror}", mirror) for t in cmd]


def fail_keys(gate, lines):
    """The keys of the failing checks a gate printed (see the docstring)."""
    rx = re.compile(gate.get("fail_key", FAIL_KEY))
    keys = set()
    for l in lines:
        m = rx.search(l)
        if m:
            keys.add(re.sub(r"\s+", " ", (m.group(1) if m.groups() else m.group(0)).strip()))
    return frozenset(keys)


def run_gate(gate, mirror, timeout):
    """(status, note, failing-check keys) for one run of one gate."""
    env = dict(os.environ, GATES_DIR=HERE, PYTHONDONTWRITEBYTECODE="1")
    try:
        p = subprocess.run(gate_cmd(gate["cmd"], mirror), cwd=mirror, env=env,
                           capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return "crash", "timeout after %ss" % timeout, frozenset()
    except OSError as e:
        return "crash", str(e), frozenset()
    lines = [l.rstrip() for l in p.stdout.splitlines() if l.strip()]
    summ = [l.strip() for l in lines if SUMMARY.match(l.strip())]
    note = summ[-1] if summ else (lines[-1].strip() if lines else "")
    tail = " ".join(p.stderr.strip().splitlines()[-2:])[-160:]
    if p.returncode == 0:
        return "green", note, frozenset()
    if p.returncode == 1 and TRACEBACK not in p.stderr:
        return "red", note, fail_keys(gate, lines)
    return "crash", "exit %d: %s" % (p.returncode, tail or note), frozenset()


def run_all(gates, mirror, timeout):
    return {g["name"]: run_gate(g, mirror, timeout) for g in gates}


def show(res):
    return "; ".join("%s %s (%s)" % (n, s, note[:90]) for n, (s, note, _) in res.items())


# ---------------------------------------------------------------- edits
def flex(old):
    return re.compile(r"\s+".join(re.escape(w) for w in old.split()))


def apply_edit(mirror, e):
    """Apply one edit in the mirror; return (path, original bytes)."""
    if "csv" in e:
        path = inside(mirror, e["csv"])
        with open(path, "rb") as fh:
            orig = fh.read()
        text = orig.decode("utf-8")
        rows = list(csv.DictReader(io.StringIO(text, newline="")))
        if not rows or e["column"] not in rows[0]:
            raise SpecError("%s: no column %r" % (e["csv"], e["column"]))
        hit = [r for r in rows if all(r.get(k) == str(v) for k, v in e["match"].items())]
        if len(hit) != 1:
            raise SpecError("%s: %d rows match %s (need exactly 1)" % (e["csv"], len(hit), e["match"]))
        hit[0][e["column"]] = str(e["value"])
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=list(rows[0].keys()), lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
        new = buf.getvalue().encode("utf-8")
    else:
        path = inside(mirror, e["file"])
        with open(path, "rb") as fh:
            orig = fh.read()
        text = orig.decode("utf-8")
        want = int(e.get("count", 1))
        if "regex" in e:
            rx = re.compile(e["regex"], re.M)
            found = len(rx.findall(text))
            if found != want:
                raise SpecError("%s: regex matches %d times (need %d): %s" % (e["file"], found, want, e["regex"][:50]))
            if e.get("groups"):
                new = rx.sub(lambda m: m.expand(e["new"]), text).encode("utf-8")
            else:
                new = rx.sub(lambda m: e["new"], text).encode("utf-8")   # literal: \times stays \times
        else:
            rx = flex(e["old"])
            found = len(rx.findall(text))
            if found != want:
                raise SpecError("%s: 'old' matches %d times (need %d): %s" % (e["file"], found, want, e["old"][:50]))
            new = rx.sub(lambda m: e["new"], text).encode("utf-8")
    if new == orig:
        raise SpecError("edit changes nothing: %s" % (e.get("label") or e.get("old") or e.get("regex") or e.get("csv")))
    with open(path, "wb") as fh:
        fh.write(new)
    return path, orig


def edits_of(p):
    if "edits" in p:
        return p["edits"]
    return [{k: v for k, v in p.items() if k not in ("label", "expect")}]


def restore(done):
    """Write back every touched file; return those not byte for byte their original."""
    for path, orig in reversed(done):
        with open(path, "wb") as fh:
            fh.write(orig)
    first = {}
    for path, orig in done:          # two edits to one file: the first original is the file's
        first.setdefault(path, orig)
    bad = []
    for path, orig in first.items():
        with open(path, "rb") as fh:
            if fh.read() != orig:
                bad.append(path)
    return bad


def loosened(compare, outcomes):
    """[(approved, retargeted, perturbation label, what loosened)], per check."""
    out = []
    for a, b in compare:
        for label, res in outcomes:
            sa, _, ka = res[a]
            sb, _, kb = res[b]
            if sa != "green" and sb == "green":
                out.append((a, b, label, "the whole gate"))
            elif sa == "red" and sb == "red":
                for k in sorted(ka - kb):
                    out.append((a, b, label, "check '%s'" % k))
    return out


# ---------------------------------------------------------------- main
def load_spec(path):
    with open(path, encoding="utf-8") as fh:
        spec = json.load(fh)
    base = os.path.dirname(os.path.abspath(path))
    given = os.path.abspath(os.path.join(base, spec.get("root", ".")))
    spec["root"] = os.path.realpath(given)
    for k in ("copy", "gates", "perturbations"):
        if not spec.get(k):
            raise SpecError("spec needs a non-empty '%s'" % k)
    names = [g["name"] for g in spec["gates"]]
    if len(set(names)) != len(names):
        raise SpecError("gate names must be unique")
    for g in spec["gates"]:
        for t in g["cmd"]:
            live = spec["root"] in t or given in t or (
                os.path.isabs(t) and (os.path.realpath(t) + os.sep).startswith(spec["root"] + os.sep))
            if live:
                raise SpecError("gate %r names the live root %s; use paths relative to the mirror" % (g["name"], spec["root"]))
        if "fail_key" in g:
            re.compile(g["fail_key"])
    for a, b in spec.get("compare", []):
        if a not in names or b not in names:
            raise SpecError("compare names an unknown gate: %s, %s" % (a, b))
    if not any(g.get("counts", True) for g in spec["gates"]):
        raise SpecError("at least one gate must count toward the verdict")
    return spec


def main(argv=None):
    ap = argparse.ArgumentParser(description="Self-test gates by perturbation in a temporary mirror.")
    ap.add_argument("spec", help="JSON spec (see the module docstring)")
    ap.add_argument("--keep", action="store_true", help="keep the mirror for inspection")
    ap.add_argument("--only", help="run only perturbations whose label matches this regex")
    args = ap.parse_args(argv)

    try:
        spec = load_spec(args.spec)
        files = plan_copy(spec["root"], spec["copy"])
    except (OSError, ValueError, SpecError, re.error) as e:
        print("spec error: %s" % e, file=sys.stderr)
        return 2
    live0 = {f: sha(f) for f, _ in files}
    timeout = float(spec.get("timeout", 900))
    gates = spec["gates"]
    counting = [g["name"] for g in gates if g.get("counts", True)]
    perts = [p for p in spec["perturbations"] if not args.only or re.search(args.only, p.get("label", ""))]

    try:
        mirror, size = build_mirror(files, float(spec.get("max_mb", 200)))
    except (OSError, SpecError) as e:
        print("setup error: %s" % e, file=sys.stderr)
        return 2
    print("mirror: %s (%d files, %.2f MB)" % (mirror, len(files), size / 1048576.0))
    gaps, outcomes = 0, []
    try:
        mir0 = {f: sha(f) for f in walk_files(mirror)}
        base = run_all(gates, mirror, timeout)
        print("baseline: " + show(base))
        if any(s != "green" for s, _, _ in base.values()):
            print("baseline is not green: a red gate cannot be self-tested. Fix the gate or the text first.")
            return 2
        for p in perts:
            label = p.get("label") or "(unlabelled)"
            expect = p.get("expect", "red")
            done, bad = [], []
            try:
                for e in edits_of(p):
                    done.append(apply_edit(mirror, e))
                res = run_all(gates, mirror, timeout)
            except (SpecError, KeyError, UnicodeDecodeError, re.error) as e:
                res = None
                err = str(e)
            finally:
                bad = restore(done)
            if bad:
                gaps += 1
                print("RESTORE   %-52s not byte for byte after restore: %s"
                      % (label[:52], ", ".join(os.path.relpath(f, os.path.realpath(mirror)) for f in bad)))
            if res is None:
                gaps += 1
                print("SKIP      %-52s spec error: %s" % (label[:52], err))
                continue
            red = any(res[n][0] != "green" for n in counting)
            if expect == "green":
                tag = "OK" if not red else "FALSE-RED"
            else:
                tag = ("RED" if red else "MISS")
                if red and all(res[n][0] in ("green", "crash") for n in counting) and any(res[n][0] == "crash" for n in counting):
                    tag = "RED/CRASH"
            if tag in ("MISS", "FALSE-RED"):
                gaps += 1
            outcomes.append((label, res))
            print("%-9s %-52s %s" % (tag, label[:52], show(res)))
            if tag == "MISS":
                print("          no counting gate went red. Does the check exist? Does the gate read the mirror"
                      " (relative paths, no absolute path into the live tree)? Does it exit 1 on a fail?")
        loose = loosened(spec.get("compare", []), outcomes)
        for a, b, label, what in loose:
            print("LOOSENED  %s catches it, %s does not (%s): %s" % (a, b, what, label))
        gaps += len(loose)
        end = run_all(gates, mirror, timeout)
        print("restored: " + show(end))
        if any(s != "green" for s, _, _ in end.values()):
            gaps += 1
        now = set(walk_files(mirror))
        bad = [os.path.relpath(f, mirror) for f, h in mir0.items() if f not in now or sha(f) != h]
        made = sorted(os.path.relpath(f, mirror) for f in now - set(mir0))
        print("mirror restored byte for byte: %s" % ("yes" if not bad else "NO " + ", ".join(bad[:5])))
        if made:
            print("files a gate created in the mirror (not a gap; a gate that writes state can change later runs): %s"
                  % ", ".join(made[:5]))
        gaps += bool(bad)
    finally:
        if args.keep:
            print("mirror kept: %s" % mirror)
        else:
            shutil.rmtree(mirror, ignore_errors=True)
    changed = [f for f, h in live0.items() if sha(f) != h]
    print("live files untouched: %s" % ("yes" if not changed else "NO " + ", ".join(changed[:5])))
    gaps += bool(changed)
    print("\n%d perturbations; %s" % (len(perts), "all as expected" if not gaps else "SELF-TEST GAPS: %d" % gaps))
    return 1 if gaps else 0


if __name__ == "__main__":
    sys.exit(main())
