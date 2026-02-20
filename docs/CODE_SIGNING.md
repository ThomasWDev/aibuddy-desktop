# AIBuddy Desktop - Code Signing Guide

## Current Status

| Platform | Signed | Notarized | Issue |
|----------|--------|-----------|-------|
| **macOS DMG** | ✅ Yes | ❌ No | Need to enable notarization |
| **Windows EXE** | ❌ No | N/A | SmartScreen "Unknown Publisher" |
| **Linux** | N/A | N/A | Works with chmod +x |

## Available Certificates (Local Keychain)

Run this to see your certificates:
```bash
security find-identity -v -p codesigning
```

### Your Current Certificates:
```
1) "Apple Distribution: Gray Matters Alliance, LLC (WMZ2835VPB)"
2) "Apple Development: Thomas Woodfin (U6363SX679)"
3) "Apple Development: Thomas Woodfin (CJA5863LVV)"
4) "Developer ID Application: AI Buddy Inc (Apps) (S2237D23CB)"  ← CONFIGURED FOR BUILDS
```

### Certificate Types Explained:

| Certificate Type | Use Case | Distribution |
|-----------------|----------|--------------|
| **Apple Development** | Local testing only | Cannot distribute |
| **Apple Distribution** | Mac App Store only | Requires provisioning profile |
| **Developer ID Application** | DMG/ZIP distribution | Outside App Store ✅ |
| **Developer ID Installer** | PKG installers | Outside App Store |

---

## 🍎 macOS Signing for DMG Distribution

### What You Need

For distributing DMG files (aibuddy.life, GitHub releases), you need:

1. **Developer ID Application** certificate (NOT Apple Distribution)
2. Apple Developer account with notarization enabled
3. App-specific password for notarization

### Step 1: Create Developer ID Certificate

If you don't have a "Developer ID Application" certificate:

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)
2. Click **+** to create new certificate
3. Select **Developer ID Application**
4. Follow CSR instructions (Keychain Access → Certificate Assistant → Request Certificate)
5. Download and double-click to install in Keychain

### Step 2: Create App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in → Security → App-Specific Passwords
3. Generate new password
4. Save it securely

### Step 3: Set Environment Variables

Create `.env.local` file (gitignored):

```bash
# macOS Signing
APPLE_ID=your@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=WMZ2835VPB  # Your team ID

# Certificate identity (use Developer ID for DMG distribution)
CSC_NAME="Developer ID Application: AIBuddy Inc (TEAMID)"
# OR for Gray Matters Alliance:
# CSC_NAME="Developer ID Application: Gray Matters Alliance, LLC (WMZ2835VPB)"
```

### Step 4: Update electron-builder.yml

```yaml
mac:
  category: public.app-category.developer-tools
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  
  # For DMG distribution (outside App Store):
  identity: "Developer ID Application: Your Name (TEAMID)"
  
  # Enable notarization
  notarize:
    teamId: "YOUR_TEAM_ID"
```

### Step 5: Build Signed + Notarized DMG

```bash
# Set environment variables
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="WMZ2835VPB"

# Build with signing and notarization
cd /Users/thomaswoodfin/Documents/GitHub/AICodingVS/aibuddy-desktop
pnpm build
pnpm package:mac
```

The build will:
1. Sign with Developer ID certificate
2. Upload to Apple for notarization
3. Wait for notarization (2-5 minutes)
4. Staple the notarization ticket to the DMG

---

## 🪟 Windows Code Signing

### What You Need

1. **EV Code Signing Certificate** (~$200-400/year)
   - Providers: DigiCert, Sectigo, GlobalSign, SSL.com
   - Must be on hardware token (USB)
2. SignTool (included with Windows SDK)

### Option A: EV Certificate (Recommended)

EV certificates immediately avoid SmartScreen warnings.

```bash
# Environment variables for Windows signing
WIN_CSC_LINK="path/to/certificate.pfx"
WIN_CSC_KEY_PASSWORD="your-password"
```

### Option B: Standard Certificate (Builds Reputation)

Standard OV certificates are cheaper but require building reputation:
- First installs will show SmartScreen warning
- After ~500-1000 downloads, warning goes away

### electron-builder Windows Config

```yaml
win:
  icon: build/icon.ico
  # For signed builds:
  certificateFile: "path/to/certificate.pfx"
  certificatePassword: "${WIN_CSC_KEY_PASSWORD}"
  # OR use environment variable CSC_LINK
```

---

## 🔧 Quick Reference: Build Commands

### Unsigned Build (Current)
```bash
pnpm build && pnpm package:mac
```

### Signed Build (Local Certificate)
```bash
# Use specific certificate
CSC_NAME="Apple Development: Thomas Woodfin (U6363SX679)" pnpm package:mac
```

### Signed + Notarized Build
```bash
# Full signing with notarization
APPLE_ID="..." \
APPLE_APP_SPECIFIC_PASSWORD="..." \
APPLE_TEAM_ID="..." \
pnpm package:mac
```

---

## 🛠️ Troubleshooting

### "No signing identity found"

```bash
# List available certificates
security find-identity -v -p codesigning

# If certificate exists but not found, unlock keychain
security unlock-keychain -p "your-password" ~/Library/Keychains/login.keychain
```

### "errSecInternalComponent" error

The certificate private key may be locked:
```bash
# In Keychain Access:
# 1. Find your certificate
# 2. Right-click the private key
# 3. Get Info → Access Control → Allow all applications
```

### Notarization fails with "Invalid signature"

Make sure:
1. Using "Developer ID Application" certificate (not Apple Distribution)
2. Hardened runtime is enabled
3. Entitlements file exists and is valid

### Check if app is properly signed

```bash
# Check signature
codesign -dv --verbose=4 /path/to/AIBuddy.app

# Check notarization status
spctl -a -v /path/to/AIBuddy.app

# Check if app will run on fresh Mac
spctl --assess --type execute /path/to/AIBuddy.app
```

---

## 📋 AIBuddy Inc Certificate Setup

If setting up new "AIBuddy Inc" Apple Developer account:

### 1. Enroll in Apple Developer Program
- Go to [developer.apple.com/programs](https://developer.apple.com/programs)
- Enroll as Organization (AIBuddy Inc)
- $99/year

### 2. Create Developer ID Certificates
```
Certificates, Identifiers & Profiles → Certificates → +
  → Developer ID Application
  → Developer ID Installer
```

### 3. Update Build Config

In `build/electron-builder.yml`:
```yaml
mac:
  identity: "Developer ID Application: AIBuddy Inc (TEAMID)"
  notarize:
    teamId: "TEAMID"
```

### 4. Export Certificate for CI

```bash
# Export from Keychain to .p12 file
security export -k ~/Library/Keychains/login.keychain-db \
  -t identities -f pkcs12 -P "password" \
  -o certificate.p12

# Base64 encode for GitHub Actions
base64 -i certificate.p12 | pbcopy
# Paste into GitHub Secrets as CSC_LINK
```

---

## 📁 Current Config Files

| File | Purpose |
|------|---------|
| `build/electron-builder.yml` | Main build config (DMG + MAS targets) |
| `build/entitlements.mac.plist` | macOS entitlements for Developer ID (DMG) distribution |
| `build/entitlements.mas.plist` | Mac App Store entitlements (sandbox + team/app IDs) |
| `build/entitlements.mas.inherit.plist` | MAS child process entitlements (sandbox inherit) |
| `build/afterPack.js` | Post-pack hook: cleans xattrs + embeds helper provisioning profiles |
| `build/embedded.provisionprofile` | MAS provisioning profile for main app (gitignored) |
| `build/embedded-helpers.provisionprofile` | Wildcard provisioning profile for helper bundles (gitignored) |
| `build/sign-app.sh` | Manual signing script for app components |

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/create-helper-profile.sh` | Regenerate wildcard provisioning profile for helpers (fixes ITMS-90885) |
| `scripts/upload-testflight.sh` | Build MAS .pkg and upload to TestFlight |
| `scripts/build-signed.sh` | Build signed DMGs with optional notarization |
| `scripts/setup-mas-profile.sh` | Validate MAS provisioning profile setup |
| `scripts/complete-mas-setup.sh` | Full MAS setup verification |

---

## 🔧 ITMS-90885 Fix — Electron Helper Provisioning

Electron apps have nested helper `.app` bundles (GPU, Plugin, Renderer, Helper,
Login Helper) that Apple requires to each have their own `embedded.provisionprofile`
for TestFlight / Mac App Store distribution.

**Solution:** A wildcard App ID `com.aibuddy.desktop.*` covers all helper bundle
IDs. The provisioning profile is embedded by `build/afterPack.js` during MAS builds.

**To regenerate if profile expires:**
```bash
./scripts/create-helper-profile.sh
base64 -i build/embedded-helpers.provisionprofile | \
  gh secret set MAS_HELPERS_PROVISION_PROFILE --repo Thomas-Woodfin/AICodingVS
```

See `docs/SIGNING_GUIDE.md` → "ITMS-90885 Fix" for full details.

---

## ✅ Signing Checklist

### For Local Signing (DMG):
- [ ] `Developer ID Application` certificate in Keychain Access
- [ ] Private key accessible (not locked)
- [ ] `CSC_NAME` or `identity` configured correctly
- [ ] Entitlements file `build/entitlements.mac.plist` exists

### For Notarization:
- [ ] Apple Developer account active
- [ ] App-specific password generated
- [ ] Using "Developer ID Application" certificate
- [ ] `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` set
- [ ] `notarize: { teamId: "S2237D23CB" }` in config

### For Mac App Store / TestFlight:
- [ ] `3rd Party Mac Developer Application` cert in Keychain
- [ ] `3rd Party Mac Developer Installer` cert in Keychain
- [ ] `build/embedded.provisionprofile` exists (main app)
- [ ] `build/embedded-helpers.provisionprofile` exists (helper wildcard)
- [ ] Build with `MAS_BUILD=true pnpm package:mas`
- [ ] Verify all 5 helpers have profiles (see SIGNING_GUIDE.md)

### For CI/CD:
- [ ] `MAS_PROVISION_PROFILE` secret set in GitHub
- [ ] `MAS_HELPERS_PROVISION_PROFILE` secret set in GitHub
- [ ] `MAC_CERTS_BASE64` secret contains all 3 certs (Developer ID + 3rd Party App + Installer)
- [ ] See `docs/CI_CD_SECRETS_REFERENCE.md` for all secrets

### For Windows:
- [ ] EV or OV code signing certificate
- [ ] Certificate accessible (USB token if EV)
- [ ] `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` set
