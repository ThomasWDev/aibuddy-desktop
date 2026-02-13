# AIBuddy Desktop - App Store Submission Guide

## 📋 Overview

This guide covers submitting AIBuddy Desktop to:
1. **Mac App Store** (via App Store Connect)
2. **Microsoft Store** (via Partner Center)
3. **Snap Store** (for Linux)

---

## 🍎 Mac App Store Submission

### Prerequisites
- Apple Developer Account ($99/year) ✅ You have this
- Xcode installed
- Transporter app (free from Mac App Store)

### Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: macOS
   - **Name**: AIBuddy Desktop IDE
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.aibuddy.desktop
   - **SKU**: aibuddy-desktop-1
   - **User Access**: Full Access

### Step 2: Create Certificates & Provisioning Profile

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)

2. **Create Certificates** (if not already):
   - Mac App Distribution
   - Mac Installer Distribution

3. **Create App ID**:
   - Go to Identifiers → **+**
   - Select **App IDs** → **App**
   - Bundle ID: `com.aibuddy.desktop`
   - Enable capabilities: (none required for basic app)

4. **Create Provisioning Profile**:
   - Go to Profiles → **+**
   - Select **Mac App Store**
   - Select your App ID
   - Select your Distribution Certificate
   - Download and save as `build/embedded.provisionprofile`

### Step 3: Build for Mac App Store

```bash
cd /Users/thomaswoodfin/Documents/GitHub/AICodingVS/aibuddy-desktop

# Build the app
pnpm build

# Package for Mac App Store (creates .pkg file)
pnpm package:mas
```

Output will be in: `release/mas/AIBuddy-1.0.0.pkg`

### Step 4: Upload to App Store Connect

**Option A: Using Transporter App**
1. Open Transporter (download from Mac App Store)
2. Sign in with your Apple ID
3. Drag the `.pkg` file into Transporter
4. Click **Deliver**

**Option B: Using Command Line**
```bash
xcrun altool --upload-app \
  --type macos \
  --file "release/mas/AIBuddy-1.0.0.pkg" \
  --username "your-apple-id@email.com" \
  --password "@keychain:AC_PASSWORD"
```

### Step 5: TestFlight (Optional)
- After upload, the build appears in App Store Connect
- Go to **TestFlight** tab
- Add internal/external testers
- Submit for Beta App Review (usually 24-48 hours)

### Step 6: Submit for Review
1. Go to App Store Connect → Your App
2. Fill in all required metadata:
   - Screenshots (1280x800 or 1440x900)
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
3. Select the build
4. Click **Submit for Review**

### ⚠️ Mac App Store Sandboxing Notes

The Mac App Store requires sandboxing, which limits:
- File system access (only user-selected files)
- No direct terminal access to system
- Network requests are allowed

**Current entitlements in `build/entitlements.mas.plist`:**
- ✅ Network client (for API calls)
- ✅ User-selected file read/write
- ✅ Downloads folder access

---

## 🪟 Microsoft Store Submission

### Prerequisites
- Microsoft Partner Center account ✅ You have this (same as VS Code extension)
- Windows 10/11 for building

### Step 1: Create App in Partner Center

1. Go to [Partner Center](https://partner.microsoft.com/dashboard)
2. Click **Apps and games** → **New product** → **MSIX or PWA app**
3. Reserve name: **AIBuddy Desktop IDE**

### Step 2: Get Publisher ID

1. In Partner Center, go to **Account settings** → **Organization profile**
2. Copy your **Publisher ID** (format: `CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)
3. Update `package.json`:

```json
"appx": {
  "publisher": "CN=YOUR_ACTUAL_PUBLISHER_ID",
  ...
}
```

### Step 3: Build for Microsoft Store

```bash
# On Windows machine or VM
cd aibuddy-desktop

# Install dependencies
pnpm install

# Build
pnpm build

# Package for Microsoft Store (creates .appx)
pnpm package:win:store
```

Output: `release/AIBuddy-1.0.0.appx`

### Step 4: Upload to Partner Center

1. Go to your app in Partner Center
2. Click **Start submission**
3. Upload the `.appx` file
4. Fill in:
   - **Pricing**: Free (with in-app purchases via AIBuddy credits)
   - **Properties**: Category = Developer tools
   - **Age ratings**: Complete questionnaire
   - **Store listings**: Screenshots, description, etc.

### Step 5: Submit for Certification

1. Review all sections
2. Click **Submit to the Store**
3. Certification usually takes 1-3 business days

### Microsoft Store Screenshots Required
- 1366x768 (minimum)
- 1920x1080 (recommended)
- At least 1 screenshot, up to 10

---

## 🐧 Snap Store Submission (Linux)

### Prerequisites
- Ubuntu account at [snapcraft.io](https://snapcraft.io)
- `snapcraft` CLI tool

### Step 1: Register on Snapcraft

1. Go to [snapcraft.io](https://snapcraft.io)
2. Sign in with Ubuntu One account
3. Register snap name: `aibuddy-desktop`

### Step 2: Build Snap Package

```bash
# Build for Linux with snap
pnpm package:linux:snap
```

Output: `release/aibuddy-desktop_1.0.0_amd64.snap`

### Step 3: Upload to Snap Store

```bash
# Login to snapcraft
snapcraft login

# Upload the snap
snapcraft upload --release=stable release/aibuddy-desktop_1.0.0_amd64.snap
```

### Step 4: Configure Store Listing

1. Go to [snapcraft.io/aibuddy-desktop](https://snapcraft.io/aibuddy-desktop)
2. Add screenshots, description, icon
3. Set visibility to Public

---

## 📦 Build Commands Summary

| Platform | Command | Output |
|----------|---------|--------|
| **Mac (DMG)** | `pnpm package:mac` | `release/*.dmg` |
| **Mac App Store** | `pnpm package:mas` | `release/mas/*.pkg` |
| **Windows (Installer)** | `pnpm package:win` | `release/*.exe` |
| **Windows Store** | `pnpm package:win:store` | `release/*.appx` |
| **Linux (AppImage)** | `pnpm package:linux` | `release/*.AppImage` |
| **Linux (Snap)** | `pnpm package:linux:snap` | `release/*.snap` |

---

## 🔑 Environment Variables for CI/CD

For automated publishing, set these in GitHub Secrets:

```bash
# Apple
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
CSC_LINK=base64-encoded-p12-certificate
CSC_KEY_PASSWORD=certificate-password

# Windows (for signing)
WIN_CSC_LINK=base64-encoded-pfx-certificate
WIN_CSC_KEY_PASSWORD=certificate-password
```

---

## 📝 Store Metadata

### App Description (use for all stores)

**Short Description:**
> AI-powered coding assistant with Claude Opus 4, Monaco Editor, and integrated terminal.

**Full Description:**
> AIBuddy Desktop IDE is your intelligent coding partner - a standalone desktop application that brings the power of AI directly to your development workflow.
>
> **Features:**
> - 🤖 AI-Powered Coding with Claude Opus 4
> - 📝 Monaco Editor (same as VS Code)
> - 💻 Integrated Terminal
> - 🔧 Git Integration
> - 🎨 Dark/Light Themes
> - 🔒 Privacy-First Design
>
> **Requirements:**
> - AIBuddy API key (get one at aibuddy.life)
> - Internet connection for AI features

### Keywords
`AI, coding, IDE, developer tools, Claude, code editor, programming, terminal, git`

### Category
- Mac: Developer Tools
- Windows: Developer tools > IDE
- Linux: Development

---

## 🚀 Quick Start Checklist

### Mac App Store
- [x] Code signing with Developer ID Application (notarized) ✅
- [x] 3rd Party Mac Developer Application cert installed ✅
- [x] MAS config in package.json (identity, entitlements) ✅
- [x] MAS entitlements (sandbox, network, file access) ✅
- [x] Notarization credentials stored in Keychain ✅
- [x] App ID `com.aibuddy.desktop` registered with Apple ✅
- [x] App Store metadata prepared (`metadata/en-US/`) ✅
- [ ] Create Mac Installer Distribution cert (see `metadata/APP_STORE_SUBMISSION_CHECKLIST.md`)
- [ ] Create provisioning profile → save to `build/embedded.provisionprofile`
- [ ] Run `./scripts/complete-mas-setup.sh`
- [ ] Take screenshots (1280x800 minimum)
- [ ] Create app in App Store Connect
- [ ] Upload via Transporter
- [ ] Submit for review

### Microsoft Store
- [ ] Create app in Partner Center
- [ ] Get Publisher ID → update `package.json`
- [ ] Run `pnpm package:win:store` (on Windows)
- [ ] Upload .appx to Partner Center
- [ ] Submit for certification

### Snap Store
- [ ] Register at snapcraft.io
- [ ] Register snap name
- [ ] Run `pnpm package:linux:snap`
- [ ] Upload with `snapcraft upload`

