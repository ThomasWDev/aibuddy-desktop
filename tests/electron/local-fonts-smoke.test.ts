import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { describe, it, expect } from "vitest"

const RENDERER_ROOT = join(__dirname, "..", "..", "renderer")
const read = (rel: string) => readFileSync(join(RENDERER_ROOT, rel), "utf8")

describe("Local Font Loading — ERR_SOCKET_NOT_CONNECTED fix", () => {
	const indexHtml = read("index.html")
	const indexCss = read("src/index.css")

	it("index.html must NOT load fonts from Google CDN", () => {
		expect(indexHtml).not.toContain("fonts.googleapis.com")
		expect(indexHtml).not.toContain("fonts.gstatic.com")
	})

	it("index.html CSP must NOT reference Google Fonts domains", () => {
		const cspMatch = indexHtml.match(/Content-Security-Policy.*?\"/)
		expect(cspMatch).toBeTruthy()
		const csp = cspMatch![0]
		expect(csp).not.toContain("fonts.googleapis.com")
		expect(csp).not.toContain("fonts.gstatic.com")
	})

	it("index.css must define @font-face for Nunito", () => {
		expect(indexCss).toContain("font-family: 'Nunito'")
		expect(indexCss).toMatch(/src:.*nunito.*\.woff2/)
	})

	it("index.css must define @font-face for Comic Neue", () => {
		expect(indexCss).toContain("font-family: 'Comic Neue'")
		expect(indexCss).toMatch(/src:.*comic-neue.*\.woff2/)
	})

	it("index.css must define @font-face for JetBrains Mono", () => {
		expect(indexCss).toContain("font-family: 'JetBrains Mono'")
		expect(indexCss).toMatch(/src:.*jetbrains-mono.*\.woff2/)
	})

	it("all font woff2 files must exist in assets/fonts/", () => {
		const fontsDir = join(RENDERER_ROOT, "src", "assets", "fonts")
		expect(existsSync(join(fontsDir, "nunito-latin.woff2"))).toBe(true)
		expect(existsSync(join(fontsDir, "comic-neue-400-latin.woff2"))).toBe(true)
		expect(existsSync(join(fontsDir, "comic-neue-700-latin.woff2"))).toBe(true)
		expect(existsSync(join(fontsDir, "jetbrains-mono-latin.woff2"))).toBe(true)
	})

	it("font files must be non-trivial size (>5KB)", () => {
		const fontsDir = join(RENDERER_ROOT, "src", "assets", "fonts")
		for (const f of ["nunito-latin.woff2", "comic-neue-400-latin.woff2", "comic-neue-700-latin.woff2", "jetbrains-mono-latin.woff2"]) {
			const stat = readFileSync(join(fontsDir, f))
			expect(stat.length).toBeGreaterThan(5000)
		}
	})
})
