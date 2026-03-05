import React, { useState, useEffect, useCallback } from 'react'
import { X, Copy, Check, FileText, MessageSquare, Download } from 'lucide-react'
import { formatAsText, formatAsMarkdown, formatAsShareSnippet, sanitizeFilename, type ShareMessage } from '../utils/share-formatting'

/**
 * Share Conversation Modal - KAN-18 FIX
 * 
 * Provides functional options to share/export conversations:
 * - Copy conversation as formatted text to clipboard
 * - Export as Markdown file (download)
 * - Export as JSON file (download)
 * 
 * KAN-18 ROOT CAUSE: Previous implementation generated a fake URL (https://aibuddy.life/share/...)
 * that had no backend to serve it. Users clicked "Create share link" and got a URL that didn't work.
 * 
 * FIX: Removed non-functional web link generation. Made clipboard copy and file export
 * the primary actions since they actually work without backend infrastructure.
 * Web link sharing will be added when the backend API endpoint is implemented.
 * 
 * NOTE: Formatting logic lives in utils/share-formatting.ts (pure functions).
 * Tests import from there directly — NEVER duplicate code.
 */

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  threadId: string
  threadTitle?: string
  messageCount: number
  messages?: ShareMessage[]
}

export function ShareModal({ isOpen, onClose, threadId, threadTitle, messageCount, messages }: ShareModalProps) {
  const [isTextCopied, setIsTextCopied] = useState(false)
  const [isMdCopied, setIsMdCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsTextCopied(false)
      setIsMdCopied(false)
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

  // Format functions delegate to pure utilities in utils/share-formatting.ts
  const getTextOutput = useCallback((): string => {
    return formatAsText(messages || [], threadTitle)
  }, [messages, threadTitle])

  const getMarkdownOutput = useCallback((): string => {
    return formatAsMarkdown(messages || [], threadTitle, messageCount)
  }, [messages, threadTitle, messageCount])

  // KAN-97 FIX: Copy with Electron clipboard fallback
  const handleCopyText = useCallback(async () => {
    if (!messages || messages.length === 0) {
      setError('No conversation to copy')
      return
    }

    const text = getTextOutput()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      try {
        await (window as any).electronAPI?.clipboard?.writeText(text)
      } catch (err) {
        console.error('Copy failed:', err)
        setError('Failed to copy conversation')
        return
      }
    }
    setIsTextCopied(true)
    setTimeout(() => setIsTextCopied(false), 2000)
  }, [messages, getTextOutput])

  // KAN-97 FIX: Copy Markdown with Electron clipboard fallback
  const handleCopyMarkdown = useCallback(async () => {
    if (!messages || messages.length === 0) {
      setError('No conversation to copy')
      return
    }

    const md = getMarkdownOutput()
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      try {
        await (window as any).electronAPI?.clipboard?.writeText(md)
      } catch (err) {
        console.error('Copy failed:', err)
        setError('Failed to copy conversation')
        return
      }
    }
    setIsMdCopied(true)
    setTimeout(() => setIsMdCopied(false), 2000)
  }, [messages, getMarkdownOutput])

  // Export as Markdown file
  const handleExportMarkdown = useCallback(async () => {
    if (!messages || messages.length === 0) {
      setError('No conversation to export')
      return
    }

    try {
      const markdown = getMarkdownOutput()
      const safeTitle = sanitizeFilename(threadTitle || '')
      const filename = `${safeTitle}-${Date.now()}.md`

      // Use Electron save dialog if available
      if (window.electronAPI?.dialog?.saveFile) {
        const filePath = await window.electronAPI.dialog.saveFile(filename)
        
        if (filePath) {
          await window.electronAPI.fs.writeFile(filePath, markdown)
          onClose()
          return
        }
        // User cancelled save dialog, don't show error
        return
      }

      // Fallback: Use browser download for web or if dialog not available
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      console.error('Export failed:', err)
      setError('Failed to export conversation')
    }
  }, [messages, threadTitle, getMarkdownOutput, onClose])

  const handleShareToSocial = useCallback((platform: string) => {
    const snippet = formatAsShareSnippet(messages || [], threadTitle)
    const text = encodeURIComponent(snippet)

    const urls: Record<string, string> = {
      twitter: `https://x.com/intent/tweet?text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?summary=${text}`,
      reddit: `https://www.reddit.com/submit?title=${encodeURIComponent(threadTitle || 'AIBuddy Conversation')}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${text}`,
      whatsapp: `https://api.whatsapp.com/send?text=${text}`,
    }

    const url = urls[platform]
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500')
    }
  }, [messages, threadTitle])

  if (!isOpen) return null

  const hasMessages = messages && messages.length > 0

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
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h2 id="share-modal-title" className="text-lg font-semibold text-white">
              Share Conversation
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
        <div className="p-6 space-y-4">
          {/* Conversation info */}
          {threadTitle && (
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-300 font-medium truncate">{threadTitle}</p>
              <p className="text-xs text-slate-500 mt-1">{messageCount} message{messageCount !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Copy as Text */}
          <button
            onClick={handleCopyText}
            disabled={!hasMessages}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              isTextCopied
                ? 'border-green-500 bg-green-500/10'
                : 'border-slate-700 hover:border-purple-500 bg-slate-800/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className={`${isTextCopied ? 'text-green-400' : 'text-purple-400'}`}>
              {isTextCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${isTextCopied ? 'text-green-400' : 'text-white'}`}>
                {isTextCopied ? 'Copied!' : 'Copy as Text'}
              </p>
              <p className="text-sm text-slate-500">Copy entire conversation to clipboard</p>
            </div>
          </button>

          {/* Copy as Markdown */}
          <button
            onClick={handleCopyMarkdown}
            disabled={!hasMessages}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              isMdCopied
                ? 'border-green-500 bg-green-500/10'
                : 'border-slate-700 hover:border-cyan-500 bg-slate-800/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className={`${isMdCopied ? 'text-green-400' : 'text-cyan-400'}`}>
              {isMdCopied ? <Check className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${isMdCopied ? 'text-green-400' : 'text-white'}`}>
                {isMdCopied ? 'Copied!' : 'Copy as Markdown'}
              </p>
              <p className="text-sm text-slate-500">Copy with formatting (headers, code blocks)</p>
            </div>
          </button>

          {/* Export as File */}
          <button
            onClick={handleExportMarkdown}
            disabled={!hasMessages}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-700 hover:border-emerald-500 bg-slate-800/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Export as File</p>
              <p className="text-sm text-slate-500">Save conversation as .md file</p>
            </div>
          </button>

          {/* Social Media Share — KAN-279 */}
          {hasMessages && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Share to Social</p>
              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => handleShareToSocial('twitter')}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-700 hover:border-sky-400 bg-slate-800/30 transition-all"
                  title="Share to X (Twitter)"
                >
                  <span className="text-lg">𝕏</span>
                  <span className="text-[10px] text-slate-400">X</span>
                </button>
                <button
                  onClick={() => handleShareToSocial('linkedin')}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-700 hover:border-blue-400 bg-slate-800/30 transition-all"
                  title="Share to LinkedIn"
                >
                  <span className="text-lg">in</span>
                  <span className="text-[10px] text-slate-400">LinkedIn</span>
                </button>
                <button
                  onClick={() => handleShareToSocial('reddit')}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-700 hover:border-orange-400 bg-slate-800/30 transition-all"
                  title="Share to Reddit"
                >
                  <span className="text-lg">📮</span>
                  <span className="text-[10px] text-slate-400">Reddit</span>
                </button>
                <button
                  onClick={() => handleShareToSocial('facebook')}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-700 hover:border-blue-500 bg-slate-800/30 transition-all"
                  title="Share to Facebook"
                >
                  <span className="text-lg">f</span>
                  <span className="text-[10px] text-slate-400">Facebook</span>
                </button>
                <button
                  onClick={() => handleShareToSocial('whatsapp')}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-700 hover:border-green-400 bg-slate-800/30 transition-all"
                  title="Share to WhatsApp"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-[10px] text-slate-400">WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareModal
