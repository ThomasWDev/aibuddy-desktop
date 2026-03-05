import { readFileSync } from "fs"
import { join } from "path"

const appSrc = readFileSync(
	join(__dirname, "..", "..", "renderer", "src", "App.tsx"),
	"utf-8"
)

const parserSrc = readFileSync(
	join(__dirname, "..", "..", "renderer", "src", "lib", "response-parser.ts"),
	"utf-8"
)

describe("KAN-34 + KAN-272: JSON/HTML response handling must be safe", () => {
	it("must use safeParseResponse for response parsing (KAN-272)", () => {
		expect(appSrc).toContain("safeParseResponse")
	})

	it("must use safeParseBody for callAI helper (KAN-272)", () => {
		expect(appSrc).toContain("safeParseBody")
	})

	it("must import from response-parser utility", () => {
		expect(appSrc).toContain("from './lib/response-parser'")
	})

	it("response-parser must try JSON.parse before checking content-type", () => {
		expect(parserSrc).toContain("JSON.parse(bodyText)")
	})

	it("must set error status on parse failure", () => {
		expect(appSrc).toContain("Response parse failed")
		expect(appSrc).toContain("setStatus('error')")
	})

	it("must log parse errors for debugging", () => {
		expect(appSrc).toContain("parseResult.parseError")
		expect(appSrc).toContain("parseResult.bodyPreview")
	})
})
