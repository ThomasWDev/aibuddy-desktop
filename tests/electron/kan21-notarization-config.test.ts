import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { describe, it, expect } from "vitest"

const PKG_PATH = join(__dirname, "..", "..", "package.json")
const WORKFLOW_PATH = join(__dirname, "..", "..", "..", ".github", "workflows", "release-on-master.yml")
const ENTITLEMENTS_MAC = join(__dirname, "..", "..", "build", "entitlements.mac.plist")

describe("KAN-21: macOS notarization configuration", () => {

	describe("package.json — electron-builder mac config", () => {
		const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"))
		const mac = pkg.build?.mac

		it("must have hardenedRuntime: true (required for notarization)", () => {
			expect(mac?.hardenedRuntime).toBe(true)
		})

		it("notarize must be false (notarization handled by xcrun notarytool in CI)", () => {
			expect(mac?.notarize).toBe(false)
		})

		it("CI workflow must run xcrun notarytool for notarization", () => {
			const workflow = existsSync(WORKFLOW_PATH) ? readFileSync(WORKFLOW_PATH, "utf-8") : ""
			expect(workflow).toContain("xcrun notarytool submit")
			expect(workflow).toContain("xcrun stapler staple")
		})

		it("must have entitlements for code signing", () => {
			expect(mac?.entitlements).toContain("entitlements")
		})

		it("must have entitlementsInherit for helper processes", () => {
			expect(mac?.entitlementsInherit).toBeTruthy()
		})

		it("must have a valid signing identity", () => {
			expect(mac?.identity).toBeTruthy()
		})
	})

	describe("entitlements.mac.plist — required for notarization", () => {
		it("entitlements file must exist", () => {
			expect(existsSync(ENTITLEMENTS_MAC)).toBe(true)
		})

		const plist = existsSync(ENTITLEMENTS_MAC) ? readFileSync(ENTITLEMENTS_MAC, "utf-8") : ""

		it("must have allow-jit (required by Electron)", () => {
			expect(plist).toContain("com.apple.security.cs.allow-jit")
		})

		it("must have allow-unsigned-executable-memory", () => {
			expect(plist).toContain("com.apple.security.cs.allow-unsigned-executable-memory")
		})

		it("must have network.client for API access", () => {
			expect(plist).toContain("com.apple.security.network.client")
		})
	})

	describe("CI workflow — notarization env vars", () => {
		it("workflow file must exist", () => {
			expect(existsSync(WORKFLOW_PATH)).toBe(true)
		})

		const workflow = existsSync(WORKFLOW_PATH) ? readFileSync(WORKFLOW_PATH, "utf-8") : ""

		it("must use xcrun notarytool for notarization", () => {
			expect(workflow).toContain("xcrun notarytool submit")
			expect(workflow).toContain("xcrun stapler staple")
		})

		it("must pass API key credentials to xcrun notarytool", () => {
			expect(workflow).toContain("--key /tmp/AuthKey.p8")
			expect(workflow).toContain("secrets.APP_STORE_KEY_ID")
			expect(workflow).toContain("secrets.APP_STORE_ISSUER_ID")
		})

		it("must pass APPLE_TEAM_ID for signing", () => {
			expect(workflow).toContain("APPLE_TEAM_ID:")
			expect(workflow).toContain("secrets.APPLE_TEAM_ID")
		})

		it("must write API key file before packaging step", () => {
			expect(workflow).toContain("AuthKey.p8")
			expect(workflow).toContain("secrets.APP_STORE_AUTH_KEY")
		})
	})
})
