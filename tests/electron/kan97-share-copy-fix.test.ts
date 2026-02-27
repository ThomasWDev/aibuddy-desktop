import { readFileSync } from "fs"
import { join } from "path"
import { describe, it, expect } from "vitest"
import { formatAsText, formatAsMarkdown } from '../../renderer/src/utils/share-formatting'

const MODAL_PATH = join(__dirname, "..", "..", "renderer", "src", "components", "ShareModal.tsx")
const modalSource = readFileSync(MODAL_PATH, "utf-8")

describe("KAN-97: Fix 'Copy as Text' and 'Copy as Markdown' in Share Conversation Modal", () => {

	describe("Clipboard fallback to Electron API", () => {
		it("handleCopyText must fallback to electronAPI.clipboard.writeText", () => {
			const copyTextBlock = modalSource.slice(
				modalSource.indexOf("handleCopyText"),
				modalSource.indexOf("handleCopyMarkdown")
			)
			expect(copyTextBlock).toContain("electronAPI")
			expect(copyTextBlock).toContain("clipboard")
			expect(copyTextBlock).toContain("writeText")
		})

		it("handleCopyMarkdown must fallback to electronAPI.clipboard.writeText", () => {
			const copyMdBlock = modalSource.slice(
				modalSource.indexOf("handleCopyMarkdown"),
				modalSource.indexOf("handleExportMarkdown")
			)
			expect(copyMdBlock).toContain("electronAPI")
			expect(copyMdBlock).toContain("clipboard")
			expect(copyMdBlock).toContain("writeText")
		})
	})

	describe("Error handling must not show generic failure when fallback succeeds", () => {
		it("must have nested try-catch for Electron fallback (not one catch for both)", () => {
			const copyTextBlock = modalSource.slice(
				modalSource.indexOf("handleCopyText"),
				modalSource.indexOf("handleCopyMarkdown")
			)
			const tryCount = (copyTextBlock.match(/try\s*\{/g) || []).length
			expect(tryCount).toBeGreaterThanOrEqual(2)
		})
	})

	describe("Regression guards", () => {
		it("must still have Copy as Text button with correct label", () => {
			expect(modalSource).toContain("Copy as Text")
		})

		it("must still have Copy as Markdown button with correct label", () => {
			expect(modalSource).toContain("Copy as Markdown")
		})

		it("must still have Export as File option", () => {
			expect(modalSource).toContain("Export as File")
		})

		it("must have Escape key handler to close modal", () => {
			expect(modalSource).toContain("Escape")
		})

		it("must have aria-modal='true' for accessibility", () => {
			expect(modalSource).toContain('aria-modal="true"')
		})

		it("must have role='dialog' for accessibility", () => {
			expect(modalSource).toContain('role="dialog"')
		})

		it("must import formatAsText and formatAsMarkdown from share-formatting", () => {
			expect(modalSource).toContain("formatAsText")
			expect(modalSource).toContain("formatAsMarkdown")
			expect(modalSource).toContain("share-formatting")
		})

		it("must guard against empty messages before copy", () => {
			expect(modalSource).toContain("messages.length === 0")
		})
	})

	describe("Formatting functions (imported from share-formatting.ts)", () => {
		const sampleMessages = [
			{ role: "user" as const, content: "Hello" },
			{ role: "assistant" as const, content: "Hi there!" },
		]

		it("formatAsText produces non-empty output for messages", () => {
			const text = formatAsText(sampleMessages, "Test Chat")
			expect(text).toContain("Test Chat")
			expect(text).toContain("Hello")
			expect(text).toContain("Hi there!")
		})

		it("formatAsMarkdown produces markdown with headers", () => {
			const md = formatAsMarkdown(sampleMessages, "Test Chat", 2)
			expect(md).toContain("# Test Chat")
			expect(md).toContain("### **You**")
			expect(md).toContain("### **AIBuddy**")
		})

		it("formatAsText returns empty string for empty messages", () => {
			expect(formatAsText([], "Title")).toBe("")
		})

		it("formatAsMarkdown returns empty string for empty messages", () => {
			expect(formatAsMarkdown([], "Title")).toBe("")
		})
	})
})
