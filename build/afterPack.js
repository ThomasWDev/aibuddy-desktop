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

exports.default = async function afterPack(context) {
	const appOutDir = context.appOutDir
	const appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`)
	console.log(`Cleaning resource forks from: ${appPath}`)

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
			console.log("WARNING: Remaining xattrs on GPU Helper:", remaining.substring(0, 500))
			execSync(`xattr -cr "${gpuHelper}"`, { stdio: "pipe" })
			const check2 = execSync(`xattr -lr "${gpuHelper}" 2>&1`, { encoding: "utf-8" })
			if (check2.trim()) {
				console.log("STILL remaining after second clear:", check2.substring(0, 500))
			} else {
				console.log("Second xattr -cr succeeded")
			}
		} else {
			console.log("GPU Helper clean - no remaining xattrs")
		}
	} catch (e) {
		console.log("GPU Helper xattr check:", e.message)
	}

	console.log("Resource forks and detritus cleaned, ready for signing")
}
