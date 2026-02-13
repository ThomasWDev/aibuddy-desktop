#!/bin/bash
# =============================================================================
# AIBuddy Desktop - Mac App Store Provisioning Profile Setup
# =============================================================================
#
# This script helps you create and download the Mac App Store provisioning
# profile needed for MAS builds.
#
# Prerequisites:
#   1. Sign in to Xcode with your Apple ID (twoodfin@berkeley.edu)
#   2. Ensure "3rd Party Mac Developer Application" cert is in Keychain
#
# Usage:
#   ./scripts/setup-mas-profile.sh
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

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AIBuddy Desktop - MAS Provisioning Profile Setup        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check certificates
echo -e "${YELLOW}Step 1: Checking certificates...${NC}"
echo ""

MAS_APP_CERT=$(security find-identity -v -p codesigning 2>/dev/null | grep "3rd Party Mac Developer Application" | head -1)
MAS_INST_CERT=$(security find-identity -v -p basic 2>/dev/null | grep "3rd Party Mac Developer Installer" | head -1)

if [ -n "$MAS_APP_CERT" ]; then
    echo -e "${GREEN}  ✓ 3rd Party Mac Developer Application cert found${NC}"
else
    echo -e "${RED}  ✗ 3rd Party Mac Developer Application cert NOT found${NC}"
    echo "    → Create at: https://developer.apple.com/account/resources/certificates/add"
    echo "    → Type: Mac App Distribution"
fi

if [ -n "$MAS_INST_CERT" ]; then
    echo -e "${GREEN}  ✓ 3rd Party Mac Developer Installer cert found${NC}"
else
    echo -e "${YELLOW}  ⚠ 3rd Party Mac Developer Installer cert not found${NC}"
    echo "    → Create at: https://developer.apple.com/account/resources/certificates/add"
    echo "    → Type: Mac Installer Distribution"
    echo "    → Needed for creating .pkg files for App Store upload"
fi

echo ""

# Step 2: Check if profile already exists
echo -e "${YELLOW}Step 2: Checking for existing provisioning profile...${NC}"
echo ""

if [ -f "$PROFILE_PATH" ]; then
    echo -e "${GREEN}  ✓ Provisioning profile exists at: $PROFILE_PATH${NC}"
    # Decode and show details
    PROF_NAME=$(security cms -D -i "$PROFILE_PATH" 2>/dev/null | grep -A1 "^	<key>Name" | grep "string" | sed 's/.*<string>//;s/<.*//')
    PROF_TEAM=$(security cms -D -i "$PROFILE_PATH" 2>/dev/null | grep -A2 "TeamIdentifier" | grep "string" | sed 's/.*<string>//;s/<.*//')
    PROF_EXP=$(security cms -D -i "$PROFILE_PATH" 2>/dev/null | grep -A1 "ExpirationDate" | grep "date" | sed 's/.*<date>//;s/<.*//')
    echo "    Name: $PROF_NAME"
    echo "    Team: $PROF_TEAM"
    echo "    Expires: $PROF_EXP"
    
    if [ "$PROF_TEAM" = "$TEAM_ID" ]; then
        echo -e "${GREEN}  ✓ Profile matches team $TEAM_ID${NC}"
    else
        echo -e "${RED}  ✗ Profile team mismatch! Expected $TEAM_ID, got $PROF_TEAM${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ No provisioning profile found at: $PROFILE_PATH${NC}"
    echo ""
    echo -e "${BLUE}To create one:${NC}"
    echo ""
    echo "  1. Open: https://developer.apple.com/account/resources/profiles/add"
    echo "  2. Select: Mac App Store → Distribution"
    echo "  3. Select App ID: $BUNDLE_ID"
    echo "  4. Select Certificate: 3rd Party Mac Developer Application"
    echo "  5. Name: AIBuddy Desktop MAS Distribution"
    echo "  6. Download and save to: $PROFILE_PATH"
    echo ""
    echo -e "${BLUE}Or use Xcode:${NC}"
    echo "  1. Open Xcode → Settings → Accounts"
    echo "  2. Sign in with: twoodfin@berkeley.edu"
    echo "  3. Select team: AI Buddy Inc (Apps) ($TEAM_ID)"
    echo "  4. Click 'Download Manual Profiles'"
    echo ""
    
    # Try opening the portal
    read -p "Open Apple Developer Portal now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://developer.apple.com/account/resources/profiles/add"
    fi
    
    # Wait for the user to download the profile
    echo ""
    echo "After downloading, move the profile to:"
    echo "  $PROFILE_PATH"
    echo ""
    read -p "Press Enter once the profile is in place..."
    
    if [ ! -f "$PROFILE_PATH" ]; then
        echo -e "${RED}Profile not found. Please download and place it manually.${NC}"
        exit 1
    fi
fi

echo ""

# Step 3: Validate the profile
echo -e "${YELLOW}Step 3: Validating provisioning profile...${NC}"
echo ""

if [ -f "$PROFILE_PATH" ]; then
    PROF_APPID=$(security cms -D -i "$PROFILE_PATH" 2>/dev/null | grep -A2 "application-identifier" | grep "string" | sed 's/.*<string>//;s/<.*//')
    
    if echo "$PROF_APPID" | grep -q "$BUNDLE_ID"; then
        echo -e "${GREEN}  ✓ Profile bundle ID matches: $BUNDLE_ID${NC}"
    else
        echo -e "${RED}  ✗ Bundle ID mismatch! Profile has: $PROF_APPID${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          Provisioning profile is ready!                      ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "You can now build for Mac App Store:"
    echo "  pnpm package:mas"
fi
