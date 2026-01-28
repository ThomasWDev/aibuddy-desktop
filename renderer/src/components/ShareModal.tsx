import React, { useState, useEffect, useCallback } from 'react'
import { X, Lock, Globe, Copy, Check, Loader2, Link as LinkIcon } from 'lucide-react'

/**
 * Share Conversation Modal - Issue #18
 * 
 * Provides a shareable link for conversations, similar to Claude.ai's share feature.
 * Users can choose between private and shared visibility.
 */

export type ShareVisibility = 'private' | 'shared'

export interface ShareLink {
  id: string
  url: string
  threadId: string
  visibility: ShareVisibility
  createdAt: Date
  expiresAt?: Date
  viewCount: number
}

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  threadId: string
  threadTitle?: string
  messageCount: number
}

const VISIBILITY_OPTIONS: { value: ShareVisibility; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you have access',
    icon: <Lock className="w-5 h-5" />
  },
  {
    value: 'shared',
    label: 'Shared',
    description: 'Anyone with the link can view',
    icon: <Globe className="w-5 h-5" />
  }
]

// Generate unique share ID
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function ShareModal({ isOpen, onClose, threadId, threadTitle, messageCount }: ShareModalProps) {
  const [visibility, setVisibility] = useState<ShareVisibility>('private')
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setVisibility('private')
      setShareLink(null)
      setIsLoading(false)
      setIsCopied(false)
      setError(null)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Create share link
  const handleCreateShare = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Generate local share link (in production, this would call an API)
      const shareId = generateShareId()
      const newShareLink: ShareLink = {
        id: shareId,
        url: `https://aibuddy.life/share/${shareId}`,
        threadId,
        visibility,
        createdAt: new Date(),
        viewCount: 0
      }

      // Store share link metadata locally
      try {
        const existingShares = await window.electronAPI.store.get('shareLinks') || {}
        await window.electronAPI.store.set('shareLinks', {
          ...existingShares,
          [shareId]: {
            ...newShareLink,
            createdAt: newShareLink.createdAt.toISOString()
          }
        })
      } catch (storeError) {
        console.warn('Could not persist share link:', storeError)
      }

      setShareLink(newShareLink)
    } catch (err) {
      setError('Failed to create share link. Please try again.')
      console.error('Share error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [threadId, visibility])

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return

    try {
      await navigator.clipboard.writeText(shareLink.url)
      setIsCopied(true)
      
      // Reset after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      setError('Failed to copy link')
    }
  }, [shareLink])

  // Update visibility
  const handleVisibilityChange = useCallback((newVisibility: ShareVisibility) => {
    setVisibility(newVisibility)
    
    // If link already exists, update it
    if (shareLink) {
      setShareLink({ ...shareLink, visibility: newVisibility })
      
      // Update stored link
      try {
        window.electronAPI.store.get('shareLinks').then((existingShares: Record<string, any>) => {
          if (existingShares && existingShares[shareLink.id]) {
            window.electronAPI.store.set('shareLinks', {
              ...existingShares,
              [shareLink.id]: {
                ...existingShares[shareLink.id],
                visibility: newVisibility
              }
            })
          }
        })
      } catch (err) {
        console.warn('Could not update share link visibility:', err)
      }
    }
  }, [shareLink])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-md mx-4 bg-slate-900 rounded-xl shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-purple-400" />
            <h2 id="share-modal-title" className="text-lg font-semibold text-white">
              {shareLink ? 'Chat shared' : 'Share conversation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close share modal"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Notice */}
          <p className="text-sm text-slate-400">
            Future messages aren't included
          </p>

          {/* Conversation info */}
          {threadTitle && (
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-300 font-medium truncate">{threadTitle}</p>
              <p className="text-xs text-slate-500 mt-1">{messageCount} message{messageCount !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Visibility options */}
          <div className="space-y-3">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleVisibilityChange(option.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  visibility === option.value
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                }`}
                aria-pressed={visibility === option.value}
              >
                <div className={`${visibility === option.value ? 'text-purple-400' : 'text-slate-400'}`}>
                  {option.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${visibility === option.value ? 'text-white' : 'text-slate-300'}`}>
                    {option.label}
                  </p>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </div>
                {visibility === option.value && (
                  <Check className="w-5 h-5 text-purple-400" />
                )}
              </button>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Share link display */}
          {shareLink && (
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink.url}
                readOnly
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 truncate"
                aria-label="Share link URL"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isCopied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
                aria-label="Copy share link to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy link
                  </>
                )}
              </button>
            </div>
          )}

          {/* Create share button */}
          {!shareLink && (
            <button
              onClick={handleCreateShare}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating link...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  Create share link
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareModal
