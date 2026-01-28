import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Info, ExternalLink, Loader2 } from 'lucide-react'

/**
 * Usage Limits Panel - Issue #19
 * 
 * Displays usage limits similar to Claude.ai's interface:
 * - Current session usage
 * - Weekly limits with reset times
 * - Model-specific limits
 * - Last updated timestamp
 */

export interface UsageLimit {
  name: string
  used: number
  limit: number
  resetTime?: Date
  description?: string
}

interface UsageLimitsPanelProps {
  /** Current credit balance */
  credits?: number
  /** Session message count */
  sessionMessages?: number
  /** Whether to show as compact version */
  compact?: boolean
  /** Custom class name */
  className?: string
}

// Color thresholds for progress bar
const COLOR_THRESHOLDS = {
  low: 50,
  medium: 75,
  high: 90
}

function calculatePercentage(used: number, limit: number): number {
  if (limit === 0) return 0
  return Math.round((used / limit) * 100)
}

function getProgressColor(percentage: number): string {
  if (percentage >= COLOR_THRESHOLDS.high) return '#ef4444' // Red
  if (percentage >= COLOR_THRESHOLDS.medium) return '#f59e0b' // Yellow/Orange
  return '#3b82f6' // Blue
}

function formatResetTime(resetTime: Date): string {
  const now = new Date()
  const diff = resetTime.getTime() - now.getTime()
  
  if (diff <= 0) return 'Resetting...'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `Resets in ${days}d ${hours}h`
  if (hours > 0) return `Resets in ${hours}h ${minutes}m`
  return `Resets in ${minutes}m`
}

function formatLastUpdated(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 1000) return 'just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Get next Tuesday 4:59 PM for weekly reset
function getNextWeeklyReset(): Date {
  const now = new Date()
  const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7
  const nextTuesday = new Date(now)
  nextTuesday.setDate(now.getDate() + daysUntilTuesday)
  nextTuesday.setHours(16, 59, 0, 0)
  
  // If today is Tuesday and before 4:59 PM, use today
  if (now.getDay() === 2 && now.getHours() < 17) {
    nextTuesday.setDate(now.getDate())
  }
  
  return nextTuesday
}

function ProgressBar({ 
  percentage, 
  label 
}: { 
  percentage: number
  label: string
}) {
  const color = getProgressColor(percentage)
  
  return (
    <div 
      className="h-2 rounded-full bg-slate-700 overflow-hidden"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div 
        className="h-full rounded-full transition-all duration-300"
        style={{ 
          width: `${Math.min(percentage, 100)}%`,
          background: color
        }}
      />
    </div>
  )
}

export function UsageLimitsPanel({ 
  credits = 0, 
  sessionMessages = 0,
  compact = false,
  className = ''
}: UsageLimitsPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [_, setForceUpdate] = useState(0)

  // Calculate usage based on credits and messages
  const weeklyReset = getNextWeeklyReset()
  const sessionLimit = 100 // Messages per session
  const weeklyLimit = 1000 // Credits per week
  
  const currentSession: UsageLimit = {
    name: 'Current session',
    used: sessionMessages,
    limit: sessionLimit,
    description: sessionMessages === 0 ? 'Starts when a message is sent' : `${sessionMessages} messages`
  }

  const weeklyLimits: UsageLimit[] = [
    {
      name: 'All models',
      used: Math.min(credits, weeklyLimit),
      limit: weeklyLimit,
      resetTime: weeklyReset,
      description: `Resets ${weeklyReset.toLocaleDateString('en-US', { weekday: 'short' })} ${weeklyReset.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    },
    {
      name: 'Premium models',
      used: 0,
      limit: 500,
      description: sessionMessages === 0 ? "You haven't used premium models yet" : undefined
    }
  ]

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    
    // Simulate API refresh
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setLastUpdated(new Date())
    setIsLoading(false)
  }, [])

  // Update "last updated" display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate(n => n + 1)
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  if (compact) {
    const sessionPercentage = calculatePercentage(currentSession.used, currentSession.limit)
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-slate-500">Session:</span>
        <div className="w-20">
          <ProgressBar percentage={sessionPercentage} label="Session usage" />
        </div>
        <span className="text-xs text-slate-400">{sessionPercentage}%</span>
      </div>
    )
  }

  return (
    <div className={`bg-slate-900 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Your usage limits</h3>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Refresh usage data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Current Session */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium text-white">{currentSession.name}</p>
            <p className="text-xs text-slate-500">{currentSession.description}</p>
          </div>
          <span className="text-sm text-slate-400">
            {calculatePercentage(currentSession.used, currentSession.limit)}% used
          </span>
        </div>
        <ProgressBar 
          percentage={calculatePercentage(currentSession.used, currentSession.limit)}
          label={`${currentSession.name}: ${calculatePercentage(currentSession.used, currentSession.limit)}% used`}
        />
      </div>

      {/* Weekly Limits */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">Weekly limits</h4>
          <a 
            href="https://aibuddy.life/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Learn more about usage limits
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {weeklyLimits.map((limit, index) => {
          const percentage = calculatePercentage(limit.used, limit.limit)
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-300">{limit.name}</p>
                  {limit.name === 'Premium models' && (
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                <span className="text-sm text-slate-400">{percentage}% used</span>
              </div>
              
              <ProgressBar 
                percentage={percentage}
                label={`${limit.name}: ${percentage}% used`}
              />
              
              {limit.description && (
                <p className="text-xs text-slate-500">
                  {limit.resetTime ? formatResetTime(limit.resetTime) : limit.description}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-800/50 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Last updated: {formatLastUpdated(lastUpdated)}
        </p>
        {isLoading && (
          <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
        )}
      </div>
    </div>
  )
}

export default UsageLimitsPanel
