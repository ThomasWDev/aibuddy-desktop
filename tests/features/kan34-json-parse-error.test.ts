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
		const catchBlock = appSrc.match(/catch\s*\(parseErr\)[\s\S]{0,500}/)
		expect(catchBlock).toBeTruthy()
		expect(catchBlock![0]).toContain("setStatus('error')")
	})
})
