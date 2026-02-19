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

exports.default = async function afterPack(context) {
	const appOutDir = context.appOutDir
	const appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`)
	const buildDir = path.join(context.packager.projectDir, "build")

	console.log(`afterPack: ${appPath}`)

	// Phase 1 — Clean resource forks & extended attributes
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

	try {
		execSync(`xattr -cr "${appPath}"`, { stdio: "pipe" })
	} catch (_) {}

	const gpuHelper = path.join(appPath, "Contents/Frameworks/AIBuddy Helper (GPU).app")
	try {
		const remaining = execSync(`xattr -lr "${gpuHelper}" 2>&1`, { encoding: "utf-8" })
		if (remaining.trim()) {
			execSync(`xattr -cr "${gpuHelper}"`, { stdio: "pipe" })
		}
	} catch (_) {}

	// Phase 2 — Embed provisioning profiles in helper bundles (MAS only)
	embedHelperProfiles(appPath, buildDir)

	console.log("afterPack complete — ready for signing")
}
