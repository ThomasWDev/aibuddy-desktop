import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { submitFeedback, type FeedbackEvent } from '../../renderer/src/lib/feedback'

describe('submitFeedback', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('POSTs to the correct URL with JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = mockFetch

    const event: FeedbackEvent = {
      type: 'nps',
      score: 9,
      source: 'desktop',
      version: '1.5.93',
      timestamp: '2026-03-05T00:00:00.000Z',
    }

    await submitFeedback(event)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://aibuddy.life/wp-json/aibuddy-code/v2/feedback')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(options.body)
    expect(body.type).toBe('nps')
    expect(body.score).toBe(9)
    expect(body.source).toBe('desktop')
  })

  it('returns true when server responds ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

    const result = await submitFeedback({
      type: 'thumbs_detail',
      messageId: 'msg-1',
      category: 'wrongAnswer',
      comment: 'Bad code',
      source: 'desktop',
      version: '1.5.93',
      timestamp: new Date().toISOString(),
    })

    expect(result).toBe(true)
  })

  it('returns false when server responds not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    const result = await submitFeedback({
      type: 'nps',
      score: 5,
      source: 'extension',
      version: '1.5.93',
      timestamp: new Date().toISOString(),
    })

    expect(result).toBe(false)
  })

  it('returns false and logs error when fetch throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await submitFeedback({
      type: 'nps',
      score: 3,
      source: 'desktop',
      version: '1.5.93',
      timestamp: new Date().toISOString(),
    })

    expect(result).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith('[Feedback] Failed to submit:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('includes all fields for thumbs_detail type', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = mockFetch

    await submitFeedback({
      type: 'thumbs_detail',
      messageId: 'msg-42',
      category: 'tooSlow',
      comment: 'Took forever',
      source: 'desktop',
      version: '1.5.93',
      timestamp: '2026-03-05T12:00:00.000Z',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.type).toBe('thumbs_detail')
    expect(body.messageId).toBe('msg-42')
    expect(body.category).toBe('tooSlow')
    expect(body.comment).toBe('Took forever')
  })
})
