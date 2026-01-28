#!/bin/bash

# ============================================================================
# AIBuddy Desktop - Build Deployment Script
# ============================================================================
# 
# Deploys built desktop apps to:
# 1. https://aibuddy.life/downloads
# 2. https://denvermobileappdeveloper.com/aibuddy-desktop
#
# Prerequisites:
# - SSH access to both servers
# - Builds already created in dist/ folder
# - rsync installed locally
#
# Usage:
#   ./scripts/deploy-builds.sh [version]
#
# Examples:
#   ./scripts/deploy-builds.sh 1.4.32
#   ./scripts/deploy-builds.sh          # Uses version from package.json
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
DIST_DIR="$PROJECT_ROOT/release"

# Server configurations
DENVER_SERVER="root@denvermobileappdeveloper.com"
DENVER_PATH="/var/www/denvermobileappdeveloper.com/public/downloads/aibuddy-desktop"

AIBUDDY_SERVER="root@aibuddy.life"
AIBUDDY_PATH="/var/www/aibuddy.life/public/downloads"

# Get version from package.json or argument
if [ -n "$1" ]; then
    VERSION="$1"
else
    VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version" 2>/dev/null || echo "1.4.32")
fi

echo ""
echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}     ${CYAN}AIBuddy Desktop - Build Deployment${NC}                      ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}     ${YELLOW}Version: v$VERSION${NC}                                       ${PURPLE}║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
step() {
    echo -e "${BLUE}▶${NC} $1"
}

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print warning
warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if dist folder exists
if [ ! -d "$DIST_DIR" ]; then
    error "Dist folder not found at $DIST_DIR"
    echo "  Run 'pnpm build' first to create the builds."
    exit 1
fi

# Find build files
echo -e "${CYAN}📦 Checking build files...${NC}"
echo ""

MAC_ARM64_DMG=$(find "$DIST_DIR" -name "*-arm64.dmg" 2>/dev/null | head -1)
MAC_X64_DMG=$(find "$DIST_DIR" -name "*-x64.dmg" -o -name "*-intel.dmg" 2>/dev/null | head -1)
MAC_UNIVERSAL_DMG=$(find "$DIST_DIR" -name "*-universal.dmg" 2>/dev/null | head -1)
WINDOWS_EXE=$(find "$DIST_DIR" -name "*.exe" 2>/dev/null | head -1)
LINUX_APPIMAGE=$(find "$DIST_DIR" -name "*.AppImage" 2>/dev/null | head -1)
LINUX_DEB=$(find "$DIST_DIR" -name "*.deb" 2>/dev/null | head -1)
LINUX_RPM=$(find "$DIST_DIR" -name "*.rpm" 2>/dev/null | head -1)

# Display found files
echo "  Found build files:"
[ -n "$MAC_ARM64_DMG" ] && echo -e "    ${GREEN}✓${NC} macOS ARM64 (Apple Silicon): $(basename "$MAC_ARM64_DMG")"
[ -n "$MAC_X64_DMG" ] && echo -e "    ${GREEN}✓${NC} macOS x64 (Intel): $(basename "$MAC_X64_DMG")"
[ -n "$MAC_UNIVERSAL_DMG" ] && echo -e "    ${GREEN}✓${NC} macOS Universal: $(basename "$MAC_UNIVERSAL_DMG")"
[ -n "$WINDOWS_EXE" ] && echo -e "    ${GREEN}✓${NC} Windows: $(basename "$WINDOWS_EXE")"
[ -n "$LINUX_APPIMAGE" ] && echo -e "    ${GREEN}✓${NC} Linux AppImage: $(basename "$LINUX_APPIMAGE")"
[ -n "$LINUX_DEB" ] && echo -e "    ${GREEN}✓${NC} Linux DEB: $(basename "$LINUX_DEB")"
[ -n "$LINUX_RPM" ] && echo -e "    ${GREEN}✓${NC} Linux RPM: $(basename "$LINUX_RPM")"
echo ""

# Check if any files found
if [ -z "$MAC_ARM64_DMG" ] && [ -z "$MAC_X64_DMG" ] && [ -z "$WINDOWS_EXE" ] && [ -z "$LINUX_APPIMAGE" ]; then
    error "No build files found in $DIST_DIR"
    exit 1
fi

# Create version folder name
VERSION_FOLDER="v$VERSION"

# ============================================================================
# Deploy to Denver Mobile App Developer
# ============================================================================
deploy_to_denver() {
    echo ""
    echo -e "${CYAN}🌐 Deploying to denvermobileappdeveloper.com...${NC}"
    echo ""
    
    step "Creating directory structure..."
    ssh $DENVER_SERVER "mkdir -p $DENVER_PATH/$VERSION_FOLDER" 2>/dev/null || {
        warn "Could not connect to Denver server. Skipping..."
        return 1
    }
    success "Directory created: $DENVER_PATH/$VERSION_FOLDER"
    
    step "Uploading build files..."
    
    # Upload each file if it exists
    if [ -n "$MAC_ARM64_DMG" ]; then
        rsync -avz --progress "$MAC_ARM64_DMG" "$DENVER_SERVER:$DENVER_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$MAC_ARM64_DMG")"
    fi
    
    if [ -n "$MAC_X64_DMG" ]; then
        rsync -avz --progress "$MAC_X64_DMG" "$DENVER_SERVER:$DENVER_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$MAC_X64_DMG")"
    fi
    
    if [ -n "$MAC_UNIVERSAL_DMG" ]; then
        rsync -avz --progress "$MAC_UNIVERSAL_DMG" "$DENVER_SERVER:$DENVER_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$MAC_UNIVERSAL_DMG")"
    fi
    
    if [ -n "$WINDOWS_EXE" ]; then
        rsync -avz --progress "$WINDOWS_EXE" "$DENVER_SERVER:$DENVER_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$WINDOWS_EXE")"
    fi
    
    if [ -n "$LINUX_APPIMAGE" ]; then
        rsync -avz --progress "$LINUX_APPIMAGE" "$DENVER_SERVER:$DENVER_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$LINUX_APPIMAGE")"
    fi
    
    if [ -n "$LINUX_DEB" ]; then
        rsync -avz --progress "$LINUX_DEB" "$DENVER_SERVER:$DENVER_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$LINUX_DEB")"
    fi
    
    # Create/update latest symlink
    step "Updating 'latest' symlink..."
    ssh $DENVER_SERVER "cd $DENVER_PATH && rm -f latest && ln -s $VERSION_FOLDER latest"
    success "Symlink updated: latest -> $VERSION_FOLDER"
    
    # Generate download page data
    step "Generating download metadata..."
    ssh $DENVER_SERVER "cat > $DENVER_PATH/$VERSION_FOLDER/manifest.json << 'MANIFEST'
{
  \"version\": \"$VERSION\",
  \"releaseDate\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"downloads\": {
    \"macOS-arm64\": \"$([ -n \"$MAC_ARM64_DMG\" ] && basename \"$MAC_ARM64_DMG\" || echo '')\",
    \"macOS-x64\": \"$([ -n \"$MAC_X64_DMG\" ] && basename \"$MAC_X64_DMG\" || echo '')\",
    \"macOS-universal\": \"$([ -n \"$MAC_UNIVERSAL_DMG\" ] && basename \"$MAC_UNIVERSAL_DMG\" || echo '')\",
    \"windows\": \"$([ -n \"$WINDOWS_EXE\" ] && basename \"$WINDOWS_EXE\" || echo '')\",
    \"linux-appimage\": \"$([ -n \"$LINUX_APPIMAGE\" ] && basename \"$LINUX_APPIMAGE\" || echo '')\",
    \"linux-deb\": \"$([ -n \"$LINUX_DEB\" ] && basename \"$LINUX_DEB\" || echo '')\"
  }
}
MANIFEST"
    success "Manifest created"
    
    echo ""
    success "Denver deployment complete!"
    echo -e "  📍 ${CYAN}https://denvermobileappdeveloper.com/aibuddy-desktop${NC}"
}

# ============================================================================
# Deploy to AIBuddy.life
# ============================================================================
deploy_to_aibuddy() {
    echo ""
    echo -e "${CYAN}🌐 Deploying to aibuddy.life...${NC}"
    echo ""
    
    step "Creating directory structure..."
    ssh $AIBUDDY_SERVER "mkdir -p $AIBUDDY_PATH/$VERSION_FOLDER" 2>/dev/null || {
        warn "Could not connect to AIBuddy server. Skipping..."
        return 1
    }
    success "Directory created: $AIBUDDY_PATH/$VERSION_FOLDER"
    
    step "Uploading build files..."
    
    # Upload each file if it exists
    if [ -n "$MAC_ARM64_DMG" ]; then
        rsync -avz --progress "$MAC_ARM64_DMG" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$MAC_ARM64_DMG")"
    fi
    
    if [ -n "$MAC_X64_DMG" ]; then
        rsync -avz --progress "$MAC_X64_DMG" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$MAC_X64_DMG")"
    fi
    
    if [ -n "$MAC_UNIVERSAL_DMG" ]; then
        rsync -avz --progress "$MAC_UNIVERSAL_DMG" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$MAC_UNIVERSAL_DMG")"
    fi
    
    if [ -n "$WINDOWS_EXE" ]; then
        rsync -avz --progress "$WINDOWS_EXE" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$WINDOWS_EXE")"
    fi
    
    if [ -n "$LINUX_APPIMAGE" ]; then
        rsync -avz --progress "$LINUX_APPIMAGE" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$LINUX_APPIMAGE")"
    fi
    
    if [ -n "$LINUX_DEB" ]; then
        rsync -avz --progress "$LINUX_DEB" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
            success "Uploaded: $(basename "$LINUX_DEB")"
    fi
    
    # Create/update latest symlink
    step "Updating 'latest' symlink..."
    ssh $AIBUDDY_SERVER "cd $AIBUDDY_PATH && rm -f latest && ln -s $VERSION_FOLDER latest"
    success "Symlink updated: latest -> $VERSION_FOLDER"
    
    # Generate manifest
    step "Generating download metadata..."
    ssh $AIBUDDY_SERVER "cat > $AIBUDDY_PATH/$VERSION_FOLDER/manifest.json << 'MANIFEST'
{
  \"version\": \"$VERSION\",
  \"releaseDate\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"downloads\": {
    \"macOS-arm64\": \"$([ -n \"$MAC_ARM64_DMG\" ] && basename \"$MAC_ARM64_DMG\" || echo '')\",
    \"macOS-x64\": \"$([ -n \"$MAC_X64_DMG\" ] && basename \"$MAC_X64_DMG\" || echo '')\",
    \"macOS-universal\": \"$([ -n \"$MAC_UNIVERSAL_DMG\" ] && basename \"$MAC_UNIVERSAL_DMG\" || echo '')\",
    \"windows\": \"$([ -n \"$WINDOWS_EXE\" ] && basename \"$WINDOWS_EXE\" || echo '')\",
    \"linux-appimage\": \"$([ -n \"$LINUX_APPIMAGE\" ] && basename \"$LINUX_APPIMAGE\" || echo '')\",
    \"linux-deb\": \"$([ -n \"$LINUX_DEB\" ] && basename \"$LINUX_DEB\" || echo '')\"
  }
}
MANIFEST"
    success "Manifest created"
    
    echo ""
    success "AIBuddy deployment complete!"
    echo -e "  📍 ${CYAN}https://aibuddy.life/downloads${NC}"
}

# ============================================================================
# Main execution
# ============================================================================

# Ask for confirmation
echo -e "${YELLOW}Ready to deploy v$VERSION to both servers.${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy to both servers
deploy_to_denver || true  # Continue even if Denver fails
deploy_to_aibuddy || true  # Continue even if AIBuddy fails

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}     ${GREEN}Deployment Complete!${NC}                                    ${PURPLE}║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Version: v$VERSION"
echo "  Date: $(date)"
echo ""
echo "  Download links:"
echo -e "    ${CYAN}https://denvermobileappdeveloper.com/aibuddy-desktop${NC}"
echo -e "    ${CYAN}https://aibuddy.life/downloads${NC}"
echo ""
echo "  Direct download URLs:"
echo -e "    ${BLUE}https://denvermobileappdeveloper.com/downloads/aibuddy-desktop/v$VERSION/${NC}"
echo -e "    ${BLUE}https://aibuddy.life/downloads/v$VERSION/${NC}"
echo ""

# Push git changes
read -p "Push git changes to origin? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin develop
    success "Pushed to origin/develop"
fi

echo ""
echo -e "${GREEN}Done! 🎉${NC}"
