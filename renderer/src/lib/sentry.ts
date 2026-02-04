/**
 * Sentry for Renderer Process (Browser)
 * 
 * Uses a lightweight HTTP-based approach instead of @sentry/electron/renderer
 * to avoid native module issues with Electron's asar packaging.
 * Shares the same DSN as main process and VS Code extension.
 */

// Same DSN as main process and VS Code extension
const SENTRY_DSN = 'https://982b270aa75b24be5d77786b58929121@o1319003.ingest.us.sentry.io/4510695985774592'

// Parse DSN to get project details
function parseDSN(dsn: string): { publicKey: string; host: string; projectId: string } | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const host = url.host
    const projectId = url.pathname.replace('/', '')
    return { publicKey, host, projectId }
  } catch {
    return null
  }
}

const dsnParts = parseDSN(SENTRY_DSN)

let isInitialized = false
let breadcrumbs: Array<{
  message: string
  category: string
  data?: Record<string, unknown>
  level: string
  timestamp: number
}> = []

const MAX_BREADCRUMBS = 100

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

/**
 * Send event to Sentry via HTTP
 */
async function sendToSentry(event: Record<string, unknown>): Promise<void> {
  if (!dsnParts) return

  const url = `https://${dsnParts.host}/api/${dsnParts.projectId}/store/?sentry_key=${dsnParts.publicKey}&sentry_version=7`
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        platform: 'javascript',
        sdk: { name: 'aibuddy-desktop-renderer', version: '1.0.0' },
        environment: 'production',
        breadcrumbs: breadcrumbs.slice(-50),
        timestamp: Date.now() / 1000,
      }),
    })
  } catch (error) {
    console.debug('[Sentry Renderer] Failed to send event:', error)
  }
}

/**
 * Initialize Sentry for the renderer process
 * Call this in renderer/src/main.tsx
 */
export function initSentryRenderer(): void {
  if (isInitialized) return

  if (!dsnParts) {
    console.debug('[Sentry Renderer] DSN not configured')
    return
  }

  isInitialized = true
  console.log('[Sentry Renderer] ✅ Initialized')
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
  const breadcrumb = {
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  }
  
  breadcrumbs.push(breadcrumb)
  
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs = breadcrumbs.slice(-MAX_BREADCRUMBS)
  }
  
  console.debug(`[Breadcrumb:${category}]`, message, data || '')
}

/**
 * Capture an error
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
  severity: ErrorSeverity = 'error'
): string | undefined {
  console.error('[Error]', error.message, context)
  
  if (!isInitialized) {
    return undefined
  }

  const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  
  sendToSentry({
    event_id: eventId,
    level: severity,
    message: error.message,
    exception: {
      values: [{
        type: error.name || 'Error',
        value: error.message,
        stacktrace: error.stack ? { frames: parseStackTrace(error.stack) } : undefined,
      }]
    },
    extra: context,
  })

  return eventId
}

/**
 * Parse stack trace into Sentry format
 */
function parseStackTrace(stack: string): Array<{ filename: string; function: string; lineno?: number; colno?: number }> {
  const lines = stack.split('\n').slice(1)
  return lines.map(line => {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
                  line.match(/at\s+(.+?):(\d+):(\d+)/)
    if (match) {
      if (match.length === 5) {
        return {
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        }
      } else {
        return {
          function: '<anonymous>',
          filename: match[1],
          lineno: parseInt(match[2], 10),
          colno: parseInt(match[3], 10),
        }
      }
    }
    return { filename: 'unknown', function: line.trim() }
  }).filter(f => f.filename !== 'unknown')
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: ErrorSeverity = 'info',
  context?: Record<string, unknown>
): string | undefined {
  console.log(`[${level}]`, message, context)
  
  if (!isInitialized) {
    return undefined
  }

  const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  
  sendToSentry({
    event_id: eventId,
    level,
    message,
    extra: context,
  })

  return eventId
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

/**
 * Track button click - useful for debugging UI issues
 */
export function trackButtonClick(
  buttonName: string,
  component: string,
  data?: Record<string, unknown>
): void {
  addBreadcrumb(
    `Button Click: ${buttonName}`,
    'ui.click',
    { button: buttonName, component, ...data }
  )
}

/**
 * Track error - alias for captureError with simpler interface
 */
export function trackError(
  error: Error,
  context?: Record<string, unknown>
): string | undefined {
  return captureError(error, context, 'error')
}

// ============================================================
// WEB RESEARCH BREADCRUMBS
// ============================================================

/**
 * Track web search request
 */
export function trackWebSearch(
  query: string,
  options?: { searchDepth?: string; maxResults?: number }
): void {
  addBreadcrumb(
    `Web Search: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`,
    'web.search',
    { query, ...options }
  )
}

/**
 * Track web search result
 */
export function trackWebSearchResult(
  query: string,
  resultCount: number,
  responseTime: number,
  hasAnswer: boolean
): void {
  addBreadcrumb(
    `Web Search Result: ${resultCount} results in ${responseTime}ms`,
    'web.search.result',
    { query: query.substring(0, 30), resultCount, responseTime, hasAnswer }
  )
}

/**
 * Track web extract request
 */
export function trackWebExtract(urls: string[]): void {
  addBreadcrumb(
    `Web Extract: ${urls.length} URL(s)`,
    'web.extract',
    { urlCount: urls.length, firstUrl: urls[0] }
  )
}

/**
 * Track web crawl request
 */
export function trackWebCrawl(url: string, maxPages?: number): void {
  addBreadcrumb(
    `Web Crawl: ${url}`,
    'web.crawl',
    { url, maxPages }
  )
}

// ============================================================
// AUTO-MODE BREADCRUMBS
// ============================================================

/**
 * Track auto-mode decision
 */
export function trackAutoModeDecision(
  action: string,
  approved: boolean,
  reason: string,
  riskLevel?: string
): void {
  const level: ErrorSeverity = approved ? 'info' : 'warning'
  addBreadcrumb(
    `Auto-Mode: ${approved ? 'Approved' : 'Blocked'} - ${action}`,
    'auto_mode.decision',
    { action, approved, reason, riskLevel },
    level
  )
}

/**
 * Track auto-mode execution
 */
export function trackAutoModeExecution(
  command: string,
  success: boolean,
  duration?: number
): void {
  const level: ErrorSeverity = success ? 'info' : 'warning'
  addBreadcrumb(
    `Auto-Mode Execute: ${command.substring(0, 40)}...`,
    'auto_mode.execute',
    { command: command.substring(0, 100), success, duration },
    level
  )
}

// ============================================================
// USER JOURNEY BREADCRUMBS
// ============================================================

/**
 * Track onboarding step
 */
export function trackOnboardingStep(
  step: 'api_key_entered' | 'first_workspace' | 'first_message' | 'first_success',
  details?: Record<string, unknown>
): void {
  addBreadcrumb(
    `Onboarding: ${step}`,
    'user.onboarding',
    { step, ...details }
  )
}

/**
 * Track feature discovery
 */
export function trackFeatureDiscovery(
  feature: string,
  source: 'tooltip' | 'menu' | 'keyboard' | 'suggestion'
): void {
  addBreadcrumb(
    `Feature Discovered: ${feature}`,
    'user.discovery',
    { feature, source }
  )
}

// ============================================================
// MODEL ROUTING & CACHE BREADCRUMBS
// ============================================================

/**
 * Track model routing decisions from API
 * Records which model was selected and why for analytics
 */
export function trackModelRouting(context: {
  provider: string
  model: string
  reason: string
  taskHints: string[]
  forcedClaude: boolean
}): void {
  addBreadcrumb(
    `Routed to ${context.provider}: ${context.reason}`,
    'ai.routing',
    {
      provider: context.provider,
      model: context.model,
      reason: context.reason,
      taskHints: context.taskHints.join(', ') || 'none',
      forcedClaude: context.forcedClaude,
    }
  )
}

/**
 * Track cache metrics from API response
 * Records response cache hits and prompt cache usage for cost analytics
 */
export function trackCacheMetrics(context: {
  responseHit: boolean
  promptCacheCreated: number
  promptCacheRead: number
  savingsPercent?: number
}): void {
  const message = context.responseHit
    ? 'Response Cache HIT (100% saved)'
    : context.promptCacheRead > 0
      ? `Prompt Cache: ${context.promptCacheRead} tokens (90% saved)`
      : context.promptCacheCreated > 0
        ? `Prompt Cache Created: ${context.promptCacheCreated} tokens`
        : 'No cache'
  
  addBreadcrumb(
    message,
    'ai.cache',
    {
      responseHit: context.responseHit,
      promptCacheCreated: context.promptCacheCreated,
      promptCacheRead: context.promptCacheRead,
      savingsPercent: context.savingsPercent,
    }
  )
}

// ============================================================
// RECOVERY & RESILIENCE BREADCRUMBS
// ============================================================

/**
 * Track command execution errors and recovery
 * Records when commands fail and recovery is attempted
 */
export function trackCommandRecovery(context: {
  command: string
  exitCode: number
  errorType: string
  recoveryAttempt: number
  maxAttempts: number
  willRetry: boolean
}): void {
  const level: ErrorSeverity = context.willRetry ? 'warning' : 'error'
  
  addBreadcrumb(
    `Command Recovery: ${context.command.substring(0, 30)}... (${context.recoveryAttempt}/${context.maxAttempts})`,
    'command.recovery',
    {
      command: context.command.substring(0, 100),
      exitCode: context.exitCode,
      errorType: context.errorType,
      recoveryAttempt: context.recoveryAttempt,
      maxAttempts: context.maxAttempts,
      willRetry: context.willRetry,
    },
    level
  )
}

/**
 * Track error recovery loop iteration (AI-assisted fix)
 * Records each iteration when AI analyzes errors and suggests fixes
 */
export function trackErrorRecoveryLoop(context: {
  iteration: number
  maxIterations: number
  errorSummary: string
  commandsFailed: number
  fixAttempted: boolean
  fixSucceeded?: boolean
  model?: string
}): void {
  const level: ErrorSeverity = context.fixSucceeded === false ? 'warning' : 'info'
  
  addBreadcrumb(
    `Error Recovery Loop: ${context.iteration}/${context.maxIterations} (${context.commandsFailed} failed)`,
    'recovery.loop',
    {
      iteration: context.iteration,
      maxIterations: context.maxIterations,
      errorSummary: context.errorSummary.substring(0, 200),
      commandsFailed: context.commandsFailed,
      fixAttempted: context.fixAttempted,
      fixSucceeded: context.fixSucceeded,
      model: context.model,
    },
    level
  )
}

/**
 * Track network/API retry attempts
 * Records when API calls fail and are retried
 */
export function trackNetworkRetry(context: {
  endpoint: string
  attemptNumber: number
  maxAttempts: number
  errorType: string
  errorMessage: string
  willRetry: boolean
  delayMs?: number
}): void {
  const level: ErrorSeverity = context.willRetry ? 'warning' : 'error'
  
  addBreadcrumb(
    `Network Retry: ${context.attemptNumber}/${context.maxAttempts} - ${context.errorType}`,
    'network.retry',
    {
      endpoint: context.endpoint.substring(0, 50),
      attemptNumber: context.attemptNumber,
      maxAttempts: context.maxAttempts,
      errorType: context.errorType,
      errorMessage: context.errorMessage.substring(0, 100),
      willRetry: context.willRetry,
      delayMs: context.delayMs,
    },
    level
  )
}

/**
 * Track DeepSeek retry with Opus fallback
 * Records when DeepSeek fails and falls back to Claude Opus
 */
export function trackModelFallback(context: {
  fromModel: string
  toModel: string
  reason: string
  retryCount: number
  maxRetries: number
}): void {
  addBreadcrumb(
    `Model Fallback: ${context.fromModel} → ${context.toModel}`,
    'model.fallback',
    {
      fromModel: context.fromModel,
      toModel: context.toModel,
      reason: context.reason,
      retryCount: context.retryCount,
      maxRetries: context.maxRetries,
    },
    'warning'
  )
}

// ============================================================
// API ERROR TRACKING - KAN-31 FIX
// ============================================================

/**
 * Track API key validation result
 * Records success/failure of API key validation for debugging
 */
export function trackApiKeyValidation(context: {
  success: boolean
  errorCode?: string
  errorMessage?: string
  credits?: number
  responseTime: number
}): void {
  const level: ErrorSeverity = context.success ? 'info' : 'warning'
  
  addBreadcrumb(
    context.success 
      ? `API Key Valid: ${context.credits?.toFixed(2)} credits`
      : `API Key Invalid: ${context.errorCode || 'unknown error'}`,
    'api.validation',
    {
      success: context.success,
      errorCode: context.errorCode,
      errorMessage: context.errorMessage,
      credits: context.credits,
      responseTime: context.responseTime,
    },
    level
  )
}

/**
 * Track detailed API error response
 * Records full API error details for debugging "something went wrong" issues
 */
export function trackApiErrorResponse(context: {
  errorCode: string
  errorMessage: string
  httpStatus: number
  canRetry: boolean
  endpoint: string
  responseTime: number
  details?: Record<string, unknown>
}): void {
  addBreadcrumb(
    `API Error: ${context.errorCode} (HTTP ${context.httpStatus})`,
    'api.error_detail',
    {
      errorCode: context.errorCode,
      errorMessage: context.errorMessage,
      httpStatus: context.httpStatus,
      canRetry: context.canRetry,
      endpoint: context.endpoint.replace(/api_key=[^&]+/, 'api_key=***'),
      responseTime: context.responseTime,
      ...context.details,
    },
    'error'
  )
}

/**
 * Track API request attempt
 * Records when an API request is made for debugging
 */
export function trackApiRequest(context: {
  endpoint: string
  method: string
  model: string
  hasApiKey: boolean
  messageCount: number
}): void {
  addBreadcrumb(
    `API Request: ${context.method} ${context.model}`,
    'api.request_detail',
    {
      endpoint: context.endpoint.substring(0, 50),
      method: context.method,
      model: context.model,
      hasApiKey: context.hasApiKey,
      messageCount: context.messageCount,
    }
  )
}

/**
 * Track credits-related events
 * Records credit balance changes and low credit warnings
 */
export function trackCreditsEvent(context: {
  event: 'checked' | 'deducted' | 'low_balance' | 'exhausted'
  credits: number
  cost?: number
  model?: string
}): void {
  const level: ErrorSeverity = 
    context.event === 'exhausted' ? 'error' :
    context.event === 'low_balance' ? 'warning' : 'info'
  
  addBreadcrumb(
    `Credits ${context.event}: ${context.credits.toFixed(2)}${context.cost ? ` (-${context.cost.toFixed(4)})` : ''}`,
    'billing.credits',
    {
      event: context.event,
      credits: context.credits,
      cost: context.cost,
      model: context.model,
    },
    level
  )
}
