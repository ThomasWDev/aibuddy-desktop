import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Source-level test reads files as strings (no runtime import needed).
// Shared utilities live in: from '../../renderer/src/utils/share-formatting'

// ---------------------------------------------------------------------------
// KAN-279: [Mac][Feature] Share Conversation Modal Should Support Direct
//          Text Sharing to Social Media Platforms
//
// Root cause: ShareModal only has Copy Text / Copy Markdown / Export File.
// No buttons to share directly to social media platforms. Users must
// manually copy text and then navigate to each platform.
//
// Fix: Add social media share buttons (X, LinkedIn, Reddit, Facebook,
// WhatsApp) that open the platform's share URL with a conversation
// snippet pre-filled. Add formatAsShareSnippet() utility for the
// preview text. Use window.open() for desktop compatibility.
// ---------------------------------------------------------------------------

const SHARE_MODAL_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/components/ShareModal.tsx'),
  'utf-8'
)

const SHARE_UTILS_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/utils/share-formatting.ts'),
  'utf-8'
)

describe('KAN-279: Social media sharing in Share Conversation modal', () => {

  // ==========================================================================
  // 1. share-formatting.ts must export a formatAsShareSnippet function
  // ==========================================================================
  describe('share snippet utility', () => {
    it('must export formatAsShareSnippet function', () => {
      expect(SHARE_UTILS_SOURCE).toMatch(/export\s+function\s+formatAsShareSnippet/)
    })

    it('must include AIBuddy branding in snippet', () => {
      expect(SHARE_UTILS_SOURCE).toMatch(/AIBuddy/)
    })

    it('must truncate long conversations for social media', () => {
      expect(SHARE_UTILS_SOURCE).toMatch(/substring|slice|truncat/i)
    })
  })

  // ==========================================================================
  // 2. ShareModal must have social media share buttons
  // ==========================================================================
  describe('social media buttons in modal', () => {
    it('must have X (Twitter) share button', () => {
      expect(SHARE_MODAL_SOURCE).toMatch(/twitter\.com\/intent|x\.com\/intent/)
    })

    it('must have LinkedIn share button', () => {
      expect(SHARE_MODAL_SOURCE).toMatch(/linkedin\.com/)
    })

    it('must have Reddit share button', () => {
      expect(SHARE_MODAL_SOURCE).toMatch(/reddit\.com/)
    })

    it('must have Facebook share button', () => {
      expect(SHARE_MODAL_SOURCE).toMatch(/facebook\.com/)
    })

    it('must have WhatsApp share button', () => {
      expect(SHARE_MODAL_SOURCE).toMatch(/whatsapp/)
    })
  })

  // ==========================================================================
  // 3. Share buttons must use window.open for Electron compatibility
  // ==========================================================================
  describe('sharing mechanism', () => {
    it('must use window.open or shell.openExternal for share links', () => {
      expect(SHARE_MODAL_SOURCE).toMatch(/window\.open|shell\.openExternal|openExternal/)
    })

    it('must use encodeURIComponent for share text', () => {
      expect(SHARE_MODAL_SOURCE).toContain('encodeURIComponent')
    })
  })

  // ==========================================================================
  // 4. ShareModal must import formatAsShareSnippet
  // ==========================================================================
  describe('integration', () => {
    it('ShareModal must import formatAsShareSnippet', () => {
      expect(SHARE_MODAL_SOURCE).toContain('formatAsShareSnippet')
    })
  })

  // ==========================================================================
  // 5. Regression guards — existing functionality preserved
  // ==========================================================================
  describe('regression guards', () => {
    it('must still have Copy as Text button', () => {
      expect(SHARE_MODAL_SOURCE).toContain('Copy as Text')
    })

    it('must still have Copy as Markdown button', () => {
      expect(SHARE_MODAL_SOURCE).toContain('Copy as Markdown')
    })

    it('must still have Export as File button', () => {
      expect(SHARE_MODAL_SOURCE).toContain('Export as File')
    })

    it('must still handle Escape key', () => {
      expect(SHARE_MODAL_SOURCE).toContain('Escape')
    })

    it('share-formatting must still export formatAsText', () => {
      expect(SHARE_UTILS_SOURCE).toMatch(/export\s+function\s+formatAsText/)
    })

    it('share-formatting must still export formatAsMarkdown', () => {
      expect(SHARE_UTILS_SOURCE).toMatch(/export\s+function\s+formatAsMarkdown/)
    })
  })
})
