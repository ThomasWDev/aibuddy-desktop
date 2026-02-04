/**
 * Sentry Error Monitoring for AIBuddy Desktop (Main Process)
 * 
 * This module provides error tracking and user behavior analytics.
 * It's designed to be compatible with the VS Code extension's Sentry implementation
 * so breadcrumbs and errors can be analyzed together in the Sentry dashboard.
 * 
 * NOTE: Uses a lightweight HTTP-based approach instead of @sentry/electron
 * to avoid native module issues with Electron's asar packaging.
 */

import { net } from 'electron'

// Same DSN as VS Code extension - all errors go to same project
const SENTRY_DSN = process.env.SENTRY_DSN || 'https://982b270aa75b24be5d77786b58929121@o1319003.ingest.us.sentry.io/4510695985774592'

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
let appVersion = 'unknown'
let userContext: { id?: string; email?: string } | null = null
let tags: Record<string, string> = {}
let breadcrumbs: Array<{
  message: string
  category: string
  data?: Record<string, unknown>
  level: string
  timestamp: number
}> = []

// Keep only last 100 breadcrumbs
const MAX_BREADCRUMBS = 100

/**
 * Error severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

/**
 * Breadcrumb categories - same as VS Code extension for unified analysis
 */
export type BreadcrumbCategory = 
  | 'ai.request'
  | 'ai.response'
  | 'ai.thinking'
  | 'ai.streaming'
  | 'ai.fallback'
  | 'ai.language_detection'
  | 'ai.code_task'
  | 'ai.code_quality'
  | 'ai.test_generation'
  | 'ai.dotnet_test_issue'
  | 'ai.test_framework_detection'
  | 'tool.execution'
  | 'tool.result'
  | 'user.action'
  | 'user.chat'
  | 'user.settings'
  | 'user.feedback'
  | 'navigation'
  | 'session'
  | 'session.metrics'
  | 'file.operation'
  | 'performance.slow'
  | 'error.retry'
  | 'context.window'
  | 'api.ratelimit'
  | 'task.lifecycle'
  | 'memory.operation'
  | 'git.operation'
  | 'app.command'
  | 'app.menu'
  | 'app.window'
  | 'editor.operation'
  | 'terminal.operation'
  | 'error'

/**
 * Send event to Sentry via HTTP
 */
async function sendToSentry(event: Record<string, unknown>): Promise<void> {
  if (!dsnParts) return

  const url = `https://${dsnParts.host}/api/${dsnParts.projectId}/store/?sentry_key=${dsnParts.publicKey}&sentry_version=7`
  
  try {
    const request = net.request({
      method: 'POST',
      url,
    })
    
    request.setHeader('Content-Type', 'application/json')
    
    const eventData = {
      ...event,
      platform: 'javascript',
      sdk: { name: 'aibuddy-desktop', version: appVersion },
      release: `aibuddy-desktop@${appVersion}`,
      environment: process.env.NODE_ENV || 'production',
      tags,
      user: userContext,
      breadcrumbs: breadcrumbs.slice(-50), // Send last 50 breadcrumbs
      timestamp: Date.now() / 1000,
    }
    
    request.write(JSON.stringify(eventData))
    request.end()
  } catch (error) {
    console.debug('[Sentry] Failed to send event:', error)
  }
}

/**
 * Initialize Sentry for the main process
 * Call this in electron/main.ts before creating windows
 */
export function initSentryMain(version: string): void {
  if (isInitialized) return
  
  appVersion = version

  if (!SENTRY_DSN || !dsnParts) {
    console.debug('[Sentry] DSN not configured - error monitoring disabled')
    return
  }

  // Set context tags
  tags = {
    app_type: 'desktop',
    app_version: version,
    os: process.platform,
    arch: process.arch,
    electron_version: process.versions.electron || 'unknown',
  }

  isInitialized = true
  console.log('[Sentry] ✅ Error monitoring initialized for desktop app')
}

/**
 * Set user context (anonymized)
 */
export function setUserContext(userId: string, email?: string): void {
  if (!isInitialized) return
  
  userContext = {
    id: userId,
    email: email ? `${email.split('@')[0].slice(0, 3)}***@***` : undefined,
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (!isInitialized) return
  userContext = null
}

/**
 * Capture an error with context
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

  const errorMessage = error.message || String(error)
  
  // Filter user-initiated cancellations
  if (errorMessage.includes('Task aborted') || 
      errorMessage.includes('Request aborted') ||
      errorMessage.includes('Canceled') ||
      errorMessage.includes('ECONNREFUSED')) {
    return undefined
  }

  const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  
  sendToSentry({
    event_id: eventId,
    level: severity,
    message: errorMessage,
    exception: {
      values: [{
        type: error.name || 'Error',
        value: errorMessage,
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
  const lines = stack.split('\n').slice(1) // Skip first line (error message)
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

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: BreadcrumbCategory | string,
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
  
  // Keep only last MAX_BREADCRUMBS
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs = breadcrumbs.slice(-MAX_BREADCRUMBS)
  }
  
  // Also log to console for debugging
  console.debug(`[Breadcrumb:${category}]`, message, data || '')
}

/**
 * Flush pending events (no-op in HTTP implementation, kept for API compatibility)
 */
export async function flushSentry(): Promise<void> {
  // HTTP requests are fire-and-forget, nothing to flush
  return Promise.resolve()
}

// ============================================================
// SPECIALIZED BREADCRUMB FUNCTIONS
// Same API as VS Code extension for code reuse
// ============================================================

/**
 * Track AI request
 */
export function trackAIRequest(context: {
  model: string
  messageCount: number
  systemPromptLength?: number
  hasImages?: boolean
  hasTools?: boolean
  temperature?: number
  maxTokens?: number
}): void {
  addBreadcrumb(
    `AI Request: ${context.model} (${context.messageCount} messages)`,
    'ai.request',
    context
  )
}

/**
 * Track AI response
 */
export function trackAIResponse(context: {
  model: string
  inputTokens: number
  outputTokens: number
  thinkingTokens?: number
  cacheHit?: boolean
  responseTime: number
  stopReason?: string
  hasCodeBlocks?: boolean
  hasToolCalls?: boolean
}): void {
  const level: ErrorSeverity = context.stopReason === 'error' ? 'error' : 'info'
  
  addBreadcrumb(
    `AI Response: ${context.outputTokens} tokens in ${context.responseTime}ms`,
    'ai.response',
    {
      ...context,
      tokensPerSecond: context.responseTime > 0 
        ? Math.round(context.outputTokens / (context.responseTime / 1000)) 
        : 0,
    },
    level
  )
}

/**
 * Track tool execution start
 */
export function trackToolStart(toolName: string, filePath?: string): void {
  addBreadcrumb(
    `Tool Start: ${toolName}${filePath ? ` on ${filePath}` : ''}`,
    'tool.execution',
    { toolName, filePath, phase: 'start' }
  )
}

/**
 * Track tool completion
 */
export function trackToolComplete(context: {
  toolName: string
  filePath?: string
  success: boolean
  duration?: number
  errorType?: string
}): void {
  const level: ErrorSeverity = context.success ? 'info' : 'warning'
  
  addBreadcrumb(
    `Tool ${context.success ? 'Success' : 'Failed'}: ${context.toolName}`,
    'tool.result',
    context,
    level
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
 * Track user action
 */
export function trackUserAction(action: string, target?: string, value?: unknown): void {
  addBreadcrumb(
    `User Action: ${action}${target ? ` on ${target}` : ''}`,
    'user.action',
    { action, target, value }
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
 * Track session start
 */
export function trackSessionStart(sessionId: string, projectType?: string): void {
  addBreadcrumb(
    `Session Started: ${sessionId.slice(0, 8)}...`,
    'session',
    { sessionId, projectType, timestamp: new Date().toISOString() }
  )
}

/**
 * Track file operation
 */
export function trackFileOperation(
  operation: 'read' | 'write' | 'delete' | 'create' | 'rename',
  filePath: string,
  success: boolean,
  details?: { fileSize?: number; duration?: number; errorMessage?: string; linesChanged?: number }
): void {
  const level: ErrorSeverity = success ? 'info' : 'warning'
  
  addBreadcrumb(
    `File ${operation}: ${filePath.split('/').pop() || filePath}`,
    'file.operation',
    { operation, filePath, success, ...details },
    level
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
 * Track Git operation
 */
export function trackGitOperation(
  operation: string,
  success: boolean,
  details?: { branch?: string; files?: number; conflictsFound?: number; errorMessage?: string }
): void {
  const level: ErrorSeverity = success ? 'info' : 'warning'
  
  addBreadcrumb(
    `Git ${operation}: ${success ? 'success' : 'failed'}`,
    'git.operation',
    { operation, success, ...details },
    level
  )
}

/**
 * Track language/framework detection
 */
export function trackLanguageDetection(
  detectedType: string,
  indicators: string[],
  confidence: 'high' | 'medium' | 'low',
  promptInjected: boolean,
  details?: { filesScanned?: number; primaryLanguage?: string; frameworks?: string[]; testFramework?: string }
): void {
  addBreadcrumb(
    `Language Detected: ${detectedType} (${confidence} confidence)`,
    'ai.language_detection',
    { detectedType, indicators, confidence, promptInjected, ...details }
  )
}

/**
 * Track code generation task
 */
export function trackCodeGenerationTask(
  taskType: 'create_tests' | 'fix_tests' | 'improve_coverage' | 'refactor' | 'implement' | 'debug' | 'other',
  language: string,
  details?: { targetFile?: string; existingTestCount?: number; requestedCoverage?: number; frameworks?: string[] }
): void {
  addBreadcrumb(
    `Code Task: ${taskType} (${language})`,
    'ai.code_task',
    { taskType, language, ...details }
  )
}

/**
 * Track code quality outcome
 */
export function trackCodeQuality(
  outcome: 'success' | 'compile_error' | 'test_failure' | 'runtime_error' | 'user_rejected',
  language: string,
  details?: { errorMessage?: string; filesModified?: number; testsRun?: number; testsPassed?: number; testsFailed?: number }
): void {
  const level: ErrorSeverity = outcome === 'success' ? 'info' : 'warning'
  
  addBreadcrumb(
    `Code Quality: ${outcome} (${language})`,
    'ai.code_quality',
    { outcome, language, ...details },
    level
  )
}

// ============================================================
// DESKTOP-SPECIFIC BREADCRUMBS
// ============================================================

/**
 * Track app menu action
 */
export function trackMenuAction(menuItem: string, accelerator?: string): void {
  addBreadcrumb(
    `Menu: ${menuItem}`,
    'app.menu',
    { menuItem, accelerator }
  )
}

/**
 * Track window events
 */
export function trackWindowEvent(
  event: 'created' | 'closed' | 'minimized' | 'maximized' | 'restored' | 'focused' | 'blurred',
  details?: { width?: number; height?: number }
): void {
  addBreadcrumb(
    `Window: ${event}`,
    'app.window',
    { event, ...details }
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
 * Track terminal operations
 */
export function trackTerminalOperation(
  operation: 'create' | 'close' | 'execute' | 'clear',
  details?: { command?: string; exitCode?: number; duration?: number }
): void {
  addBreadcrumb(
    `Terminal: ${operation}`,
    'terminal.operation',
    { operation, ...details }
  )
}

/**
 * Track session metrics
 */
export function trackSessionMetrics(metrics: {
  sessionDurationMs: number
  tasksCompleted: number
  tasksFailed: number
  totalTokensUsed: number
  averageResponseTime: number
  errorsEncountered: number
  toolsExecuted: number
  filesEdited: number
  terminalCommands: number
}): void {
  const successRate = metrics.tasksCompleted + metrics.tasksFailed > 0
    ? Math.round((metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed)) * 100)
    : 100
  
  addBreadcrumb(
    `Session Metrics: ${successRate}% success rate`,
    'session.metrics',
    {
      ...metrics,
      successRate,
      sessionDurationMin: Math.round(metrics.sessionDurationMs / 60000),
    }
  )
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return isInitialized
}

/**
 * Get app version
 */
export function getAppVersion(): string {
  return appVersion
}

// ============================================================
// VERSION & API TRACKING BREADCRUMBS
// ============================================================

/**
 * Track version check events
 */
export function trackVersionCheck(
  currentVersion: string,
  latestVersion: string | null,
  updateAvailable: boolean,
  isUrgent: boolean
): void {
  addBreadcrumb(
    `Version Check: ${currentVersion} → ${latestVersion || 'unknown'}${updateAvailable ? ' (update available)' : ''}`,
    'version.check',
    { currentVersion, latestVersion, updateAvailable, isUrgent },
    updateAvailable && isUrgent ? 'warning' : 'info'
  )
}

/**
 * Track version notification response
 */
export function trackVersionNotificationResponse(
  selection: string | null,
  currentVersion: string,
  latestVersion: string | null,
  isUrgent: boolean
): void {
  addBreadcrumb(
    `Update notification response: ${selection || 'dismissed'}`,
    'version.notification_response',
    { selection, currentVersion, latestVersion, isUrgent }
  )
}

/**
 * Track API endpoint selection
 */
export function trackApiEndpoint(
  endpoint: string,
  isPrimary: boolean,
  reason?: string
): void {
  addBreadcrumb(
    `API Endpoint: ${isPrimary ? 'Primary' : 'Fallback'} - ${endpoint.substring(0, 50)}`,
    'api.endpoint',
    { endpoint, isPrimary, reason }
  )
}

/**
 * Track indexing events
 */
export function trackIndexingEvent(
  event: 'start' | 'progress' | 'complete' | 'error' | 'skip',
  details: {
    workspacePath?: string
    filesFound?: number
    filesIndexed?: number
    totalFiles?: number
    durationMs?: number
    error?: string
    reason?: string
  }
): void {
  const level: ErrorSeverity = event === 'error' ? 'error' : 'info'
  
  addBreadcrumb(
    `Indexing ${event}: ${details.filesIndexed || 0}/${details.totalFiles || 0} files`,
    'indexing.event',
    { event, ...details },
    level
  )
}

/**
 * Track extension/app lifecycle events
 */
export function trackAppLifecycle(
  event: 'activate' | 'deactivate' | 'reload' | 'error' | 'update_check',
  details?: {
    version?: string
    activationTime?: number
    error?: string
  }
): void {
  const level: ErrorSeverity = event === 'error' ? 'error' : 'info'
  
  addBreadcrumb(
    `App ${event}${details?.version ? ` v${details.version}` : ''}`,
    'app.lifecycle',
    { event, ...details },
    level
  )
}

/**
 * Track user credits
 */
export function trackCredits(
  event: 'fetch' | 'update' | 'low' | 'exhausted',
  credits: number,
  details?: {
    previousCredits?: number
    threshold?: number
    userId?: string
  }
): void {
  const level: ErrorSeverity = event === 'exhausted' ? 'error' : event === 'low' ? 'warning' : 'info'
  
  addBreadcrumb(
    `Credits ${event}: ${credits.toFixed(2)}`,
    'credits.event',
    { event, credits, ...details },
    level
  )
}

/**
 * Track workspace detection
 */
export function trackWorkspaceDetection(
  isProjectFolder: boolean,
  projectType: string | null,
  indicators: string[],
  details?: {
    workspacePath?: string
    filesCount?: number
  }
): void {
  addBreadcrumb(
    `Workspace: ${isProjectFolder ? projectType || 'Unknown project' : 'Not a project folder'}`,
    'workspace.detection',
    { isProjectFolder, projectType, indicators, ...details }
  )
}

/**
 * Track provider connection status
 */
export function trackProviderConnection(
  provider: string,
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'timeout',
  details?: {
    endpoint?: string
    durationMs?: number
    error?: string
    retryCount?: number
  }
): void {
  const level: ErrorSeverity = status === 'error' || status === 'timeout' ? 'error' : 
    status === 'disconnected' ? 'warning' : 'info'
  
  addBreadcrumb(
    `Provider ${provider}: ${status}`,
    'provider.connection',
    { provider, status, ...details },
    level
  )
}

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

// ============================================================================
// RECOVERY & RESILIENCE BREADCRUMBS (Main Process)
// ============================================================================

/**
 * Track IPC communication errors and recovery
 */
export function trackIpcRecovery(context: {
  channel: string
  errorType: string
  recoveryAttempt: number
  success: boolean
}): void {
  const level: ErrorSeverity = context.success ? 'info' : 'warning'
  
  addBreadcrumb(
    `IPC Recovery: ${context.channel} (attempt ${context.recoveryAttempt})`,
    'ipc.recovery',
    context,
    level
  )
}

/**
 * Track file system operation recovery
 */
export function trackFsRecovery(context: {
  operation: string
  path: string
  errorType: string
  retryAttempt: number
  success: boolean
}): void {
  const level: ErrorSeverity = context.success ? 'info' : 'warning'
  
  addBreadcrumb(
    `FS Recovery: ${context.operation} (attempt ${context.retryAttempt})`,
    'fs.recovery',
    {
      operation: context.operation,
      path: context.path.substring(0, 50),
      errorType: context.errorType,
      retryAttempt: context.retryAttempt,
      success: context.success,
    },
    level
  )
}

