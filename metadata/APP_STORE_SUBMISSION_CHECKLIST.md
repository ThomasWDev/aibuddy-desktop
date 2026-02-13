# AIBuddy Desktop - App Store Submission Checklist

## Pre-Submission Status

| Item | Status | Notes |
|------|--------|-------|
| App signed with Developer ID | Done | Notarized with `Developer ID Application: AI Buddy Inc (Apps)` |
| Direct-download DMG notarized | Done | v1.5.58 on aibuddy.life/downloads |
| 3rd Party Mac Developer Application cert | Done | `48C97E7D1277...` in Keychain |
| 3rd Party Mac Developer Installer cert | **NEEDED** | Create at developer.apple.com |
| Mac App Store provisioning profile | **NEEDED** | Create at developer.apple.com |
| MAS config in package.json | Done | Identity, entitlements configured |
| MAS entitlements (sandbox) | Done | App sandbox, network, file access |
| App Store metadata (descriptions, keywords) | Done | In `metadata/en-US/` |
| Screenshots (1280x800 minimum) | **NEEDED** | Take using the app |
| App Store Connect app record | **NEEDED** | Create at appstoreconnect.apple.com |
| Privacy policy URL | **NEEDED** | Create at aibuddy.life/privacy |
| Transporter.app installed | **NEEDED** | Download from Mac App Store |

---

## Step-by-Step Submission

### 1. Apple Developer Portal (developer.apple.com)

**Sign in with:** `twoodfin@berkeley.edu` / Team: `AI Buddy Inc (Apps) (S2237D23CB)`

#### a. Create Mac Installer Distribution Certificate
1. Go to Certificates → +
2. Select **Mac Installer Distribution**
3. Upload CSR from: `/tmp/AIBuddyMASInstaller.certSigningRequest`
4. Download the `.cer` file
5. Double-click to install in Keychain

#### b. Create Provisioning Profile
1. Go to Profiles → +
2. Select **Mac App Store** under Distribution
3. Select App ID: `com.aibuddy.desktop`
4. Select Certificate: `3rd Party Mac Developer Application`
5. Name: `AIBuddy Desktop MAS Distribution`
6. Download and save to: `build/embedded.provisionprofile`

### 2. Build the MAS Package

```bash
cd /path/to/aibuddy-desktop

# Verify setup
./scripts/complete-mas-setup.sh --verify

# Build (runs npm build + electron-builder --mac mas)
./scripts/complete-mas-setup.sh
```

Output: `release/mas-arm64/AIBuddy-1.5.58.pkg`

### 3. App Store Connect (appstoreconnect.apple.com)

1. **My Apps** → **+** → **New App**
   - Platform: **macOS**
   - Name: **AIBuddy Desktop IDE**
   - Primary Language: English (U.S.)
   - Bundle ID: `com.aibuddy.desktop`
   - SKU: `aibuddy-desktop-1`

2. **App Information**
   - Category: Developer Tools
   - Subtitle: "AI-Powered Code Editor & Terminal"
   - Content Rights: No third-party content

3. **Pricing and Availability**
   - Price: Free (credits purchased via website/Stripe)
   - Availability: All territories

4. **Prepare for Submission**
   - Upload screenshots (1280x800 minimum)
   - Copy description from `metadata/en-US/description.txt`
   - Copy keywords from `metadata/en-US/keywords.txt`
   - Set privacy policy URL
   - Set support URL: https://aibuddy.life/support
   - Version: 1.5.58
   - What's New: Copy from `metadata/en-US/whats_new.txt`

5. **Upload Build**
   - Install Transporter from Mac App Store
   - Drag `.pkg` into Transporter → Click **Deliver**
   - Or: `xcrun altool --upload-app --type macos --file release/mas-arm64/AIBuddy-1.5.58.pkg -u twoodfin@berkeley.edu -p @keychain:AIBuddy-notarize`

6. **Select Build** in App Store Connect and **Submit for Review**

### 4. App Review Considerations

- **Sandbox**: The app uses App Sandbox with network client access and user-selected file access. Terminal integration may require temporary exception entitlements.
- **In-App Purchases**: Not using Apple IAP. Credits purchased via website (Stripe). This is acceptable for "reader" apps where the digital content is consumed server-side.
- **Privacy**: The app sends code snippets to AI APIs. Privacy policy must clearly state this.
- **Login**: Users need an AIBuddy API key. The app should explain how to get one on first launch.

---

## Quick Reference

| Setting | Value |
|---------|-------|
| Bundle ID | `com.aibuddy.desktop` |
| Team ID | `S2237D23CB` |
| Apple ID | `twoodfin@berkeley.edu` |
| App-Specific Password | See API_KEYS_MASTER.md |
| Category | Developer Tools |
| Min macOS | 12.0 |
| Architectures | arm64, x64 (Universal) |
