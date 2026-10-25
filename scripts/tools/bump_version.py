#!/usr/bin/env python3
"""bump_version.py - move a document to its next version, and move every pointer with it.

The old file is never touched: it stays on disk as the record of what the reader saw. What
changes is which file the tools read. A version bump that is done by hand misses a tool sooner
or later, and a gate that still reads the old version validates new claims against a stale
file while it reports green.

Usage:
    python3 bump_version.py OLD [NEW] [--also FILE ...] [--pointers FILE ...]
                            [--pointers-file LIST] [--rewrite-self] [--dry-run]
    python3 bump_version.py --check DIR [--pointers FILE ...] [--pointers-file LIST]

    OLD             the current file, named STEM_vK.ext (e.g. drafts/paper_v3.tex).
    NEW             the new file (default: STEM_v(K+1).ext beside OLD). If it already exists
                    it is left alone and only the pointers move.
    --also FILE     a companion file whose name contains STEM_vK (a translation, an outline,
                    a reply letter); it is copied the same way (repeatable).
    --pointers      tool or config files that name the document by version (repeatable).
    --pointers-file a text file listing those files, one path per line ('#' comments); paths
                    are relative to the list file. Keep this list complete: it is the point.
    --rewrite-self  also replace STEM_vK by the new name inside the new copy (off by default:
                    a copy is a copy).
    --dry-run       report what would change and write nothing.
    --check DIR     report every pointer that names a version other than the newest file of
                    the same stem in DIR (an older one, or one newer than any file), and every
                    pointer that names a file in DIR that is not there. Runs after every bump.

A pointer is any token NAME_vN in a pointer file. A file name NAME_vN....ext in it names a file
in DIR when its path ends in DIR's folder name, or when it has no path and its stem lives in DIR;
that file must exist. Replacement respects word boundaries, so paper_v3 never matches inside
paper_v30, paper_v3b or old_paper_v3. Both a bump and --check need the pointer list: with an
empty one the tool stops (exit 2), because a check of nothing passes by construction.

Exit codes: 0 done (or no stale pointer), 1 stale pointers found, 2 usage or file error.
"""
import argparse
import os
import re
import shutil
import sys

VERSIONED = re.compile(r"^(?P<stem>.+?)_v(?P<ver>\d+)(?P<rest>(?:[_.-].*)?)$")
TOKEN = re.compile(r"(?<![A-Za-z0-9_])([A-Za-z0-9][A-Za-z0-9_\-]*?)_v(\d+)(?![0-9A-Za-z])")


def split_name(path):
    base = os.path.basename(path)
    m = VERSIONED.match(base)
    if not m:
        return None
    return m.group("stem"), int(m.group("ver")), m.group("rest")


def stem_re(old_stem):
    # the same boundaries as TOKEN: not inside old_paper_v3, paper_v30 or paper_v3b
    return re.compile(r"(?<![A-Za-z0-9_])" + re.escape(old_stem) + r"(?![0-9A-Za-z])")


def read_pointer_list(pointers, pointers_file):
    out = list(pointers or [])
    if pointers_file:
        base = os.path.dirname(os.path.abspath(pointers_file))
        for line in open(pointers_file, encoding="utf-8"):
            line = line.split("#", 1)[0].strip()
            if line:
                out.append(line if os.path.isabs(line) else os.path.join(base, line))
    return out


def live_versions(folder):
    """{stem: (newest version, file name)} for the versioned files in a folder."""
    best = {}
    for f in os.listdir(folder):
        s = split_name(f)
        if not s:
            continue
        stem, ver, _ = s
        if ver > best.get(stem, (-1, ""))[0]:
            best[stem] = (ver, f)
    return best


FILEREF = re.compile(r"(?<![A-Za-z0-9_\-./])(/?(?:[A-Za-z0-9_\-.]+/)*)([A-Za-z0-9][A-Za-z0-9_\-]*?_v\d+"
                     r"(?:[_.\-][A-Za-z0-9_\-]*)*\.[A-Za-z0-9]+)(?![A-Za-z0-9])")


def check(folder, pointers):
    """Stale pointers: a version other than the newest of its stem, or a named file that is
    missing from the folder. Exit 1 when there is one, 2 when there is nothing to check."""
    if not pointers:
        print("no pointer files given: pass --pointers or --pointers-file (a check of nothing passes)",
              file=sys.stderr)
        return 2
    best = live_versions(folder)
    here = os.path.basename(os.path.abspath(folder))
    stale = set()
    for p in pointers:
        if not os.path.exists(p):
            print("  MISSING pointer file %s" % p)
            stale.add((p, "(file not found)", ""))
            continue
        txt = open(p, encoding="utf-8", errors="replace").read()
        for m in TOKEN.finditer(txt):
            stem, ver = m.group(1), int(m.group(2))
            if stem in best and ver != best[stem][0]:
                stale.add((p, m.group(0), "newest is %s" % best[stem][1]))
        for m in FILEREF.finditer(txt):          # a file named in this folder must exist
            dirs, name = m.group(1).rstrip("/"), m.group(2)
            s = split_name(name)
            if m.group(1).startswith("/"):
                in_folder = os.path.abspath(dirs) == os.path.abspath(folder)
            elif dirs:
                in_folder = dirs.split("/")[-1] == here
            else:
                in_folder = bool(s and s[0] in best)
            if in_folder and not os.path.exists(os.path.join(folder, name)):
                stale.add((p, m.group(0), "no such file in %s" % folder))
    for p, found, why in sorted(stale):
        if why:
            print("  STALE   %s names %s; %s" % (p, found, why))
    print("%d stale pointer(s)" % len(stale))
    return 1 if stale else 0


def copy_versioned(src, dst, old_stem, new_stem, rewrite, dry):
    if os.path.exists(dst):
        print("  %s already exists, left alone" % dst)
        return
    print("  copy    %s -> %s" % (src, dst))
    if dry:
        return
    shutil.copy2(src, dst)
    if rewrite:
        try:
            txt = open(dst, encoding="utf-8").read()
        except UnicodeDecodeError:
            return
        new = stem_re(old_stem).sub(new_stem, txt)
        if new != txt:
            open(dst, "w", encoding="utf-8").write(new)
            print("  rewrote internal references in %s" % dst)


def bump(a):
    s = split_name(a.old)
    if not s:
        print("not a versioned name (STEM_vK.ext): %s" % a.old, file=sys.stderr)
        return 2
    if not os.path.exists(a.old):
        print("no such file: %s" % a.old, file=sys.stderr)
        return 2
    stem, ver, rest = s
    old_stem = "%s_v%d" % (stem, ver)
    new = a.new or os.path.join(os.path.dirname(a.old), "%s_v%d%s" % (stem, ver + 1, rest))
    ns = split_name(new)
    if not ns or ns[0] != stem:
        print("NEW must keep the stem %s and carry a version: %s" % (stem, new), file=sys.stderr)
        return 2
    new_stem = "%s_v%d" % (stem, ns[1])
    pointers = read_pointer_list(a.pointers, a.pointers_file)
    if not pointers:
        print("no pointer files given: pass --pointers or --pointers-file. A bump that moves no tool "
              "leaves every gate reading the old version.", file=sys.stderr)
        return 2
    copy_versioned(a.old, new, old_stem, new_stem, a.rewrite_self, a.dry_run)
    for f in a.also or []:
        if not stem_re(old_stem).search(os.path.basename(f)) or not os.path.exists(f):
            print("  skip    %s (missing, or its name does not contain %s)" % (f, old_stem))
            continue
        target = os.path.join(os.path.dirname(f), stem_re(old_stem).sub(new_stem, os.path.basename(f)))
        copy_versioned(f, target, old_stem, new_stem, a.rewrite_self, a.dry_run)
    n = 0
    for p in pointers:
        if not os.path.exists(p):
            print("  MISSING pointer file %s" % p)
            continue
        txt = open(p, encoding="utf-8").read()
        new_txt, k = stem_re(old_stem).subn(new_stem, txt)
        if k:
            n += 1
            print("  point   %s (%d reference%s)" % (p, k, "" if k == 1 else "s"))
            if not a.dry_run:
                open(p, "w", encoding="utf-8").write(new_txt)
    print("  %d pointer file(s) repointed%s" % (n, " (dry run)" if a.dry_run else ""))
    if not a.dry_run:
        print()
        return check(os.path.dirname(os.path.abspath(new)), pointers)
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Copy STEM_vK to STEM_v(K+1) and repoint the tools.",
                                 epilog="See the module docstring for details.")
    ap.add_argument("old", nargs="?")
    ap.add_argument("new", nargs="?")
    ap.add_argument("--also", action="append", metavar="FILE")
    ap.add_argument("--pointers", nargs="+", metavar="FILE")
    ap.add_argument("--pointers-file", metavar="LIST")
    ap.add_argument("--rewrite-self", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--check", metavar="DIR")
    a = ap.parse_args(argv)
    if a.check:
        if not os.path.isdir(a.check):
            print("not a folder: %s" % a.check, file=sys.stderr)
            return 2
        return check(a.check, read_pointer_list(a.pointers, a.pointers_file))
    if not a.old:
        ap.print_usage(sys.stderr)
        return 2
    return bump(a)


if __name__ == "__main__":
    sys.exit(main())
