import { readFileSync } from "fs"
import { join } from "path"
import { describe, it, expect } from "vitest"
import { isImageFile, isTextFile } from "../../renderer/src/lib/utils"

const APP_PATH = join(__dirname, "..", "..", "renderer", "src", "App.tsx")
const source = readFileSync(APP_PATH, "utf-8")

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"]
const CODE_EXTENSIONS = [
	"ts", "tsx", "js", "jsx", "py", "java", "cpp", "c", "h",
	"cs", "go", "rs", "rb", "php", "swift", "kt", "scala",
	"sql", "sh", "bash", "html", "css", "json", "yaml", "yml",
	"md", "txt",
]

describe("KAN-96: Unified Attachment Button (Desktop)", () => {
	describe("UI — Single button requirement", () => {
		it("must use Paperclip icon for attachment", () => {
			expect(source).toContain("<Paperclip")
		})

		it("must have aria-label 'Attach file or image'", () => {
			expect(source).toContain('aria-label="Attach file or image"')
		})

		it("must NOT have separate ImageIcon button in input toolbar", () => {
			const inputSection = source.slice(
				source.indexOf("Main input row"),
				source.indexOf("AIBuddy Smart AI Badge")
			)
			expect(inputSection).not.toContain("<ImageIcon")
		})

		it("must NOT have separate FileCode button in input toolbar", () => {
			const inputSection = source.slice(
				source.indexOf("Main input row"),
				source.indexOf("AIBuddy Smart AI Badge")
			)
			expect(inputSection).not.toContain("<FileCode")
		})

		it("must have exactly one attachment aria-label in input toolbar", () => {
			const inputSection = source.slice(
				source.indexOf("Main input row"),
				source.indexOf("AIBuddy Smart AI Badge")
			)
			const attachCount = (inputSection.match(/aria-label="Attach/g) || []).length
			expect(attachCount).toBe(1)
		})

		it("tooltip must mention both files and images", () => {
			expect(source).toContain("Attach file or image")
		})
	})

	describe("Unified handler — handleAttachFileWithElectron", () => {
		it("must define handleAttachFileWithElectron function", () => {
			expect(source).toContain("handleAttachFileWithElectron")
		})

		it("unified handler must accept both image and code file extensions", () => {
			const handlerIdx = source.indexOf("handleAttachFileWithElectron")
			const handlerBlock = source.slice(handlerIdx, handlerIdx + 2000)
			expect(handlerBlock).toMatch(/Images.*extensions/)
			expect(handlerBlock).toMatch(/Code Files|All Supported/)
		})

		it("unified handler must route images to attachedImages state", () => {
			const handlerIdx = source.indexOf("handleAttachFileWithElectron")
			const handlerBlock = source.slice(handlerIdx, handlerIdx + 5000)
			expect(handlerBlock).toContain("setAttachedImages")
		})

		it("unified handler must route code files to attachedFiles state", () => {
			const handlerIdx = source.indexOf("handleAttachFileWithElectron")
			const handlerBlock = source.slice(handlerIdx, handlerIdx + 6000)
			expect(handlerBlock).toContain("setAttachedFiles")
		})
	})

	describe("Drag-and-drop — must accept both images and code files", () => {
		it("handleDrop must not reject non-image files", () => {
			const dropIdx = source.indexOf("const handleDrop")
			const dropBlock = source.slice(dropIdx, dropIdx + 1500)
			expect(dropBlock).not.toContain("is not an image")
		})

		it("drag overlay text must say files, not just images", () => {
			expect(source).toContain("Drop files here")
		})
	})

	describe("File type routing — isImageFile from utils", () => {
		it("isImageFile detects PNG", () => {
			expect(isImageFile("screenshot.png")).toBe(true)
		})

		it("isImageFile detects JPG", () => {
			expect(isImageFile("photo.jpg")).toBe(true)
		})

		it("isImageFile detects WebP", () => {
			expect(isImageFile("icon.webp")).toBe(true)
		})

		it("isImageFile rejects .ts file", () => {
			expect(isImageFile("app.ts")).toBe(false)
		})

		it("isImageFile rejects .py file", () => {
			expect(isImageFile("script.py")).toBe(false)
		})

		it("isTextFile detects TypeScript", () => {
			expect(isTextFile("app.ts")).toBe(true)
		})

		it("isTextFile detects Python", () => {
			expect(isTextFile("script.py")).toBe(true)
		})

		it("isTextFile rejects PNG", () => {
			expect(isTextFile("screenshot.png")).toBe(false)
		})
	})

	describe("Regression guards", () => {
		it("image preview section must still exist for attached images", () => {
			expect(source).toContain("Image Attachments Preview")
		})

		it("code file preview section must still exist for attached files", () => {
			expect(source).toContain("Code File Attachments Preview")
		})

		it("Paperclip must be imported from lucide-react", () => {
			const importBlock = source.slice(0, source.indexOf("} from 'lucide-react'") + 30)
			expect(importBlock).toContain("Paperclip")
		})

		it("old separate button handlers must NOT be called from input toolbar", () => {
			const inputSection = source.slice(
				source.indexOf("Main input row"),
				source.indexOf("AIBuddy Smart AI Badge")
			)
			expect(inputSection).not.toContain("handleImageSelectWithElectron")
			expect(inputSection).not.toContain("handleCodeFileSelectWithElectron")
		})
	})
})
