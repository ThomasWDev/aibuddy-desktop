/**
 * Chat History Types
 * 
 * Types for storing and managing chat conversation history.
 * Similar to Cursor's chat threads feature.
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  images?: {
    id: string
    base64: string
    mimeType: string
    name: string
  }[]
}

export interface ChatThread {
  /** Unique thread ID */
  id: string
  /** Thread title (auto-generated from first message or user-defined) */
  title: string
  /** When the thread was created */
  createdAt: number
  /** When the thread was last updated */
  updatedAt: number
  /** All messages in this thread */
  messages: ChatMessage[]
  /** Workspace path associated with this thread */
  workspacePath?: string
  /** Total tokens used in this thread */
  totalTokensIn?: number
  totalTokensOut?: number
  /** Total cost of this thread */
  totalCost?: number
  /** Model used for this thread */
  model?: string
  /** Is this thread completed/archived */
  isCompleted?: boolean
}

export interface ChatHistoryState {
  /** All chat threads */
  threads: ChatThread[]
  /** Currently active thread ID */
  activeThreadId: string | null
  /** Version for migrations */
  version: number
}

export const HISTORY_VERSION = 1

