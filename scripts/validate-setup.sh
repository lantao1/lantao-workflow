#!/usr/bin/env bash
# =============================================================================
# validate-setup.sh — Verify all dependencies for the academic workflow
#
# Run this after forking the repo to confirm your environment is ready.
# Exits 0 if all required tools are found; non-zero otherwise.
# =============================================================================

set -uo pipefail

# ANSI colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

pass=0
warn=0
fail=0

echo ""
echo -e "${BOLD}Validating Claude Code Academic Workflow setup...${RESET}"
echo ""

check_required() {
    local name="$1"
    local cmd="$2"
    local install_url="$3"
    if command -v "$cmd" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${RESET} $name found: $("$cmd" --version 2>&1 | head -n1)"
        pass=$((pass + 1))
    else
        echo -e "  ${RED}✗${RESET} $name NOT FOUND — install: ${install_url}"
        fail=$((fail + 1))
    fi
}

check_optional() {
    local name="$1"
    local cmd="$2"
    local install_url="$3"
    if command -v "$cmd" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${RESET} $name found: $("$cmd" --version 2>&1 | head -n1)"
        pass=$((pass + 1))
    else
        echo -e "  ${YELLOW}⚠${RESET} $name not found (optional) — install: ${install_url}"
        warn=$((warn + 1))
    fi
}

echo -e "${BOLD}Required tools:${RESET}"
# Claude Code runs either as the `claude` CLI or inside the desktop app, which
# does not put the CLI on PATH. Either one is enough.
if ! command -v claude >/dev/null 2>&1 && \
   { [ -d "/Applications/Claude.app" ] || [ -d "$HOME/Applications/Claude.app" ]; }; then
    echo -e "  ${GREEN}✓${RESET} Claude Code: desktop app found (the claude CLI is not on PATH; install it only for terminal use)"
    pass=$((pass + 1))
else
    check_required "Claude Code"  "claude"   "https://claude.ai/install"
fi
check_required "XeLaTeX"      "xelatex"  "https://tug.org/texlive/ (or MacTeX: https://tug.org/mactex/)"
check_required "git"          "git"      "https://git-scm.com/downloads"
check_required "Python 3"     "python3"  "https://python.org (needed for hooks)"
echo ""

echo -e "${BOLD}Recommended tools:${RESET}"
check_optional "Quarto"       "quarto"   "https://quarto.org/docs/get-started/ (needed only for Quarto slides and /deploy)"
check_optional "R"            "R"        "https://www.r-project.org/"
check_optional "GitHub CLI"   "gh"       "https://cli.github.com/"
echo ""

echo -e "${BOLD}Git configuration:${RESET}"
if command -v git >/dev/null 2>&1; then
    git_name=$(git config user.name 2>/dev/null || true)
    git_email=$(git config user.email 2>/dev/null || true)
    if [ -n "$git_name" ] && [ -n "$git_email" ]; then
        echo -e "  ${GREEN}✓${RESET} git user: $git_name <$git_email>"
        pass=$((pass + 1))
    else
        echo -e "  ${YELLOW}⚠${RESET} git user.name / user.email not set"
        echo -e "    Run: git config --global user.name \"Your Name\""
        echo -e "    Run: git config --global user.email \"you@example.com\""
        warn=$((warn + 1))
    fi
else
    echo -e "  ${YELLOW}⚠${RESET} skipped — install git first (see required tools above)"
    warn=$((warn + 1))
fi
echo ""

echo -e "${BOLD}Claude Code hooks:${RESET}"
hook_dir="$(dirname "$0")/../.claude/hooks"
if [ -d "$hook_dir" ]; then
    non_exec=$(find "$hook_dir" -maxdepth 1 \( -name "*.py" -o -name "*.sh" \) ! -perm -u+x 2>/dev/null | wc -l | tr -d ' ')
    if [ "$non_exec" -eq 0 ]; then
        echo -e "  ${GREEN}✓${RESET} All hook scripts are executable"
        pass=$((pass + 1))
    else
        echo -e "  ${YELLOW}⚠${RESET} $non_exec hook script(s) not executable"
        echo -e "    Fix: chmod +x .claude/hooks/*.py .claude/hooks/*.sh"
        warn=$((warn + 1))
    fi
else
    echo -e "  ${YELLOW}⚠${RESET} .claude/hooks/ directory not found (are you in the project root?)"
    warn=$((warn + 1))
fi

echo ""
echo -e "${BOLD}Git pre-commit gate (v2.0):${RESET}"
pchook="$(dirname "$0")/../.githooks/pre-commit"
if [ -f "$pchook" ]; then
    if [ -x "$pchook" ]; then
        echo -e "  ${GREEN}✓${RESET} .githooks/pre-commit is executable"
        pass=$((pass + 1))
    else
        echo -e "  ${YELLOW}⚠${RESET} .githooks/pre-commit is NOT executable — git silently skips it, disabling the gate"
        echo -e "    Fix: chmod +x .githooks/pre-commit  (or re-run ./scripts/install-hooks.sh)"
        warn=$((warn + 1))
    fi
    if command -v git >/dev/null 2>&1; then
        repo_dir="$(dirname "$0")/.."
        if ! git -C "$repo_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
            echo -e "  ${YELLOW}⚠${RESET} not a git repository yet; run: git init && ./scripts/install-hooks.sh"
            warn=$((warn + 1))
        elif [ "$(git -C "$repo_dir" config core.hooksPath 2>/dev/null || true)" = ".githooks" ]; then
            echo -e "  ${GREEN}✓${RESET} core.hooksPath → .githooks (gate active on every commit)"
        else
            echo -e "  ${YELLOW}⚠${RESET} pre-commit gate not activated — run ./scripts/install-hooks.sh"
            warn=$((warn + 1))
        fi
    fi
else
    echo -e "  ${YELLOW}⚠${RESET} .githooks/pre-commit not found"
    warn=$((warn + 1))
fi
echo ""

echo -e "${BOLD}Palette sync (LaTeX ↔ SCSS):${RESET}"
palette_script="$(dirname "$0")/check-palette-sync.sh"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$repo_root/Preambles/header.tex" ] || [ ! -f "$repo_root/Quarto/theme-template.scss" ]; then
    # A project without slides deletes these files; there is no palette pair to keep in step.
    echo "  - skipped: Preambles/header.tex or Quarto/theme-template.scss not present (no slides)"
elif [ -x "$palette_script" ]; then
    # Rely on the helper's exit code — stable contract, not text matching.
    # 0 = in sync, 1 = divergence.
    if "$palette_script" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${RESET} Preambles/header.tex ↔ Quarto/theme-template.scss agree on the core palette"
        pass=$((pass + 1))
    else
        echo -e "  ${YELLOW}⚠${RESET} Palette drift — run ./scripts/check-palette-sync.sh for details"
        warn=$((warn + 1))
    fi
else
    echo -e "  ${YELLOW}⚠${RESET} scripts/check-palette-sync.sh missing or not executable — skipping"
    warn=$((warn + 1))
fi
echo ""

echo -e "${BOLD}Summary:${RESET} ${GREEN}${pass} passed${RESET}, ${YELLOW}${warn} warnings${RESET}, ${RED}${fail} failed${RESET}"
echo ""

# Which tools did we actually find? Gate the next-step suggestions accordingly.
# Use string flags (not command names) so shellcheck is happy and `if` bodies
# read naturally.
# has_claude_cli: the `claude` shell command exists. has_claude: the CLI OR the
# desktop app exists. Only suggest typing `claude` when the CLI is on PATH.
has_claude_cli="false"; command -v claude >/dev/null 2>&1 && has_claude_cli="true"
has_claude="$has_claude_cli"
{ [ -d "/Applications/Claude.app" ] || [ -d "$HOME/Applications/Claude.app" ]; } && has_claude="true"
has_xelatex="false"; command -v xelatex >/dev/null 2>&1 && has_xelatex="true"
has_quarto="false";  command -v quarto  >/dev/null 2>&1 && has_quarto="true"
has_r="false";       command -v R       >/dev/null 2>&1 && has_r="true"
# /deploy needs Quarto AND the sync script; a trimmed copy may ship without it.
has_deploy="false"
[ "$has_quarto" = "true" ] && [ -x "$(dirname "$0")/sync_to_docs.sh" ] && has_deploy="true"
# Suggest the sample decks only while they exist; a project without slides deletes them.
has_beamer_sample="false"; [ -f "$repo_root/Slides/HelloWorld.tex" ] && has_beamer_sample="true"
has_quarto_sample="false"; [ -f "$repo_root/Quarto/HelloWorld.qmd" ] && has_quarto_sample="true"
[ "$has_quarto_sample" = "true" ] || has_deploy="false"

if [ "$fail" -gt 0 ]; then
    echo -e "${RED}Some required tools are missing.${RESET}"
    echo ""
    echo -e "${BOLD}What you CAN do right now:${RESET}"
    if [ "$has_claude" = "true" ]; then
        if [ "$has_claude_cli" = "true" ]; then
            echo "  - Open Claude Code:                      claude  (or open the folder in the desktop app)"
        else
            echo "  - Open Claude Code:                      open this folder in the desktop app"
        fi
        echo ""
        echo -e "  ${BOLD}Inside Claude Code${RESET} (these are slash-commands, NOT shell commands):"
        if [ "$has_deploy" = "true" ]; then
            echo "    /deploy HelloWorld         # render Quarto sample"
        fi
        if [ "$has_xelatex" = "true" ] && [ "$has_beamer_sample" = "true" ]; then
            echo "    /compile-latex HelloWorld  # compile Beamer sample"
        fi
        if [ "$has_r" = "true" ]; then
            echo "    /data-analysis             # orchestrate R analysis"
        fi
        if [ "$has_xelatex" != "true" ]; then
            echo ""
            echo "  (Beamer workflow disabled until you install XeLaTeX: https://tug.org/texlive/)"
        fi
        if [ "$has_quarto" != "true" ]; then
            echo "  (Quarto deploy disabled until you install Quarto: https://quarto.org/docs/get-started/)"
        fi
    else
        echo "  - Install Claude Code first: https://claude.ai/install"
        echo "    (Everything else in this template is orchestrated through Claude.)"
    fi
    echo ""
    echo -e "${BOLD}Next:${RESET} install the missing required tool(s) listed above, then re-run this script."
    exit 1
fi

echo -e "${GREEN}Setup looks good!${RESET} Next steps:"
if [ "$has_claude_cli" = "true" ]; then
    echo "  1. Open Claude Code in this directory:  claude  (or open the folder in the desktop app)"
else
    echo "  1. Open Claude Code in this directory:  open the folder in the desktop app"
fi
step=2
if [ "$has_beamer_sample" = "true" ]; then
    echo "  ${step}. Compile the sample deck:              /compile-latex HelloWorld"
    step=$((step + 1))
fi
if [ "$has_deploy" = "true" ]; then
    echo "  ${step}. Deploy the Quarto sample:             /deploy HelloWorld"
    step=$((step + 1))
fi
echo "  ${step}. Fill every [BRACKET] placeholder in CLAUDE.md"
echo ""
exit 0
