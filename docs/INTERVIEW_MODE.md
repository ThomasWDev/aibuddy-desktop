# Interview Mode — Feature Documentation

**Last Updated:** March 4, 2026
**Component:** `renderer/src/components/InterviewPanel.tsx`
**Available in:** Desktop (Mac, Windows, Linux)
**Version Introduced:** v1.5.65

---

## Purpose

Interview Mode is a dedicated AI-powered coaching feature that helps users prepare for technical and behavioral interviews. It provides:

- **Real-time audio transcription** — listens to interview questions via microphone and auto-sends them to the AI
- **Manual question entry** — users can type interview questions directly
- **Two-section responses** — every answer includes a "Simple Explanation" (plain language) and an "Expert Answer" (interview-quality)
- **STAR-format behavioral answers** — automatically uses Situation-Task-Action-Result for behavioral questions

---

## Architecture

```
┌──────────────────────────────────────────────┐
│                InterviewPanel                 │
│  (renderer/src/components/InterviewPanel.tsx) │
├──────────────┬───────────────────────────────┤
│ Left Panel   │ Right Panel                   │
│ Live         │ AI Interview Coach             │
│ Transcript   │ (Responses with metadata)     │
├──────────────┴───────────────────────────────┤
│ Mode Toggle: [Live Audio] [Type Question]    │
└──────────────────────────────────────────────┘
         │                       │
         ▼                       ▼
  MediaRecorder            fetch(apiUrl)
  → Whisper API            → Chat Completion
  → Transcript             → AIResponse
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `InterviewPanel` | `renderer/src/components/InterviewPanel.tsx` | Main panel with split-view layout |
| App integration | `renderer/src/App.tsx` line ~761 | `showInterviewMode` state toggle |
| Header button | `renderer/src/App.tsx` line ~3662 | GraduationCap icon to open |
| System prompt | `InterviewPanel.tsx` lines 9-25 | `INTERVIEW_SYSTEM_PROMPT` |
| Microphone entitlement | `build/entitlements.mas.plist` | `com.apple.security.device.microphone` |

### State Management

All state is local to `InterviewPanel` (no global store):

| State | Type | Purpose |
|-------|------|---------|
| `transcript` | `TranscriptEntry[]` | Recorded/typed questions |
| `responses` | `AIResponse[]` | AI answers with metadata |
| `mode` | `'realtime' \| 'manual'` | Audio vs typed input |
| `isListening` | `boolean` | Microphone active |
| `copiedId` | `string \| null` | Tracks which response was copied (2s feedback) |
| `manualQuestion` | `string` | Typed question input |
| `error` | `string \| null` | Error banner message |

### Data Types

```typescript
interface TranscriptEntry {
  id: string
  text: string
  timestamp: Date
  isFinal: boolean
}

interface AIResponse {
  id: string
  question: string
  answer: string
  timestamp: Date
  isLoading: boolean
  cost?: number
  tokensIn?: number
  tokensOut?: number
  model?: string
  responseTime?: number
}
```

---

## Two Modes

### 1. Live Audio (`realtime`)

1. User clicks "Start Listening" → `startListening()` requests microphone access
2. `MediaRecorder` captures audio in 8-second segments (`audio/webm;codecs=opus`)
3. Each segment is base64-encoded and sent to the API's Whisper transcription endpoint
4. Transcribed text accumulates in `pendingTextRef`
5. After 3 seconds of silence, accumulated text is sent to the AI as an interview question
6. AI responds with structured Simple + Expert answer

**macOS Permissions:** Requires `com.apple.security.device.microphone` entitlement. KAN-62 added explicit permission checking via `electronAPI.microphone.getStatus()` and `requestAccess()`.

### 2. Type Question (`manual`)

1. User types a question in the input field
2. Pressing Enter or clicking "Ask AI" calls `handleManualSubmit()`
3. Question is added to transcript and sent to the AI
4. AI responds identically to Live Audio mode

---

## Feature Fixes (Chronological)

| Ticket | Fix | Tests |
|--------|-----|-------|
| KAN-17 | Replaced broken `SpeechRecognition` with `MediaRecorder` + Whisper API | — |
| KAN-62 | Added macOS microphone permission checking before recording | 2 |
| KAN-186 | Copy button: Electron clipboard fallback + "Copied!" feedback | 7 |
| KAN-187 | Added cost, token usage, response time, timestamp to responses | 18 |
| KAN-188 | Clear All: native Electron dialog instead of window.confirm | 7 |

---

## API Integration

Interview Mode uses the same API endpoint as regular chat (`apiUrl` prop):

**Chat request:**
```json
{
  "api_key": "...",
  "messages": [
    { "role": "system", "content": "INTERVIEW_SYSTEM_PROMPT" },
    { "role": "user", "content": "Interview question heard: \"...\"" }
  ],
  "max_tokens": 2000,
  "temperature": 0.7
}
```

**Response fields used:**
- `data.choices[0].message.content` or `data.response` or `data.content` → answer text
- `data.api_cost` → cost
- `data.usage.input_tokens` → tokens in
- `data.usage.output_tokens` → tokens out
- `data.model` → model identifier

**Transcription request (Live Audio only):**
```json
{
  "mode": "transcribe",
  "api_key": "...",
  "audio_base64": "...",
  "audio_format": "webm"
}
```

---

## Destructive Actions

**Clear All** (`clearAll()`):
- Requires confirmation via native Electron `dialog.showMessage()` (KAN-188)
- Falls back to `window.confirm()` in non-Electron environments
- Clears: `transcript`, `responses`, `currentInterim`, `pendingTextRef`, aborts in-flight requests
- No-ops when nothing exists to clear

---

## Known Limitations

1. **No persistence** — interview history is in-memory only, lost on panel close
2. **No session management** — cannot save/load interview sessions
3. **Single conversation** — no message history context between questions (each question is independent)
4. **No streaming** — responses arrive all at once (not streamed token-by-token)
5. **Audio format** — only `audio/webm;codecs=opus` supported (MediaRecorder limitation)

---

## Testing

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `tests/electron/kan186-interview-copy.test.ts` | 7 | Copy button: try/catch, Electron fallback, feedback |
| `tests/electron/kan187-interview-metadata.test.ts` | 18 | Cost, tokens, timestamp, model display |
| `tests/electron/kan188-interview-clear-confirmation.test.ts` | 7 | Native dialog, fallback, early return |
| `tests/electron/v1565-smoke.test.ts` | ~10 | Component exists, modes, icons, system prompt |
| `tests/electron/kan62-microphone-permission.test.ts` | 2 | Microphone permission checks |
