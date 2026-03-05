const FEEDBACK_API_URL = 'https://aibuddy.life/wp-json/aibuddy-code/v2/feedback'

export type FeedbackType = 'nps' | 'thumbs_detail' | 'uninstall'

export interface FeedbackEvent {
  type: FeedbackType
  score?: number
  messageId?: string
  category?: string | null
  comment?: string
  reasons?: string[]
  source: 'extension' | 'desktop' | 'web'
  version: string
  timestamp: string
}

export async function submitFeedback(event: FeedbackEvent): Promise<boolean> {
  try {
    const response = await fetch(FEEDBACK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    return response.ok
  } catch (err) {
    console.error('[Feedback] Failed to submit:', err)
    return false
  }
}
