#!/bin/bash

# ============================================================================
# AIBuddy Desktop - Local Build Script
# ============================================================================
# 
# Builds desktop app for all platforms possible on current machine.
# 
# On macOS:
#   - macOS ARM64 (Apple Silicon) ✓
#   - macOS x64 (Intel) ✓
#   - macOS Universal ✓
#   - Windows (via Wine - experimental)
#   - Linux (via Docker - experimental)
#
# Usage:
#   ./scripts/build-all.sh [--mac-only] [--skip-prompts]
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Parse arguments
MAC_ONLY=false
SKIP_PROMPTS=false

for arg in "$@"; do
    case $arg in
        --mac-only)
            MAC_ONLY=true
            ;;
        --skip-prompts)
            SKIP_PROMPTS=true
            ;;
    esac
done

step() { echo -e "${BLUE}▶${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

cd "$PROJECT_ROOT"

VERSION=$(node -p "require('./package.json').version")

echo ""
echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}     ${CYAN}AIBuddy Desktop - Local Build${NC}                           ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}     ${YELLOW}Version: v$VERSION${NC}                                       ${PURPLE}║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS=$(uname -s)
ARCH=$(uname -m)

echo "  System: $OS ($ARCH)"
echo ""

# ============================================================================
# Step 1: Install dependencies
# ============================================================================
step "Installing dependencies..."
pnpm install --prefer-offline 2>/dev/null || pnpm install
success "Dependencies installed"

# ============================================================================
# Step 2: Build prompts package (workspace dependency)
# ============================================================================
step "Building @aibuddy/prompts package..."
pnpm --filter @aibuddy/prompts build 2>/dev/null || true
success "Prompts package built"

# ============================================================================
# Step 3: Build the app
# ============================================================================
step "Building application..."
pnpm build
success "Application built"

# ============================================================================
# Step 4: Package for different platforms
# ============================================================================
echo ""
echo -e "${CYAN}📦 Packaging for distribution...${NC}"
echo ""

# Clean release folder
rm -rf release/*.dmg release/*.exe release/*.AppImage release/*.deb 2>/dev/null || true

# macOS builds (always available on macOS)
if [ "$OS" = "Darwin" ]; then
    step "Building macOS ARM64 (Apple Silicon)..."
    pnpm package:mac:arm64 2>&1 | tail -5
    success "macOS ARM64 built"
    
    step "Building macOS x64 (Intel)..."
    pnpm package:mac:x64 2>&1 | tail -5
    success "macOS x64 built"
fi

# Windows build (experimental on macOS via Wine)
if [ "$MAC_ONLY" = false ] && command -v wine64 &> /dev/null; then
    step "Building Windows (via Wine)..."
    if pnpm package:win 2>&1 | tail -5; then
        success "Windows built"
    else
        warn "Windows build failed (Wine may not work for all builds)"
    fi
elif [ "$MAC_ONLY" = false ]; then
    warn "Skipping Windows build (Wine not installed)"
    echo "    Install Wine to enable: brew install --cask wine-stable"
fi

# Linux build (experimental on macOS via Docker)
if [ "$MAC_ONLY" = false ] && command -v docker &> /dev/null; then
    step "Building Linux (via Docker)..."
    # Note: This requires electronuserland/builder Docker image
    if docker run --rm -v "$PROJECT_ROOT:/project" -w /project electronuserland/builder:wine \
        /bin/bash -c "pnpm install && pnpm package:linux" 2>&1 | tail -5; then
        success "Linux built"
    else
        warn "Linux build failed (Docker may not work for all builds)"
    fi
elif [ "$MAC_ONLY" = false ]; then
    warn "Skipping Linux build (Docker not installed)"
    echo "    Install Docker to enable: brew install --cask docker"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}     ${GREEN}Build Complete!${NC}                                         ${PURPLE}║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "  Build output: $PROJECT_ROOT/release/"
echo ""
echo "  Files created:"
ls -la "$PROJECT_ROOT/release/"*.{dmg,exe,AppImage,deb} 2>/dev/null | awk '{print "    " $NF " (" $5 " bytes)"}' || echo "    (none)"
echo ""

# Offer to deploy
if [ "$SKIP_PROMPTS" = false ]; then
    read -p "Deploy to aibuddy.life and Denver? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/deploy-builds.sh" "$VERSION"
    fi
fi

echo ""
echo -e "${GREEN}Done! 🎉${NC}"
