# AIBuddy Desktop - Code Signing Guide

## Quick Status (January 29, 2026)

| Platform | v1.4.33 | Signing Status | User Experience |
|----------|---------|----------------|-----------------|
| **macOS** | ✅ Built | ✅ **Code Signed** (Developer ID) | No warnings |
| **Windows** | ✅ Built | ❌ Not Signed | SmartScreen warning |
| **Linux** | ✅ Built | ✅ N/A (not required) | No warnings |

---

## Windows EV Code Signing - TODO

### Why Needed
Without signing, Windows users see "Windows protected your PC" SmartScreen warning.

### Recommended Providers

| Provider | Price/Year | URL |
|----------|------------|-----|
| **SSL.com** (Recommended) | $239 | https://www.ssl.com/certificates/ev-code-signing/ |
| **Certum** (Budget) | $189 | https://shop.certum.eu/ev-code-signing-certificate.html |
| **Sectigo** | $299 | https://sectigo.com/ssl-certificates-tls/code-signing/ |
| **DigiCert** (Premium) | $499 | https://www.digicert.com/signing/code-signing-certificates |

### Requirements to Apply
1. **Business verification**: Registration docs, EIN/Tax ID
2. **Identity verification**: Government ID, phone call
3. **Hardware token**: USB key (usually included) or cloud signing

### Timeline
- Application: 10 minutes
- Verification: 1-5 business days
- Token delivery: 2-3 days
- **Total: ~1-2 weeks**

### Integration with Electron Builder
```javascript
// package.json
{
  "build": {
    "win": {
      "certificateSubjectName": "AI Buddy Inc",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

### AWS Cannot Help
AWS Signer only supports Lambda and IoT code signing, NOT desktop applications (Windows EXE, macOS DMG).

---

**Last Updated:** January 28, 2026  
**Current Version:** 1.5.63

---

## Quick Reference

| Platform | Signing Status | Certificate Cost |
|----------|----------------|-----------------|
| **macOS** | ✅ Signed | $99/year (Apple Developer) |
| **Windows** | ⚠️ Not signed | ~$350-500/year (EV cert) |
| **Linux** | ✅ Not required | Free |

---

## macOS Code Signing ✅ CONFIGURED

### Certificate Details
- **Identity:** `Developer ID Application: AI Buddy Inc (Apps) (S2237D23CB)`
- **Type:** Developer ID Application (for distribution outside Mac App Store)
- **Team ID:** S2237D23CB
- **Expiry:** January 30, 2031
- **Certificate File:** `developerID_application.cer` (included in downloads)

### Verify Downloaded App

Users can verify the app is properly signed:

```bash
# Check app signature
codesign -dv --verbose=2 /Applications/AIBuddy.app

# Should show:
# Authority=Developer ID Application: AI Buddy Inc (Apps) (S2237D23CB)
# Authority=Developer ID Certification Authority
# Authority=Apple Root CA
```

### How to Build Signed App

```bash
# Build ARM64 (Apple Silicon)
cd aibuddy-desktop
pnpm build
pnpm package:mac:arm64

# Build x64 (Intel)
pnpm package:mac:x64
```

### Verify Signature

```bash
# Check app signature
codesign -dv --verbose=4 "release/mac-arm64/AIBuddy.app"

# Verify signature validity
codesign --verify --deep --strict "release/mac-arm64/AIBuddy.app"

# Check Gatekeeper acceptance
spctl --assess --verbose "release/mac-arm64/AIBuddy.app"
```

### Notarization (Optional)

For Gatekeeper to fully trust the app on first launch, enable notarization:

1. Create App-specific password at https://appleid.apple.com
2. Set environment variables:
   ```bash
   export APPLE_ID="your-apple-id@email.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="S2237D23CB"
   ```
3. Update `package.json`:
   ```json
   "mac": {
     "notarize": {
       "teamId": "S2237D23CB"
     }
   }
   ```

---

## Windows Code Signing ⚠️ REQUIRES CERTIFICATE

### Current Status
- **Status:** Not signed (users see SmartScreen warning)
- **Cost:** ~$350-500/year for EV certificate
- **Priority:** Medium (most users are on Mac)

### What Users See Without Signing
1. "Windows protected your PC" (SmartScreen)
2. "Unknown publisher" in app properties
3. Users must click "More info" → "Run anyway"

### Certificate Options

| Provider | Type | Cost (Annual) | SmartScreen Trust | Notes |
|----------|------|---------------|-------------------|-------|
| [SSL.com](https://www.ssl.com/certificates/ev-code-signing/) | EV | ~$350 | Builds over time | Best value |
| [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing) | EV | ~$400 | Immediate | Popular choice |
| [DigiCert](https://www.digicert.com/signing/code-signing-certificates) | EV | ~$500 | Immediate | Enterprise-grade |
| [GlobalSign](https://www.globalsign.com/en/code-signing-certificate) | EV | ~$450 | Immediate | Good support |

### How to Sign (Once You Have Certificate)

**Option 1: Local Certificate (PFX file)**

```json
// package.json
"win": {
  "certificateFile": "certs/windows-ev-cert.pfx",
  "certificatePassword": "${WIN_CSC_KEY_PASSWORD}",
  "publisherName": "AI Buddy Inc"
}
```

**Option 2: Azure SignTool (EV on HSM)**

```bash
# Install Azure SignTool
dotnet tool install --global AzureSignTool

# Sign the executable
AzureSignTool sign \
  -kvu "https://your-vault.vault.azure.net" \
  -kvi "your-client-id" \
  -kvs "your-client-secret" \
  -kvc "your-cert-name" \
  -tr http://timestamp.digicert.com \
  -td sha256 \
  "AIBuddy-Setup-1.4.33.exe"
```

**Option 3: SignTool (Windows SDK)**

```bash
# Sign with local certificate
signtool sign /f cert.pfx /p password /tr http://timestamp.digicert.com /td sha256 "AIBuddy-Setup.exe"
```

### Build Windows Installer

```bash
# On Windows or CI with Wine
pnpm package:win
```

### Temporary Instructions for Users

Add to download page:
```
⚠️ Windows SmartScreen Warning

When installing on Windows, you may see a "Windows protected your PC" warning.
This is because the app is not yet signed with an EV certificate.

To install:
1. Click "More info"
2. Click "Run anyway"
3. The app is safe - it's the same code that's signed on macOS
```

---

## Linux Signing 📦 NOT REQUIRED

Linux distributions don't require code signing in the traditional sense. Users trust packages based on:
- Distribution's package manager (apt, dnf, etc.)
- AppImage portability (no install needed)
- Snap/Flatpak store verification

### Current Status
- **Status:** ✅ No signing required
- **Cost:** Free
- **Distribution:** AppImage (portable, works everywhere)

### Package Formats

| Format | Target Users | Installation | Signing |
|--------|--------------|--------------|---------|
| **AppImage** | All Linux | Download & run | Optional GPG |
| **.deb** | Debian/Ubuntu | `sudo dpkg -i` | Optional GPG |
| **.rpm** | Fedora/RHEL | `sudo rpm -i` | Optional GPG |
| **Snap** | Ubuntu | Snap Store | Store signs |
| **Flatpak** | All | Flathub | Store signs |

### How to Build

```bash
# Build AppImage (recommended - most portable)
pnpm package:linux

# Build all Linux formats
pnpm package:linux:snap  # Requires snapcraft
```

### AppImage Usage

AppImage is a portable format that works on most Linux distributions:

```bash
# Download
wget https://aibuddy.life/downloads/v1.4.33/AIBuddy-1.4.33.AppImage

# Make executable
chmod +x AIBuddy-1.4.33.AppImage

# Run
./AIBuddy-1.4.33.AppImage
```

### Optional GPG Signing

For users who want to verify authenticity:

```bash
# Generate GPG key (one-time setup)
gpg --full-generate-key

# Sign AppImage
gpg --detach-sign --armor AIBuddy-1.4.33.AppImage
# Creates: AIBuddy-1.4.33.AppImage.asc

# Users verify with:
gpg --verify AIBuddy-1.4.33.AppImage.asc AIBuddy-1.4.33.AppImage
```

### Snap Store Distribution (Future)

To publish to Snap Store:

```bash
# Build snap
pnpm package:linux:snap

# Login and upload
snapcraft login
snapcraft upload AIBuddy_1.4.33_amd64.snap --release=stable
```

---

## Build All Platforms

```bash
# macOS only (from Mac)
pnpm package:mac

# Windows only (from Windows or CI)
pnpm package:win

# Linux only (from Linux or CI)
pnpm package:linux

# All platforms (requires all platform toolchains)
pnpm package:all
```

---

## CI/CD Signing

For GitHub Actions or other CI:

### macOS (GitHub Actions)

```yaml
- name: Build macOS
  env:
    CSC_LINK: ${{ secrets.MAC_CERTIFICATE_P12 }}
    CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
    APPLE_TEAM_ID: S2237D23CB
  run: pnpm package:mac
```

### Windows (GitHub Actions)

```yaml
- name: Build Windows
  env:
    WIN_CSC_LINK: ${{ secrets.WIN_CERTIFICATE_P12 }}
    WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERTIFICATE_PASSWORD }}
  run: pnpm package:win
```

---

## Deployment

After building, deploy using:

```bash
# Deploy to both Denver and AIBuddy.life
./scripts/deploy-builds.sh 1.4.32
```

---

## Download URLs

### Production Downloads
- **AIBuddy.life:** https://aibuddy.life/downloads/latest/
- **Denver:** https://denvermobileappdeveloper.com/downloads/aibuddy-desktop/latest/

### Direct Links (v1.4.33)
- **macOS (Apple Silicon):** https://aibuddy.life/downloads/v1.4.33/AIBuddy-1.4.33-arm64.dmg
- **macOS (Intel):** https://aibuddy.life/downloads/v1.4.33/AIBuddy-1.4.33.dmg
- **Certificate:** https://aibuddy.life/downloads/v1.4.33/developerID_application.cer

---

## Deployment Script

Deploy new versions to both servers:

```bash
cd aibuddy-desktop
./scripts/deploy-builds.sh 1.4.33
```

---

## Resources

### Apple
- [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
- [Developer ID Documentation](https://developer.apple.com/developer-id/)
- [Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

### Windows
- [SSL.com EV Code Signing](https://www.ssl.com/certificates/ev-code-signing/)
- [Azure SignTool](https://github.com/vcsjones/AzureSignTool)
- [Microsoft Code Signing Guide](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

### Linux
- [AppImage Documentation](https://appimage.org/)
- [Snapcraft](https://snapcraft.io/)
- [Flatpak](https://flatpak.org/)

### Electron
- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [electron-builder Configuration](https://www.electron.build/configuration/configuration)

---

## Mac App Store (MAS) / TestFlight Signing

### ITMS-90885 Fix — Helper Provisioning Profiles

Electron apps contain nested helper `.app` bundles that Apple requires to each
have their own `embedded.provisionprofile` for TestFlight and Mac App Store.
Without this, you get ITMS-90885 errors after upload.

**Affected helpers (inside `AIBuddy.app`):**

| Helper Bundle | Bundle ID | Location |
|---------------|-----------|----------|
| AIBuddy Helper | `com.aibuddy.desktop.helper` | `Contents/Frameworks/` |
| AIBuddy Helper (GPU) | `com.aibuddy.desktop.helper.GPU` | `Contents/Frameworks/` |
| AIBuddy Helper (Plugin) | `com.aibuddy.desktop.helper.Plugin` | `Contents/Frameworks/` |
| AIBuddy Helper (Renderer) | `com.aibuddy.desktop.helper.Renderer` | `Contents/Frameworks/` |
| AIBuddy Login Helper | `com.aibuddy.desktop.loginhelper` | `Contents/Library/LoginItems/` |

### How It Works

1. A **wildcard App ID** `com.aibuddy.desktop.*` is registered in Apple Developer Portal
   (Apple resource ID: `AZB8369VSX`)
2. A **Mac App Store Distribution provisioning profile** is created for that wildcard
   (Apple profile ID: `283CXD9R74`, name: "AIBuddy Desktop Helpers MAS Distribution")
3. The profile is saved to `build/embedded-helpers.provisionprofile`
4. **`build/afterPack.js`** automatically copies this profile into each helper's
   `Contents/embedded.provisionprofile` during MAS builds
5. MAS detection: the hook checks `appOutDir` path (contains `mas-`),
   CLI args (contains `mas`), or `MAS_BUILD=true` env var

### Provisioning Profile Files

| File | App ID | Purpose |
|------|--------|---------|
| `build/embedded.provisionprofile` | `S2237D23CB.com.aibuddy.desktop` | Main app bundle |
| `build/embedded-helpers.provisionprofile` | `S2237D23CB.com.aibuddy.desktop.*` | All 5 helper bundles |

Both files are **gitignored**. In CI, they are decoded from GitHub secrets
(`MAS_PROVISION_PROFILE` and `MAS_HELPERS_PROVISION_PROFILE`).

### Regenerating the Helper Profile (if expired)

```bash
cd aibuddy-desktop

# Run the automated script (uses App Store Connect API)
./scripts/create-helper-profile.sh

# Then update the CI secret
base64 -i build/embedded-helpers.provisionprofile | \
  gh secret set MAS_HELPERS_PROVISION_PROFILE --repo Thomas-Woodfin/AICodingVS
```

**Prerequisites for the script:**
```bash
pip3 install PyJWT cryptography requests
```

The script (`scripts/create-helper-profile.sh`) uses the App Store Connect API
(key at `~/.private_keys/AuthKey_WL4HMQYALA.p8`) to:
1. Register `com.aibuddy.desktop.*` wildcard App ID (idempotent — skips if exists)
2. Find the MAS distribution certificate
3. Create or reuse the provisioning profile
4. Save to `build/embedded-helpers.provisionprofile`
5. Verify the profile content

### MAS Build Process (local)

```bash
cd aibuddy-desktop
pnpm build
MAS_BUILD=true pnpm package:mas
# afterPack.js embeds profiles in all helpers automatically
```

### MAS Build Process (CI)

The CI workflow (`release-on-master.yml`) handles this automatically:
1. Decodes both provisioning profiles from secrets
2. Writes them to `build/embedded.provisionprofile` and `build/embedded-helpers.provisionprofile`
3. Runs `pnpm package:mas` with `MAS_BUILD=true`
4. `afterPack.js` embeds the helper profile in all 5 helpers
5. Verifies each helper has a profile before proceeding

### Verify Profiles Are Embedded

After a MAS build, check all helpers:
```bash
for helper in \
  "release/mas-arm64/AIBuddy.app/Contents/Frameworks/AIBuddy Helper.app" \
  "release/mas-arm64/AIBuddy.app/Contents/Frameworks/AIBuddy Helper (GPU).app" \
  "release/mas-arm64/AIBuddy.app/Contents/Frameworks/AIBuddy Helper (Plugin).app" \
  "release/mas-arm64/AIBuddy.app/Contents/Frameworks/AIBuddy Helper (Renderer).app" \
  "release/mas-arm64/AIBuddy.app/Contents/Library/LoginItems/AIBuddy Login Helper.app"; do
  if [ -f "$helper/Contents/embedded.provisionprofile" ]; then
    echo "✓ $(basename "$helper")"
  else
    echo "✗ $(basename "$helper") MISSING"
  fi
done
```

### Entitlements Files

| File | Used For | Key Entitlements |
|------|----------|------------------|
| `build/entitlements.mac.plist` | Developer ID (DMG) distribution | JIT, network, file access, microphone |
| `build/entitlements.mas.plist` | MAS main app | Sandbox + network + file access + team/app IDs |
| `build/entitlements.mas.inherit.plist` | MAS helper processes | Sandbox inherit from parent |

---

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/create-helper-profile.sh` | Create/regenerate wildcard provisioning profile for helpers | `./scripts/create-helper-profile.sh` |
| `scripts/upload-testflight.sh` | Build MAS .pkg and upload to TestFlight | `./scripts/upload-testflight.sh` |
| `scripts/upload-testflight.sh --setup` | Store Apple ID credentials in Keychain | `./scripts/upload-testflight.sh --setup` |
| `scripts/build-signed.sh` | Build signed DMGs (Developer ID) | `./scripts/build-signed.sh` |
| `scripts/setup-mas-profile.sh` | Validate MAS profile setup | `./scripts/setup-mas-profile.sh` |
| `scripts/complete-mas-setup.sh` | Full MAS setup verification | `./scripts/complete-mas-setup.sh` |
| `build/afterPack.js` | Clean xattrs + embed helper provisioning profiles | Runs automatically during `electron-builder` |
| `build/sign-app.sh` | Manual signing of app components | `./build/sign-app.sh` |

---

**Support:** support@aibuddy.life  
**GitHub:** https://github.com/ThomasWDev/aibuddy-desktop
