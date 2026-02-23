const { execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

const XATTR_NAMES = [
	"com.apple.FinderInfo",
	"com.apple.ResourceFork",
	"com.apple.fileprovider.fpfs#P",
	"com.apple.provenance",
	"com.apple.quarantine",
]

const HELPER_BUNDLES = [
	"Contents/Frameworks/AIBuddy Helper.app",
	"Contents/Frameworks/AIBuddy Helper (GPU).app",
	"Contents/Frameworks/AIBuddy Helper (Plugin).app",
	"Contents/Frameworks/AIBuddy Helper (Renderer).app",
	"Contents/Library/LoginItems/AIBuddy Login Helper.app",
]

exports.XATTR_NAMES = XATTR_NAMES
exports.HELPER_BUNDLES = HELPER_BUNDLES

exports.walkSync = walkSync
function walkSync(dir) {
	const results = [dir]
	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true })
		for (const entry of entries) {
			const full = path.join(dir, entry.name)
			if (entry.name.startsWith("._")) {
				try { fs.unlinkSync(full) } catch (_) {}
				continue
			}
			results.push(full)
			if (entry.isDirectory()) {
				results.push(...walkSync(full))
			}
		}
	} catch (_) {}
	return results
}

exports.embedHelperProfiles = embedHelperProfiles
function embedHelperProfiles(appPath, buildDir) {
	const isMAS = appPath.includes("mas-")
		|| process.argv.some(a => a.includes("mas"))
		|| process.env.MAS_BUILD === "true"

	if (!isMAS) {
		console.log("Not a MAS build — skipping helper provisioning profiles")
		return
	}

	const profileCandidates = [
		path.join(buildDir, "embedded-helpers.provisionprofile"),
		path.join(buildDir, "embedded.provisionprofile"),
	]

	let profileSrc = null
	for (const p of profileCandidates) {
		if (fs.existsSync(p)) {
			profileSrc = p
			break
		}
	}

	if (!profileSrc) {
		console.warn("⚠️  No provisioning profile found for helpers — TestFlight will reject!")
		console.warn("   Create a wildcard profile for com.aibuddy.desktop.* and save to:")
		console.warn(`   ${profileCandidates[0]}`)
		return
	}

	console.log(`Embedding provisioning profile in helper bundles (source: ${path.basename(profileSrc)})`)

	let embedded = 0
	for (const rel of HELPER_BUNDLES) {
		const helperApp = path.join(appPath, rel)
		if (!fs.existsSync(helperApp)) {
			console.log(`  skip: ${rel} (not found)`)
			continue
		}
		const destDir = path.join(helperApp, "Contents")
		const dest = path.join(destDir, "embedded.provisionprofile")
		fs.mkdirSync(destDir, { recursive: true })
		fs.copyFileSync(profileSrc, dest)
		console.log(`  ✓ ${path.basename(helperApp)}`)
		embedded++
	}
	console.log(`Embedded provisioning profile in ${embedded} helper bundle(s)`)
}

exports.stripQuarantine = stripQuarantine
function stripQuarantine(filePath) {
	for (const attr of XATTR_NAMES) {
		try {
			execSync(`xattr -d "${attr}" "${filePath}"`, { stdio: "pipe" })
		} catch (_) {}
	}
}

exports.stripQuarantineRecursive = stripQuarantineRecursive
function stripQuarantineRecursive(dir) {
	try {
		execSync(`xattr -cr "${dir}"`, { stdio: "pipe" })
	} catch (_) {}
}

exports.default = async function afterPack(context) {
	const appOutDir = context.appOutDir
	const appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`)
	const buildDir = path.join(context.packager.projectDir, "build")

	console.log(`afterPack: ${appPath}`)

	// Phase 0 — Strip quarantine from SOURCE provisioning profiles in build/
	// This prevents electron-builder from copying quarantined files into the bundle
	const sourceProfiles = [
		path.join(buildDir, "embedded.provisionprofile"),
		path.join(buildDir, "embedded-helpers.provisionprofile"),
	]
	for (const p of sourceProfiles) {
		if (fs.existsSync(p)) {
			stripQuarantine(p)
			console.log(`Stripped xattrs from source: ${path.basename(p)}`)
		}
	}

	// Phase 1 — Clean resource forks & extended attributes from entire .app
	let cleaned = 0
	const allPaths = walkSync(appPath)
	for (const p of allPaths) {
		for (const attr of XATTR_NAMES) {
			try {
				execSync(`xattr -d "${attr}" "${p}"`, { stdio: "pipe" })
				cleaned++
			} catch (_) {}
		}
	}
	console.log(`Removed ${cleaned} extended attributes from ${allPaths.length} paths`)

	stripQuarantineRecursive(appPath)

	// Phase 2 — Patch ALL Info.plist files for Apple compliance
	// - LSMinimumSystemVersion: Apple rejects arm64-only builds without >= 12.0 on EVERY bundle
	// - ITSAppUsesNonExemptEncryption: Required for TestFlight processing (prevents PROCESSING_EXCEPTION)
	const MIN_SYS_VERSION = "12.0"
	const allPlists = allPaths.filter(p => p.endsWith("Info.plist"))
	let plistsPatched = 0
	for (const plist of allPlists) {
		try {
			execSync(
				`/usr/libexec/PlistBuddy -c "Set :LSMinimumSystemVersion ${MIN_SYS_VERSION}" "${plist}" 2>/dev/null` +
				` || /usr/libexec/PlistBuddy -c "Add :LSMinimumSystemVersion string ${MIN_SYS_VERSION}" "${plist}"`,
				{ stdio: "pipe", shell: "/bin/bash" }
			)
			plistsPatched++
		} catch (_) {}
	}
	const mainPlist = path.join(appPath, "Contents", "Info.plist")
	try {
		execSync(
			`/usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "${mainPlist}" 2>/dev/null` +
			` || /usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "${mainPlist}"`,
			{ stdio: "pipe", shell: "/bin/bash" }
		)
		console.log("Phase 2: set ITSAppUsesNonExemptEncryption=false in main Info.plist")
	} catch (_) {}
	// KAN-62: Ensure NSMicrophoneUsageDescription is present (required for voice dictation)
	const MIC_DESCRIPTION = "AIBuddy uses the microphone for voice dictation so you can speak your prompts instead of typing."
	try {
		execSync(
			`/usr/libexec/PlistBuddy -c "Set :NSMicrophoneUsageDescription '${MIC_DESCRIPTION}'" "${mainPlist}" 2>/dev/null` +
			` || /usr/libexec/PlistBuddy -c "Add :NSMicrophoneUsageDescription string '${MIC_DESCRIPTION}'" "${mainPlist}"`,
			{ stdio: "pipe", shell: "/bin/bash" }
		)
		console.log("Phase 2: set NSMicrophoneUsageDescription in main Info.plist")
	} catch (_) {}
	console.log(`Phase 2: patched LSMinimumSystemVersion=${MIN_SYS_VERSION} in ${plistsPatched} Info.plist file(s)`)

	// Phase 3 — Helper provisioning profile embedding DISABLED
	// Embedding profiles in helpers causes ITMS-90886 (PROCESSING_EXCEPTION) because
	// electron-builder signs helpers with entitlementsInherit which lacks
	// com.apple.application-identifier. The profile has it, the signature doesn't → mismatch.
	// ITMS-90885 (missing helper profiles) is a non-blocking warning.
	// Build 1.5.58 (no helper profiles) passes TestFlight; 1.5.63+ (with profiles) doesn't.
	console.log("Phase 3: helper profile embedding SKIPPED (prevents ITMS-90886 / PROCESSING_EXCEPTION)")

	// Phase 4 — Final quarantine sweep on ALL provisioning profiles in the bundle
	const profilePaths = allPaths.filter(p => p.endsWith(".provisionprofile"))
	const mainProfile = path.join(appPath, "Contents", "embedded.provisionprofile")
	if (fs.existsSync(mainProfile)) profilePaths.push(mainProfile)

	for (const p of profilePaths) {
		stripQuarantine(p)
	}
	if (profilePaths.length > 0) {
		console.log(`Phase 4: stripped xattrs from ${profilePaths.length} provisioning profile(s)`)
	}

	// Final recursive sweep of entire bundle
	stripQuarantineRecursive(appPath)

	console.log("afterPack complete — ready for signing")
}
