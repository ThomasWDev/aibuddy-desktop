#!/usr/bin/env bash
#
# upload-testflight.sh — Build, sign, and upload AIBuddy Desktop to TestFlight
#
# Prerequisites:
#   1. "3rd Party Mac Developer Application" cert installed in Keychain
#   2. "3rd Party Mac Developer Installer" cert installed in Keychain
#   3. Provisioning profile at build/embedded.provisionprofile
#   4. App-specific password stored in Keychain (see --setup flag)
#
# Usage:
#   ./scripts/upload-testflight.sh              # Full build + upload
#   ./scripts/upload-testflight.sh --setup      # First-time credential setup
#   ./scripts/upload-testflight.sh --build-only # Build .pkg without uploading
#   ./scripts/upload-testflight.sh --upload-only # Upload existing .pkg
#   ./scripts/upload-testflight.sh --validate   # Validate .pkg only
#

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────
TEAM_ID="S2237D23CB"
BUNDLE_ID="com.aibuddy.desktop"
APPLE_ID="twoodfin@berkeley.edu"
APP_NAME="AIBuddy"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="${PROJECT_DIR}/release"
MAS_DIR="${RELEASE_DIR}/mas-arm64"
APP_IDENTITY="3rd Party Mac Developer Application: AI Buddy Inc (Apps) (${TEAM_ID})"
INSTALLER_IDENTITY="3rd Party Mac Developer Installer: AI Buddy Inc (Apps) (${TEAM_ID})"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Helper functions ───────────────────────────────────────────────────────
log_info()  { echo -e "${BLUE}ℹ ${NC}$*"; }
log_ok()    { echo -e "${GREEN}✓ ${NC}$*"; }
log_warn()  { echo -e "${YELLOW}⚠ ${NC}$*"; }
log_error() { echo -e "${RED}✗ ${NC}$*"; }
log_step()  { echo -e "\n${BLUE}━━━ $* ━━━${NC}\n"; }

check_cert() {
  local label="$1"
  if security find-identity -v -p codesigning 2>/dev/null | grep -q "$label"; then
    log_ok "Found: $label"
    return 0
  else
    log_error "Missing: $label"
    return 1
  fi
}

check_installer_cert() {
  local label="$1"
  if security find-identity -v 2>/dev/null | grep -q "$label"; then
    log_ok "Found: $label"
    return 0
  else
    log_error "Missing: $label"
    return 1
  fi
}

get_version() {
  cd "$PROJECT_DIR"
  node -p "require('./package.json').version"
}

# ─── Setup credentials ─────────────────────────────────────────────────────
do_setup() {
  log_step "First-time Setup"

  echo "This will store your Apple ID credentials in the macOS Keychain."
  echo ""
  echo "You need an app-specific password from:"
  echo "  https://appleid.apple.com/account/manage → Sign-In and Security → App-Specific Passwords"
  echo ""
  echo "Steps:"
  echo "  1. Sign in at https://appleid.apple.com"
  echo "  2. Go to 'Sign-In and Security' → 'App-Specific Passwords'"
  echo "  3. Click '+' to generate a new password (name it 'AIBuddy TestFlight')"
  echo "  4. Copy the generated password"
  echo ""

  # Store credentials for altool
  xcrun notarytool store-credentials "AIBuddy-notarize" \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID"

  log_ok "Credentials stored in Keychain as 'AIBuddy-notarize'"
  echo ""
  echo "You can now run: ./scripts/upload-testflight.sh"
}

# ─── Preflight checks ──────────────────────────────────────────────────────
do_preflight() {
  log_step "Preflight Checks"

  local ok=true

  # Check certs
  if ! check_cert "3rd Party Mac Developer Application"; then
    log_error "Install from: https://developer.apple.com/account/resources/certificates/add"
    log_error "Select: 'Apple Distribution' certificate type"
    ok=false
  fi

  if ! check_installer_cert "3rd Party Mac Developer Installer"; then
    log_error "Install from: https://developer.apple.com/account/resources/certificates/add"
    log_error "Select: 'Mac Installer Distribution' certificate type"
    ok=false
  fi

  # Check provisioning profile
  if [ -f "${PROJECT_DIR}/build/embedded.provisionprofile" ]; then
    log_ok "Provisioning profile: build/embedded.provisionprofile"
  else
    log_error "Missing: build/embedded.provisionprofile"
    log_error "Download from: https://developer.apple.com/account/resources/profiles/list"
    ok=false
  fi

  # Check Xcode
  if command -v xcrun &>/dev/null; then
    log_ok "Xcode CLI: $(xcodebuild -version 2>/dev/null | head -1)"
  else
    log_error "Xcode CLI tools not installed"
    ok=false
  fi

  # Check node/pnpm
  if command -v pnpm &>/dev/null; then
    log_ok "pnpm: $(pnpm --version)"
  else
    log_error "pnpm not found"
    ok=false
  fi

  if [ "$ok" = false ]; then
    log_error "Preflight failed. Fix the above issues and retry."
    exit 1
  fi

  log_ok "All preflight checks passed"
}

# ─── Build ──────────────────────────────────────────────────────────────────
do_build() {
  local version
  version=$(get_version)
  log_step "Building AIBuddy v${version} for Mac App Store"

  cd "$PROJECT_DIR"

  # Step 1: Build renderer
  log_info "Building renderer..."
  pnpm build 2>&1 | tail -3
  log_ok "Renderer built"

  # Step 2: Build MAS .app (signed with Application cert)
  log_info "Building MAS .app (electron-builder)..."
  npx electron-builder --mac mas --publish never 2>&1 | tail -10

  if [ ! -d "${MAS_DIR}/${APP_NAME}.app" ]; then
    log_error "MAS .app not found at ${MAS_DIR}/${APP_NAME}.app"
    exit 1
  fi
  log_ok "MAS .app created"

  # Step 3: Verify code signing
  log_info "Verifying .app signature..."
  codesign -dvv "${MAS_DIR}/${APP_NAME}.app" 2>&1 | grep -E "Authority|Identifier"
  log_ok "App signature verified"

  # Step 4: Create signed .pkg
  local PKG_PATH="${MAS_DIR}/${APP_NAME}-${version}.pkg"
  log_info "Creating signed .pkg..."
  productbuild \
    --component "${MAS_DIR}/${APP_NAME}.app" /Applications \
    --sign "${INSTALLER_IDENTITY}" \
    "$PKG_PATH"

  if [ ! -f "$PKG_PATH" ]; then
    log_error ".pkg not created"
    exit 1
  fi

  local size
  size=$(du -h "$PKG_PATH" | awk '{print $1}')
  log_ok ".pkg created: ${PKG_PATH} (${size})"
  echo "$PKG_PATH"
}

# ─── Validate ───────────────────────────────────────────────────────────────
do_validate() {
  local pkg_path="$1"
  log_step "Validating Package"

  log_info "Running Apple validation..."
  xcrun altool --validate-app \
    --file "$pkg_path" \
    --type macos \
    -u "$APPLE_ID" \
    -p "@keychain:AIBuddy-notarize" 2>&1

  log_ok "Validation passed"
}

# ─── Upload ─────────────────────────────────────────────────────────────────
do_upload() {
  local pkg_path="$1"
  log_step "Uploading to App Store Connect (TestFlight)"

  log_info "Uploading ${pkg_path}..."
  log_info "This may take 5-15 minutes depending on connection speed..."

  xcrun altool --upload-app \
    --file "$pkg_path" \
    --type macos \
    -u "$APPLE_ID" \
    -p "@keychain:AIBuddy-notarize" 2>&1

  log_ok "Upload complete!"
  echo ""
  log_info "Next steps:"
  echo "  1. Open App Store Connect: https://appstoreconnect.apple.com/apps"
  echo "  2. Select 'Buddy Vibe Coding'"
  echo "  3. Go to TestFlight tab"
  echo "  4. Build should appear in 5-30 minutes after processing"
  echo "  5. Add internal testers for immediate testing"
  echo "  6. For external testers, submit for Beta App Review (~24-48h)"
  echo ""
  echo "  IAP Sandbox Testing:"
  echo "  • Settings > App Store > Sandbox Account (on Mac)"
  echo "  • Use a sandbox Apple ID to test purchases"
  echo "  • All 3 IAP products should appear in the purchase flow"
}

# ─── Find latest .pkg ──────────────────────────────────────────────────────
find_latest_pkg() {
  local version
  version=$(get_version)
  local pkg_path="${MAS_DIR}/${APP_NAME}-${version}.pkg"
  if [ -f "$pkg_path" ]; then
    echo "$pkg_path"
  else
    # Try to find any .pkg
    local found
    found=$(ls -t "${MAS_DIR}"/*.pkg 2>/dev/null | head -1)
    if [ -n "$found" ]; then
      echo "$found"
    else
      log_error "No .pkg found. Run with --build-only first."
      exit 1
    fi
  fi
}

# ─── Main ───────────────────────────────────────────────────────────────────
main() {
  local mode="${1:-full}"

  echo ""
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║       AIBuddy Desktop → TestFlight Upload            ║"
  echo "║       Team: AI Buddy Inc (Apps) (${TEAM_ID})  ║"
  echo "║       Bundle: ${BUNDLE_ID}                   ║"
  echo "╚═══════════════════════════════════════════════════════╝"
  echo ""

  case "$mode" in
    --setup)
      do_setup
      ;;
    --build-only)
      do_preflight
      do_build
      ;;
    --upload-only)
      local pkg_path
      pkg_path=$(find_latest_pkg)
      log_info "Using: $pkg_path"
      do_validate "$pkg_path"
      do_upload "$pkg_path"
      ;;
    --validate)
      local pkg_path
      pkg_path=$(find_latest_pkg)
      log_info "Using: $pkg_path"
      do_validate "$pkg_path"
      ;;
    full|*)
      do_preflight
      local pkg_path
      pkg_path=$(do_build | tail -1)
      do_validate "$pkg_path"
      do_upload "$pkg_path"
      ;;
  esac

  echo ""
  log_ok "Done!"
}

main "$@"
