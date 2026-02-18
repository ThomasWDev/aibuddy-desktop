#!/bin/bash

# ============================================================================
# AIBuddy Desktop - Build Deployment Script
# ============================================================================
# 
# Deploys built desktop apps to:
# 1. https://aibuddy.life/downloads
# 2. https://denvermobileappdeveloper.com/aibuddy-desktop
#
# Features:
# - Downloads from GitHub releases if local builds not available
# - Supports local builds OR GitHub release deployment
# - Auto-detects latest release version
#
# Usage:
#   ./scripts/deploy-builds.sh [version] [--from-github]
#
# Examples:
#   ./scripts/deploy-builds.sh                    # Deploy local builds
#   ./scripts/deploy-builds.sh 1.4.32             # Deploy specific version
#   ./scripts/deploy-builds.sh --from-github      # Download latest from GitHub
#   ./scripts/deploy-builds.sh 1.4.32 --from-github  # Download specific version
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
DOWNLOAD_DIR="$PROJECT_ROOT/.github-releases"

# GitHub repository
GITHUB_OWNER="ThomasWDev"
GITHUB_REPO="aibuddy-desktop"
GITHUB_API="https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO"

# Server configurations
DENVER_SERVER="ubuntu@3.132.25.123"
DENVER_KEY="$HOME/.ssh/denver_veterans.pem"
DENVER_SSH="ssh -o IdentitiesOnly=yes -i $DENVER_KEY"
DENVER_PATH="/var/www/deploy/denvermobileappdeveloper/current/public/downloads/aibuddy-desktop"

AIBUDDY_SERVER="u1998-ymfomzglajhz@aibuddy.life"
AIBUDDY_PORT="18765"
AIBUDDY_SSH="ssh -p $AIBUDDY_PORT"
AIBUDDY_PATH="/home/u1998-ymfomzglajhz/www/aibuddy.life/public_html/downloads"

# Parse arguments
FROM_GITHUB=false
VERSION=""

for arg in "$@"; do
    case $arg in
        --from-github)
            FROM_GITHUB=true
            ;;
        *)
            if [ -z "$VERSION" ]; then
                VERSION="$arg"
            fi
            ;;
    esac
done

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

# ============================================================================
# GitHub Release Functions
# ============================================================================

# Get latest release version from GitHub
get_latest_release_version() {
    local latest=$(curl -s "$GITHUB_API/releases/latest" | grep '"tag_name":' | sed -E 's/.*"v?([^"]+)".*/\1/')
    echo "$latest"
}

# Get release info for a specific version
get_release_info() {
    local version="$1"
    curl -s "$GITHUB_API/releases/tags/v$version" 2>/dev/null || \
    curl -s "$GITHUB_API/releases/tags/$version" 2>/dev/null
}

# List all releases
list_releases() {
    echo ""
    echo -e "${CYAN}📦 Available GitHub Releases:${NC}"
    echo ""
    
    local releases=$(curl -s "$GITHUB_API/releases" | grep '"tag_name":' | head -10 | sed -E 's/.*"v?([^"]+)".*/  - \1/')
    
    if [ -z "$releases" ]; then
        warn "No releases found on GitHub"
        echo "  You may need to create a release first:"
        echo "  1. Tag the commit: git tag v1.4.32"
        echo "  2. Push the tag: git push origin v1.4.32"
        echo "  3. Create release on GitHub with build artifacts"
        return 1
    fi
    
    echo "$releases"
    echo ""
}

# Download release assets from GitHub
download_github_release() {
    local version="$1"
    
    echo ""
    echo -e "${CYAN}📥 Downloading GitHub Release v$version...${NC}"
    echo ""
    
    # Create download directory
    mkdir -p "$DOWNLOAD_DIR/v$version"
    
    # Get release assets
    local release_json=$(get_release_info "$version")
    
    if [ -z "$release_json" ] || echo "$release_json" | grep -q "Not Found"; then
        error "Release v$version not found on GitHub"
        list_releases
        return 1
    fi
    
    # Extract download URLs for each asset
    local assets=$(echo "$release_json" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/"browser_download_url": *"\([^"]*\)"/\1/')
    
    if [ -z "$assets" ]; then
        warn "No downloadable assets found for v$version"
        echo "  The release may not have any uploaded files."
        return 1
    fi
    
    # Download each asset
    while IFS= read -r url; do
        if [ -n "$url" ]; then
            local filename=$(basename "$url")
            step "Downloading: $filename"
            
            if curl -L -# -o "$DOWNLOAD_DIR/v$version/$filename" "$url"; then
                success "Downloaded: $filename"
            else
                warn "Failed to download: $filename"
            fi
        fi
    done <<< "$assets"
    
    # Set DIST_DIR to the download directory
    DIST_DIR="$DOWNLOAD_DIR/v$version"
    
    echo ""
    success "Download complete! Files saved to: $DIST_DIR"
}

# ============================================================================
# Build Detection
# ============================================================================

find_build_files() {
    echo -e "${CYAN}📦 Checking build files in $DIST_DIR...${NC}"
    echo ""
    
    # When VERSION is set, match files for that specific version to avoid picking wrong builds
    local ver_pattern="${VERSION:-*}"
    
    MAC_ARM64_DMG=$(find "$DIST_DIR" -maxdepth 1 -name "*${ver_pattern}-arm64.dmg" 2>/dev/null | head -1)
    # Fallback: try generic pattern if version-specific match fails
    [ -z "$MAC_ARM64_DMG" ] && MAC_ARM64_DMG=$(find "$DIST_DIR" -maxdepth 1 -name "*-arm64.dmg" 2>/dev/null | sort -V | tail -1)
    
    MAC_X64_DMG=$(find "$DIST_DIR" -maxdepth 1 \( -name "*${ver_pattern}-x64.dmg" -o -name "*${ver_pattern}-intel.dmg" -o -name "*${ver_pattern}.dmg" \) ! -name "*-arm64.dmg" ! -name "*-universal.dmg" 2>/dev/null | head -1)
    [ -z "$MAC_X64_DMG" ] && MAC_X64_DMG=$(find "$DIST_DIR" -maxdepth 1 \( -name "*-x64.dmg" -o -name "*-intel.dmg" \) 2>/dev/null | sort -V | tail -1)
    
    MAC_UNIVERSAL_DMG=$(find "$DIST_DIR" -maxdepth 1 -name "*${ver_pattern}-universal.dmg" 2>/dev/null | head -1)
    [ -z "$MAC_UNIVERSAL_DMG" ] && MAC_UNIVERSAL_DMG=$(find "$DIST_DIR" -maxdepth 1 -name "*-universal.dmg" 2>/dev/null | sort -V | tail -1)
    
    WINDOWS_EXE=$(find "$DIST_DIR" -maxdepth 1 -name "*${ver_pattern}*.exe" 2>/dev/null | head -1)
    [ -z "$WINDOWS_EXE" ] && WINDOWS_EXE=$(find "$DIST_DIR" -maxdepth 1 -name "*.exe" 2>/dev/null | sort -V | tail -1)
    
    LINUX_APPIMAGE=$(find "$DIST_DIR" -maxdepth 1 -name "*${ver_pattern}*.AppImage" 2>/dev/null | head -1)
    [ -z "$LINUX_APPIMAGE" ] && LINUX_APPIMAGE=$(find "$DIST_DIR" -maxdepth 1 -name "*.AppImage" 2>/dev/null | sort -V | tail -1)
    
    LINUX_DEB=$(find "$DIST_DIR" -maxdepth 1 -name "*${ver_pattern}*.deb" 2>/dev/null | head -1)
    [ -z "$LINUX_DEB" ] && LINUX_DEB=$(find "$DIST_DIR" -maxdepth 1 -name "*.deb" 2>/dev/null | sort -V | tail -1)
    
    LINUX_RPM=$(find "$DIST_DIR" -maxdepth 1 -name "*${ver_pattern}*.rpm" 2>/dev/null | head -1)
    [ -z "$LINUX_RPM" ] && LINUX_RPM=$(find "$DIST_DIR" -maxdepth 1 -name "*.rpm" 2>/dev/null | sort -V | tail -1)
    
    # Display found files
    echo "  Found build files:"
    local found_any=false
    
    if [ -n "$MAC_ARM64_DMG" ]; then
        echo -e "    ${GREEN}✓${NC} macOS ARM64 (Apple Silicon): $(basename "$MAC_ARM64_DMG")"
        found_any=true
    fi
    if [ -n "$MAC_X64_DMG" ]; then
        echo -e "    ${GREEN}✓${NC} macOS x64 (Intel): $(basename "$MAC_X64_DMG")"
        found_any=true
    fi
    if [ -n "$MAC_UNIVERSAL_DMG" ]; then
        echo -e "    ${GREEN}✓${NC} macOS Universal: $(basename "$MAC_UNIVERSAL_DMG")"
        found_any=true
    fi
    if [ -n "$WINDOWS_EXE" ]; then
        echo -e "    ${GREEN}✓${NC} Windows: $(basename "$WINDOWS_EXE")"
        found_any=true
    fi
    if [ -n "$LINUX_APPIMAGE" ]; then
        echo -e "    ${GREEN}✓${NC} Linux AppImage: $(basename "$LINUX_APPIMAGE")"
        found_any=true
    fi
    if [ -n "$LINUX_DEB" ]; then
        echo -e "    ${GREEN}✓${NC} Linux DEB: $(basename "$LINUX_DEB")"
        found_any=true
    fi
    if [ -n "$LINUX_RPM" ]; then
        echo -e "    ${GREEN}✓${NC} Linux RPM: $(basename "$LINUX_RPM")"
        found_any=true
    fi
    
    if [ "$found_any" = false ]; then
        echo -e "    ${YELLOW}(none found)${NC}"
    fi
    
    echo ""
}

# ============================================================================
# Deploy to Denver Mobile App Developer
# ============================================================================
deploy_to_denver() {
    echo ""
    echo -e "${CYAN}🌐 Deploying to denvermobileappdeveloper.com...${NC}"
    echo ""
    
    step "Creating directory structure..."
    $DENVER_SSH $DENVER_SERVER "sudo mkdir -p $DENVER_PATH/$VERSION_FOLDER && sudo chown -R deploy:deploy $DENVER_PATH/$VERSION_FOLDER" 2>/dev/null || {
        warn "Could not connect to Denver server. Skipping..."
        return 1
    }
    success "Directory created: $DENVER_PATH/$VERSION_FOLDER"
    
    step "Uploading build files..."
    
    local uploaded=0
    
    # Upload each file if it exists
    if [ -n "$MAC_ARM64_DMG" ] && [ -f "$MAC_ARM64_DMG" ]; then
        scp -o IdentitiesOnly=yes -i "$DENVER_KEY" "$MAC_ARM64_DMG" "$DENVER_SERVER:/tmp/" && \
        $DENVER_SSH $DENVER_SERVER "sudo mv /tmp/$(basename "$MAC_ARM64_DMG") $DENVER_PATH/$VERSION_FOLDER/ && sudo chown deploy:deploy $DENVER_PATH/$VERSION_FOLDER/$(basename "$MAC_ARM64_DMG")" && \
        success "Uploaded: $(basename "$MAC_ARM64_DMG")" && ((uploaded++))
    fi
    
    if [ -n "$MAC_X64_DMG" ] && [ -f "$MAC_X64_DMG" ]; then
        scp -o IdentitiesOnly=yes -i "$DENVER_KEY" "$MAC_X64_DMG" "$DENVER_SERVER:/tmp/" && \
        $DENVER_SSH $DENVER_SERVER "sudo mv /tmp/$(basename "$MAC_X64_DMG") $DENVER_PATH/$VERSION_FOLDER/ && sudo chown deploy:deploy $DENVER_PATH/$VERSION_FOLDER/$(basename "$MAC_X64_DMG")" && \
        success "Uploaded: $(basename "$MAC_X64_DMG")" && ((uploaded++))
    fi
    
    if [ -n "$MAC_UNIVERSAL_DMG" ] && [ -f "$MAC_UNIVERSAL_DMG" ]; then
        scp -o IdentitiesOnly=yes -i "$DENVER_KEY" "$MAC_UNIVERSAL_DMG" "$DENVER_SERVER:/tmp/" && \
        $DENVER_SSH $DENVER_SERVER "sudo mv /tmp/$(basename "$MAC_UNIVERSAL_DMG") $DENVER_PATH/$VERSION_FOLDER/ && sudo chown deploy:deploy $DENVER_PATH/$VERSION_FOLDER/$(basename "$MAC_UNIVERSAL_DMG")" && \
        success "Uploaded: $(basename "$MAC_UNIVERSAL_DMG")" && ((uploaded++))
    fi
    
    if [ -n "$WINDOWS_EXE" ] && [ -f "$WINDOWS_EXE" ]; then
        scp -o IdentitiesOnly=yes -i "$DENVER_KEY" "$WINDOWS_EXE" "$DENVER_SERVER:/tmp/" && \
        $DENVER_SSH $DENVER_SERVER "sudo mv /tmp/$(basename "$WINDOWS_EXE") $DENVER_PATH/$VERSION_FOLDER/ && sudo chown deploy:deploy $DENVER_PATH/$VERSION_FOLDER/$(basename "$WINDOWS_EXE")" && \
        success "Uploaded: $(basename "$WINDOWS_EXE")" && ((uploaded++))
    fi
    
    if [ -n "$LINUX_APPIMAGE" ] && [ -f "$LINUX_APPIMAGE" ]; then
        scp -o IdentitiesOnly=yes -i "$DENVER_KEY" "$LINUX_APPIMAGE" "$DENVER_SERVER:/tmp/" && \
        $DENVER_SSH $DENVER_SERVER "sudo mv /tmp/$(basename "$LINUX_APPIMAGE") $DENVER_PATH/$VERSION_FOLDER/ && sudo chown deploy:deploy $DENVER_PATH/$VERSION_FOLDER/$(basename "$LINUX_APPIMAGE")" && \
        success "Uploaded: $(basename "$LINUX_APPIMAGE")" && ((uploaded++))
    fi
    
    if [ -n "$LINUX_DEB" ] && [ -f "$LINUX_DEB" ]; then
        scp -o IdentitiesOnly=yes -i "$DENVER_KEY" "$LINUX_DEB" "$DENVER_SERVER:/tmp/" && \
        $DENVER_SSH $DENVER_SERVER "sudo mv /tmp/$(basename "$LINUX_DEB") $DENVER_PATH/$VERSION_FOLDER/ && sudo chown deploy:deploy $DENVER_PATH/$VERSION_FOLDER/$(basename "$LINUX_DEB")" && \
        success "Uploaded: $(basename "$LINUX_DEB")" && ((uploaded++))
    fi
    
    if [ $uploaded -eq 0 ]; then
        warn "No files were uploaded to Denver"
        return 1
    fi
    
    # Create/update latest symlink
    step "Updating 'latest' symlink..."
    $DENVER_SSH $DENVER_SERVER "cd $DENVER_PATH && sudo rm -f latest && sudo ln -s $VERSION_FOLDER latest && sudo chown -h deploy:deploy latest"
    success "Symlink updated: latest -> $VERSION_FOLDER"
    
    # Generate download page data
    step "Generating download metadata..."
    $DENVER_SSH $DENVER_SERVER "sudo tee $DENVER_PATH/$VERSION_FOLDER/manifest.json > /dev/null << 'MANIFEST'
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
    
    # Clear Laravel cache
    step "Clearing Laravel cache..."
    $DENVER_SSH $DENVER_SERVER "cd /var/www/deploy/denvermobileappdeveloper/current && php artisan view:clear 2>/dev/null || true"
    success "Cache cleared"
    
    echo ""
    success "Denver deployment complete! ($uploaded files)"
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
    $AIBUDDY_SSH $AIBUDDY_SERVER "mkdir -p $AIBUDDY_PATH/$VERSION_FOLDER" 2>/dev/null || {
        warn "Could not connect to AIBuddy server. Skipping..."
        return 1
    }
    success "Directory created: $AIBUDDY_PATH/$VERSION_FOLDER"
    
    step "Uploading build files..."
    
    local uploaded=0
    
    # Upload each file if it exists
    if [ -n "$MAC_ARM64_DMG" ] && [ -f "$MAC_ARM64_DMG" ]; then
        scp -P $AIBUDDY_PORT "$MAC_ARM64_DMG" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
        success "Uploaded: $(basename "$MAC_ARM64_DMG")" && ((uploaded++))
    fi
    
    if [ -n "$MAC_X64_DMG" ] && [ -f "$MAC_X64_DMG" ]; then
        scp -P $AIBUDDY_PORT "$MAC_X64_DMG" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
        success "Uploaded: $(basename "$MAC_X64_DMG")" && ((uploaded++))
    fi
    
    if [ -n "$MAC_UNIVERSAL_DMG" ] && [ -f "$MAC_UNIVERSAL_DMG" ]; then
        scp -P $AIBUDDY_PORT "$MAC_UNIVERSAL_DMG" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
        success "Uploaded: $(basename "$MAC_UNIVERSAL_DMG")" && ((uploaded++))
    fi
    
    if [ -n "$WINDOWS_EXE" ] && [ -f "$WINDOWS_EXE" ]; then
        scp -P $AIBUDDY_PORT "$WINDOWS_EXE" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
        success "Uploaded: $(basename "$WINDOWS_EXE")" && ((uploaded++))
    fi
    
    if [ -n "$LINUX_APPIMAGE" ] && [ -f "$LINUX_APPIMAGE" ]; then
        scp -P $AIBUDDY_PORT "$LINUX_APPIMAGE" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
        success "Uploaded: $(basename "$LINUX_APPIMAGE")" && ((uploaded++))
    fi
    
    if [ -n "$LINUX_DEB" ] && [ -f "$LINUX_DEB" ]; then
        scp -P $AIBUDDY_PORT "$LINUX_DEB" "$AIBUDDY_SERVER:$AIBUDDY_PATH/$VERSION_FOLDER/" && \
        success "Uploaded: $(basename "$LINUX_DEB")" && ((uploaded++))
    fi
    
    if [ $uploaded -eq 0 ]; then
        warn "No files were uploaded to AIBuddy"
        return 1
    fi
    
    # Create/update latest symlink
    step "Updating 'latest' symlink..."
    $AIBUDDY_SSH $AIBUDDY_SERVER "cd $AIBUDDY_PATH && rm -f latest && ln -s $VERSION_FOLDER latest"
    success "Symlink updated: latest -> $VERSION_FOLDER"
    
    # Generate manifest
    step "Generating download metadata..."
    $AIBUDDY_SSH $AIBUDDY_SERVER "cat > $AIBUDDY_PATH/$VERSION_FOLDER/manifest.json << 'MANIFEST'
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
    success "AIBuddy deployment complete! ($uploaded files)"
    echo -e "  📍 ${CYAN}https://aibuddy.life/downloads${NC}"
}

# ============================================================================
# Update Website Pages
# ============================================================================
update_website_pages() {
    echo ""
    echo -e "${CYAN}📝 Updating website download pages...${NC}"
    echo ""
    
    # Determine which platforms are available
    local mac_available="false"
    local win_available="false"
    local linux_available="false"
    
    [ -n "$MAC_ARM64_DMG" ] || [ -n "$MAC_X64_DMG" ] || [ -n "$MAC_UNIVERSAL_DMG" ] && mac_available="true"
    [ -n "$WINDOWS_EXE" ] && win_available="true"
    [ -n "$LINUX_APPIMAGE" ] || [ -n "$LINUX_DEB" ] && linux_available="true"
    
    step "Detected platforms:"
    echo "    macOS: $mac_available"
    echo "    Windows: $win_available"
    echo "    Linux: $linux_available"
    
    # Update Denver Blade view
    step "Updating Denver download page..."
    $DENVER_SSH $DENVER_SERVER "cd /var/www/deploy/denvermobileappdeveloper/current/resources/views/frontend && \
        sudo sed -i 's/v1\.[0-9]\+\.[0-9]\+/v$VERSION/g' aibuddy-desktop.blade.php 2>/dev/null || true"
    success "Denver page updated to v$VERSION"
    
    # Update AIBuddy.life page
    step "Updating AIBuddy.life download page..."
    $AIBUDDY_SSH $AIBUDDY_SERVER "cd $AIBUDDY_PATH/../ && \
        sed -i 's/Version 1\.[0-9]\+\.[0-9]\+/Version $VERSION/g' downloads.html 2>/dev/null && \
        sed -i 's/v1\.[0-9]\+\.[0-9]\+/v$VERSION/g' downloads.html 2>/dev/null && \
        cp downloads.html downloads/index.html 2>/dev/null || true"
    success "AIBuddy.life page updated to v$VERSION"
}

# ============================================================================
# Main execution
# ============================================================================

echo ""
echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}     ${CYAN}AIBuddy Desktop - Build Deployment${NC}                      ${PURPLE}║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Determine version
if [ -z "$VERSION" ]; then
    if [ "$FROM_GITHUB" = true ]; then
        step "Fetching latest release version from GitHub..."
        VERSION=$(get_latest_release_version)
        if [ -z "$VERSION" ]; then
            error "Could not determine latest version from GitHub"
            list_releases
            exit 1
        fi
        success "Latest release: v$VERSION"
    else
        VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version" 2>/dev/null || echo "1.4.32")
    fi
fi

echo -e "  ${YELLOW}Version: v$VERSION${NC}"
echo -e "  ${YELLOW}Source: $([ "$FROM_GITHUB" = true ] && echo "GitHub Releases" || echo "Local builds")${NC}"
echo ""

# Download from GitHub if requested
if [ "$FROM_GITHUB" = true ]; then
    download_github_release "$VERSION" || exit 1
fi

# Check if dist folder exists
if [ ! -d "$DIST_DIR" ]; then
    error "Build folder not found at $DIST_DIR"
    echo ""
    echo "  Options:"
    echo "    1. Run 'pnpm build && pnpm package:mac' to create local builds"
    echo "    2. Use --from-github flag to download from GitHub releases"
    echo ""
    list_releases
    exit 1
fi

# Find build files
find_build_files

# Create version folder name
VERSION_FOLDER="v$VERSION"

# Check if any files found
if [ -z "$MAC_ARM64_DMG" ] && [ -z "$MAC_X64_DMG" ] && [ -z "$MAC_UNIVERSAL_DMG" ] && \
   [ -z "$WINDOWS_EXE" ] && [ -z "$LINUX_APPIMAGE" ] && [ -z "$LINUX_DEB" ]; then
    error "No build files found in $DIST_DIR"
    echo ""
    if [ "$FROM_GITHUB" = true ]; then
        echo "  The GitHub release may not have any uploaded assets."
        echo "  Please upload build files to the release."
    else
        echo "  Run 'pnpm build && pnpm package:mac' to create builds."
    fi
    exit 1
fi

# Ask for confirmation
echo -e "${YELLOW}Ready to deploy v$VERSION to both servers.${NC}"
echo ""
echo "  Files to deploy:"
[ -n "$MAC_ARM64_DMG" ] && echo "    - $(basename "$MAC_ARM64_DMG")"
[ -n "$MAC_X64_DMG" ] && echo "    - $(basename "$MAC_X64_DMG")"
[ -n "$MAC_UNIVERSAL_DMG" ] && echo "    - $(basename "$MAC_UNIVERSAL_DMG")"
[ -n "$WINDOWS_EXE" ] && echo "    - $(basename "$WINDOWS_EXE")"
[ -n "$LINUX_APPIMAGE" ] && echo "    - $(basename "$LINUX_APPIMAGE")"
[ -n "$LINUX_DEB" ] && echo "    - $(basename "$LINUX_DEB")"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy to both servers
deploy_to_denver || true  # Continue even if Denver fails
deploy_to_aibuddy || true  # Continue even if AIBuddy fails

# Update website pages with new version
update_website_pages || true

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
echo "  Source: $([ "$FROM_GITHUB" = true ] && echo "GitHub Releases" || echo "Local builds")"
echo ""
echo "  Download pages:"
echo -e "    ${CYAN}https://denvermobileappdeveloper.com/aibuddy-desktop${NC}"
echo -e "    ${CYAN}https://aibuddy.life/downloads${NC}"
echo ""
echo "  Direct download URLs:"
echo -e "    ${BLUE}https://denvermobileappdeveloper.com/downloads/aibuddy-desktop/v$VERSION/${NC}"
echo -e "    ${BLUE}https://aibuddy.life/downloads/v$VERSION/${NC}"
echo ""

# Cleanup downloaded files if from GitHub
if [ "$FROM_GITHUB" = true ]; then
    read -p "Delete downloaded files from $DOWNLOAD_DIR? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$DOWNLOAD_DIR"
        success "Downloaded files cleaned up"
    fi
fi

echo ""
echo -e "${GREEN}Done! 🎉${NC}"
