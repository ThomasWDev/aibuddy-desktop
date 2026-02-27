import { readFileSync } from "fs"
import { join } from "path"
import { describe, it, expect } from "vitest"

const APP_PATH = join(__dirname, "..", "..", "renderer", "src", "App.tsx")
const source = readFileSync(APP_PATH, "utf-8")

describe("KAN-95: Fix server error when sending message with file attachment", () => {

	describe("Bug fix 1: Payload truncation must use correct image type", () => {
		it("truncation filter must strip 'image' type parts, not 'image_url'", () => {
			const truncateIdx = source.indexOf("Strip base64 images from all messages")
			expect(truncateIdx).toBeGreaterThan(-1)
			const truncateBlock = source.slice(truncateIdx, truncateIdx + 500)
			expect(truncateBlock).toContain("part.type !== 'image'")
			expect(truncateBlock).not.toContain("part.type !== 'image_url'")
		})
	})

	describe("Bug fix 2: Code files must be included when images are present", () => {
		it("when images are attached, message text must use userMessage.content (includes code files)", () => {
			const imageBlockIdx = source.indexOf("Add current message with images if present")
			expect(imageBlockIdx).toBeGreaterThan(-1)
			const imageBlock = source.slice(imageBlockIdx, imageBlockIdx + 500)
			expect(imageBlock).toContain("userMessage.content")
		})
	})

	describe("Regression guards", () => {
		it("MAX_PAYLOAD_BYTES must be defined and <= 900KB", () => {
			expect(source).toContain("MAX_PAYLOAD_BYTES")
			const match = source.match(/MAX_PAYLOAD_BYTES\s*=\s*(\d+)\s*\*\s*(\d+)/)
			expect(match).toBeTruthy()
			const value = parseInt(match![1]) * parseInt(match![2])
			expect(value).toBeLessThanOrEqual(900 * 1024)
		})

		it("image format must use Anthropic structure (type: image, source: base64)", () => {
			expect(source).toContain("type: 'image'")
			expect(source).toContain("type: 'base64'")
			expect(source).toContain("media_type: img.mimeType")
		})

		it("payload size check must exist before the main inference fetch", () => {
			const sizeCheckIdx = source.indexOf("payloadSize > MAX_PAYLOAD_BYTES")
			expect(sizeCheckIdx).toBeGreaterThan(-1)
			const mainFetchIdx = source.indexOf("body: serializedBody")
			expect(mainFetchIdx).toBeGreaterThan(-1)
			expect(sizeCheckIdx).toBeLessThan(mainFetchIdx)
		})

		it("413 error handler must exist", () => {
			expect(source).toContain("response.status === 413")
		})

		it("500/502/503 error handler must exist", () => {
			expect(source).toContain("response.status === 500")
			expect(source).toContain("response.status === 502")
			expect(source).toContain("response.status === 503")
		})
	})
})
