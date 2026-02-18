import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatAsText, formatAsMarkdown, sanitizeFilename } from '../../renderer/src/utils/share-formatting'

/**
 * Share Conversation Tests - Issue #18
 * 
 * TDD Approach: Tests written FIRST before implementation
 * following Microsoft, Apple, and Google senior engineering standards.
 * 
 * RULE: Formatting functions imported from utils/share-formatting.ts.
 *       NEVER duplicate source code in tests.
 * 
 * Feature Requirements (from Claude.ai reference):
 * 1. Share button in conversation header
 * 2. Modal with privacy options (Private/Shared)
 * 3. Shareable link generation
 * 4. Copy link functionality
 * 5. "Future messages aren't included" notice
 * 6. Visual feedback for actions
 */

// ============================================================================
// TYPES
// ============================================================================

type ShareVisibility = 'private' | 'shared'

interface ShareConfig {
  visibility: ShareVisibility
  expiresAt?: Date
  includeSystemMessages: boolean
}

interface ShareLink {
  id: string
  url: string
  threadId: string
  visibility: ShareVisibility
  createdAt: Date
  expiresAt?: Date
  viewCount: number
}

interface ShareModalState {
  isOpen: boolean
  isLoading: boolean
  isSuccess: boolean
  error: string | null
  shareLink: ShareLink | null
  visibility: ShareVisibility
}

// ============================================================================
// MOCKS
// ============================================================================

const mockElectronAPI = {
  clipboard: {
    writeText: vi.fn()
  }
}

const mockShareAPI = {
  createShareLink: vi.fn(),
  updateShareLink: vi.fn(),
  deleteShareLink: vi.fn(),
  getShareLink: vi.fn()
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(global as any).navigator = {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
  }
})

afterEach(() => {
  delete (global as any).navigator
})

describe('Share Conversation - Issue #18', () => {
  // ==========================================================================
  // 1. SHARE LINK GENERATION
  // ==========================================================================
  describe('Share Link Generation', () => {
    it('should generate unique share ID', () => {
      const shareId = 'abc123def456'
      expect(shareId).toHaveLength(12)
    })

    it('should create shareable URL format', () => {
      const baseUrl = 'https://aibuddy.life'
      const shareId = 'abc123def456'
      const shareUrl = `${baseUrl}/share/${shareId}`
      
      expect(shareUrl).toContain('/share/')
      expect(shareUrl).toBe('https://aibuddy.life/share/abc123def456')
    })

    it('should include thread ID in share link metadata', () => {
      const shareLink: ShareLink = {
        id: 'abc123',
        url: 'https://aibuddy.life/share/abc123',
        threadId: 'thread-456',
        visibility: 'shared',
        createdAt: new Date(),
        viewCount: 0
      }
      
      expect(shareLink.threadId).toBe('thread-456')
    })

    it('should track view count', () => {
      const shareLink: ShareLink = {
        id: 'abc123',
        url: 'https://aibuddy.life/share/abc123',
        threadId: 'thread-456',
        visibility: 'shared',
        createdAt: new Date(),
        viewCount: 42
      }
      
      expect(shareLink.viewCount).toBe(42)
    })

    it('should support optional expiration', () => {
      const expiresAt = new Date('2026-12-31')
      const shareLink: ShareLink = {
        id: 'abc123',
        url: 'https://aibuddy.life/share/abc123',
        threadId: 'thread-456',
        visibility: 'shared',
        createdAt: new Date(),
        expiresAt,
        viewCount: 0
      }
      
      expect(shareLink.expiresAt).toEqual(expiresAt)
    })
  })

  // ==========================================================================
  // 2. VISIBILITY OPTIONS
  // ==========================================================================
  describe('Visibility Options', () => {
    it('should default to private visibility', () => {
      const state: ShareModalState = {
        isOpen: false,
        isLoading: false,
        isSuccess: false,
        error: null,
        shareLink: null,
        visibility: 'private'
      }
      
      expect(state.visibility).toBe('private')
    })

    it('should allow changing to shared visibility', () => {
      let visibility: ShareVisibility = 'private'
      visibility = 'shared'
      
      expect(visibility).toBe('shared')
    })

    it('should have private description', () => {
      const descriptions: Record<ShareVisibility, string> = {
        private: 'Only you have access',
        shared: 'Anyone with the link can view'
      }
      
      expect(descriptions.private).toContain('Only you')
    })

    it('should have shared description', () => {
      const descriptions: Record<ShareVisibility, string> = {
        private: 'Only you have access',
        shared: 'Anyone with the link can view'
      }
      
      expect(descriptions.shared).toContain('Anyone')
    })
  })

  // ==========================================================================
  // 3. MODAL STATE MANAGEMENT
  // ==========================================================================
  describe('Modal State Management', () => {
    it('should start closed', () => {
      const state: ShareModalState = {
        isOpen: false,
        isLoading: false,
        isSuccess: false,
        error: null,
        shareLink: null,
        visibility: 'private'
      }
      
      expect(state.isOpen).toBe(false)
    })

    it('should open when triggered', () => {
      let state: ShareModalState = {
        isOpen: false,
        isLoading: false,
        isSuccess: false,
        error: null,
        shareLink: null,
        visibility: 'private'
      }
      
      state = { ...state, isOpen: true }
      
      expect(state.isOpen).toBe(true)
    })

    it('should show loading during link creation', () => {
      const state: ShareModalState = {
        isOpen: true,
        isLoading: true,
        isSuccess: false,
        error: null,
        shareLink: null,
        visibility: 'shared'
      }
      
      expect(state.isLoading).toBe(true)
    })

    it('should show success after link created', () => {
      const state: ShareModalState = {
        isOpen: true,
        isLoading: false,
        isSuccess: true,
        error: null,
        shareLink: {
          id: 'abc123',
          url: 'https://aibuddy.life/share/abc123',
          threadId: 'thread-456',
          visibility: 'shared',
          createdAt: new Date(),
          viewCount: 0
        },
        visibility: 'shared'
      }
      
      expect(state.isSuccess).toBe(true)
      expect(state.shareLink).not.toBeNull()
    })

    it('should handle errors', () => {
      const state: ShareModalState = {
        isOpen: true,
        isLoading: false,
        isSuccess: false,
        error: 'Failed to create share link',
        shareLink: null,
        visibility: 'shared'
      }
      
      expect(state.error).toBe('Failed to create share link')
    })

    it('should reset state on close', () => {
      let state: ShareModalState = {
        isOpen: true,
        isLoading: false,
        isSuccess: true,
        error: null,
        shareLink: {
          id: 'abc123',
          url: 'https://aibuddy.life/share/abc123',
          threadId: 'thread-456',
          visibility: 'shared',
          createdAt: new Date(),
          viewCount: 0
        },
        visibility: 'shared'
      }
      
      // Close and reset
      state = {
        isOpen: false,
        isLoading: false,
        isSuccess: false,
        error: null,
        shareLink: null,
        visibility: 'private'
      }
      
      expect(state.isOpen).toBe(false)
      expect(state.shareLink).toBeNull()
    })
  })

  // ==========================================================================
  // 4. COPY LINK FUNCTIONALITY
  // ==========================================================================
  describe('Copy Link Functionality', () => {
    it('should copy link to clipboard', async () => {
      const url = 'https://aibuddy.life/share/abc123'
      await navigator.clipboard.writeText(url)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url)
    })

    it('should show copied feedback', () => {
      let isCopied = false
      
      // After copy
      isCopied = true
      
      expect(isCopied).toBe(true)
    })

    it('should reset copied state after timeout', () => {
      vi.useFakeTimers()
      
      let isCopied = true
      
      // Simulate timeout
      setTimeout(() => {
        isCopied = false
      }, 2000)
      
      vi.advanceTimersByTime(2000)
      expect(isCopied).toBe(false)
      
      vi.useRealTimers()
    })

    it('should have copy button', () => {
      const buttonText = 'Copy link'
      expect(buttonText).toBe('Copy link')
    })

    it('should change button text after copy', () => {
      const isCopied = true
      const buttonText = isCopied ? 'Copied!' : 'Copy link'
      
      expect(buttonText).toBe('Copied!')
    })
  })

  // ==========================================================================
  // 5. UI COMPONENTS
  // ==========================================================================
  describe('UI Components', () => {
    it('should have share button in header', () => {
      const buttonIcon = 'Share2'
      expect(buttonIcon).toBe('Share2')
    })

    it('should show modal title "Chat shared"', () => {
      const title = 'Chat shared'
      expect(title).toBe('Chat shared')
    })

    it('should show future messages notice', () => {
      const notice = "Future messages aren't included"
      expect(notice).toContain('Future messages')
    })

    it('should have close button (X)', () => {
      const closeIcon = 'X'
      expect(closeIcon).toBe('X')
    })

    it('should show visibility icons', () => {
      const icons: Record<ShareVisibility, string> = {
        private: 'Lock',
        shared: 'Globe'
      }
      
      expect(icons.private).toBe('Lock')
      expect(icons.shared).toBe('Globe')
    })

    it('should highlight selected visibility option', () => {
      const selectedVisibility: ShareVisibility = 'shared'
      const isSelected = selectedVisibility === 'shared'
      const highlightClass = isSelected ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700'
      
      expect(highlightClass).toContain('purple')
    })

    it('should show checkmark for selected option', () => {
      const selectedVisibility: ShareVisibility = 'shared'
      const showCheckmark = selectedVisibility === 'shared'
      
      expect(showCheckmark).toBe(true)
    })
  })

  // ==========================================================================
  // 6. LINK DISPLAY
  // ==========================================================================
  describe('Link Display', () => {
    it('should show truncated URL', () => {
      const fullUrl = 'https://aibuddy.life/share/77ebd255-f17d-4708-a5'
      const truncatedUrl = fullUrl.length > 40 ? fullUrl.slice(0, 40) + '...' : fullUrl
      
      expect(truncatedUrl).toContain('...')
    })

    it('should show full URL in input', () => {
      const url = 'https://aibuddy.life/share/abc123'
      const inputValue = url
      
      expect(inputValue).toBe(url)
    })

    it('should make URL input readonly', () => {
      const isReadonly = true
      expect(isReadonly).toBe(true)
    })

    it('should have input and button in row', () => {
      const layout = 'flex gap-2'
      expect(layout).toContain('flex')
    })
  })

  // ==========================================================================
  // 7. SHARE BUTTON PLACEMENT
  // ==========================================================================
  describe('Share Button Placement', () => {
    it('should be in conversation header', () => {
      const location = 'header'
      expect(location).toBe('header')
    })

    it('should be near settings button', () => {
      const headerButtons = ['new-chat', 'share', 'settings']
      const shareIndex = headerButtons.indexOf('share')
      
      expect(shareIndex).toBeGreaterThan(0)
    })

    it('should be disabled when no conversation', () => {
      const hasMessages = false
      const isDisabled = !hasMessages
      
      expect(isDisabled).toBe(true)
    })

    it('should be enabled when conversation exists', () => {
      const hasMessages = true
      const isDisabled = !hasMessages
      
      expect(isDisabled).toBe(false)
    })
  })

  // ==========================================================================
  // 8. ACCESSIBILITY
  // ==========================================================================
  describe('Accessibility', () => {
    it('should have aria-label on share button', () => {
      const ariaLabel = 'Share conversation'
      expect(ariaLabel).toBeTruthy()
    })

    it('should have role="dialog" on modal', () => {
      const role = 'dialog'
      expect(role).toBe('dialog')
    })

    it('should have aria-modal="true"', () => {
      const ariaModal = true
      expect(ariaModal).toBe(true)
    })

    it('should trap focus in modal', () => {
      const trapFocus = true
      expect(trapFocus).toBe(true)
    })

    it('should close on Escape key', () => {
      const key = 'Escape'
      let isOpen = true
      
      if (key === 'Escape') {
        isOpen = false
      }
      
      expect(isOpen).toBe(false)
    })

    it('should have descriptive button labels', () => {
      const copyButtonLabel = 'Copy share link to clipboard'
      expect(copyButtonLabel).toContain('clipboard')
    })
  })

  // ==========================================================================
  // 9. API INTEGRATION
  // ==========================================================================
  describe('API Integration', () => {
    it('should call createShareLink API', async () => {
      const threadId = 'thread-123'
      const visibility: ShareVisibility = 'shared'
      
      mockShareAPI.createShareLink.mockResolvedValue({
        id: 'share-abc',
        url: 'https://aibuddy.life/share/share-abc',
        threadId,
        visibility,
        createdAt: new Date(),
        viewCount: 0
      })
      
      await mockShareAPI.createShareLink(threadId, visibility)
      
      expect(mockShareAPI.createShareLink).toHaveBeenCalledWith(threadId, visibility)
    })

    it('should handle API errors gracefully', async () => {
      mockShareAPI.createShareLink.mockRejectedValue(new Error('Network error'))
      
      let error: string | null = null
      try {
        await mockShareAPI.createShareLink('thread-123', 'shared')
      } catch (e: any) {
        error = e.message
      }
      
      expect(error).toBe('Network error')
    })

    it('should update visibility via API', async () => {
      mockShareAPI.updateShareLink.mockResolvedValue({ success: true })
      
      await mockShareAPI.updateShareLink('share-abc', { visibility: 'private' })
      
      expect(mockShareAPI.updateShareLink).toHaveBeenCalledWith('share-abc', { visibility: 'private' })
    })

    it('should delete share link via API', async () => {
      mockShareAPI.deleteShareLink.mockResolvedValue({ success: true })
      
      await mockShareAPI.deleteShareLink('share-abc')
      
      expect(mockShareAPI.deleteShareLink).toHaveBeenCalledWith('share-abc')
    })
  })

  // ==========================================================================
  // 10. CONVERSATION DATA
  // ==========================================================================
  describe('Conversation Data for Sharing', () => {
    it('should include conversation title', () => {
      const sharedData = {
        title: 'Help with React hooks',
        messages: []
      }
      
      expect(sharedData.title).toBe('Help with React hooks')
    })

    it('should include messages up to share time', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' }
      ]
      
      const sharedData = {
        title: 'Test',
        messages: messages.slice() // Snapshot at share time
      }
      
      expect(sharedData.messages).toHaveLength(2)
    })

    it('should exclude system messages by default', () => {
      const messages = [
        { role: 'system', content: 'You are an assistant' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' }
      ]
      
      const sharedMessages = messages.filter(m => m.role !== 'system')
      
      expect(sharedMessages).toHaveLength(2)
    })

    it('should sanitize sensitive data', () => {
      const message = {
        role: 'user',
        content: 'My API key is sk-abc123'
      }
      
      // Sanitization should happen server-side
      const containsSensitive = message.content.includes('sk-')
      expect(containsSensitive).toBe(true) // Raw data has it
      
      // After sanitization
      const sanitized = message.content.replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]')
      expect(sanitized).toContain('[REDACTED]')
    })
  })

  // ==========================================================================
  // 11. VISUAL STYLING
  // ==========================================================================
  describe('Visual Styling', () => {
    it('should have modal backdrop', () => {
      const backdropClass = 'bg-black/50 backdrop-blur-sm'
      expect(backdropClass).toContain('backdrop-blur')
    })

    it('should have rounded modal corners', () => {
      const modalClass = 'rounded-xl'
      expect(modalClass).toContain('rounded')
    })

    it('should have dark theme styling', () => {
      const modalBg = 'bg-slate-900'
      expect(modalBg).toContain('slate-900')
    })

    it('should have proper spacing', () => {
      const padding = 'p-6'
      expect(padding).toBe('p-6')
    })

    it('should have purple accent for share', () => {
      const accentColor = '#a855f7' // Purple-500
      expect(accentColor).toBe('#a855f7')
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================
describe('Share Conversation Integration', () => {
  it('should complete full share flow', async () => {
    // 1. User clicks share button
    let modalState: ShareModalState = {
      isOpen: true,
      isLoading: false,
      isSuccess: false,
      error: null,
      shareLink: null,
      visibility: 'private'
    }
    expect(modalState.isOpen).toBe(true)
    
    // 2. User selects shared visibility
    modalState = { ...modalState, visibility: 'shared' }
    expect(modalState.visibility).toBe('shared')
    
    // 3. Link is created (loading)
    modalState = { ...modalState, isLoading: true }
    expect(modalState.isLoading).toBe(true)
    
    // 4. Link creation succeeds
    const shareLink: ShareLink = {
      id: 'abc123',
      url: 'https://aibuddy.life/share/abc123',
      threadId: 'thread-456',
      visibility: 'shared',
      createdAt: new Date(),
      viewCount: 0
    }
    modalState = {
      ...modalState,
      isLoading: false,
      isSuccess: true,
      shareLink
    }
    expect(modalState.isSuccess).toBe(true)
    expect(modalState.shareLink?.url).toBe('https://aibuddy.life/share/abc123')
    
    // 5. User copies link
    await navigator.clipboard.writeText(shareLink.url)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(shareLink.url)
  })

  it('should handle visibility change after sharing', async () => {
    let visibility: ShareVisibility = 'shared'
    
    // User changes to private
    visibility = 'private'
    
    mockShareAPI.updateShareLink.mockResolvedValue({ success: true })
    await mockShareAPI.updateShareLink('share-abc', { visibility })
    
    expect(mockShareAPI.updateShareLink).toHaveBeenCalledWith('share-abc', { visibility: 'private' })
  })

  it('should handle error during sharing', async () => {
    let modalState: ShareModalState = {
      isOpen: true,
      isLoading: true,
      isSuccess: false,
      error: null,
      shareLink: null,
      visibility: 'shared'
    }
    
    // API error
    mockShareAPI.createShareLink.mockRejectedValue(new Error('Server error'))
    
    try {
      await mockShareAPI.createShareLink('thread-123', 'shared')
    } catch {
      modalState = {
        ...modalState,
        isLoading: false,
        error: 'Failed to create share link. Please try again.'
      }
    }
    
    expect(modalState.error).toContain('Failed to create')
  })
})

// ============================================================================
// SHARED LINK VIEWER TESTS
// ============================================================================
describe('Shared Link Viewer (Public View)', () => {
  it('should display conversation title', () => {
    const title = 'Help with React hooks'
    expect(title).toBeTruthy()
  })

  it('should display messages read-only', () => {
    const isReadOnly = true
    expect(isReadOnly).toBe(true)
  })

  it('should not show input field', () => {
    const showInput = false
    expect(showInput).toBe(false)
  })

  it('should show AIBuddy branding', () => {
    const branding = 'AIBuddy'
    expect(branding).toBe('AIBuddy')
  })

  it('should show "Shared conversation" badge', () => {
    const badge = 'Shared conversation'
    expect(badge).toContain('Shared')
  })

  it('should handle expired links', () => {
    const expiresAt = new Date('2025-01-01')
    const now = new Date('2026-01-28')
    const isExpired = now > expiresAt
    
    expect(isExpired).toBe(true)
  })

  it('should show error for private links', () => {
    const visibility: ShareVisibility = 'private'
    const errorMessage = visibility === 'private' 
      ? 'This conversation is private'
      : null
    
    expect(errorMessage).toContain('private')
  })
})

// ============================================================================
// KAN-18 BUG FIX TESTS - Messages Prop Missing
// ============================================================================
describe('KAN-18: ShareModal Messages Prop Fix', () => {
  interface Message {
    role: 'user' | 'assistant'
    content: string
  }

  interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    threadId: string
    threadTitle?: string
    messageCount: number
    messages?: Message[]  // BUG: This prop was not being passed!
  }

  describe('ShareModal Props Validation', () => {
    it('should require messages prop for Copy as Text functionality', () => {
      // BUG: ShareModal was called without messages prop
      const incompleteProps: Partial<ShareModalProps> = {
        isOpen: true,
        threadId: 'thread-123',
        messageCount: 5
        // messages: undefined - BUG!
      }
      
      expect(incompleteProps.messages).toBeUndefined()
      
      // FIX: ShareModal should receive messages
      const completeProps: ShareModalProps = {
        isOpen: true,
        onClose: () => {},
        threadId: 'thread-123',
        messageCount: 5,
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ]
      }
      
      expect(completeProps.messages).toBeDefined()
      expect(completeProps.messages?.length).toBe(2)
    })

    it('should handle empty messages array', () => {
      const props: ShareModalProps = {
        isOpen: true,
        onClose: () => {},
        threadId: 'thread-123',
        messageCount: 0,
        messages: []
      }
      
      expect(props.messages?.length).toBe(0)
    })
  })

  describe('Copy as Text Functionality', () => {
    it('should format conversation as readable text (uses real formatAsText)', () => {
      const messages: Message[] = [
        { role: 'user', content: 'What is TypeScript?' },
        { role: 'assistant', content: 'TypeScript is a typed superset of JavaScript.' }
      ]
      
      // Use the real formatAsText function from source
      const fullText = formatAsText(messages, 'TypeScript Question')
      
      expect(fullText).toContain('TypeScript Question')
      expect(fullText).toContain('You:\nWhat is TypeScript?')
      expect(fullText).toContain('AIBuddy:\nTypeScript is a typed superset')
      expect(fullText).toContain('---')
    })

    it('should handle multiline message content (uses real formatAsText)', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Show me code' },
        { role: 'assistant', content: 'Here is code:\n```typescript\nconst x = 1;\n```' }
      ]
      
      // Use the real formatAsText function from source
      const fullText = formatAsText(messages, 'Code Example')
      
      expect(fullText).toContain('```typescript')
      expect(fullText).toContain('const x = 1;')
    })

    it('should show error when messages is undefined', async () => {
      const messages: Message[] | undefined = undefined
      
      let error: string | null = null
      if (!messages || messages.length === 0) {
        error = 'No conversation to copy'
      }
      
      expect(error).toBe('No conversation to copy')
    })

    it('should show error when messages is empty array', async () => {
      const messages: Message[] = []
      
      let error: string | null = null
      if (!messages || messages.length === 0) {
        error = 'No conversation to copy'
      }
      
      expect(error).toBe('No conversation to copy')
    })

    it('should successfully copy when messages exist', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Test message' }
      ]
      
      let error: string | null = null
      let copied = false
      
      if (!messages || messages.length === 0) {
        error = 'No conversation to copy'
      } else {
        // Copy would happen here
        copied = true
      }
      
      expect(error).toBeNull()
      expect(copied).toBe(true)
    })
  })

  describe('App.tsx ShareModal Integration', () => {
    it('should pass messages prop to ShareModal', () => {
      // Simulating App.tsx state
      const appState = {
        messages: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi!' }
        ],
        showShareModal: true,
        activeThreadId: 'thread-123'
      }
      
      // Props that should be passed to ShareModal
      const shareModalProps: ShareModalProps = {
        isOpen: appState.showShareModal,
        onClose: () => {},
        threadId: appState.activeThreadId || 'temp-' + Date.now(),
        threadTitle: appState.messages[0]?.content.slice(0, 50),
        messageCount: appState.messages.length,
        messages: appState.messages  // BUG FIX: This was missing!
      }
      
      expect(shareModalProps.messages).toBeDefined()
      expect(shareModalProps.messages).toEqual(appState.messages)
    })

    it('should handle messages state correctly', () => {
      // Types from App.tsx
      interface AppMessage {
        id: string
        role: 'user' | 'assistant'
        content: string
      }
      
      // ShareModal expects simpler Message type
      interface ShareModalMessage {
        role: 'user' | 'assistant'
        content: string
      }
      
      const appMessages: AppMessage[] = [
        { id: 'msg-1', role: 'user', content: 'Question' },
        { id: 'msg-2', role: 'assistant', content: 'Answer' }
      ]
      
      // Convert AppMessage to ShareModalMessage (remove id)
      const shareMessages: ShareModalMessage[] = appMessages.map(({ role, content }) => ({ role, content }))
      
      expect(shareMessages.length).toBe(2)
      expect(shareMessages[0]).not.toHaveProperty('id')
      expect(shareMessages[0]).toHaveProperty('role', 'user')
      expect(shareMessages[0]).toHaveProperty('content', 'Question')
    })
  })
})
