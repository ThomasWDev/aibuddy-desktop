/**
 * Chat History Manager
 * 
 * Manages persistent chat history storage.
 * Stores threads in ~/.aibuddy/history/
 * 
 * Features:
 * - Create new chat threads
 * - Add messages to threads
 * - Search through history
 * - Delete/archive threads
 * - Persist across app restarts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { ChatThread, ChatMessage, ChatHistoryState, HISTORY_VERSION } from './types'

// Simple ID generator (replaces nanoid which is ESM-only)
const generateId = (): string => {
  return crypto.randomBytes(12).toString('base64url')
}

const HISTORY_DIR = path.join(os.homedir(), '.aibuddy', 'history')
const HISTORY_FILE = path.join(HISTORY_DIR, 'threads.json')
const MAX_THREADS = 100
const MAX_HISTORY_FILE_SIZE = 50 * 1024 * 1024 // 50 MB hard cap
const MAX_MESSAGES_PER_THREAD = 500
const IMAGE_STRIP_AGE_MS = 7 * 24 * 60 * 60 * 1000 // Strip base64 from threads older than 7 days

export class ChatHistoryManager {
  private static instance: ChatHistoryManager | null = null
  private state: ChatHistoryState
  private saveDebounceTimer: NodeJS.Timeout | null = null
  private readonly SAVE_DEBOUNCE_MS = 1000

  private constructor() {
    this.state = this.load()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ChatHistoryManager {
    if (!ChatHistoryManager.instance) {
      ChatHistoryManager.instance = new ChatHistoryManager()
    }
    return ChatHistoryManager.instance
  }

  /**
   * Load history from disk
   */
  private load(): ChatHistoryState {
    try {
      // Ensure directory exists
      if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true })
      }

      // Load existing history
      if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8')
        const state = JSON.parse(data) as ChatHistoryState
        
        // Migrate if needed
        if (state.version !== HISTORY_VERSION) {
          return this.migrate(state)
        }
        
        return state
      }
    } catch (error) {
      console.error('[ChatHistoryManager] Failed to load history:', error)
    }

    // Return default state
    return {
      threads: [],
      activeThreadId: null,
      version: HISTORY_VERSION
    }
  }

  /**
   * Migrate old history format
   */
  private migrate(oldState: ChatHistoryState): ChatHistoryState {
    // For now, just update version
    return {
      ...oldState,
      version: HISTORY_VERSION
    }
  }

  /**
   * Save history to disk (debounced)
   */
  private save(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.saveImmediate()
    }, this.SAVE_DEBOUNCE_MS)
  }

  /**
   * Strip inline base64 images from threads older than IMAGE_STRIP_AGE_MS.
   * Replaces base64 data with a placeholder to reclaim disk space while
   * preserving the message structure and metadata.
   */
  private stripOldBase64Images(): void {
    const cutoff = Date.now() - IMAGE_STRIP_AGE_MS
    for (const thread of this.state.threads) {
      if (thread.updatedAt >= cutoff) continue
      for (const msg of thread.messages) {
        if (!msg.images?.length) continue
        for (const img of msg.images) {
          if (img.base64 && img.base64.length > 100) {
            img.base64 = '[stripped]'
          }
        }
      }
    }
  }

  /**
   * Trim messages in oversized threads to MAX_MESSAGES_PER_THREAD,
   * keeping the most recent messages.
   */
  private trimOversizedThreads(): void {
    for (const thread of this.state.threads) {
      if (thread.messages.length > MAX_MESSAGES_PER_THREAD) {
        thread.messages = thread.messages.slice(-MAX_MESSAGES_PER_THREAD)
      }
    }
  }

  /**
   * Save history immediately
   */
  private saveImmediate(): void {
    try {
      if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true })
      }

      // Prune old threads if needed
      if (this.state.threads.length > MAX_THREADS) {
        this.state.threads = this.state.threads
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, MAX_THREADS)
      }

      this.trimOversizedThreads()
      this.stripOldBase64Images()

      const json = JSON.stringify(this.state, null, 2)

      if (json.length > MAX_HISTORY_FILE_SIZE) {
        console.warn(`[ChatHistoryManager] History file too large (${(json.length / 1024 / 1024).toFixed(1)}MB). Pruning aggressively.`)
        // Drop oldest half of non-pinned threads
        const pinned = this.state.threads.filter(t => t.isPinned)
        const unpinned = this.state.threads
          .filter(t => !t.isPinned)
          .sort((a, b) => b.updatedAt - a.updatedAt)
        const keepCount = Math.max(10, Math.floor(unpinned.length / 2))
        this.state.threads = [...pinned, ...unpinned.slice(0, keepCount)]

        // Strip ALL remaining base64 as emergency measure
        for (const thread of this.state.threads) {
          for (const msg of thread.messages) {
            if (msg.images) {
              for (const img of msg.images) {
                if (img.base64 && img.base64.length > 100) {
                  img.base64 = '[stripped]'
                }
              }
            }
          }
        }
      }

      const finalJson = JSON.stringify(this.state, null, 2)
      fs.writeFileSync(HISTORY_FILE, finalJson)
      console.log(`[ChatHistoryManager] History saved (${(finalJson.length / 1024).toFixed(0)}KB, ${this.state.threads.length} threads)`)
    } catch (error) {
      console.error('[ChatHistoryManager] Failed to save history:', error)
    }
  }

  /**
   * Get current history file size estimate in bytes
   */
  getFileSizeEstimate(): number {
    try {
      return JSON.stringify(this.state).length
    } catch {
      return 0
    }
  }

  /**
   * Create a new chat thread
   */
  createThread(firstMessage?: string, workspacePath?: string): ChatThread {
    const thread: ChatThread = {
      id: generateId(),
      title: firstMessage 
        ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
        : 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      workspacePath
    }

    this.state.threads.unshift(thread)
    this.state.activeThreadId = thread.id
    this.save()

    return thread
  }

  /**
   * Get all threads
   */
  getThreads(): ChatThread[] {
    return this.state.threads.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * Get a specific thread by ID
   */
  getThread(threadId: string): ChatThread | undefined {
    return this.state.threads.find(t => t.id === threadId)
  }

  /**
   * Get the active thread
   */
  getActiveThread(): ChatThread | undefined {
    if (!this.state.activeThreadId) return undefined
    return this.getThread(this.state.activeThreadId)
  }

  /**
   * Set the active thread
   */
  setActiveThread(threadId: string | null): void {
    this.state.activeThreadId = threadId
    this.save()
  }

  /**
   * Add a message to a thread.
   * Content over 100KB is truncated. Per-image base64 over 400KB is rejected.
   */
  addMessage(threadId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const thread = this.getThread(threadId)
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`)
    }

    const MAX_CONTENT_SIZE = 100 * 1024
    let content = message.content
    if (content && content.length > MAX_CONTENT_SIZE) {
      content = content.slice(0, MAX_CONTENT_SIZE) + '\n\n[Content truncated — exceeded 100KB]'
      console.warn(`[ChatHistoryManager] Message content truncated for thread ${threadId}`)
    }

    const MAX_IMAGE_B64_SIZE = 400 * 1024
    const safeImages = message.images?.filter(img => {
      if (img.base64 && img.base64.length > MAX_IMAGE_B64_SIZE) {
        console.warn(`[ChatHistoryManager] Dropping oversized image (${(img.base64.length / 1024).toFixed(0)}KB)`)
        return false
      }
      return true
    })

    const fullMessage: ChatMessage = {
      ...message,
      content,
      images: safeImages,
      id: generateId(),
      timestamp: Date.now()
    }

    thread.messages.push(fullMessage)
    thread.updatedAt = Date.now()

    if (thread.title === 'New Chat' && message.role === 'user' && content) {
      thread.title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
    }

    this.save()
    return fullMessage
  }

  /**
   * Update thread metadata (tokens, cost, model, pin status)
   */
  updateThreadMetadata(threadId: string, metadata: {
    totalTokensIn?: number
    totalTokensOut?: number
    totalCost?: number
    model?: string
    isCompleted?: boolean
    isPinned?: boolean
  }): void {
    const thread = this.getThread(threadId)
    if (!thread) return

    if (metadata.totalTokensIn !== undefined) {
      thread.totalTokensIn = (thread.totalTokensIn || 0) + metadata.totalTokensIn
    }
    if (metadata.totalTokensOut !== undefined) {
      thread.totalTokensOut = (thread.totalTokensOut || 0) + metadata.totalTokensOut
    }
    if (metadata.totalCost !== undefined) {
      thread.totalCost = (thread.totalCost || 0) + metadata.totalCost
    }
    if (metadata.model !== undefined) {
      thread.model = metadata.model
    }
    if (metadata.isCompleted !== undefined) {
      thread.isCompleted = metadata.isCompleted
    }
    // Handle pin/favorite status
    if (metadata.isPinned !== undefined) {
      thread.isPinned = metadata.isPinned
      console.log('[ChatHistoryManager] Thread pin status updated:', { threadId, isPinned: metadata.isPinned })
    }

    thread.updatedAt = Date.now()
    this.save()
  }

  /**
   * Rename a thread
   */
  renameThread(threadId: string, newTitle: string): void {
    const thread = this.getThread(threadId)
    if (!thread) return

    thread.title = newTitle
    thread.updatedAt = Date.now()
    this.save()
  }

  /**
   * Update feedback (thumbs up/down) for a specific message
   * KAN-28: Fixed feedback persistence
   */
  updateMessageFeedback(threadId: string, messageId: string, feedback: 'up' | 'down' | null): boolean {
    const thread = this.getThread(threadId)
    if (!thread) {
      console.warn('[ChatHistoryManager] Thread not found for feedback update:', threadId)
      return false
    }

    const message = thread.messages.find(m => m.id === messageId)
    if (!message) {
      console.warn('[ChatHistoryManager] Message not found for feedback update:', messageId)
      return false
    }

    // Store feedback on the message (properly typed now)
    message.feedback = feedback
    thread.updatedAt = Date.now()
    
    // Force immediate save for feedback to ensure persistence
    this.saveImmediate()
    
    console.log('[ChatHistoryManager] Updated message feedback:', { threadId, messageId, feedback })
    return true
  }

  /**
   * Delete a thread
   */
  deleteThread(threadId: string): void {
    const index = this.state.threads.findIndex(t => t.id === threadId)
    if (index === -1) return

    this.state.threads.splice(index, 1)

    // Clear active thread if it was deleted
    if (this.state.activeThreadId === threadId) {
      this.state.activeThreadId = this.state.threads[0]?.id || null
    }

    this.save()
  }

  /**
   * Clear all history
   */
  clearAll(): void {
    this.state.threads = []
    this.state.activeThreadId = null
    this.saveImmediate()
  }

  /**
   * Search threads by content
   */
  searchThreads(query: string): ChatThread[] {
    const lowerQuery = query.toLowerCase()
    return this.state.threads.filter(thread => {
      // Search in title
      if (thread.title.toLowerCase().includes(lowerQuery)) return true
      
      // Search in messages
      return thread.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      )
    })
  }

  /**
   * Export thread to markdown
   */
  exportThread(threadId: string): string {
    const thread = this.getThread(threadId)
    if (!thread) return ''

    let markdown = `# ${thread.title}\n\n`
    markdown += `Created: ${new Date(thread.createdAt).toLocaleString()}\n`
    markdown += `Last Updated: ${new Date(thread.updatedAt).toLocaleString()}\n\n`
    markdown += `---\n\n`

    for (const msg of thread.messages) {
      const role = msg.role === 'user' ? '**You**' : '**AIBuddy**'
      const time = new Date(msg.timestamp).toLocaleTimeString()
      markdown += `### ${role} (${time})\n\n`
      markdown += `${msg.content}\n\n`
    }

    return markdown
  }
}

// Export singleton getter
export const getHistoryManager = () => ChatHistoryManager.getInstance()

