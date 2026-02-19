#!/usr/bin/env bash
#
# create-helper-profile.sh — Register wildcard App ID and create provisioning
# profile for Electron helper bundles (fixes ITMS-90885).
#
# This uses the App Store Connect API to:
#   1. Register com.aibuddy.desktop.* wildcard App ID (if not exists)
#   2. Find the "3rd Party Mac Developer Application" certificate
#   3. Create a Mac App Store Distribution provisioning profile
#   4. Save it to build/embedded-helpers.provisionprofile
#
# Prerequisites:
#   pip3 install PyJWT cryptography requests
#
# Usage:
#   ./scripts/create-helper-profile.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

python3 << 'PYEOF'
import jwt
import time
import json
import base64
import sys
import os
from pathlib import Path

import requests

KEY_ID = "WL4HMQYALA"
ISSUER_ID = "78eb7952-8e3c-478b-b647-08272b268a20"
TEAM_ID = "S2237D23CB"

key_paths = [
    os.path.expanduser("~/.private_keys/AuthKey_WL4HMQYALA.p8"),
    os.path.expanduser("~/Downloads/AuthKey_WL4HMQYALA.p8"),
    os.path.join(os.path.dirname(__file__) or ".", "build/AuthKey_WL4HMQYALA.p8"),
]

PRIVATE_KEY = None
for p in key_paths:
    if os.path.exists(p):
        PRIVATE_KEY = open(p).read()
        print(f"Using API key: {p}")
        break

if not PRIVATE_KEY:
    print("ERROR: AuthKey_WL4HMQYALA.p8 not found in any expected location")
    sys.exit(1)

BASE = "https://api.appstoreconnect.apple.com/v1"
WILDCARD_ID = "com.aibuddy.desktop.*"
PROFILE_NAME = "AIBuddy Desktop Helpers MAS Distribution"
OUTPUT_PATH = "build/embedded-helpers.provisionprofile"


def make_token():
    now = int(time.time())
    payload = {
        "iss": ISSUER_ID,
        "iat": now,
        "exp": now + 1200,
        "aud": "appstoreconnect-v1",
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm="ES256", headers={"kid": KEY_ID})


def api(method, path, json_body=None):
    token = make_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    url = f"{BASE}{path}"
    r = requests.request(method, url, headers=headers, json=json_body)
    if r.status_code >= 400:
        print(f"API {method} {path} → {r.status_code}")
        print(r.text[:2000])
    return r


# ── Step 1: Find or register wildcard bundle ID ──────────────────────────
print("\n━━━ Step 1: Wildcard Bundle ID ━━━")

r = api("GET", f"/bundleIds?filter[identifier]={WILDCARD_ID}&filter[platform]=MAC_OS")
data = r.json().get("data", [])

bundle_id_resource = None
if data:
    bundle_id_resource = data[0]
    print(f"✓ Wildcard already registered: {bundle_id_resource['id']}")
else:
    print(f"Registering wildcard App ID: {WILDCARD_ID}")
    body = {
        "data": {
            "type": "bundleIds",
            "attributes": {
                "identifier": WILDCARD_ID,
                "name": "AIBuddy Desktop Helpers Wildcard",
                "platform": "MAC_OS",
            },
        }
    }
    r = api("POST", "/bundleIds", body)
    if r.status_code in (200, 201):
        bundle_id_resource = r.json()["data"]
        print(f"✓ Registered: {bundle_id_resource['id']}")
    else:
        print("✗ Failed to register wildcard App ID")
        sys.exit(1)

BUNDLE_ID_ASC = bundle_id_resource["id"]

# ── Step 2: Find distribution certificate ────────────────────────────────
print("\n━━━ Step 2: Distribution Certificate ━━━")

r = api("GET", "/certificates?filter[certificateType]=MAC_APP_DISTRIBUTION&limit=50")
certs = r.json().get("data", [])

if not certs:
    r = api("GET", "/certificates?filter[certificateType]=DISTRIBUTION&limit=50")
    certs = r.json().get("data", [])

if not certs:
    r = api("GET", "/certificates?limit=200")
    all_certs = r.json().get("data", [])
    print("Available certificate types:")
    for c in all_certs:
        attrs = c["attributes"]
        print(f"  {c['id']}: {attrs.get('certificateType')} - {attrs.get('displayName', attrs.get('name', '?'))}")
    certs = [c for c in all_certs if "DISTRIBUTION" in c["attributes"].get("certificateType", "")
             or "3RD_PARTY_MAC" in c["attributes"].get("certificateType", "")
             or "MAC_APP" in c["attributes"].get("certificateType", "")]

if not certs:
    print("✗ No distribution certificate found")
    print("  Create a '3rd Party Mac Developer Application' cert at:")
    print("  https://developer.apple.com/account/resources/certificates/add")
    sys.exit(1)

cert = certs[0]
cert_name = cert["attributes"].get("displayName", cert["attributes"].get("name", cert["id"]))
print(f"✓ Using certificate: {cert_name} ({cert['id']})")

# ── Step 3: Check for existing profile ───────────────────────────────────
print("\n━━━ Step 3: Provisioning Profile ━━━")

r = api("GET", f"/profiles?filter[name]={PROFILE_NAME}&include=bundleId")
existing = r.json().get("data", [])

profile_data = None
if existing:
    p = existing[0]
    state = p["attributes"].get("profileState", "?")
    if state == "ACTIVE":
        profile_data = p["attributes"]["profileContent"]
        print(f"✓ Existing profile is ACTIVE: {p['id']}")
    else:
        print(f"Existing profile state: {state} — will recreate")
        api("DELETE", f"/profiles/{p['id']}")

if not profile_data:
    print(f"Creating profile: {PROFILE_NAME}")
    body = {
        "data": {
            "type": "profiles",
            "attributes": {
                "name": PROFILE_NAME,
                "profileType": "MAC_APP_STORE",
            },
            "relationships": {
                "bundleId": {
                    "data": {"type": "bundleIds", "id": BUNDLE_ID_ASC},
                },
                "certificates": {
                    "data": [{"type": "certificates", "id": cert["id"]}],
                },
            },
        }
    }
    r = api("POST", "/profiles", body)
    if r.status_code in (200, 201):
        profile_data = r.json()["data"]["attributes"]["profileContent"]
        print(f"✓ Profile created: {r.json()['data']['id']}")
    else:
        print("✗ Failed to create profile")
        sys.exit(1)

# ── Step 4: Save profile ─────────────────────────────────────────────────
print(f"\n━━━ Step 4: Save to {OUTPUT_PATH} ━━━")

decoded = base64.b64decode(profile_data)
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "wb") as f:
    f.write(decoded)

print(f"✓ Saved {len(decoded)} bytes to {OUTPUT_PATH}")

# Verify
import subprocess
try:
    info = subprocess.check_output(
        ["security", "cms", "-D", "-i", OUTPUT_PATH],
        stderr=subprocess.DEVNULL,
    ).decode()
    if "com.aibuddy.desktop.*" in info or "com.aibuddy.desktop" in info:
        print("✓ Profile verified — contains correct App ID")
    else:
        print("⚠ Profile saved but App ID not found in content — check manually")
except Exception:
    print("⚠ Could not verify profile content (security cms failed)")

print("\n✓ Done! The profile will be embedded in helper bundles by afterPack.js")
print("  Run 'pnpm package:mas' to build with the fix applied.")
PYEOF
