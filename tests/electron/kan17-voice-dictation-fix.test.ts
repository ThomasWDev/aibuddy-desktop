import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { describe, it, expect } from "vitest"

const HOOK_PATH = join(__dirname, "..", "..", "renderer", "src", "hooks", "useVoiceInput.ts")
const APP_PATH = join(__dirname, "..", "..", "renderer", "src", "App.tsx")
const URLS_PATH = join(__dirname, "..", "..", "src", "constants", "urls.ts")

describe("KAN-17: Fix voice dictation — replace Web Speech API with Whisper", () => {

	describe("useVoiceInput.ts must use MediaRecorder, not SpeechRecognition", () => {
		it("hook file must exist", () => {
			expect(existsSync(HOOK_PATH)).toBe(true)
		})

		const hookSource = existsSync(HOOK_PATH) ? readFileSync(HOOK_PATH, "utf-8") : ""

		it("must use MediaRecorder for audio capture", () => {
			expect(hookSource).toContain("MediaRecorder")
		})

		it("must use getUserMedia for microphone access", () => {
			expect(hookSource).toContain("getUserMedia")
		})

		it("must NOT use SpeechRecognition as primary API (broken in Electron)", () => {
			const hasSpeechRecogAsMain = hookSource.includes("new SpeechRecognition()")
				|| hookSource.includes("new (window as any).SpeechRecognition()")
			expect(hasSpeechRecogAsMain).toBe(false)
		})

		it("must send audio to backend for Whisper transcription", () => {
			expect(hookSource).toContain("transcribe")
		})

		it("must encode audio as base64 for transmission", () => {
			expect(hookSource).toContain("base64")
		})

		it("must have a max recording duration limit", () => {
			expect(hookSource).toMatch(/MAX_RECORDING|maxDuration|60000|60_000/)
		})

		it("must handle transcription API errors gracefully", () => {
			expect(hookSource).toContain("error")
		})

		it("must clean up media stream on stop", () => {
			expect(hookSource).toContain("stop()")
		})
	})

	describe("URL configuration", () => {
		const urlSource = existsSync(URLS_PATH) ? readFileSync(URLS_PATH, "utf-8") : ""

		it("must have a transcription URL constant", () => {
			expect(urlSource).toContain("TRANSCRIBE")
		})
	})

	describe("App.tsx integration", () => {
		const appSource = existsSync(APP_PATH) ? readFileSync(APP_PATH, "utf-8") : ""

		it("must still have microphone button", () => {
			expect(appSource).toContain("voice")
		})

		it("must have voice state handling (listening state)", () => {
			expect(appSource).toContain("voiceState")
		})
	})

	describe("Error messages should be accurate, not misleading", () => {
		const hookSource = existsSync(HOOK_PATH) ? readFileSync(HOOK_PATH, "utf-8") : ""

		it("must NOT show generic 'Network error' for dictation failures", () => {
			expect(hookSource).not.toContain("Network error. Please check your connection.")
		})

		it("should have specific microphone permission error", () => {
			expect(hookSource).toContain("Microphone")
		})
	})
})
