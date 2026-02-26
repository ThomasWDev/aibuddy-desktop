import { readFileSync } from "fs"
import { join } from "path"

const appSrc = readFileSync(
	join(__dirname, "..", "..", "renderer", "src", "App.tsx"),
	"utf-8"
)

describe("KAN-38: Must be able to create new chat even when a request is in progress", () => {
	it("New Chat button must abort current request instead of blocking", () => {
		expect(appSrc).not.toMatch(
			/if\s*\(isLoading\)\s*\{\s*\n\s*toast\.warning/
		)
	})

	it("New Chat handler must call abortControllerRef.current.abort() when loading", () => {
		const newChatBlock = appSrc.match(
			/New Chat button[\s\S]*?onClick[\s\S]*?abortControllerRef\.current\.abort\(\)/
		)
		expect(newChatBlock).toBeTruthy()
	})

	it("New Chat handler must reset isLoading and status after abort", () => {
		const newChatBlock = appSrc.match(
			/New Chat button[\s\S]{0,500}setIsLoading\(false\)[\s\S]{0,200}setStatus\('idle'\)/
		)
		expect(newChatBlock).toBeTruthy()
	})

	it("New Chat must always clear messages regardless of loading state", () => {
		const handler = appSrc.match(
			/New Chat button[\s\S]*?setMessages\(\[\]\)/
		)
		expect(handler).toBeTruthy()
	})
})
