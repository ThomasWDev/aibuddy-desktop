#!/bin/bash
# =============================================================================
# AIBuddy Desktop - Complete Mac App Store Setup
# =============================================================================
#
# Run this script after completing the Apple Developer Portal steps:
#   1. Download provisioning profile → build/embedded.provisionprofile
#   2. (Optional) Create Mac Installer Distribution cert if not present
#
# Usage:
#   ./scripts/complete-mas-setup.sh          # Build MAS app
#   ./scripts/complete-mas-setup.sh --verify # Verify setup only
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROFILE_PATH="$PROJECT_ROOT/build/embedded.provisionprofile"
BUNDLE_ID="com.aibuddy.desktop"
TEAM_ID="S2237D23CB"

cd "$PROJECT_ROOT"

VERIFY_ONLY=false
[[ "$1" == "--verify" ]] && VERIFY_ONLY=true

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AIBuddy Desktop - Mac App Store Build                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# STEP 1: Check Certificates
# ============================================================
echo -e "${YELLOW}━━━ Step 1: Certificates ━━━${NC}"
echo ""

ERRORS=0

MAS_APP_CERT=$(security find-identity -v -p codesigning 2>/dev/null | grep "3rd Party Mac Developer Application.*$TEAM_ID" | head -1)
MAS_INST_CERT=$(security find-identity -v -p basic 2>/dev/null | grep "3rd Party Mac Developer Installer.*$TEAM_ID" | head -1)
# Also accept Developer ID Installer as fallback
DEV_INST_CERT=$(security find-identity -v -p basic 2>/dev/null | grep "Developer ID Installer.*$TEAM_ID" | head -1)

if [ -n "$MAS_APP_CERT" ]; then
    echo -e "  ${GREEN}✓${NC} 3rd Party Mac Developer Application"
else
    echo -e "  ${RED}✗${NC} 3rd Party Mac Developer Application - MISSING"
    echo "    Create at: https://developer.apple.com/account/resources/certificates/add"
    echo "    Type: Mac App Distribution"
    ERRORS=$((ERRORS + 1))
fi

if [ -n "$MAS_INST_CERT" ]; then
    echo -e "  ${GREEN}✓${NC} 3rd Party Mac Developer Installer"
elif [ -n "$DEV_INST_CERT" ]; then
    echo -e "  ${YELLOW}⚠${NC} Using Developer ID Installer (will work for local testing, not for MAS upload)"
else
    echo -e "  ${YELLOW}⚠${NC} 3rd Party Mac Developer Installer - MISSING (needed for .pkg creation)"
    echo "    Create at: https://developer.apple.com/account/resources/certificates/add"
    echo "    Type: Mac Installer Distribution"
    echo "    CSR ready at: /tmp/AIBuddyMASInstaller.certSigningRequest"
fi

echo ""

# ============================================================
# STEP 2: Check Provisioning Profile
# ============================================================
echo -e "${YELLOW}━━━ Step 2: Provisioning Profile ━━━${NC}"
echo ""

if [ -f "$PROFILE_PATH" ]; then
    echo -e "  ${GREEN}✓${NC} Provisioning profile found"
    
    PROF_NAME=$(security cms -D -i "$PROFILE_PATH" 2>/dev/null | grep -A1 "^	<key>Name" | grep "string" | sed 's/.*<string>//;s/<.*//')
    PROF_TEAM=$(security cms -D -i "$PROFILE_PATH" 2>/dev/null | grep -A2 "TeamIdentifier" | grep "string" | sed 's/.*<string>//;s/<.*//')
    PROF_EXP=$(security cms -D -i "$PROFILE_PATH" 2>/dev/null | grep -A1 "ExpirationDate" | grep "date" | sed 's/.*<date>//;s/<.*//')
    
    echo "    Name: $PROF_NAME"
    echo "    Team: $PROF_TEAM"
    echo "    Expires: $PROF_EXP"
    
    if [ "$PROF_TEAM" != "$TEAM_ID" ]; then
        echo -e "  ${RED}✗${NC} Team mismatch! Expected $TEAM_ID, got $PROF_TEAM"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "  ${RED}✗${NC} Provisioning profile NOT found"
    echo ""
    echo "    To create:"
    echo "    1. Go to: https://developer.apple.com/account/resources/profiles/add"
    echo "    2. Select: Mac App Store Distribution"
    echo "    3. App ID: $BUNDLE_ID"
    echo "    4. Certificate: 3rd Party Mac Developer Application"
    echo "    5. Name: AIBuddy Desktop MAS Distribution"
    echo "    6. Download → save as: build/embedded.provisionprofile"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================================
# STEP 3: Check Entitlements
# ============================================================
echo -e "${YELLOW}━━━ Step 3: Entitlements ━━━${NC}"
echo ""

for plist in "build/entitlements.mas.plist" "build/entitlements.mas.inherit.plist"; do
    if [ -f "$plist" ]; then
        if plutil -lint "$plist" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $plist (valid)"
        else
            echo -e "  ${RED}✗${NC} $plist (invalid XML)"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "  ${RED}✗${NC} $plist - MISSING"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# ============================================================
# STEP 4: Check package.json MAS config
# ============================================================
echo -e "${YELLOW}━━━ Step 4: Build Configuration ━━━${NC}"
echo ""

if grep -q '"mas"' package.json; then
    echo -e "  ${GREEN}✓${NC} MAS config found in package.json"
    MAS_IDENTITY=$(python3 -c "import json; d=json.load(open('package.json')); print(d.get('build',{}).get('mas',{}).get('identity','not set'))" 2>/dev/null)
    echo "    Identity: $MAS_IDENTITY"
else
    echo -e "  ${RED}✗${NC} No MAS config in package.json"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================================
# Summary
# ============================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "  ${RED}$ERRORS issue(s) found. Fix them before building.${NC}"
    echo ""
    if [ "$VERIFY_ONLY" = false ]; then
        exit 1
    fi
else
    echo -e "  ${GREEN}All checks passed!${NC}"
    echo ""
    
    if [ "$VERIFY_ONLY" = true ]; then
        echo "Run without --verify to build."
        exit 0
    fi
    
    # ============================================================
    # STEP 5: Build
    # ============================================================
    echo -e "${YELLOW}━━━ Step 5: Building for Mac App Store ━━━${NC}"
    echo ""
    
    echo "Building app code..."
    npm run build
    
    echo ""
    echo "Packaging for MAS (arm64)..."
    npx electron-builder --mac mas --arm64 --publish never
    
    echo ""
    echo "Packaging for MAS (x64)..."
    npx electron-builder --mac mas --x64 --publish never
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  MAS Build Complete!                         ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Output files:"
    ls -lh release/mas*/*.pkg 2>/dev/null || ls -lh release/mas*/*.app 2>/dev/null || echo "  Check release/mas-arm64/ and release/mas/"
    echo ""
    echo "Next steps:"
    echo "  1. Open Transporter.app (download from Mac App Store)"
    echo "  2. Drag the .pkg file into Transporter"
    echo "  3. Click Deliver to upload to App Store Connect"
    echo ""
    echo "  Or use command line:"
    echo "  xcrun altool --upload-app --type macos --file release/mas-arm64/AIBuddy-*.pkg \\"
    echo "    -u twoodfin@berkeley.edu -p @keychain:AIBuddy-notarize"
fi
