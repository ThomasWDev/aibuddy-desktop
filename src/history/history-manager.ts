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
const MAX_THREADS = 100 // Keep last 100 threads

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
   * Save history immediately
   */
  private saveImmediate(): void {
    try {
      // Ensure directory exists
      if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true })
      }

      // Prune old threads if needed
      if (this.state.threads.length > MAX_THREADS) {
        this.state.threads = this.state.threads
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, MAX_THREADS)
      }

      fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.state, null, 2))
      console.log('[ChatHistoryManager] History saved')
    } catch (error) {
      console.error('[ChatHistoryManager] Failed to save history:', error)
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
   * Add a message to a thread
   */
  addMessage(threadId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const thread = this.getThread(threadId)
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`)
    }

    const fullMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now()
    }

    thread.messages.push(fullMessage)
    thread.updatedAt = Date.now()

    // Update title from first user message if still default
    if (thread.title === 'New Chat' && message.role === 'user' && message.content) {
      thread.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
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

    // Store feedback on the message
    ;(message as any).feedback = feedback
    thread.updatedAt = Date.now()
    this.save()
    
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

