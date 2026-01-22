/**
 * Sentry Error Monitoring for AIBuddy Desktop
 * 
 * This module provides error tracking and user behavior analytics.
 * It's designed to be compatible with the VS Code extension's Sentry implementation
 * so breadcrumbs and errors can be analyzed together in the Sentry dashboard.
 * 
 * Uses @sentry/electron for proper Electron main/renderer process support.
 */

import * as Sentry from '@sentry/electron/main'

// Same DSN as VS Code extension - all errors go to same project
const SENTRY_DSN = process.env.SENTRY_DSN || 'https://982b270aa75b24be5d77786b58929121@o1319003.ingest.us.sentry.io/4510695985774592'

let isInitialized = false
let appVersion = 'unknown'

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
 * Initialize Sentry for the main process
 * Call this in electron/main.ts before creating windows
 */
export function initSentryMain(version: string): void {
  if (isInitialized) return
  
  appVersion = version

  if (!SENTRY_DSN) {
    console.debug('[Sentry] DSN not configured - error monitoring disabled')
    return
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      release: `aibuddy-desktop@${version}`,
      environment: process.env.NODE_ENV || 'production',
      
      // Sample rates
      sampleRate: 1.0,
      tracesSampleRate: 0.1,
      
      // Don't send PII
      sendDefaultPii: false,
      
      // Filter noisy errors
      beforeSend(event, hint) {
        const error = hint.originalException
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        // Filter user-initiated cancellations
        if (errorMessage.includes('Task aborted') || 
            errorMessage.includes('Request aborted') ||
            errorMessage.includes('Canceled')) {
          return null
        }
        
        // Filter connection errors to local services
        if (errorMessage.includes('ECONNREFUSED')) {
          return null
        }
        
        return event
      },
    })

    // Set context tags
    Sentry.setTag('app_type', 'desktop')
    Sentry.setTag('app_version', version)
    Sentry.setTag('os', process.platform)
    Sentry.setTag('arch', process.arch)
    Sentry.setTag('electron_version', process.versions.electron)

    isInitialized = true
    console.log('[Sentry] ✅ Error monitoring initialized for desktop app')
  } catch (error) {
    console.debug('[Sentry] Failed to initialize:', error)
  }
}

/**
 * Set user context (anonymized)
 */
export function setUserContext(userId: string, email?: string): void {
  if (!isInitialized) return
  
  Sentry.setUser({
    id: userId,
    email: email ? `${email.split('@')[0].slice(0, 3)}***@***` : undefined,
  })
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (!isInitialized) return
  Sentry.setUser(null)
}

/**
 * Capture an error with context
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

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: BreadcrumbCategory | string,
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
 * Flush pending events
 */
export async function flushSentry(): Promise<void> {
  if (!isInitialized) return
  
  try {
    await Sentry.flush(2000)
  } catch {
    // Ignore flush errors
  }
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

