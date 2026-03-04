import { readFileSync } from "fs"
import { join } from "path"

const appSrc = readFileSync(
	join(__dirname, "..", "..", "renderer", "src", "App.tsx"),
	"utf-8"
)

describe("KAN-34: JSON parse error from HTML server responses must be handled gracefully", () => {
	it("must wrap response.json() in try-catch", () => {
		expect(appSrc).toMatch(/try\s*\{[\s\S]*?response\.json\(\)[\s\S]*?\}\s*catch/)
	})

	it("must show user-friendly error on JSON parse failure", () => {
		expect(appSrc).toContain("JSON parse failed")
	})

	it("must still have content-type check as first defense", () => {
		expect(appSrc).toContain("application/json")
		expect(appSrc).toContain("Non-JSON response")
	})

	it("must set error status on parse failure", () => {
		const allMatches = [...appSrc.matchAll(/catch\s*\(parseErr\)[\s\S]{0,500}/g)]
		const jsonParseCatch = allMatches.find(m => m[0].includes('JSON parse failed'))
		expect(jsonParseCatch).toBeTruthy()
		expect(jsonParseCatch![0]).toContain("setStatus('error')")
	})
})
