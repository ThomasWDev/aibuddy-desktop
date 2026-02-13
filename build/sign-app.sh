#!/bin/bash
set -e

APP="$1"
IDENTITY="Developer ID Application: AI Buddy Inc (Apps) (S2237D23CB)"
ENTITLEMENTS="$(dirname "$0")/entitlements.mac.plist"

if [ -z "$APP" ] || [ ! -d "$APP" ]; then
    echo "Usage: $0 /path/to/AIBuddy.app"
    exit 1
fi

echo "=== Cleaning xattrs ==="
find "$APP" -exec xattr -d com.apple.FinderInfo {} 2>/dev/null \;
find "$APP" -exec xattr -d "com.apple.fileprovider.fpfs#P" {} 2>/dev/null \;
find "$APP" -exec xattr -d com.apple.ResourceFork {} 2>/dev/null \;
find "$APP" -name '._*' -delete 2>/dev/null
xattr -cr "$APP" 2>/dev/null || true

echo "=== Signing dylibs ==="
find "$APP" -name "*.dylib" -exec codesign --sign "$IDENTITY" --force --timestamp --options runtime {} \;

echo "=== Signing .so files ==="
find "$APP" -name "*.so" -exec codesign --sign "$IDENTITY" --force --timestamp --options runtime {} \;

echo "=== Signing standalone executables in Frameworks ==="
find "$APP/Contents/Frameworks" -type f -perm +111 ! -name "*.dylib" ! -name "*.so" -exec sh -c '
    file "$1" | grep -q "Mach-O" && codesign --sign "'"$IDENTITY"'" --force --timestamp --options runtime --entitlements "'"$ENTITLEMENTS"'" "$1"
' _ {} \;

echo "=== Signing Helper apps ==="
for helper in "$APP"/Contents/Frameworks/*.app; do
    if [ -d "$helper" ]; then
        echo "  Signing: $(basename "$helper")"
        codesign --sign "$IDENTITY" --force --timestamp --options runtime --entitlements "$ENTITLEMENTS" "$helper"
    fi
done

echo "=== Signing Frameworks ==="
for framework in "$APP"/Contents/Frameworks/*.framework; do
    if [ -d "$framework" ]; then
        echo "  Signing: $(basename "$framework")"
        codesign --sign "$IDENTITY" --force --timestamp --options runtime "$framework"
    fi
done

echo "=== Signing main app ==="
codesign --sign "$IDENTITY" --force --timestamp --options runtime --entitlements "$ENTITLEMENTS" "$APP"

echo "=== Verifying ==="
codesign --verify --deep --strict "$APP" 2>&1
echo "=== Signing complete ==="
