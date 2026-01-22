/**
 * Sentry for Renderer Process (Browser)
 * 
 * Uses @sentry/electron/renderer for proper Electron renderer support.
 * Shares the same DSN as main process and VS Code extension.
 */

import * as Sentry from '@sentry/electron/renderer'

// Same DSN as main process and VS Code extension
const SENTRY_DSN = 'https://982b270aa75b24be5d77786b58929121@o1319003.ingest.us.sentry.io/4510695985774592'

let isInitialized = false

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

/**
 * Initialize Sentry for the renderer process
 * Call this in renderer/src/main.tsx
 */
export function initSentryRenderer(): void {
  if (isInitialized) return

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Integrations for browser context
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      
      // Sample rates
      tracesSampleRate: 0.1,
      
      // Don't send PII
      sendDefaultPii: false,
    })

    isInitialized = true
    console.log('[Sentry Renderer] ✅ Initialized')
  } catch (error) {
    console.debug('[Sentry Renderer] Failed to initialize:', error)
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: ErrorSeverity = 'info'
): void {
  if (!isInitialized) return

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Capture an error
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
  severity: ErrorSeverity = 'error'
): string | undefined {
  if (!isInitialized) {
    console.error('[Error]', error.message, context)
    return undefined
  }

  return Sentry.captureException(error, {
    level: severity,
    extra: context,
  })
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: ErrorSeverity = 'info',
  context?: Record<string, unknown>
): string | undefined {
  if (!isInitialized) {
    console.log(`[${level}]`, message, context)
    return undefined
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  })
}

// ============================================================
// RENDERER-SPECIFIC BREADCRUMB FUNCTIONS
// ============================================================

/**
 * Track user action in UI
 */
export function trackUserAction(action: string, target?: string, value?: unknown): void {
  addBreadcrumb(
    `User Action: ${action}${target ? ` on ${target}` : ''}`,
    'user.action',
    { action, target, value }
  )
}

/**
 * Track user chat message
 */
export function trackUserMessage(
  messageLength: number,
  hasImages: boolean = false,
  hasAttachments: boolean = false,
  isNewTask: boolean = false
): void {
  addBreadcrumb(
    `User Message: ${messageLength} chars${hasImages ? ' +images' : ''}${hasAttachments ? ' +files' : ''}`,
    'user.chat',
    { messageLength, hasImages, hasAttachments, isNewTask }
  )
}

/**
 * Track user feedback
 */
export function trackUserFeedback(
  feedbackType: 'accept' | 'reject' | 'edit' | 'retry',
  context?: string
): void {
  addBreadcrumb(
    `User Feedback: ${feedbackType}`,
    'user.feedback',
    { feedbackType, context }
  )
}

/**
 * Track navigation
 */
export function trackNavigation(from: string, to: string, trigger?: string): void {
  addBreadcrumb(
    `Navigation: ${from} → ${to}`,
    'navigation',
    { from, to, trigger }
  )
}

/**
 * Track settings change
 */
export function trackSettingsChange(setting: string, changed: boolean = true): void {
  addBreadcrumb(
    `Settings Changed: ${setting}`,
    'user.settings',
    { setting, changed }
  )
}

/**
 * Track editor operations
 */
export function trackEditorOperation(
  operation: 'open' | 'close' | 'save' | 'change' | 'format' | 'find' | 'replace',
  filePath?: string,
  details?: { language?: string; linesChanged?: number }
): void {
  addBreadcrumb(
    `Editor: ${operation}${filePath ? ` - ${filePath.split('/').pop()}` : ''}`,
    'editor.operation',
    { operation, filePath, ...details }
  )
}

/**
 * Track slow operation
 */
export function trackSlowOperation(
  operationName: string,
  durationMs: number,
  threshold: number = 3000,
  details?: Record<string, unknown>
): void {
  if (durationMs >= threshold) {
    addBreadcrumb(
      `[UX:SLOW] ${operationName} took ${durationMs}ms (threshold: ${threshold}ms)`,
      'performance.slow',
      { operationName, durationMs, threshold, exceededBy: durationMs - threshold, ...details },
      'warning'
    )
  }
}

/**
 * Track AI request (from renderer)
 */
export function trackAIRequest(context: {
  model: string
  messageCount: number
  hasImages?: boolean
  hasTools?: boolean
}): void {
  addBreadcrumb(
    `AI Request: ${context.model} (${context.messageCount} messages)`,
    'ai.request',
    context
  )
}

/**
 * Track AI response (from renderer)
 */
export function trackAIResponse(context: {
  model: string
  outputTokens: number
  responseTime: number
  success: boolean
}): void {
  const level: ErrorSeverity = context.success ? 'info' : 'error'
  
  addBreadcrumb(
    `AI Response: ${context.outputTokens} tokens in ${context.responseTime}ms`,
    'ai.response',
    context,
    level
  )
}

/**
 * Track file operation
 */
export function trackFileOperation(
  operation: 'read' | 'write' | 'delete' | 'create' | 'rename',
  filePath: string,
  success: boolean
): void {
  const level: ErrorSeverity = success ? 'info' : 'warning'
  
  addBreadcrumb(
    `File ${operation}: ${filePath.split('/').pop() || filePath}`,
    'file.operation',
    { operation, filePath, success },
    level
  )
}

/**
 * Track panel toggle
 */
export function trackPanelToggle(panel: string, visible: boolean): void {
  addBreadcrumb(
    `Panel ${visible ? 'Opened' : 'Closed'}: ${panel}`,
    'navigation',
    { panel, visible }
  )
}

/**
 * Track theme change
 */
export function trackThemeChange(theme: string): void {
  addBreadcrumb(
    `Theme Changed: ${theme}`,
    'user.settings',
    { setting: 'theme', value: theme }
  )
}

// Export Sentry for direct access if needed
export { Sentry }
