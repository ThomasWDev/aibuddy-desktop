/**
 * Share / Export Formatting Utilities
 * 
 * Pure functions extracted from ShareModal for testability.
 * Used by ShareModal.tsx and imported directly by test files.
 * 
 * RULE: Tests MUST import these functions — NEVER duplicate them.
 */

export interface ShareMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Format messages as plain text for clipboard copy
 */
export function formatAsText(messages: ShareMessage[], threadTitle?: string): string {
  if (!messages || messages.length === 0) return ''

  const conversationText = messages.map((msg) => {
    const role = msg.role === 'user' ? 'You' : 'AIBuddy'
    return `${role}:\n${msg.content}`
  }).join('\n\n---\n\n')

  return `${threadTitle || 'AIBuddy Conversation'}\n${'='.repeat(40)}\n\n${conversationText}`
}

/**
 * Format messages as Markdown for export
 */
export function formatAsMarkdown(messages: ShareMessage[], threadTitle?: string, messageCount?: number): string {
  if (!messages || messages.length === 0) return ''

  const conversationMd = messages.map((msg) => {
    const role = msg.role === 'user' ? '**You**' : '**AIBuddy**'
    return `### ${role}\n\n${msg.content}`
  }).join('\n\n---\n\n')

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const count = messageCount ?? messages.length
  return `# ${threadTitle || 'AIBuddy Conversation'}\n\n_Exported on ${date} | ${count} messages_\n\n---\n\n${conversationMd}\n`
}

/**
 * Sanitize a thread title for use as a filename
 */
export function sanitizeFilename(title: string): string {
  return (title || 'aibuddy-conversation')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .substring(0, 50)
}

/**
 * Format a short snippet for social media sharing.
 * Truncates to ~250 chars so it fits in a tweet/post.
 */
export function formatAsShareSnippet(messages: ShareMessage[], threadTitle?: string): string {
  if (!messages || messages.length === 0) return ''

  const firstUserMsg = messages.find(m => m.role === 'user')
  const preview = firstUserMsg
    ? firstUserMsg.content.substring(0, 200).trim()
    : (threadTitle || 'AIBuddy Conversation')

  const truncated = preview.length >= 200 ? preview + '...' : preview

  return `Shared via AIBuddy\n\n"${truncated}"\n\n#AI #DeveloperTools`
}

/**
 * Export conversation as JSON (for KAN-49: Shared Transcripts)
 */
export function exportAsJSON(messages: ShareMessage[], threadTitle: string) {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    threadTitle,
    messageCount: messages.length,
    messages: messages.map((msg, i) => ({
      index: i,
      role: msg.role,
      content: msg.content,
    })),
  }
}
