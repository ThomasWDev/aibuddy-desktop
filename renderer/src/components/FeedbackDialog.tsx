import React, { useState, useEffect, useCallback } from 'react'
import { X, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface FeedbackPayload {
  messageId: string
  category: string | null
  comment: string
  timestamp: string
}

interface FeedbackDialogProps {
  isOpen: boolean
  messageId: string | null
  onClose: () => void
  onSubmit: (payload: FeedbackPayload) => void
}

const FEEDBACK_CATEGORIES = [
  { key: 'wrongAnswer', icon: '\u274C' },
  { key: 'tooSlow', icon: '\u23F3' },
  { key: 'didntUnderstand', icon: '\u2753' },
  { key: 'other', icon: '\uD83D\uDCAC' },
] as const

export function FeedbackDialog({ isOpen, messageId, onClose, onSubmit }: FeedbackDialogProps) {
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(null)
      setComment('')
      setSubmitted(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSubmit = useCallback(() => {
    if (!messageId) return
    onSubmit({
      messageId,
      category: selectedCategory,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
    })
    setSubmitted(true)
    setTimeout(onClose, 1500)
  }, [messageId, selectedCategory, comment, onSubmit, onClose])

  if (!isOpen || !messageId) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md mx-4 rounded-2xl bg-slate-800 border border-slate-700/60 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h3 className="text-base font-semibold text-white">
            {t('feedback.whatWentWrong')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-10 text-center">
            <div className="text-4xl mb-3">{'\uD83D\uDE4F'}</div>
            <p className="text-white font-medium">{t('feedback.thankYou')}</p>
          </div>
        ) : (
          <>
            {/* Category grid */}
            <div className="px-5 pt-4 pb-2">
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_CATEGORIES.map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(prev => prev === key ? null : key)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      selectedCategory === key
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 ring-1 ring-red-500/20'
                        : 'bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700/60 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{icon}</span>
                    <span className="truncate">{t(`feedback.${key}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Comment box */}
            <div className="px-5 pb-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('feedback.additionalComments')}
                rows={3}
                className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-slate-700/40 border border-slate-600/40 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-700/50">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/40 transition-colors"
              >
                {t('feedback.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedCategory && !comment.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {t('feedback.submitFeedback')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
