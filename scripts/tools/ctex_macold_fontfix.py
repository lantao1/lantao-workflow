#!/usr/bin/env python3
"""ctex_macold_fontfix.py - write a project-local ctex fontset that stops the macOS font dialog.

On recent macOS, ctex's `macold` fontset asks for STHeiti (bold CJK and \\heiti). That font is a
downloadable asset, not an installed file, so every xelatex run opens the dialog "texbin needs to
download the font STHeiti" and the build waits on it. Clicking Download did not fix it. What did:
a copy of `ctex-fontset-macold.def` in the build's working directory with STHeiti replaced by an
installed face. TeX reads the current directory first, so every build run from that directory
picks the copy up. The story is in docs/LESSONS.md, section 1.1.

This script writes that copy from the ctex installed on this machine (found with kpsewhich), so
the modified file is generated locally and never redistributed. ctex is under the LaTeX Project
Public License: keep the generated copy out of any package you publish, and regenerate it on
each machine.

Usage:
    python3 ctex_macold_fontfix.py [--dest DIR] [--font NAME] [--force] [--dry-run]

    --dest DIR   the folder the CJK builds run from (default: the current directory). A build
                 run from another folder needs its own copy.
    --font NAME  the PostScript name of the installed face that replaces STHeiti (default:
                 STHeitiSC-Medium, the same Heiti design installed at
                 /System/Library/Fonts/STHeiti Medium.ttc). Check a name with
                 `fc-list ":postscriptname=NAME" file`.
    --force      overwrite an existing copy in DIR.
    --dry-run    report what would be written and write nothing.

Check afterwards: build one CJK document from DIR under a timeout (macOS has no `timeout`:
`perl -e 'alarm 120; exec @ARGV' xelatex ...`), confirm no dialog opened, and check the PDF's
modification time, not only the error count (docs/LESSONS.md, sections 1.3 and 1.4).

Exit codes: 0 written (or would be written), 2 usage, file or setup error.
"""
import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

DEF_NAME = "ctex-fontset-macold.def"
OLD_FONT = "STHeiti"


def find_installed_def():
    """Path of the installed ctex fontset file, or None."""
    if shutil.which("kpsewhich") is None:
        return None
    try:
        out = subprocess.run(["kpsewhich", DEF_NAME], capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    path = out.stdout.strip()
    return Path(path) if out.returncode == 0 and path else None


def font_note(font):
    """A warning when fc-list is available and finds no installed face with this PostScript name."""
    if shutil.which("fc-list") is None:
        return "fc-list not found; confirm in Font Book that %s is installed." % font
    try:
        out = subprocess.run(["fc-list", ":postscriptname=%s" % font, "file"],
                             capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return "fc-list failed; confirm in Font Book that %s is installed." % font
    if not out.stdout.strip():
        return "fc-list finds no installed face named %s; pick one it lists." % font
    return None


def main():
    ap = argparse.ArgumentParser(description="Write a project-local ctex macold fontset without STHeiti.")
    ap.add_argument("--dest", default=".", help="folder the CJK builds run from (default: .)")
    ap.add_argument("--font", default="STHeitiSC-Medium", help="installed face that replaces STHeiti")
    ap.add_argument("--force", action="store_true", help="overwrite an existing copy")
    ap.add_argument("--dry-run", action="store_true", help="report and write nothing")
    args = ap.parse_args()

    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 _-]*", args.font):
        print("error: --font must be a plain font name: %r" % args.font, file=sys.stderr)
        return 2
    dest = Path(args.dest)
    if not dest.is_dir():
        print("error: --dest is not a folder: %s" % dest, file=sys.stderr)
        return 2
    target = dest / DEF_NAME

    src = find_installed_def()
    if src is None or not src.is_file():
        print("error: kpsewhich did not find %s; is ctex installed?" % DEF_NAME, file=sys.stderr)
        return 2
    if target.exists() and target.resolve() == src.resolve():
        print("error: --dest is ctex's own folder; choose the project's build folder", file=sys.stderr)
        return 2
    if target.exists() and not args.force:
        print("error: %s exists; pass --force to overwrite it" % target, file=sys.stderr)
        return 2

    text = src.read_text(encoding="utf-8")
    new, n = re.subn(r"\b%s\b" % OLD_FONT, args.font, text)
    if n == 0:
        print("error: %s names no %s; this ctex needs no fix" % (src, OLD_FONT), file=sys.stderr)
        return 2

    header = (
        "%% PROJECT-LOCAL COPY written by scripts/tools/ctex_macold_fontfix.py from\n"
        "%% " + str(src) + "\n"
        "%% It differs from that file only in the bold Heiti face: " + OLD_FONT + " -> " + args.font + "\n"
        "%% (" + str(n) + " occurrences). TeX finds this copy first when a build runs from this folder.\n"
        "%% Generated on this machine; do not redistribute it. Regenerate it after a ctex update.\n"
    )
    note = font_note(args.font)
    if args.dry_run:
        print("would write %s: %d occurrences of %s -> %s" % (target, n, OLD_FONT, args.font))
    else:
        target.write_text(header + new, encoding="utf-8")
        print("wrote %s: %d occurrences of %s -> %s" % (target, n, OLD_FONT, args.font))
    if note:
        print("warning: " + note)
    return 0


if __name__ == "__main__":
    sys.exit(main())
