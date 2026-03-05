import React, { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY_LAST_PROMPT = 'aibuddy_nps_last_prompt'
const STORAGE_KEY_DISMISSED = 'aibuddy_nps_dismissed'
const STORAGE_KEY_INTERACTIONS = 'aibuddy_interaction_count'

const MIN_INTERACTIONS = 10
const MIN_DAYS_BETWEEN_PROMPTS = 30

export function incrementInteractionCount(): void {
  const current = parseInt(localStorage.getItem(STORAGE_KEY_INTERACTIONS) || '0', 10)
  localStorage.setItem(STORAGE_KEY_INTERACTIONS, String(current + 1))
}

export function getInteractionCount(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY_INTERACTIONS) || '0', 10)
}

export function shouldShowNps(): boolean {
  if (localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true') return false

  const count = getInteractionCount()
  if (count < MIN_INTERACTIONS) return false

  const lastPrompt = localStorage.getItem(STORAGE_KEY_LAST_PROMPT)
  if (lastPrompt) {
    const daysSince = (Date.now() - parseInt(lastPrompt, 10)) / (1000 * 60 * 60 * 24)
    if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) return false
  }

  return true
}

interface NpsPromptProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (score: number) => void
}

export function NpsPrompt({ isOpen, onClose, onSubmit }: NpsPromptProps) {
  const { t } = useTranslation()
  const [hoveredScore, setHoveredScore] = useState<number | null>(null)
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setHoveredScore(null)
      setSelectedScore(null)
      setSubmitted(false)
      localStorage.setItem(STORAGE_KEY_LAST_PROMPT, String(Date.now()))
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
    if (selectedScore === null) return
    onSubmit(selectedScore)
    setSubmitted(true)
    setTimeout(onClose, 1800)
  }, [selectedScore, onSubmit, onClose])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true')
    onClose()
  }, [onClose])

  if (!isOpen) return null

  const getScoreColor = (score: number, active: boolean) => {
    if (!active) return 'bg-slate-700/50 text-slate-400 border-slate-600/40'
    if (score <= 3) return 'bg-red-500/25 text-red-300 border-red-500/50'
    if (score <= 6) return 'bg-amber-500/25 text-amber-300 border-amber-500/50'
    return 'bg-green-500/25 text-green-300 border-green-500/50'
  }

  return (
    <div className="fixed bottom-6 right-6 z-[998] w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl bg-slate-800 border border-slate-700/60 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50">
          <h3 className="text-sm font-semibold text-white">
            {t('feedback.npsQuestion')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-8 text-center">
            <div className="text-3xl mb-2">{'\uD83D\uDE4F'}</div>
            <p className="text-white font-medium text-sm">{t('feedback.thankYou')}</p>
          </div>
        ) : (
          <>
            {/* Score buttons 0-10 */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex gap-1.5 justify-between">
                {Array.from({ length: 11 }, (_, i) => {
                  const isActive = selectedScore === i || hoveredScore === i
                  return (
                    <button
                      key={i}
                      onMouseEnter={() => setHoveredScore(i)}
                      onMouseLeave={() => setHoveredScore(null)}
                      onClick={() => setSelectedScore(i)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${getScoreColor(i, isActive)} hover:scale-110`}
                    >
                      {i}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-between mt-1.5 px-0.5">
                <span className="text-[10px] text-slate-500">{t('feedback.npsNotLikely')}</span>
                <span className="text-[10px] text-slate-500">{t('feedback.npsVeryLikely')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/50">
              <button
                onClick={handleDismiss}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t('feedback.npsDontAskAgain')}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/40 transition-colors"
                >
                  {t('feedback.npsMaybeLater')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={selectedScore === null}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('feedback.npsSubmit')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
