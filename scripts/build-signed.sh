#!/bin/bash
# =============================================================================
# AIBuddy Desktop - Build with Code Signing
# =============================================================================
# 
# This script builds macOS DMG with proper code signing and notarization.
#
# Usage:
#   ./scripts/build-signed.sh              # Interactive mode
#   ./scripts/build-signed.sh --no-sign    # Skip signing (testing only)
#   ./scripts/build-signed.sh --notarize   # Sign and notarize
#
# Environment variables (can also be set in .env.local):
#   CSC_NAME                      - Certificate name to use
#   APPLE_ID                      - Apple ID for notarization
#   APPLE_APP_SPECIFIC_PASSWORD   - App-specific password
#   APPLE_TEAM_ID                 - Team ID
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Load .env.local if exists
if [ -f ".env.local" ]; then
    echo -e "${BLUE}Loading .env.local...${NC}"
    export $(grep -v '^#' .env.local | xargs)
fi

# Parse arguments
NO_SIGN=false
NOTARIZE=false
PLATFORM="mac"

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-sign)
            NO_SIGN=true
            shift
            ;;
        --notarize)
            NOTARIZE=true
            shift
            ;;
        --win|--windows)
            PLATFORM="win"
            shift
            ;;
        --linux)
            PLATFORM="linux"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         AIBuddy Desktop - Signed Build                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show available certificates
echo -e "${YELLOW}📜 Available Code Signing Certificates:${NC}"
echo ""
security find-identity -v -p codesigning 2>/dev/null || echo "  (none found)"
echo ""

# Check current signing configuration
if [ "$NO_SIGN" = true ]; then
    echo -e "${YELLOW}⚠️  Signing disabled (--no-sign flag)${NC}"
    export CSC_IDENTITY_AUTO_DISCOVERY=false
elif [ -n "$CSC_NAME" ]; then
    echo -e "${GREEN}✅ Using certificate: $CSC_NAME${NC}"
else
    echo -e "${YELLOW}⚠️  No CSC_NAME set - will use auto-discovery${NC}"
    echo ""
    echo "To specify a certificate, set CSC_NAME:"
    echo '  export CSC_NAME="Developer ID Application: Your Name (TEAMID)"'
    echo ""
fi

# Check notarization configuration
if [ "$NOTARIZE" = true ]; then
    echo ""
    echo -e "${YELLOW}🔐 Notarization enabled${NC}"
    
    if [ -z "$APPLE_ID" ]; then
        echo -e "${RED}❌ APPLE_ID not set${NC}"
        echo "   Set: export APPLE_ID='your@email.com'"
        exit 1
    fi
    
    if [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
        echo -e "${RED}❌ APPLE_APP_SPECIFIC_PASSWORD not set${NC}"
        echo "   Generate at: https://appleid.apple.com/account/manage"
        exit 1
    fi
    
    if [ -z "$APPLE_TEAM_ID" ]; then
        echo -e "${RED}❌ APPLE_TEAM_ID not set${NC}"
        echo "   Find at: https://developer.apple.com/account"
        exit 1
    fi
    
    echo -e "${GREEN}  ✓ APPLE_ID: $APPLE_ID${NC}"
    echo -e "${GREEN}  ✓ APPLE_APP_SPECIFIC_PASSWORD: ****${NC}"
    echo -e "${GREEN}  ✓ APPLE_TEAM_ID: $APPLE_TEAM_ID${NC}"
    
    # Update electron-builder config temporarily for notarization
    # (electron-builder reads notarize from config, not env vars)
fi

echo ""
echo -e "${BLUE}🔨 Building application...${NC}"
echo ""

# Build the app
pnpm build

echo ""
echo -e "${BLUE}📦 Packaging for $PLATFORM...${NC}"
echo ""

# Package based on platform
case $PLATFORM in
    mac)
        if [ "$NOTARIZE" = true ]; then
            # For notarization, we need to temporarily enable it in config
            # electron-builder doesn't read NOTARIZE env var
            echo -e "${YELLOW}Note: For notarization, edit build/electron-builder.yml:${NC}"
            echo "  notarize: true"
            echo ""
            echo "Or use object form:"
            echo "  notarize:"
            echo "    teamId: \"$APPLE_TEAM_ID\""
            echo ""
        fi
        pnpm package:mac
        ;;
    win)
        if [ -n "$WIN_CSC_LINK" ]; then
            echo -e "${GREEN}✅ Windows signing certificate configured${NC}"
        else
            echo -e "${YELLOW}⚠️  No Windows signing certificate (WIN_CSC_LINK)${NC}"
        fi
        pnpm package:win
        ;;
    linux)
        pnpm package:linux
        ;;
esac

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Build Complete!                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show output files
echo -e "${BLUE}📁 Output files:${NC}"
ls -la release/*.dmg release/*.exe release/*.AppImage 2>/dev/null || echo "  (check release/ folder)"
echo ""

# Verify signature if on macOS
if [ "$PLATFORM" = "mac" ] && [ "$NO_SIGN" = false ]; then
    DMG_FILE=$(ls release/*.dmg 2>/dev/null | head -1)
    if [ -n "$DMG_FILE" ]; then
        echo -e "${BLUE}🔍 Verifying signature...${NC}"
        
        # Mount DMG temporarily
        MOUNT_POINT=$(mktemp -d)
        hdiutil attach "$DMG_FILE" -mountpoint "$MOUNT_POINT" -quiet 2>/dev/null || true
        
        APP_PATH="$MOUNT_POINT/AIBuddy.app"
        if [ -d "$APP_PATH" ]; then
            echo ""
            codesign -dv "$APP_PATH" 2>&1 | head -5 || echo "  (not signed)"
            echo ""
            
            # Check Gatekeeper assessment
            echo -e "${BLUE}🛡️  Gatekeeper assessment:${NC}"
            spctl -a -v "$APP_PATH" 2>&1 || echo "  ⚠️  App will show security warning on fresh Mac"
        fi
        
        # Unmount
        hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
        rm -rf "$MOUNT_POINT"
    fi
fi

echo ""
echo -e "${YELLOW}📖 For signing help, see: docs/CODE_SIGNING.md${NC}"
echo ""
