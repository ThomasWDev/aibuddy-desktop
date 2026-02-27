import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Toaster, toast } from 'sonner'
import { 
  Send, 
  FolderOpen, 
  Sparkles, 
  CreditCard,
  Loader2,
  Bot,
  User,
  Copy,
  Check,
  Key,
  X,
  HelpCircle,
  Coins,
  Zap,
  FileSearch,
  Cloud,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  History,
  Plus,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Settings,
  Keyboard,
  MessageSquare,
  Mic,
  MicOff,
  Share2,
  FileCode, // KAN-6 FIX
  Menu, // KAN-42 FIX: Hamburger menu icon
  Square, // KAN-35 FIX: Stop button icon
  GraduationCap // Interview Mode icon
} from 'lucide-react'
import { CloudKnowledgePanel } from './components/knowledge'
import { HistorySidebar } from './components/HistorySidebar'
import { ShareModal } from './components/ShareModal'
import { UsageLimitsPanel } from './components/UsageLimitsPanel'
import { InterviewPanel } from './components/InterviewPanel'
import { LanguageSelector } from './components/LanguageSelector'
import { WelcomeScreen } from './components/welcome/WelcomeScreen'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from './i18n/languages'
import { useTheme, type Theme, type FontSize } from './hooks/useTheme'
import { useVoiceInput } from './hooks/useVoiceInput'
import type { ChatThread } from '../../src/history/types'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { 
  trackButtonClick, 
  trackError, 
  addBreadcrumb,
  trackUserAction,
  trackUserMessage,
  trackAIRequest,
  trackAIResponse,
  trackPanelToggle,
  trackSettingsChange,
  trackSlowOperation,
  trackNavigation,
  captureMessage
} from './lib/sentry'
import { 
  AIBUDDY_BUY_CREDITS_URL, 
  AIBUDDY_API_INFERENCE_URL,
  AIBUDDY_WEBSITE 
} from '../../src/constants/urls'

// Debug: Log the API URL at module load time
console.log('[App] API URL configured:', AIBUDDY_API_INFERENCE_URL)
import { generateSystemPrompt, DESKTOP_PLATFORM_CONTEXT } from '../../src/constants/system-prompt'

// Child-friendly tooltip with big text and emojis
function Tooltip({ text, children, position = 'top' }: { text: string; children: React.ReactNode; position?: 'top' | 'bottom' | 'left' | 'right' }) {
  const [show, setShow] = useState(false)
  
  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '12px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '12px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '12px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '12px' },
  }
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          className="absolute z-50 animate-bounce-in"
          style={{ 
            ...positionStyles[position],
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 700,
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.4)',
            border: '3px solid rgba(255,255,255,0.3)',
            maxWidth: '320px',
            minWidth: '200px',
            textAlign: 'center',
            lineHeight: '1.4',
          }}
        >
          {/* Arrow */}
          <div 
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              ...(position === 'top' ? {
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '10px solid #ec4899',
              } : position === 'bottom' ? {
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: '10px solid #7c3aed',
              } : {})
            }}
          />
          {text}
        </div>
      )}
    </div>
  )
}

// Big friendly button component
function BigButton({ 
  onClick, 
  icon, 
  label, 
  tooltip, 
  color = 'blue',
  active = false,
  badge,
}: { 
  onClick: () => void
  icon: React.ReactNode
  label: string
  tooltip: string
  color?: 'blue' | 'green' | 'pink' | 'orange' | 'purple'
  active?: boolean
  badge?: React.ReactNode
}) {
  const colors = {
    blue: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', hover: '#1d4ed8' },
    green: { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', hover: '#15803d' },
    pink: { bg: 'linear-gradient(135deg, #ec4899, #db2777)', hover: '#be185d' },
    orange: { bg: 'linear-gradient(135deg, #f97316, #ea580c)', hover: '#c2410c' },
    purple: { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', hover: '#6d28d9' },
  }
  
  return (
    <Tooltip text={tooltip}>
      <button
        onClick={onClick}
        className="relative flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
        style={{ 
          background: active ? colors[color].bg : 'rgba(255,255,255,0.1)',
          color: active ? 'white' : '#94a3b8',
          border: active ? 'none' : '2px solid #334155',
          boxShadow: active ? `0 8px 24px ${color === 'pink' ? 'rgba(236,72,153,0.4)' : 'rgba(0,0,0,0.3)'}` : 'none',
          minWidth: '100px',
        }}
      >
        <span className="text-xl">{icon}</span>
        <span>{label}</span>
        {badge}
      </button>
    </Tooltip>
  )
}

interface ImageAttachment {
  id: string
  base64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  name: string
  size: number
}

const MAX_IMAGE_DIMENSION = 1920
const JPEG_QUALITY = 0.8
const MAX_PAYLOAD_BYTES = 900 * 1024 // 900KB — ALB→Lambda sync invocation limit is ~1MB
// KAN-54: Token-based cost guard — limit total input tokens before sending
const MAX_CONTEXT_TOKENS = 40_000

function estimateTokenCount(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 3.5)
}

function compressImageFromSrc(src: string): Promise<{ base64: string; mimeType: ImageAttachment['mimeType'] }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const scale = MAX_IMAGE_DIMENSION / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      const base64 = dataUrl.split(',')[1]
      resolve({ base64, mimeType: 'image/jpeg' })
    }
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = src
  })
}

function compressImage(file: File): Promise<{ base64: string; mimeType: ImageAttachment['mimeType'] }> {
  return compressImageFromSrc(URL.createObjectURL(file))
}

function compressBase64Image(base64: string, mimeType: string): Promise<{ base64: string; mimeType: ImageAttachment['mimeType'] }> {
  return compressImageFromSrc(`data:${mimeType};base64,${base64}`)
}

// KAN-6 FIX: Add code file attachment support
interface CodeFileAttachment {
  id: string
  content: string
  name: string
  size: number
  language: string
}

// Code file extensions and their languages
const CODE_FILE_EXTENSIONS: Record<string, string> = {
  'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 'jsx': 'javascript',
  'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'h': 'c',
  'cs': 'csharp', 'go': 'go', 'rs': 'rust', 'rb': 'ruby', 'php': 'php',
  'swift': 'swift', 'kt': 'kotlin', 'scala': 'scala', 'r': 'r',
  'sql': 'sql', 'sh': 'bash', 'bash': 'bash', 'zsh': 'bash',
  'html': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
  'json': 'json', 'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml',
  'md': 'markdown', 'txt': 'text', 'env': 'env', 'conf': 'config',
  'dockerfile': 'dockerfile', 'makefile': 'makefile', 'cmake': 'cmake'
}

export interface OpenFile {
  path: string
  name: string
  content: string
  language: string
  isDirty: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  cost?: number
  model?: string
  tokensIn?: number
  tokensOut?: number
  executionResults?: CommandResult[]
  images?: ImageAttachment[]
}

interface CommandResult {
  command: string
  stdout: string
  stderr: string
  exitCode: number
  executed: boolean
}

// Terminal output for real-time display
interface TerminalOutput {
  type: 'command' | 'stdout' | 'stderr' | 'info' | 'success' | 'error'
  text: string
  timestamp: number
}

interface TaskProgress {
  totalCommands: number
  completedCommands: number
  passedCommands: number
  failedCommands: number
  currentStep: string
  steps: string[]
}

const MAX_TERMINAL_LINES = 100
const COLLAPSED_VISIBLE_LINES = 5

// AIBuddy uses smart backend routing - users never select models
// Backend automatically chooses optimal model based on task analysis:
// - GPT-5.3-Codex: Code generation, images (best coding, 25% faster)
// - Claude Opus 4: Complex reasoning, debugging, refactoring (80.9% SWE-bench)
// - DeepSeek V3: Simple tasks (cost optimization, ~60% of requests)
// Expected cost savings: ~50% vs always using expensive models

// Parse code blocks from AI response to find executable commands
function parseCodeBlocks(content: string): { language: string; code: string }[] {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  const blocks: { language: string; code: string }[] = []
  let match
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1].toLowerCase()
    const code = match[2].trim()
    
    // ONLY include explicitly marked shell/bash commands
    // Do NOT include blocks without a language tag (they're usually output examples)
    if (['bash', 'sh', 'shell', 'zsh'].includes(language)) {
      blocks.push({ language: 'bash', code })
    }
  }
  
  return blocks
}

// Extract individual commands from a code block
// Handles heredoc, python3 -c, multi-line continuations, and --no-interaction injection
function extractCommands(codeBlock: string): string[] {
  const lines = codeBlock.split('\n')
  const commands: string[] = []
  let i = 0

  const isOutputLine = (l: string): boolean => {
    if (!l) return true
    if (l.startsWith('#') || l.startsWith('//')) return true
    if (l.startsWith('echo "')) return true
    if (l.startsWith('total ')) return true
    if (/^[d-][rwx-]{9}/.test(l)) return true
    if (/^[a-z0-9_-]+\s+\d+\s+\d+/i.test(l)) return true
    if (l.startsWith('List of devices')) return true
    if (/^\d+\s+actionable/.test(l)) return true
    if (l.startsWith('BUILD ')) return true
    if (l.startsWith('> Task')) return true
    if (l.startsWith('Starting:')) return true
    if (l.startsWith('Installed on')) return true
    if (l.startsWith('Error type')) return true
    if (l.startsWith('Error:')) return true
    if (l.startsWith('WARNING:')) return true
    if (l.startsWith('INFO')) return true
    if (l.startsWith('FAILURE:')) return true
    if (/^[A-Z][a-z]+:$/.test(l)) return true
    if (/^[\s\-|=+]+$/.test(l)) return true
    if (/^\d+\.\d+\.\d+/.test(l)) return true
    if (l.includes('at org.gradle')) return true
    if (l.includes('at java.base')) return true
    if (l.includes('Caused by:')) return true
    return false
  }
  
  while (i < lines.length) {
    const line = lines[i].trim()
    
    if (isOutputLine(line)) { i++; continue }
    
    // Heredoc: `cat > file << 'EOF'`, `python3 << 'PY'`, etc.
    const heredocMatch = line.match(/<<-?\s*['"]?(\w+)['"]?\s*$/)
    if (heredocMatch) {
      const delimiter = heredocMatch[1]
      let heredocCmd = lines[i]
      i++
      while (i < lines.length) {
        heredocCmd += '\n' + lines[i]
        if (lines[i].trim() === delimiter) break
        i++
      }
      commands.push(heredocCmd)
      i++
      continue
    }

    // python3 -c '...' spanning multiple lines (single-quoted block)
    if (/^python3?\s+-c\s+'/.test(line) && !line.endsWith("'")) {
      let multiCmd = lines[i]
      i++
      while (i < lines.length) {
        multiCmd += '\n' + lines[i]
        if (lines[i].trimEnd().endsWith("'")) { i++; break }
        i++
      }
      commands.push(multiCmd)
      continue
    }

    // Line continuation with trailing backslash
    if (line.endsWith('\\')) {
      let joined = lines[i]
      i++
      while (i < lines.length) {
        joined += '\n' + lines[i]
        if (!lines[i].trimEnd().endsWith('\\')) { i++; break }
        i++
      }
      commands.push(joined)
      continue
    }
    
    commands.push(line)
    i++
  }
  
  return commands
}

const NO_INTERACTION_TOOLS: Record<string, string> = {
  'composer': '--no-interaction',
  'artisan': '--no-interaction',
  'phpunit': '--no-interaction',
  'pint': '--no-interaction',
  'pecl': '',  // handled by stdin piping
  'npm': '--yes',
  'npx': '--yes',
  'yarn': '--non-interactive',
}

function injectNoInteraction(command: string): string {
  const trimmed = command.trim()
  for (const [tool, flag] of Object.entries(NO_INTERACTION_TOOLS)) {
    if (!flag) continue
    const toolPattern = new RegExp(`(^|/)${tool}\\b`)
    if (toolPattern.test(trimmed) && !trimmed.includes(flag)) {
      return `${trimmed} ${flag}`
    }
  }
  return command
}

// ============================================================================
// GIT SAFETY — Pre-validate git commands to prevent cascading failures
// ============================================================================

const GIT_COMMANDS_NEEDING_CLEAN_WORKTREE = ['git pull', 'git rebase', 'git merge', 'git checkout', 'git switch']
const GIT_PUSH_PREFIXES = ['git push']

function isGitMutatingCommand(cmd: string): boolean {
  const trimmed = cmd.trim()
  return [...GIT_COMMANDS_NEEDING_CLEAN_WORKTREE, ...GIT_PUSH_PREFIXES].some(p => trimmed.startsWith(p))
}

function needsCleanWorktree(cmd: string): boolean {
  return GIT_COMMANDS_NEEDING_CLEAN_WORKTREE.some(p => cmd.trim().startsWith(p))
}

function preprocessGitCommands(commands: string[]): string[] {
  const hasGitMutating = commands.some(isGitMutatingCommand)
  if (!hasGitMutating) return commands

  const result: string[] = []
  let stashInserted = false

  if (commands.some(needsCleanWorktree)) {
    result.push('git status --porcelain')
    result.push('git stash --include-untracked -m "aibuddy-auto-stash"')
    stashInserted = true
  }

  const hasPush = commands.some(c => c.trim().startsWith('git push'))
  const hasPullOrFetch = commands.some(c =>
    c.trim().startsWith('git pull') || c.trim().startsWith('git fetch') || c.trim().startsWith('git rebase')
  )
  if (hasPush && !hasPullOrFetch && !commands.some(c => c.includes('rev-parse'))) {
    result.push('git rev-parse --abbrev-ref HEAD')
  }

  result.push(...commands)

  if (stashInserted) {
    result.push('git stash pop 2>/dev/null || true')
  }

  return result
}

// Status steps for visual feedback
type StatusStep = 'idle' | 'validating' | 'reading' | 'sending' | 'thinking' | 'generating' | 'done' | 'error'

const statusConfig: Record<StatusStep, { text: string; icon: React.ReactNode; color: string }> = {
  idle: { text: 'Ready to help! 🚀', icon: <Sparkles className="w-5 h-5" />, color: '#22c55e' },
  validating: { text: '🔑 Checking your AIBuddy API key...', icon: <Key className="w-5 h-5" />, color: '#f59e0b' },
  reading: { text: '📂 Reading your files...', icon: <FileSearch className="w-5 h-5" />, color: '#3b82f6' },
  sending: { text: '☁️ Sending to AI...', icon: <Cloud className="w-5 h-5" />, color: '#8b5cf6' },
  thinking: { text: '🧠 AIBuddy is thinking...', icon: <Loader2 className="w-5 h-5 animate-spin" />, color: '#f97316' },
  generating: { text: '✍️ Writing response...', icon: <Zap className="w-5 h-5" />, color: '#ec4899' },
  done: { text: '✅ Done!', icon: <CheckCircle className="w-5 h-5" />, color: '#22c55e' },
  error: { text: '❌ Something went wrong', icon: <AlertTriangle className="w-5 h-5" />, color: '#ef4444' },
}

// ============================================================================
// API ERROR HANDLING - KAN-31 Fix
// ============================================================================

/**
 * API Error codes returned by the AIBuddy API
 */
type ApiErrorCode = 
  | 'INVALID_API_KEY'
  | 'MISSING_API_KEY'
  | 'INSUFFICIENT_CREDITS'
  | 'RATE_LIMITED'
  | 'MODEL_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * API Error response structure from the backend
 */
interface ApiErrorResponse {
  error: ApiErrorCode
  message: string
  details?: Record<string, unknown>
}

/**
 * User-friendly error message configuration
 */
interface UserFriendlyError {
  title: string
  message: string
  action?: string
  actionUrl?: string
  canRetry: boolean
}

/**
 * Parse API error response and return structured error
 */
function parseApiErrorResponse(responseBody: string | null): ApiErrorResponse | null {
  if (!responseBody) return null
  
  try {
    const parsed = JSON.parse(responseBody)
    
    // Handle standard API error format
    if (parsed.error && typeof parsed.error === 'string') {
      return {
        error: parsed.error as ApiErrorCode,
        message: parsed.message || 'An error occurred',
        details: parsed.details
      }
    }
    
    // Handle alternative error formats
    if (parsed.errorCode) {
      return {
        error: parsed.errorCode as ApiErrorCode,
        message: parsed.errorMessage || parsed.message || 'An error occurred'
      }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Map API error code to user-friendly message
 */
function mapErrorToUserMessage(error: ApiErrorResponse): UserFriendlyError {
  const errorMappings: Record<ApiErrorCode, UserFriendlyError> = {
    INVALID_API_KEY: {
      title: '🔑 Invalid API Key',
      message: 'Your API key is invalid or has expired.',
      action: 'Check Settings',
      canRetry: false
    },
    MISSING_API_KEY: {
      title: '🔑 API Key Required',
      message: 'Please add your AIBuddy API key to use the app.',
      action: 'Open Settings',
      canRetry: false
    },
    INSUFFICIENT_CREDITS: {
      title: '💳 Out of Credits',
      message: 'You\'ve run out of AIBuddy credits.',
      action: 'Buy More Credits',
      actionUrl: AIBUDDY_BUY_CREDITS_URL,
      canRetry: false
    },
    RATE_LIMITED: {
      title: '⏳ Too Many Requests',
      message: 'Please wait a moment before trying again.',
      canRetry: true
    },
    MODEL_ERROR: {
      title: '🤖 AI Model Error',
      message: 'The AI model encountered an issue. Please try again.',
      canRetry: true
    },
    SERVER_ERROR: {
      title: '🔧 Server Error',
      message: 'AIBuddy is having temporary issues. Please try again in a moment.',
      canRetry: true
    },
    UNKNOWN_ERROR: {
      title: '❌ Unexpected Error',
      message: 'Something unexpected happened.',
      canRetry: true
    }
  }
  
  return errorMappings[error.error] || {
    title: '❌ Error',
    message: error.message || 'An unknown error occurred',
    canRetry: true
  }
}

/**
 * Format error message for display in chat
 */
function formatErrorForChat(userError: UserFriendlyError): string {
  let content = `**${userError.title}**\n\n${userError.message}`
  
  if (userError.action) {
    if (userError.actionUrl) {
      content += `\n\n👉 [${userError.action}](${userError.actionUrl})`
    } else {
      content += `\n\n👉 **${userError.action}**`
    }
  }
  
  if (userError.canRetry) {
    content += '\n\n*Click Retry to try again*'
  }
  
  return content
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: ApiErrorResponse | null, httpStatus?: number): boolean {
  // Non-API errors (network issues) are generally retryable
  if (!error && httpStatus) {
    // 5xx errors are retryable
    if (httpStatus >= 500 && httpStatus < 600) return true
    // 429 rate limit is retryable
    if (httpStatus === 429) return true
    // 4xx client errors (except rate limit) are not retryable
    if (httpStatus >= 400 && httpStatus < 500) return false
  }
  
  if (!error) return true // Network errors are retryable
  
  // API-level errors
  const nonRetryableErrors: ApiErrorCode[] = [
    'INVALID_API_KEY',
    'MISSING_API_KEY',
    'INSUFFICIENT_CREDITS'
  ]
  
  return !nonRetryableErrors.includes(error.error)
}

// ============================================================================
// APP COMPONENT
// ============================================================================

function App() {
  const { t, i18n } = useTranslation()
  const [showLanguageSelector, setShowLanguageSelector] = useState(
    () => !localStorage.getItem('aibuddy_language_selected')
  )

  // Theme and font settings
  const { theme, setTheme, fontSize, setFontSize } = useTheme()
  
  // Input state (declared first for voice input dependency)
  const [input, setInput] = useState('')
  
  // Voice input / dictation
  const { 
    state: voiceState, 
    isSupported: voiceSupported, 
    interimTranscript,
    toggleListening: toggleVoice,
    errorMessage: voiceError 
  } = useVoiceInput({
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        setInput(prev => prev ? `${prev} ${transcript}` : transcript)
      }
    },
    onError: (error) => {
      toast.error(error)
    }
  })
  
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<StatusStep>('idle')
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  
  // KAN-54: Only send handoff doc on first message per conversation
  const handoffSentRef = useRef(false)

  // Credits tracking
  const [credits, setCredits] = useState<number | null>(null)
  const [lastCost, setLastCost] = useState<number | null>(null)
  const [lastModel, setLastModel] = useState<string | null>(null)
  
  // Knowledge Base
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false)
  const [knowledgeContext, setKnowledgeContext] = useState<string>('')
  
  // Environment Detection
  const [environmentSummary, setEnvironmentSummary] = useState<string>('')
  
  // Terminal output panel
  const [showTerminal, setShowTerminal] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([])
  const [isExecutingCommands, setIsExecutingCommands] = useState(false)
  const [currentCommand, setCurrentCommand] = useState<string | null>(null)
  const [terminalCollapsed, setTerminalCollapsed] = useState(true)
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null)
  const [terminalHeight, setTerminalHeight] = useState(300)
  const terminalDragRef = useRef<{ startY: number; startH: number } | null>(null)
  
  // Error recovery state
  const [deepSeekRetryCount, setDeepSeekRetryCount] = useState(0)
  
  // Image attachments
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([])
  const [attachedFiles, setAttachedFiles] = useState<CodeFileAttachment[]>([]) // KAN-6 FIX
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const codeFileInputRef = useRef<HTMLInputElement>(null) // KAN-6 FIX
  
  // Chat history
  const [showHistory, setShowHistory] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  
  // Message feedback state (thumbs up/down)
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down' | null>>({})
  
  // Track last user message for regenerate feature
  const [lastUserMessage, setLastUserMessage] = useState<{ content: string; images?: ImageAttachment[] } | null>(null)
  
  // KAN-42 FIX: Hamburger menu state for secondary actions
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  
  // Interview Mode
  const [showInterviewMode, setShowInterviewMode] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  
  // Model selection removed - backend uses smart AI routing
  // Users no longer choose models; AIBuddy automatically selects optimal model
  
  // Error and retry state
  const [lastError, setLastError] = useState<{ message: string; canRetry: boolean } | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null)
  
  // Recent threads for adaptive empty state
  const [recentThreads, setRecentThreads] = useState<ChatThread[]>([])
  const [hasUsedBefore, setHasUsedBefore] = useState(false)

  // KAN-78 FIX: Session flag to allow chatting without opening a folder first.
  // When true, bypasses the WelcomeScreen even if workspacePath is null.
  // Reset when user clicks Home to return to WelcomeScreen.
  const [chatWithoutWorkspace, setChatWithoutWorkspace] = useState<boolean>(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // KAN-35 FIX: Store AbortController ref so user can cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // KAN-42 FIX: Click outside to close hamburger menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  // Load on mount - FAST startup, no blocking network calls
  useEffect(() => {
    const init = async () => {
      const startTime = Date.now()
      addBreadcrumb('App initializing', 'app.lifecycle', { timestamp: new Date().toISOString() })
      
      const electronAPI = (window as any).electronAPI
      
      // PHASE 1: Load local data FAST (no network)
      // This should complete in <100ms
      
      // Get version dynamically from Electron (reads package.json at runtime, never hardcoded)
      let versionLoaded = false
      if (electronAPI?.app?.getVersion) {
        try {
          const v = await electronAPI.app.getVersion()
          if (v) {
            setAppVersion(v)
            versionLoaded = true
          }
        } catch {}
      }
      // Fallback: try version:get IPC handler if app:getVersion didn't work
      if (!versionLoaded && electronAPI?.version?.get) {
        try {
          const info = await electronAPI.version.get()
          if (info?.currentVersion) setAppVersion(info.currentVersion)
        } catch {}
      }
      
      // Get API key from local store
      let hasKey = false
      if (electronAPI?.store?.get) {
        try {
          const key = await electronAPI.store.get('apiKey')
          if (key) {
            setApiKey(key)
            hasKey = true
            
            // Load cached credits immediately (no network)
            // KAN-27 FIX: Check for undefined/null explicitly to handle 0 credits
            const cachedCredits = await electronAPI.store.get('cachedCredits')
            if (cachedCredits !== undefined && cachedCredits !== null) {
              setCredits(cachedCredits)
              console.log('[App] Loaded cached credits:', cachedCredits)
            }
            
            // KAN-27 FIX: Load last cost and model so they display after reopening
            const savedLastCost = await electronAPI.store.get('lastCost')
            const savedLastModel = await electronAPI.store.get('lastModel')
            if (savedLastCost !== undefined && savedLastCost !== null) {
              setLastCost(savedLastCost)
              console.log('[App] Loaded cached lastCost:', savedLastCost)
            }
            if (savedLastModel) {
              setLastModel(savedLastModel)
              console.log('[App] Loaded cached lastModel:', savedLastModel)
            }
          }
        } catch (err) {
          addBreadcrumb('Failed to load API key', 'app.init', { error: (err as Error).message }, 'error')
        }
        
        // Load recent threads for adaptive empty state
        try {
          const threads = await electronAPI.history.getThreads() as ChatThread[]
          if (threads && threads.length > 0) {
            setRecentThreads(threads.slice(0, 5)) // Top 5 recent
            setHasUsedBefore(true)
            
            // KAN-37 FIX: Restore the most recent thread's messages on startup
            // so responses don't disappear after reopening the app
            try {
              const activeThread = await electronAPI.history.getActiveThread() as ChatThread | null
              const threadToRestore = activeThread || threads[0] // Fallback to most recent
              if (threadToRestore?.id && threadToRestore.messages?.length > 0) {
                const loadedMessages: Message[] = threadToRestore.messages.map((msg: any) => ({
                  id: msg.id,
                  role: msg.role || 'user',
                  content: msg.content || '',
                  cost: msg.cost,
                  model: msg.model,
                  images: msg.images?.map((img: any) => ({
                    id: img.id,
                    base64: img.base64,
                    mimeType: img.mimeType,
                  })),
                }))
                setMessages(loadedMessages)
                setActiveThreadId(threadToRestore.id)
                // KAN-27 FIX: Also restore cost/model from thread
                if (threadToRestore.totalCost !== undefined) setLastCost(threadToRestore.totalCost)
                if (threadToRestore.model) setLastModel(threadToRestore.model)
                console.log(`[App] KAN-37 FIX: Restored ${loadedMessages.length} messages from thread ${threadToRestore.id}`)
                addBreadcrumb('Restored active thread on startup', 'app.init', {
                  threadId: threadToRestore.id,
                  messageCount: loadedMessages.length,
                })
              } else if (threadToRestore?.id) {
                // Thread exists but no embedded messages - load via getThread
                const fullThread = await electronAPI.history.getThread(threadToRestore.id) as ChatThread | null
                if (fullThread?.messages?.length) {
                  const loadedMessages: Message[] = fullThread.messages.map((msg: any) => ({
                    id: msg.id,
                    role: msg.role || 'user',
                    content: msg.content || '',
                    cost: msg.cost,
                    model: msg.model,
                  }))
                  setMessages(loadedMessages)
                  setActiveThreadId(fullThread.id)
                  if (fullThread.totalCost !== undefined) setLastCost(fullThread.totalCost)
                  if (fullThread.model) setLastModel(fullThread.model)
                  console.log(`[App] KAN-37 FIX: Restored ${loadedMessages.length} messages via getThread(${fullThread.id})`)
                }
              }
            } catch (restoreErr) {
              console.warn('[App] Could not restore active thread:', restoreErr)
              addBreadcrumb('Failed to restore active thread', 'app.init', { 
                error: (restoreErr as Error).message 
              }, 'warning')
            }
          }
        } catch {}
        
        // KAN-53 FIX: Do NOT auto-restore workspacePath from recentWorkspaces.
        // The WelcomeScreen already shows recent projects for the user to choose.
        // Auto-restoring bypassed the landing page entirely, preventing project switching.
      }
      
      const phase1Time = Date.now() - startTime
      addBreadcrumb('App init phase 1 complete (local data)', 'app.lifecycle', { 
        phase1TimeMs: phase1Time,
        hasKey
      })
      
      // PHASE 2: Background operations (non-blocking)
      // These run after UI is interactive
      
      // Validate API key in background (don't await)
      if (hasKey && electronAPI?.store?.get) {
        const key = await electronAPI.store.get('apiKey')
        if (key) {
          // Fire and forget - don't block UI
          validateApiKey(key, false) // false = don't show toast on startup
        }
      }
      // No auto-open of settings on first launch — the WelcomeScreen handles onboarding.
      // Previously this forced showSettings(true) which showed an error-like panel on launch.
      
      // Detect environment in background (don't await)
      if (electronAPI?.environment?.getSummary) {
        electronAPI.environment.getSummary()
          .then((envSummary: string) => {
            if (envSummary) {
              setEnvironmentSummary(envSummary)
              addBreadcrumb('Environment detected', 'app.init', { 
                summaryLength: envSummary.length 
              })
            }
          })
          .catch(() => {}) // Ignore errors
      }
      
      const totalTime = Date.now() - startTime
      addBreadcrumb('App initialization complete', 'app.lifecycle', { 
        initTimeMs: totalTime,
        phase1TimeMs: phase1Time,
        hasApiKey: hasKey,
        platform: navigator.platform
      })
      
      // Track slow initialization (should be <200ms now)
      trackSlowOperation('App Initialization', totalTime, 500)
      
      // Set up terminal output listeners
      if (electronAPI?.terminal?.onOutput) {
        const unsubOutput = electronAPI.terminal.onOutput((data: { type: string; text: string; command: string }) => {
          setTerminalOutput(prev => [...prev, {
            type: data.type === 'stderr' ? 'stderr' : 'stdout',
            text: data.text,
            timestamp: Date.now()
          }])
          // Auto-scroll terminal
          setTimeout(() => {
            const terminalEl = document.getElementById('terminal-output')
            if (terminalEl) terminalEl.scrollTop = terminalEl.scrollHeight
          }, 50)
        })
        
        // Clean up on unmount
        return () => unsubOutput()
      }
    }
    init()
  }, [])
  
  // Auto-scroll terminal when output changes
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [terminalOutput])
  
  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      toast.success('🌐 Back online!')
      addBreadcrumb('Network restored', 'network', {})
    }
    
    const handleOffline = () => {
      setIsOffline(true)
      toast.error('📡 You are offline. Check your internet connection.')
      addBreadcrumb('Network lost', 'network', {})
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl modifier
      const isMod = e.metaKey || e.ctrlKey
      
      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 'k':
            // Cmd+K: Open settings
            e.preventDefault()
            setShowSettings(true)
            trackButtonClick('keyboard_shortcut', 'App', { shortcut: 'Cmd+K' })
            break
          case 'n':
            // Cmd+N: New chat
            e.preventDefault()
            setMessages([])
            setActiveThreadId(null)
            setMessageFeedback({}) // KAN-28 FIX: Clear feedback when starting new chat
            setInput('')
            setAttachedImages([])
            inputRef.current?.focus()
            toast.info('🆕 Started new chat')
            trackButtonClick('keyboard_shortcut', 'App', { shortcut: 'Cmd+N' })
            break
          case 'h':
            // Cmd+H: Toggle history (prevent default hide window)
            e.preventDefault()
            setShowHistory(prev => !prev)
            trackButtonClick('keyboard_shortcut', 'App', { shortcut: 'Cmd+H' })
            break
          case '/':
            // Cmd+/: Focus input
            e.preventDefault()
            inputRef.current?.focus()
            break
        }
      }
      
      // Escape key handlers
      if (e.key === 'Escape') {
        // KAN-35 FIX: Escape cancels in-flight requests first
        if (isLoading && abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
          setIsLoading(false)
          setStatus('idle')
          toast.info('Request cancelled')
          addBreadcrumb('User cancelled request via Escape', 'ui.action')
        } else if (showSettings) {
          setShowSettings(false)
        } else if (showHistory) {
          setShowHistory(false)
        } else if (showKnowledgeBase) {
          setShowKnowledgeBase(false)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettings, showHistory, showKnowledgeBase, isLoading])

  // Validate API key and get credits (non-blocking, background operation)
  const validateApiKey = async (key: string, showToast = true) => {
    // Don't block UI - validation happens in background
    // Status stays 'idle' so user can interact immediately
    addBreadcrumb('Validating API key (background)', 'api.validation', { keyPrefix: key.substring(0, 10) + '...' })
    
    const startTime = Date.now()
    
    // Use AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for validation (was 10s — too aggressive for slow networks)
    
    try {
      // Use API Gateway for quick validation (29s limit is fine for this)
      const response = await fetch(AIBUDDY_API_INFERENCE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: key,
          model: 'claude-3-5-haiku-20241022', // Cheapest model for validation
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5, // Minimal tokens
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime
      const data = await response.json()
      console.log('[App] API validation response:', data)
      
      // KAN-31 FIX: Check for API errors in the response
      if (data.error) {
        console.log('[App] API validation error:', data.error, data.message)
        
        // Parse the error using our new error handling functions
        const apiError = parseApiErrorResponse(JSON.stringify(data))
        
        if (apiError) {
          addBreadcrumb('API key validation failed', 'api.validation', {
            errorCode: apiError.error,
            errorMessage: apiError.message,
            responseTime
          }, 'error')
          
          // Show specific error messages based on error type
          if (showToast) {
            if (apiError.error === 'INVALID_API_KEY') {
              toast.error('🔑 Your API key is invalid. Please check Settings.')
              // Open settings so user can fix the key
              setTimeout(() => setShowSettings(true), 1000)
            } else if (apiError.error === 'MISSING_API_KEY') {
              toast.error('🔑 API key is missing. Please add it in Settings.')
              setTimeout(() => setShowSettings(true), 1000)
            } else if (apiError.error === 'INSUFFICIENT_CREDITS') {
              toast.error(`💳 You're out of credits. Buy more at aibuddy.life`)
              setCredits(0)
            } else {
              toast.warning(`⚠️ API validation issue: ${apiError.message}`)
            }
          }
          return // Don't continue with success flow
        }
      }
      
      if (data.remaining_credits !== undefined) {
        setCredits(data.remaining_credits)
        
        // Cache credits locally for instant display next time
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.store?.set) {
          electronAPI.store.set('cachedCredits', data.remaining_credits)
          electronAPI.store.set('creditsLastUpdated', Date.now())
        }
        
        if (showToast) {
          toast.success(`✅ AIBuddy API key valid! You have ${data.remaining_credits.toFixed(2)} credits`)
        }
        
        // Track successful validation
        addBreadcrumb('API key validated successfully', 'api.validation', {
          credits: data.remaining_credits,
          responseTime,
          status: response.status
        })
        
        // Track if credits are low
        if (data.remaining_credits < 5) {
          addBreadcrumb('Low credits warning', 'billing', { 
            credits: data.remaining_credits 
          }, 'warning')
          toast.warning('⚠️ Low credits! Consider buying more at aibuddy.life')
        }
      }
    } catch (err) {
      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime
      
      // Don't show error on startup - just log it
      // User can still use the app, validation will retry on first message
      const errMsg = (err as Error).message
      const isTimeout = errMsg.includes('aborted') || errMsg.includes('abort')
      console.log(`[App] API validation skipped (${isTimeout ? 'timeout after 30s' : 'network issue'}):`, errMsg)
      
      // Try to load cached credits
      // KAN-27 FIX: Check for undefined/null explicitly to handle 0 credits
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.store?.get) {
        try {
          const cachedCredits = await electronAPI.store.get('cachedCredits')
          const lastUpdated = await electronAPI.store.get('creditsLastUpdated')
          if (cachedCredits !== undefined && cachedCredits !== null && lastUpdated) {
            const ageMinutes = (Date.now() - lastUpdated) / 60000
            if (ageMinutes < 60) { // Use cache if less than 1 hour old
              setCredits(cachedCredits)
              console.log('[App] Using cached credits (network failed):', cachedCredits)
              addBreadcrumb('Using cached credits', 'api.validation', { 
                cachedCredits, 
                ageMinutes: ageMinutes.toFixed(1) 
              })
            }
          }
        } catch {}
      }
      
      // Only track as error if it's not a timeout/abort
      if ((err as Error).name !== 'AbortError') {
        addBreadcrumb('API key validation failed', 'api.validation', {
          error: (err as Error).message,
          responseTime
        }, 'warning') // Warning, not error - app still works
      }
    }
  }

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input
  useEffect(() => {
    if (!showSettings) {
      inputRef.current?.focus()
    }
  }, [showSettings])

  const handleOpenFolder = async (defaultPath?: string | null) => {
    trackButtonClick(defaultPath ? 'Open Folder on Desktop' : 'Open Folder', 'App')
    addBreadcrumb(defaultPath ? 'User clicked Open Folder (Desktop)' : 'User clicked Open Folder', 'ui.click', { component: 'header' })
    
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.dialog?.openFolder) {
      const path = await electronAPI.dialog.openFolder(defaultPath ?? undefined)
      if (path) {
        setWorkspacePath(path)
        // Save to recent
        try {
          const recent = await electronAPI.store.get('recentWorkspaces') || []
          const updated = [path, ...recent.filter((p: string) => p !== path)].slice(0, 10)
          await electronAPI.store.set('recentWorkspaces', updated)
        } catch {}
        toast.success(`📂 Opened: ${path.split('/').pop()}`)
        
        // Track folder selection with details
        addBreadcrumb('Workspace folder selected', 'workspace', { 
          path,
          folderName: path.split('/').pop(),
          recentCount: 1
        })
        
        // Detect project type for better AI context
        const projectType = detectProjectType(path)
        addBreadcrumb('Project type detected', 'workspace', { 
          path,
          projectType
        })
      }
    } else {
      addBreadcrumb('Electron API not available for folder dialog', 'error', {}, 'warning')
    }
  }
  
  // Detect project type from folder path - comprehensive detection
  const detectProjectType = (path: string): string => {
    const folderName = path.toLowerCase()
    
    // Android/Kotlin detection
    if (folderName.includes('android') || folderName.includes('kotlin') || 
        folderName.includes('gradle') || folderName.includes('raptor')) {
      return 'Android (Kotlin/Java) - Run: ./gradlew assembleDebug'
    }
    
    // iOS/Swift detection
    if (folderName.includes('ios') || folderName.includes('swift') || 
        folderName.includes('xcode') || folderName.includes('cocoa')) {
      return 'iOS (Swift) - Run: xcodebuild build'
    }
    
    // React/Next.js detection
    if (folderName.includes('react') || folderName.includes('next') || 
        folderName.includes('vite') || folderName.includes('create-react')) {
      return 'React/Next.js - Run: npm run dev'
    }
    
    // Vue detection
    if (folderName.includes('vue') || folderName.includes('nuxt')) {
      return 'Vue.js - Run: npm run dev'
    }
    
    // Angular detection
    if (folderName.includes('angular')) {
      return 'Angular - Run: ng serve'
    }
    
    // Python detection
    if (folderName.includes('python') || folderName.includes('django') || 
        folderName.includes('flask') || folderName.includes('fastapi')) {
      return 'Python - Run: python main.py or python manage.py runserver'
    }
    
    // Node.js detection
    if (folderName.includes('node') || folderName.includes('express') || 
        folderName.includes('nest') || folderName.includes('koa')) {
      return 'Node.js - Run: npm start'
    }
    
    // .NET detection
    if (folderName.includes('dotnet') || folderName.includes('.net') || 
        folderName.includes('csharp') || folderName.includes('blazor')) {
      return '.NET - Run: dotnet run'
    }
    
    // Rust detection
    if (folderName.includes('rust') || folderName.includes('cargo')) {
      return 'Rust - Run: cargo run'
    }
    
    // Go detection
    if (folderName.includes('golang') || folderName.includes('-go')) {
      return 'Go - Run: go run .'
    }
    
    // Electron detection
    if (folderName.includes('electron') || folderName.includes('desktop')) {
      return 'Electron - Run: npm run dev'
    }
    
    // Flutter detection
    if (folderName.includes('flutter') || folderName.includes('dart')) {
      return 'Flutter - Run: flutter run'
    }
    
    // WordPress detection
    if (folderName.includes('wordpress') || folderName.includes('wp-')) {
      return 'WordPress - PHP project'
    }
    
    return 'Unknown project type - will analyze files to determine'
  }

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    trackButtonClick('Save API Key', 'App')
    trackSettingsChange('api_key', true)
    addBreadcrumb('User saving API key', 'settings', { 
      keyLength: apiKeyInput.trim().length,
      keyPrefix: apiKeyInput.trim().substring(0, 10) + '...'
    })
    
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.store?.set) {
      await electronAPI.store.set('apiKey', apiKeyInput.trim())
      addBreadcrumb('API key saved to store', 'settings')
    }
    
    setApiKey(apiKeyInput.trim())
    setShowSettings(false)
    trackPanelToggle('Settings', false)
    
    // Validate and get credits
    validateApiKey(apiKeyInput.trim())
    setApiKeyInput('')
  }
  
  // Add terminal output helper -- caps at MAX_TERMINAL_LINES to prevent DOM bloat
  const addTerminalLine = (type: TerminalOutput['type'], text: string) => {
    setTerminalOutput(prev => {
      const next = [...prev, { type, text, timestamp: Date.now() }]
      if (next.length > MAX_TERMINAL_LINES) {
        return next.slice(next.length - MAX_TERMINAL_LINES)
      }
      return next
    })
  }
  
  // Clear terminal
  const clearTerminal = () => {
    setTerminalOutput([])
    setTaskProgress(null)
    setTerminalCollapsed(true)
  }

  // Drag-to-resize terminal (Cursor-style)
  const handleTerminalDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    terminalDragRef.current = { startY: e.clientY, startH: terminalHeight }
    const onMove = (ev: MouseEvent) => {
      if (!terminalDragRef.current) return
      const delta = terminalDragRef.current.startY - ev.clientY
      const next = Math.max(120, Math.min(window.innerHeight * 0.75, terminalDragRef.current.startH + delta))
      setTerminalHeight(next)
      setTerminalCollapsed(false)
    }
    const onUp = () => {
      terminalDragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [terminalHeight])
  
  // Image handling functions - using Electron native dialog
  // KAN-6/KAN-12 FIX: Added defensive checks and better error handling with detailed logging
  const handleImageSelectWithElectron = async () => {
    console.log('[ImageSelect] Starting image selection...')
    
    try {
      // KAN-6: Defensive check for electronAPI availability
      if (!window.electronAPI) {
        console.error('[ImageSelect] window.electronAPI is undefined')
        addBreadcrumb('Image select failed - electronAPI undefined', 'error', {}, 'error')
        toast.error('Desktop features not available. Please restart the app.')
        return
      }
      
      console.log('[ImageSelect] electronAPI available, checking dialog...')
      
      if (!window.electronAPI.dialog?.openFile) {
        console.error('[ImageSelect] electronAPI.dialog.openFile not available')
        addBreadcrumb('Image select failed - API not available', 'error', { api: 'dialog.openFile' }, 'error')
        toast.error('File picker not available. Please restart the app.')
        return
      }
      
      if (!window.electronAPI.fs?.readFile) {
        console.error('[ImageSelect] electronAPI.fs.readFile not available')
        addBreadcrumb('Image select failed - API not available', 'error', { api: 'fs.readFile' }, 'error')
        toast.error('File system access not available. Try drag and drop instead.')
        return
      }

      console.log('[ImageSelect] Opening dialog for images...')
      addBreadcrumb('Opening image file dialog', 'ui.action', { action: 'openFile' })
      
      // Use Electron's native dialog to select images (fixes macOS sandbox issue)
      let filePath: string | null = null
      try {
        filePath = await window.electronAPI.dialog.openFile([
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
        ])
        console.log('[ImageSelect] Dialog returned:', filePath ? 'path received' : 'cancelled/null')
      } catch (dialogError) {
        console.error('[ImageSelect] Dialog threw error:', dialogError)
        addBreadcrumb('Image dialog threw error', 'error', { error: (dialogError as Error).message }, 'error')
        toast.error('Could not open file picker. Try drag and drop instead.')
        return
      }
      
      if (!filePath) {
        console.log('[ImageSelect] User cancelled dialog')
        addBreadcrumb('Image dialog cancelled by user', 'ui.action')
        return // User cancelled
      }
      
      console.log('[ImageSelect] Image selected:', filePath)
      addBreadcrumb('Image file selected', 'ui.action', { path: filePath })
      
      // KAN-6/KAN-12 FIX: Use readFileAsBase64 to avoid "Buffer is not defined" error
      // Buffer is not available in Electron renderer with contextIsolation: true
      // The main process does the Buffer->base64 conversion and returns a plain string
      let base64: string
      try {
        console.log('[ImageSelect] Reading file as base64...')
        base64 = await window.electronAPI.fs.readFileAsBase64(filePath)
        console.log('[ImageSelect] File read success, base64 length:', base64?.length)
      } catch (readError) {
        console.error('[ImageSelect] Failed to read file:', readError)
        addBreadcrumb('Failed to read image file', 'error', { 
          path: filePath, 
          error: (readError as Error).message 
        }, 'error')
        toast.error(`Cannot read file. Check permissions or try drag and drop.`)
        return
      }
      
      // KAN-6: Validate base64 is not empty
      if (!base64 || base64.length === 0) {
        console.error('[ImageSelect] File base64 is empty')
        addBreadcrumb('Image file base64 empty', 'error', { path: filePath }, 'error')
        toast.error('File appears to be empty. Please select a different image.')
        return
      }
      
      console.log('[ImageSelect] Base64 length:', base64.length)
      
      // Determine MIME type from extension
      const extension = filePath.split('.').pop()?.toLowerCase() || 'png'
      const mimeTypes: Record<string, ImageAttachment['mimeType']> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp'
      }
      const mimeType = mimeTypes[extension] || 'image/png'
      
      // Get file name from path
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'image'
      console.log('[ImageSelect] File:', fileName, 'Type:', mimeType)
      
      // Get file size
      let fileSize: number
      try {
        const stat = await window.electronAPI.fs.stat(filePath)
        fileSize = stat.size
        console.log('[ImageSelect] File size from stat:', fileSize)
      } catch (statError) {
        console.error('[ImageSelect] Failed to get file stats:', statError)
        // KAN-6 FIX: Estimate size from base64 length (base64 is ~4/3 of original)
        fileSize = Math.ceil(base64.length * 3 / 4)
        addBreadcrumb('Using base64 estimated file size', 'warning', { fallback: true })
      }
      
      // Check file size (max 10MB)
      if (fileSize > 10 * 1024 * 1024) {
        console.warn('[ImageSelect] File too large:', fileSize)
        addBreadcrumb('Image too large', 'error', { size: fileSize, max: 10 * 1024 * 1024 }, 'error')
        toast.error(`${fileName} is too large (max 10MB)`)
        return
      }
      
      const compressed = await compressBase64Image(base64, mimeType)
      
      const newImage = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        name: fileName,
        size: compressed.base64.length
      }
      
      setAttachedImages(prev => [...prev, newImage])
      console.log('[ImageSelect] SUCCESS: Image attached:', fileName, 'compressed from', base64.length, 'to', compressed.base64.length)
      
      toast.success(`📷 Added: ${fileName}`)
      addBreadcrumb('Image attached via dialog', 'chat.image', { 
        name: fileName, 
        originalSize: fileSize,
        compressedSize: compressed.base64.length,
        type: compressed.mimeType 
      })
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error'
      const errorStack = (error as Error).stack || 'No stack trace'
      console.error('[ImageSelect] UNEXPECTED ERROR:', error)
      console.error('[ImageSelect] Error message:', errorMessage)
      console.error('[ImageSelect] Stack trace:', errorStack)
      addBreadcrumb('Image select unexpected error', 'error', { 
        error: errorMessage,
        stack: errorStack.substring(0, 500) 
      }, 'error')
      
      // KAN-6: Provide more specific error messages based on error type
      if (errorMessage.includes('permission') || errorMessage.includes('EACCES')) {
        toast.error('Permission denied. Try drag and drop instead.')
      } else if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
        toast.error('File not found. Please select a different file.')
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        toast.error('Network error. Please try again.')
      } else if (errorMessage.includes('cancel') || errorMessage.includes('Cancel')) {
        // User cancelled - no error message needed
        console.log('[ImageSelect] User cancelled')
      } else {
        toast.error(`Failed to select image: ${errorMessage.substring(0, 50)}`)
      }
    }
  }
  
  // KAN-6 FIX: Code file selection using Electron native dialog
  // KAN-12 FIX: Added defensive checks and better error handling
  const handleCodeFileSelectWithElectron = async () => {
    console.log('[CodeFileSelect] Starting file selection...')
    
    try {
      // KAN-6: Defensive check for electronAPI availability
      if (!window.electronAPI) {
        console.error('[CodeFileSelect] window.electronAPI is undefined')
        addBreadcrumb('Code file select failed - electronAPI undefined', 'error', {}, 'error')
        toast.error('Desktop features not available. Please restart the app.')
        return
      }
      
      console.log('[CodeFileSelect] electronAPI available, checking dialog...')
      
      if (!window.electronAPI.dialog?.openFile) {
        console.error('[CodeFileSelect] electronAPI.dialog.openFile not available')
        addBreadcrumb('Code file select failed - API not available', 'error', { api: 'dialog.openFile' }, 'error')
        toast.error('File picker not available. Please restart the app.')
        return
      }
      
      if (!window.electronAPI.fs?.readFile) {
        console.error('[CodeFileSelect] electronAPI.fs.readFile not available')
        addBreadcrumb('Code file select failed - API not available', 'error', { api: 'fs.readFile' }, 'error')
        toast.error('File system access not available. Try drag and drop instead.')
        return
      }
      
      // All supported code file extensions
      const codeExtensions = Object.keys(CODE_FILE_EXTENSIONS)
      console.log('[CodeFileSelect] Opening dialog with extensions:', codeExtensions.length, 'types')
      
      addBreadcrumb('Opening code file dialog', 'ui.action', { action: 'openFile', extensionCount: codeExtensions.length })
      
      let filePath: string | null = null
      try {
        filePath = await window.electronAPI.dialog.openFile([
          { name: 'Code Files', extensions: codeExtensions },
          { name: 'All Files', extensions: ['*'] }
        ])
        console.log('[CodeFileSelect] Dialog returned:', filePath ? 'path received' : 'cancelled/null')
      } catch (dialogError) {
        console.error('[CodeFileSelect] Dialog threw error:', dialogError)
        addBreadcrumb('Dialog threw error', 'error', { error: (dialogError as Error).message }, 'error')
        toast.error('Could not open file picker. Try drag and drop instead.')
        return
      }
      
      if (!filePath) {
        console.log('[CodeFileSelect] User cancelled dialog')
        addBreadcrumb('Code file dialog cancelled by user', 'ui.action')
        return // User cancelled
      }
      
      console.log('[CodeFileSelect] File selected:', filePath)
      addBreadcrumb('Code file selected', 'ui.action', { path: filePath })
      
      // KAN-6/KAN-12 FIX: Use readFileAsText to avoid "Buffer is not defined" error
      // Buffer is not available in Electron renderer with contextIsolation: true
      // The main process reads and returns a plain UTF-8 string
      let content: string
      try {
        console.log('[CodeFileSelect] Reading file as text...')
        content = await window.electronAPI.fs.readFileAsText(filePath)
        console.log('[CodeFileSelect] File read success, content length:', content?.length)
      } catch (readError) {
        console.error('[CodeFileSelect] Failed to read file:', readError)
        addBreadcrumb('Failed to read code file', 'error', { 
          path: filePath, 
          error: (readError as Error).message 
        }, 'error')
        toast.error(`Cannot read file. Check permissions or try drag and drop.`)
        return
      }
      
      // KAN-6: Validate content is not empty
      if (!content || content.length === 0) {
        console.error('[CodeFileSelect] File content is empty')
        addBreadcrumb('Code file content empty', 'error', { path: filePath }, 'error')
        toast.error('File appears to be empty. Please select a different file.')
        return
      }
      
      console.log('[CodeFileSelect] Content length:', content.length, 'characters')
      
      // Get file name and extension
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'file'
      const extension = fileName.split('.').pop()?.toLowerCase() || 'txt'
      const language = CODE_FILE_EXTENSIONS[extension] || 'text'
      console.log('[CodeFileSelect] File:', fileName, 'Extension:', extension, 'Language:', language)
      
      // Get file size
      let fileSize: number
      try {
        const stat = await window.electronAPI.fs.stat(filePath)
        fileSize = stat.size
        console.log('[CodeFileSelect] File size from stat:', fileSize)
      } catch (statError) {
        console.error('[CodeFileSelect] Failed to get file stats:', statError)
        // KAN-6 FIX: Use content length as fallback (UTF-8 bytes ≈ string length for ASCII)
        fileSize = new Blob([content]).size
        addBreadcrumb('Using content length as file size', 'warning', { fallback: true })
      }
      
      // Check file size (max 1MB for code files to avoid context overflow)
      if (fileSize > 1 * 1024 * 1024) {
        console.warn('[CodeFileSelect] File too large:', fileSize)
        addBreadcrumb('Code file too large', 'error', { size: fileSize, max: 1 * 1024 * 1024 }, 'error')
        toast.error(`${fileName} is too large (max 1MB for code files)`)
        return
      }
      
      const newFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content,
        name: fileName,
        size: fileSize,
        language
      }
      
      setAttachedFiles(prev => [...prev, newFile])
      console.log('[CodeFileSelect] SUCCESS: File attached:', fileName)
      
      toast.success(`📄 Added: ${fileName}`)
      addBreadcrumb('Code file attached via dialog', 'chat.file', { 
        name: fileName, 
        size: fileSize,
        language 
      })
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error'
      const errorStack = (error as Error).stack || 'No stack trace'
      console.error('[CodeFileSelect] UNEXPECTED ERROR:', error)
      console.error('[CodeFileSelect] Error message:', errorMessage)
      console.error('[CodeFileSelect] Stack trace:', errorStack)
      addBreadcrumb('Code file select unexpected error', 'error', { 
        error: errorMessage,
        stack: errorStack.substring(0, 500)
      }, 'error')
      
      // KAN-6: Provide more specific error messages based on error type
      if (errorMessage.includes('permission') || errorMessage.includes('EACCES')) {
        toast.error('Permission denied. Try drag and drop instead.')
      } else if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
        toast.error('File not found. Please select a different file.')
      } else if (errorMessage.includes('cancel') || errorMessage.includes('Cancel')) {
        // User cancelled - no error message needed
        console.log('[CodeFileSelect] User cancelled')
      } else {
        toast.error(`Failed to select file: ${errorMessage.substring(0, 50)}`)
      }
    }
  }
  
  // KAN-96 FIX: Unified attachment handler — single Paperclip button for images + code files
  const handleAttachFileWithElectron = async () => {
    console.log('[AttachFile] Starting unified file selection...')
    
    try {
      if (!window.electronAPI) {
        console.error('[AttachFile] window.electronAPI is undefined')
        addBreadcrumb('Attach file failed - electronAPI undefined', 'error', {}, 'error')
        toast.error('Desktop features not available. Please restart the app.')
        return
      }
      
      if (!window.electronAPI.dialog?.openFile) {
        console.error('[AttachFile] electronAPI.dialog.openFile not available')
        addBreadcrumb('Attach file failed - dialog API not available', 'error', {}, 'error')
        toast.error('File picker not available. Please restart the app.')
        return
      }

      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp']
      const codeExts = Object.keys(CODE_FILE_EXTENSIONS)
      
      addBreadcrumb('Opening unified file dialog', 'ui.action', { action: 'openFile' })
      
      let filePath: string | null = null
      try {
        filePath = await window.electronAPI.dialog.openFile([
          { name: 'All Supported Files', extensions: [...imageExts, ...codeExts] },
          { name: 'Images', extensions: imageExts },
          { name: 'Code Files', extensions: codeExts },
          { name: 'All Files', extensions: ['*'] }
        ])
        console.log('[AttachFile] Dialog returned:', filePath ? 'path received' : 'cancelled/null')
      } catch (dialogError) {
        console.error('[AttachFile] Dialog threw error:', dialogError)
        addBreadcrumb('File dialog threw error', 'error', { error: (dialogError as Error).message }, 'error')
        toast.error('Could not open file picker. Try drag and drop instead.')
        return
      }
      
      if (!filePath) {
        console.log('[AttachFile] User cancelled dialog')
        return
      }
      
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'file'
      const extension = fileName.split('.').pop()?.toLowerCase() || ''
      const isImage = imageExts.includes(extension)
      
      console.log('[AttachFile] Selected:', fileName, 'isImage:', isImage)
      addBreadcrumb('File selected', 'ui.action', { path: filePath, isImage })
      
      if (isImage) {
        if (!window.electronAPI.fs?.readFileAsBase64) {
          toast.error('File system access not available.')
          return
        }
        
        let base64: string
        try {
          base64 = await window.electronAPI.fs.readFileAsBase64(filePath)
        } catch (readError) {
          console.error('[AttachFile] Failed to read image:', readError)
          toast.error('Cannot read file. Check permissions or try drag and drop.')
          return
        }
        
        if (!base64 || base64.length === 0) {
          toast.error('File appears to be empty.')
          return
        }
        
        const mimeTypes: Record<string, ImageAttachment['mimeType']> = {
          'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
          'gif': 'image/gif', 'webp': 'image/webp'
        }
        const mimeType = mimeTypes[extension] || 'image/png'
        
        let fileSize: number
        try {
          const stat = await window.electronAPI.fs.stat(filePath)
          fileSize = stat.size
        } catch {
          fileSize = Math.ceil(base64.length * 3 / 4)
        }
        
        if (fileSize > 10 * 1024 * 1024) {
          toast.error(`${fileName} is too large (max 10MB)`)
          return
        }
        
        const compressed = await compressBase64Image(base64, mimeType)
        setAttachedImages(prev => [...prev, {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          base64: compressed.base64,
          mimeType: compressed.mimeType,
          name: fileName,
          size: compressed.base64.length
        }])
        
        toast.success(`📷 Added: ${fileName}`)
        addBreadcrumb('Image attached via unified dialog', 'chat.image', { name: fileName, type: mimeType })
      } else {
        if (!window.electronAPI.fs?.readFileAsText) {
          toast.error('File system access not available.')
          return
        }
        
        let content: string
        try {
          content = await window.electronAPI.fs.readFileAsText(filePath)
        } catch (readError) {
          console.error('[AttachFile] Failed to read code file:', readError)
          toast.error('Cannot read file. Check permissions.')
          return
        }
        
        if (!content || content.length === 0) {
          toast.error('File appears to be empty.')
          return
        }
        
        const language = CODE_FILE_EXTENSIONS[extension] || 'text'
        
        let fileSize: number
        try {
          const stat = await window.electronAPI.fs.stat(filePath)
          fileSize = stat.size
        } catch {
          fileSize = new Blob([content]).size
        }
        
        if (fileSize > 1 * 1024 * 1024) {
          toast.error(`${fileName} is too large (max 1MB for code files)`)
          return
        }
        
        setAttachedFiles(prev => [...prev, {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          name: fileName,
          size: fileSize,
          language
        }])
        
        toast.success(`📄 Added: ${fileName}`)
        addBreadcrumb('Code file attached via unified dialog', 'chat.file', { name: fileName, language })
      }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error'
      console.error('[AttachFile] UNEXPECTED ERROR:', error)
      addBreadcrumb('Unified file select error', 'error', { error: errorMessage }, 'error')
      
      if (errorMessage.includes('cancel') || errorMessage.includes('Cancel')) {
        return
      }
      toast.error(`Failed to attach file: ${errorMessage.substring(0, 50)}`)
    }
  }

  // KAN-6 FIX: Remove attached code file
  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
    toast.info('📄 File removed')
  }
  
  // Legacy HTML file input handler (fallback)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`)
        continue
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`)
        continue
      }
      
      try {
        const { base64, mimeType } = await compressImage(file)
        setAttachedImages(prev => [...prev, {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          base64,
          mimeType,
          name: file.name,
          size: base64.length
        }])
        toast.success(`📷 Added: ${file.name}`)
        addBreadcrumb('Image attached', 'chat.image', { 
          name: file.name, 
          originalSize: file.size,
          compressedSize: base64.length,
          type: mimeType 
        })
      } catch (err) {
        console.error('[App] Image compression failed:', err)
        toast.error(`Failed to process ${file.name}`)
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handlePasteImage = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        
        try {
          const { base64, mimeType } = await compressImage(file)
          setAttachedImages(prev => [...prev, {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            base64,
            mimeType,
            name: `pasted-image-${Date.now()}.jpeg`,
            size: base64.length
          }])
          toast.success('📷 Image pasted from clipboard!')
          addBreadcrumb('Image pasted', 'chat.image', { 
            originalSize: file.size,
            compressedSize: base64.length,
            type: mimeType 
          })
        } catch (err) {
          console.error('[App] Paste image compression failed:', err)
          toast.error('Failed to process pasted image')
        }
      }
    }
  }, [])
  
  const removeImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id))
    toast.info('Image removed')
  }
  
  const clearAllImages = () => {
    setAttachedImages([])
  }
  
  // Drag and drop handlers for images
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }
  
  // KAN-96 FIX: Unified drag-and-drop handler — accepts both images and code files
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    const codeExtensions = Object.keys(CODE_FILE_EXTENSIONS)
    let imageCount = 0
    let fileCount = 0
    
    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      const isImage = file.type.startsWith('image/') || imageExtensions.includes(extension)
      const isCode = codeExtensions.includes(extension)
      
      if (isImage) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`)
          continue
        }
        try {
          const { base64, mimeType } = await compressImage(file)
          setAttachedImages(prev => [...prev, {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            base64, mimeType, name: file.name, size: base64.length
          }])
          addBreadcrumb('Image dropped', 'chat.image', { name: file.name, type: mimeType })
          imageCount++
        } catch (error) {
          console.error('Failed to process dropped image:', error)
          toast.error(`Failed to process ${file.name}`)
        }
      } else if (isCode) {
        if (file.size > 1 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 1MB for code files)`)
          continue
        }
        try {
          const content = await file.text()
          const language = CODE_FILE_EXTENSIONS[extension] || 'text'
          setAttachedFiles(prev => [...prev, {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content, name: file.name, size: file.size, language
          }])
          addBreadcrumb('Code file dropped', 'chat.file', { name: file.name, language })
          fileCount++
        } catch (error) {
          console.error('Failed to process dropped file:', error)
          toast.error(`Failed to process ${file.name}`)
        }
      } else {
        toast.error(`${file.name}: unsupported file type`)
      }
    }
    
    const parts: string[] = []
    if (imageCount > 0) parts.push(`📷 ${imageCount} image${imageCount > 1 ? 's' : ''}`)
    if (fileCount > 0) parts.push(`📄 ${fileCount} file${fileCount > 1 ? 's' : ''}`)
    if (parts.length > 0) toast.success(`Added ${parts.join(' + ')}!`)
  }
  
  // Call AI with smart backend routing
  // Backend automatically selects optimal model based on task analysis:
  // - GPT-5.3-Codex: Code generation, images (best coding, 25% faster)
  // - Claude Opus 4: Complex reasoning, debugging, refactoring (80.9% SWE-bench)
  // - DeepSeek V3: Simple tasks (cost optimization, ~60% of requests)
  const callAIWithRouting = async (
    messages: { role: string; content: string | any[] }[],
    systemPrompt: string,
    purpose: 'execution' | 'analysis' = 'execution',
    retryCount = 0,
    hasImages = false
  ): Promise<{ response: string; model: string; cost: number; credits: number }> => {
    // Backend handles all model selection via smart routing
    // We just send the request and let the backend decide
    addBreadcrumb('AI call with backend smart routing', 'api.routing', {
      purpose,
      hasImages,
      retryCount
    })
    
    const response = await fetch(AIBUDDY_API_INFERENCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIBuddy-API-Key': apiKey || '',
      },
      body: JSON.stringify({
        api_key: apiKey,
        // No model selection - backend uses smart routing
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 4096,
        has_images: hasImages, // Help backend route to multimodal model if needed
      }),
    })
    
    // Check for non-JSON responses (WAF blocks, server errors, etc.)
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      const text = await response.text()
      console.error('[App] Non-JSON response:', response.status, text.substring(0, 200))
      throw new Error(`Server returned non-JSON response (${response.status}). This may be a temporary issue - please try again.`)
    }
    
    const data = await response.json()
    
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || data.message || 'API request failed')
    }
    
    // Extract response text
    let responseText = ''
    if (data.response) {
      responseText = data.response
    } else if (data.content && Array.isArray(data.content)) {
      responseText = data.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n')
    }
    
    return {
      response: responseText,
      model: data.model || 'auto-routed',
      cost: data.api_cost || 0,
      credits: data.remaining_credits || 0
    }
  }
  
  // Execute commands with error recovery loop and task progress tracking
  const executeCommandsWithRecovery = async (
    commands: string[],
    originalRequest: string
  ): Promise<{ results: CommandResult[]; needsMoreHelp: boolean; errorSummary: string }> => {
    const results: CommandResult[] = []
    const electronAPI = (window as any).electronAPI
    let hasErrors = false
    let errorSummary = ''
    
    if (!electronAPI?.terminal?.execute || !workspacePath) {
      return { results: [], needsMoreHelp: false, errorSummary: 'Terminal not available' }
    }
    
    setShowTerminal(true)
    setIsExecutingCommands(true)

    const describeCommand = (cmd: string): string => {
      const c = cmd.trim().split(/\s+/)
      const base = (c[0] || '').replace(/^.*\//, '')
      if (['git', 'composer', 'npm', 'yarn', 'pnpm'].includes(base)) return `${base} ${c[1] || ''}`
      if (base === 'phpunit' || cmd.includes('phpunit')) return 'Running tests'
      if (base === 'pint' || cmd.includes('pint')) return 'Code style check'
      if (base === 'php-cs-fixer' || cmd.includes('php-cs-fixer')) return 'Code style check'
      if (base === 'python3' || base === 'python') return 'Running Python script'
      if (base === 'cat' && cmd.includes('<<')) return 'Creating file'
      if (base === 'cd') return `Changing directory`
      if (base === 'mkdir') return 'Creating directory'
      if (['ls', 'pwd', 'echo'].includes(base)) return base
      return (cmd || '').substring(0, 40)
    }

    const steps = commands.map(describeCommand)
    setTaskProgress({
      totalCommands: commands.length,
      completedCommands: 0,
      passedCommands: 0,
      failedCommands: 0,
      currentStep: steps[0] || '',
      steps,
    })
    
    for (let idx = 0; idx < commands.length; idx++) {
      const command = commands[idx]
      setCurrentCommand(command)
      addTerminalLine('command', `$ ${command}`)

      setTaskProgress(prev => prev ? {
        ...prev,
        completedCommands: idx,
        currentStep: steps[idx] || '',
      } : prev)
      
      try {
        const result = await electronAPI.terminal.execute(command, workspacePath)
        
        results.push({
          command,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executed: true
        })
        
        if (result.stdout) addTerminalLine('stdout', result.stdout)
        if (result.stderr) addTerminalLine('stderr', result.stderr)
        
        if (result.exitCode === 0) {
          addTerminalLine('success', `✓ ${describeCommand(command)} succeeded`)
          setTaskProgress(prev => prev ? { ...prev, passedCommands: prev.passedCommands + 1, completedCommands: idx + 1 } : prev)
        } else {
          hasErrors = true
          errorSummary += `Command "${command}" failed with exit code ${result.exitCode}:\n${result.stderr || result.stdout}\n\n`
          addTerminalLine('error', `✗ ${describeCommand(command)} failed (exit ${result.exitCode})`)
          setTaskProgress(prev => prev ? { ...prev, failedCommands: prev.failedCommands + 1, completedCommands: idx + 1 } : prev)
        }
        
      } catch (execErr) {
        hasErrors = true
        const errMsg = (execErr as Error).message
        errorSummary += `Command "${command}" threw error: ${errMsg}\n\n`
        
        results.push({ command, stdout: '', stderr: errMsg, exitCode: -1, executed: false })
        addTerminalLine('error', `✗ Error: ${errMsg}`)
        setTaskProgress(prev => prev ? { ...prev, failedCommands: prev.failedCommands + 1, completedCommands: idx + 1 } : prev)
      }
    }
    
    setCurrentCommand(null)
    setIsExecutingCommands(false)
    setTaskProgress(prev => prev ? { ...prev, completedCommands: commands.length, currentStep: 'Done' } : prev)
    
    return { results, needsMoreHelp: hasErrors, errorSummary }
  }
  
  // Analyze errors and get fix suggestions from AI
  const analyzeErrorsAndGetFix = async (
    originalRequest: string,
    errorSummary: string,
    retryCount: number
  ): Promise<string> => {
    const errorAnalysisPrompt = `You are AIBuddy, an expert developer assistant. The user asked to "${originalRequest}" but some commands failed.

ERRORS ENCOUNTERED:
${errorSummary}

ENVIRONMENT INFO:
${environmentSummary || 'Not available'}

WORKSPACE: ${workspacePath}

Analyze these errors and provide a DIFFERENT approach (do NOT retry the same failing commands):
1. A brief explanation of what went wrong
2. The EXACT commands to fix the issue (in bash code blocks)
3. If it's a version/compatibility issue, suggest the specific fix

GIT-SPECIFIC RULES:
- If a git command failed, ALWAYS run \`git status\` first to check repository state
- If there are uncommitted changes, run \`git stash --include-untracked\` before pull/rebase/merge
- If push was rejected (non-fast-forward), run \`git pull --rebase origin <branch>\` first
- NEVER blindly retry the same git command that already failed — diagnose the state first
- After fixing, run \`git stash pop\` to restore stashed changes

Be concise and actionable. Use an alternative approach, not the same commands that failed.`

    try {
      const result = await callAIWithRouting(
        [{ role: 'user', content: `Fix these errors:\n${errorSummary}` }],
        errorAnalysisPrompt,
        'execution',
        retryCount
      )
      
      // Update credits
      if (result.credits) {
        setCredits(result.credits)
      }
      
      return result.response
    } catch (err) {
      console.error('[App] Error analysis failed:', err)
      return `Unable to analyze errors: ${(err as Error).message}`
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    // KAN-6 FIX: Also check for attached code files
    if ((!input.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || isLoading) return

    // Track user action
    trackButtonClick('send_message', 'App', { 
      messageLength: input.trim().length,
      imageCount: attachedImages.length,
      fileCount: attachedFiles.length // KAN-6 FIX
    })

    if (!apiKey) {
      setShowSettings(true)
      toast.error('🔑 Please add your AIBuddy API key first! Get one at aibuddy.life')
      addBreadcrumb('API key missing - showing settings', 'user.action', { trigger: 'send_message' }, 'warning')
      return
    }

    const trimmedInput = input.trim()
    const currentImages = [...attachedImages] // Copy images before clearing
    const currentFiles = [...attachedFiles] // KAN-6 FIX: Copy files before clearing
    
    // KAN-6 FIX: Build message content with code files
    let messageContent = trimmedInput
    if (currentFiles.length > 0) {
      const fileContext = currentFiles.map(f => 
        `\n\n📄 **File: ${f.name}** (${f.language})\n\`\`\`${f.language}\n${f.content}\n\`\`\``
      ).join('')
      messageContent = trimmedInput 
        ? `${trimmedInput}\n\n---\n**Attached Code Files:**${fileContext}`
        : `Please analyze these code files:${fileContext}`
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent || (currentImages.length > 0 ? '📷 [Image attached - please analyze]' : ''),
      images: currentImages.length > 0 ? currentImages : undefined
    }

    // Track user message
    trackUserMessage(userMessage.content.length, currentImages.length > 0, false, messages.length === 0)
    addBreadcrumb('User sent message', 'chat', { 
      messageLength: userMessage.content.length,
      isFirstMessage: messages.length === 0,
      hasKnowledgeContext: !!knowledgeContext,
      workspacePath: workspacePath || 'none',
      imageCount: currentImages.length
    })

    // Create or get active thread for history
    let threadId = activeThreadId
    if (!threadId || messages.length === 0) {
      // Create new thread for first message
      try {
        const thread = await window.electronAPI.history.createThread(trimmedInput, workspacePath || undefined) as ChatThread
        threadId = thread.id
        setActiveThreadId(thread.id)
      } catch (err) {
        console.error('[App] Failed to create thread:', err)
      }
    }

    // Save user message to history
    if (threadId) {
      try {
        await window.electronAPI.history.addMessage(threadId, {
          role: 'user',
          content: userMessage.content,
          images: currentImages.length > 0 ? currentImages : undefined
        })
      } catch (err) {
        console.error('[App] Failed to save user message to history:', err)
      }
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setAttachedImages([]) // Clear attached images after sending
    setAttachedFiles([]) // KAN-6 FIX: Clear attached code files after sending
    setIsLoading(true)
    setLastCost(null)
    setLastModel(null)
    
    // Reset DeepSeek retry count for new conversation
    setDeepSeekRetryCount(0)
    
    // Clear terminal for new task if user is asking to run something
    const userWantsExecution = trimmedInput.toLowerCase().match(/\b(run|execute|build|test|start|install|deploy|fix|debug)\b/)
    if (userWantsExecution) {
      clearTerminal()
      addTerminalLine('info', `🚀 Starting task: ${trimmedInput.substring(0, 100)}...`)
    }

    // Progress through status steps - KAN-33 FIX: Removed 700ms of artificial delays
    // Before: 200ms + 300ms + 200ms = 700ms wasted before API call even starts
    // After: Instant status transitions, no setTimeout delays
    setStatus('validating')
    setStatus('sending')
    setStatus('thinking')

    const startTime = Date.now()
    const hasImages = currentImages.length > 0

    try {
      console.log('[App] Sending API request...', hasImages ? `with ${currentImages.length} image(s)` : '')
      
      // Build messages array - handle images for vision-capable models
      const chatMessages: any[] = messages.map(m => {
        if (m.images && m.images.length > 0) {
          // Message with images - use content array format
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              ...m.images.map(img => ({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: img.mimeType,
                  data: img.base64
                }
              }))
            ]
          }
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content
        }
      })
      
      // Add current message with images if present
      // KAN-95 FIX: Use userMessage.content (includes code files) instead of trimmedInput
      if (currentImages.length > 0) {
        chatMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: userMessage.content || 'Please analyze this image and help me fix any issues you see.' },
            ...currentImages.map(img => ({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mimeType,
                data: img.base64
              }
            }))
          ]
        })
      } else {
        chatMessages.push({ role: 'user', content: userMessage.content })
      }

      // KAN-54: Only load handoff doc on first message per conversation to reduce cost
      let handoffDoc: string | undefined
      if (!handoffSentRef.current && workspacePath && window.electronAPI?.fs?.readFileAsText) {
        try {
          const handoffPath = `${workspacePath.replace(/\/$/, '')}/COMPLETE_SYSTEM_HANDOFF.md`
          handoffDoc = await window.electronAPI.fs.readFileAsText(handoffPath)
          if (handoffDoc && handoffDoc.length > 45000) {
            handoffDoc = handoffDoc.slice(0, 45000) + '\n\n...[truncated for context length]'
          }
          handoffSentRef.current = true
        } catch {
          // No handoff file or read failed – continue without it
        }
      }

      // Backend handles model selection via smart routing
      // We just indicate if images are present so backend can route to multimodal model
      const isExecutionTask = userWantsExecution !== null && !hasImages
      
      // Track AI request - model will be determined by backend smart routing
      trackAIRequest({
        model: 'auto-routed', // Backend selects optimal model
        messageCount: chatMessages.length + 1, // +1 for system
        hasImages,
        hasTools: false
      })
      addBreadcrumb('Sending AI request', 'api.request', {
        routing: 'smart-backend',
        messageCount: chatMessages.length + 1,
        hasKnowledgeContext: !!knowledgeContext,
        isExecutionTask,
        hasImages,
        imageCount: currentImages.length
      })

      // Using ALB (Application Load Balancer) - same as VS Code extension
      // ALB has NO timeout limit - can wait for Lambda's full 5-minute timeout
      // This fixes Claude Opus 4.5 timeout issues (can take 2+ minutes)
      const TIMEOUT_MS = 300_000 // 5 minutes (same as VS Code extension)
      let response: Response | null = null

      // Prepare request body - backend handles model selection via smart routing
      const requestBody = {
        api_key: apiKey,
        has_images: hasImages, // Backend uses this for smart model routing
        messages: [
          { 
            role: 'system', 
            content: generateSystemPrompt({
              workspacePath: workspacePath || undefined,
              projectType: workspacePath ? detectProjectType(workspacePath) : undefined,
              knowledgeContext: knowledgeContext || undefined,
              environmentSummary: environmentSummary || undefined,
              hasImages,
              handoffDoc: handoffDoc || undefined,
              platformContext: DESKTOP_PLATFORM_CONTEXT,
              uiLanguage: i18n.language,
            })
          },
          ...chatMessages
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }

      // KAN-54: Token-based truncation — keep total input tokens under MAX_CONTEXT_TOKENS
      const systemTokens = estimateTokenCount(typeof requestBody.messages[0]?.content === 'string' ? requestBody.messages[0].content : '')
      let totalTokens = systemTokens
      const conversationMsgs = requestBody.messages.slice(1)
      for (const msg of conversationMsgs) {
        const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        totalTokens += estimateTokenCount(text)
      }
      if (totalTokens > MAX_CONTEXT_TOKENS && conversationMsgs.length > 2) {
        console.log(`[KAN-54] Estimated ${totalTokens} tokens exceeds MAX_CONTEXT_TOKENS (${MAX_CONTEXT_TOKENS}). Trimming history...`)
        while (totalTokens > MAX_CONTEXT_TOKENS && conversationMsgs.length > 2) {
          const removed = conversationMsgs.shift()
          const removedText = typeof removed?.content === 'string' ? removed.content : JSON.stringify(removed?.content)
          totalTokens -= estimateTokenCount(removedText)
        }
        requestBody.messages = [requestBody.messages[0], ...conversationMsgs]
        console.log(`[KAN-54] Trimmed to ${conversationMsgs.length} messages (~${totalTokens} tokens)`)
      }

      let serializedBody = JSON.stringify(requestBody)

      try {
        toast.info(`🚀 Sending to AI...`)
        const controller = new AbortController()
        abortControllerRef.current = controller // KAN-35 FIX: Store for cancel button
        const timeoutId = setTimeout(() => {
          console.log(`[App] Request timeout after ${TIMEOUT_MS/1000}s, aborting...`)
          controller.abort()
        }, TIMEOUT_MS)

        // KAN-33 FIX: Track fetch timing for performance monitoring
        const fetchStartTime = Date.now()
        const preProcessMs = fetchStartTime - startTime
        console.log(`[Perf] Pre-processing took ${preProcessMs}ms`)
        
        let payloadSize = new Blob([serializedBody]).size
        console.log(`[Perf] Request payload size: ${(payloadSize / 1024 / 1024).toFixed(2)}MB`)

        // Auto-truncate conversation history if payload exceeds server limit
        if (payloadSize > MAX_PAYLOAD_BYTES) {
          console.log(`[App] Payload ${(payloadSize / 1024).toFixed(0)}KB exceeds limit ${(MAX_PAYLOAD_BYTES / 1024).toFixed(0)}KB — auto-truncating...`)

          // Strategy: keep system prompt + strip images from old messages + trim oldest messages
          const systemMsg = requestBody.messages[0]
          let conversationMsgs = requestBody.messages.slice(1)

          // Step 1: Strip base64 images from all messages except the latest user message
          // KAN-95 FIX: Desktop uses type 'image' (Anthropic format), not 'image_url'
          conversationMsgs = conversationMsgs.map((msg: any, idx: number) => {
            if (idx < conversationMsgs.length - 1 && msg.content && Array.isArray(msg.content)) {
              return { ...msg, content: msg.content.filter((part: any) => part.type !== 'image') }
            }
            return msg
          })

          // Step 2: Truncate long message content in history (keep first 2000 chars)
          conversationMsgs = conversationMsgs.map((msg: any, idx: number) => {
            if (idx < conversationMsgs.length - 1 && typeof msg.content === 'string' && msg.content.length > 2000) {
              return { ...msg, content: msg.content.substring(0, 2000) + '\n\n...[truncated for context length]' }
            }
            return msg
          })

          requestBody.messages = [systemMsg, ...conversationMsgs]
          serializedBody = JSON.stringify(requestBody)
          payloadSize = new Blob([serializedBody]).size
          console.log(`[Perf] After image strip + truncation: ${(payloadSize / 1024).toFixed(0)}KB`)

          // Step 3: If still too large, progressively remove oldest messages (keep last 4 turns)
          while (payloadSize > MAX_PAYLOAD_BYTES && conversationMsgs.length > 2) {
            conversationMsgs.shift()
            requestBody.messages = [systemMsg, ...conversationMsgs]
            serializedBody = JSON.stringify(requestBody)
            payloadSize = new Blob([serializedBody]).size
          }
          console.log(`[Perf] Final payload: ${(payloadSize / 1024).toFixed(0)}KB (${conversationMsgs.length} messages)`)

          if (payloadSize > MAX_PAYLOAD_BYTES) {
            toast.error(`📦 Message too large (${(payloadSize / 1024).toFixed(0)}KB). Try starting a new chat or removing images.`)
            addBreadcrumb('Payload too large after truncation', 'api.error', { payloadSize, max: MAX_PAYLOAD_BYTES })
            setStatus('error')
            return
          }

          toast.info(`📋 Trimmed conversation history to fit server limits (${conversationMsgs.length} messages kept)`)
        }

        response = await fetch(AIBUDDY_API_INFERENCE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AIBuddy-API-Key': apiKey || '',
            'X-Requested-With': 'AIBuddy-Desktop',
            'User-Agent': `AIBuddy-Desktop/${appVersion || 'unknown'}`,
          },
          body: serializedBody,
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        
        const fetchEndTime = Date.now()
        const networkMs = fetchEndTime - fetchStartTime
        console.log(`[Perf] Network request took ${networkMs}ms (${(networkMs / 1000).toFixed(1)}s)`)

      } catch (fetchError: any) {
        console.log(`[App] Fetch error:`, fetchError.name, fetchError.message)
        
        // Timeout/abort error
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          toast.error('⏱️ Request timed out. The AI is taking too long. Try a simpler question.')
          addBreadcrumb('API timeout', 'api.timeout', { timeoutMs: TIMEOUT_MS })
          setStatus('idle')
          setIsLoading(false)
          return
        }
        
        // Network errors
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          toast.error('🌐 Network error. Check your internet connection.')
          setStatus('error')
          setIsLoading(false)
          return
        }
        
        throw fetchError
      }

      // If no response
      if (!response) {
        console.error('[App] No response received')
        toast.error(`❌ No response from server`)
        setStatus('error')
        setIsLoading(false)
        return
      }

      const responseTime = Date.now() - startTime
      console.log('[App] API response status:', response.status)
      
      // Track response status
      addBreadcrumb('API response received', 'api.response', {
        status: response.status,
        responseTime,
        ok: response.ok
      })

      // Handle specific HTTP errors with user-friendly messages
      if (response.status === 504) {
        // Gateway Timeout - shouldn't happen with ALB (no timeout limit)
        // But handle it just in case
        toast.error('⏱️ Request timed out. The AI is taking too long. Try a simpler question.')
        addBreadcrumb('Gateway timeout', 'api.error', { status: 504, responseTime })
        setStatus('idle')
        return
      }

      if (response.status === 401) {
        toast.error('🔑 Invalid API key. Please check your AIBuddy API key in settings.')
        addBreadcrumb('Auth failed', 'api.error', { status: 401 })
        setStatus('error')
        return
      }

      if (response.status === 429) {
        toast.error('⏳ Rate limited. Please wait a moment and try again.')
        addBreadcrumb('Rate limited', 'api.error', { status: 429 })
        setStatus('idle')
        return
      }

      if (response.status === 500 || response.status === 502 || response.status === 503) {
        toast.error('🔧 Server error. AIBuddy is having issues. Please try again in a moment.')
        addBreadcrumb('Server error', 'api.error', { status: response.status })
        setStatus('error')
        return
      }

      if (response.status === 413) {
        toast.error('📦 Message too large for server. Try starting a new chat (Cmd+N) or removing images.')
        addBreadcrumb('Payload too large (server 413)', 'api.error', { status: 413, payloadSize: new Blob([serializedBody]).size })
        setStatus('error')
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await response.text()
        console.error('[App] Non-JSON response:', response.status, text.substring(0, 200))
        toast.error(`Server returned an unexpected response (${response.status}). Please try again.`)
        addBreadcrumb('Non-JSON response', 'api.error', { status: response.status, contentType, body: text.substring(0, 200) })
        setStatus('error')
        return
      }
      
      setStatus('generating')
      
      // KAN-34 FIX: Wrap JSON parsing with try-catch for HTML error pages
      const JSON_PARSE_TIMEOUT = 60_000
      let data: any
      try {
        data = await Promise.race([
          response.json(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Response body parsing timed out after 60s')), JSON_PARSE_TIMEOUT)
          )
        ]) as any
      } catch (parseErr) {
        console.error('[App] JSON parse failed (server likely returned HTML):', (parseErr as Error).message)
        toast.error('Server returned an invalid response. Please try again.')
        addBreadcrumb('JSON parse failed', 'api.error', { status: response.status, error: (parseErr as Error).message }, 'error')
        setStatus('error')
        setIsLoading(false)
        return
      }
      console.log('[App] API response data:', data)

      // KAN-31 FIX: Check for API-level errors in response body
      if (data.error) {
        console.log('[App] API returned error:', data.error, data.message)
        
        // Parse the error using our new error handling functions
        const apiError = parseApiErrorResponse(JSON.stringify(data))
        
        if (apiError) {
          const userMessage = mapErrorToUserMessage(apiError)
          const chatContent = formatErrorForChat(userMessage)
          const canRetry = isRetryableError(apiError, response.status)
          
          // Track error details for debugging
          addBreadcrumb('API error response', 'api.error', {
            errorCode: apiError.error,
            errorMessage: apiError.message,
            httpStatus: response.status,
            canRetry,
            responseTime
          }, 'error')
          
          setStatus('error')
          setLastError({
            message: apiError.message,
            canRetry
          })
          
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: chatContent
          }
          setMessages(prev => [...prev, errorMessage])
          
          // Show appropriate toast
          if (apiError.error === 'INVALID_API_KEY' || apiError.error === 'MISSING_API_KEY') {
            toast.error('🔑 API key issue - check Settings')
          } else if (apiError.error === 'INSUFFICIENT_CREDITS') {
            toast.error('💳 Out of credits - buy more at aibuddy.life')
          } else if (apiError.error === 'RATE_LIMITED') {
            toast.warning('⏳ Rate limited - please wait')
          } else {
            toast.error('❌ ' + userMessage.title)
          }
          
          setTimeout(() => setStatus('idle'), 3000)
          return
        }
      }

      // Track AI response with full details
      trackAIResponse({
        model: data.model || 'unknown',
        outputTokens: data.usage?.output_tokens || 0,
        responseTime,
        success: response.ok && !data.error
      })

      // Track slow operations
      trackSlowOperation('AI Response', responseTime, 5000, {
        model: data.model,
        status: response.status
      })

      // Update credits
      if (data.remaining_credits !== undefined) {
        const oldCredits = credits
        setCredits(data.remaining_credits)
        if (oldCredits !== null && data.api_cost) {
          toast.info(`💰 Used ${data.api_cost.toFixed(4)} credits`)
          addBreadcrumb('Credits deducted', 'billing', {
            cost: data.api_cost,
            remaining: data.remaining_credits,
            model: data.model
          })
        }
      }
      
      // KAN-27 FIX: Track cost and model, persist to store for display after app reopen
      if (data.api_cost) {
        setLastCost(data.api_cost)
        try { window.electronAPI?.store?.set('lastCost', data.api_cost) } catch (e) { /* non-critical */ }
      }
      if (data.model) {
        setLastModel(data.model)
        try { window.electronAPI?.store?.set('lastModel', data.model) } catch (e) { /* non-critical */ }
      }

      // Extract response text
      let responseText = ''
      if (data.response) {
        responseText = data.response
      } else if (data.content && Array.isArray(data.content)) {
        responseText = data.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n')
      }

      // Check if user asked to run/execute something and auto-execute commands
      // Now with ERROR RECOVERY LOOP - will retry with AI analysis if commands fail
      let executionResults: CommandResult[] = []
      let totalExecutionOutput = ''
      const electronAPI = (window as any).electronAPI
      
      if (userWantsExecution && workspacePath && electronAPI?.terminal?.execute) {
        const codeBlocks = parseCodeBlocks(responseText)
        
        if (codeBlocks.length > 0) {
          setStatus('generating')
          setShowTerminal(true) // Show terminal panel
          
          addBreadcrumb('Auto-executing commands', 'terminal', { 
            blockCount: codeBlocks.length,
            workspacePath 
          })
          
          const allCommands: string[] = []
          for (const block of codeBlocks) {
            const commands = extractCommands(block.code)
            allCommands.push(...commands.map(injectNoInteraction))
          }
          
          const gitSafeCommands = preprocessGitCommands(allCommands)
          if (gitSafeCommands.length !== allCommands.length) {
            addTerminalLine('info', `🔒 Git safety: added pre-checks (${gitSafeCommands.length - allCommands.length} extra)`)
          }
          addTerminalLine('info', `📋 Plan: ${gitSafeCommands.length} command(s) to execute`)

          let currentRetry = 0
          const MAX_ERROR_RETRIES = 3
          let commandsToRun = gitSafeCommands
          
          while (commandsToRun.length > 0 && currentRetry <= MAX_ERROR_RETRIES) {
            addTerminalLine('info', currentRetry > 0 
              ? `🔄 Retry attempt ${currentRetry}/${MAX_ERROR_RETRIES}...` 
              : `📋 Executing ${commandsToRun.length} command(s)...`)
            
            const { results, needsMoreHelp, errorSummary } = await executeCommandsWithRecovery(
              commandsToRun,
              trimmedInput
            )
            
            executionResults.push(...results)
            
            // If there were errors and we haven't exceeded retries, ask AI for fixes
            if (needsMoreHelp && currentRetry < MAX_ERROR_RETRIES) {
              currentRetry++
              setDeepSeekRetryCount(currentRetry)
              
              addTerminalLine('info', `🤖 Analyzing errors and getting fix suggestions...`)
              toast.info(`🔧 Analyzing errors... (attempt ${currentRetry}/${MAX_ERROR_RETRIES})`)
              
              // Get fix suggestions from AI (uses DeepSeek first, then Opus)
              const fixResponse = await analyzeErrorsAndGetFix(
                trimmedInput,
                errorSummary,
                currentRetry
              )
              
              // Parse new commands from the fix response
              const fixBlocks = parseCodeBlocks(fixResponse)
              const fixCommands: string[] = []
              for (const block of fixBlocks) {
                fixCommands.push(...extractCommands(block.code).map(injectNoInteraction))
              }
              
              if (fixCommands.length > 0) {
                commandsToRun = preprocessGitCommands(fixCommands)
                addTerminalLine('info', `📝 AI suggested ${fixCommands.length} fix command(s)`)
                
                // Add fix response to output
                totalExecutionOutput += `\n\n### 🔧 Fix Attempt ${currentRetry}\n\n${fixResponse}\n`
              } else {
                // No more commands to try
                addTerminalLine('error', `❌ AI couldn't provide executable fix commands`)
                totalExecutionOutput += `\n\n### ❌ Fix Attempt ${currentRetry} Failed\n\n${fixResponse}\n`
                break
              }
            } else {
              // No errors or max retries reached
              if (needsMoreHelp) {
                addTerminalLine('error', `⚠️ Max retries reached. Some commands still failing.`)
                toast.warning('⚠️ Some commands failed after multiple attempts')
              } else {
                addTerminalLine('success', `✅ All commands completed successfully!`)
                toast.success('🎉 All commands executed successfully!')
              }
              break
            }
          }
        }
      }

      // Build a concise execution summary for chat (full output stays in terminal panel)
      let executionOutput = ''
      if (executionResults.length > 0) {
        const passed = executionResults.filter(r => r.exitCode === 0).length
        const failed = executionResults.filter(r => r.exitCode !== 0).length
        executionOutput = '\n\n---\n'
        executionOutput += `\n**${passed + failed} command(s) executed** — ${passed} passed`
        if (failed > 0) executionOutput += `, ${failed} failed`
        executionOutput += '. See Terminal panel for full output.\n'
        if (failed > 0) {
          executionOutput += '\nFailed commands:\n'
          for (const result of executionResults.filter(r => r.exitCode !== 0)) {
            executionOutput += `- \`${result.command}\` (exit ${result.exitCode})`
            if (result.stderr) executionOutput += `: ${result.stderr.split('\n')[0].substring(0, 120)}`
            executionOutput += '\n'
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: (responseText || "I'm here to help! What would you like me to do? 🤖") + executionOutput,
        cost: data.api_cost,
        model: data.model,
        tokensIn: data.usage?.input_tokens,
        tokensOut: data.usage?.output_tokens,
        executionResults
      }

      setMessages(prev => [...prev, assistantMessage])
      setStatus('done')
      
      // Save assistant message to history
      if (threadId) {
        try {
          // KAN-27 FIX: Include cost and model in message for persistence
          await window.electronAPI.history.addMessage(threadId, {
            role: 'assistant',
            content: assistantMessage.content,
            cost: data.api_cost,
            model: data.model,
            tokensIn: data.usage?.input_tokens,
            tokensOut: data.usage?.output_tokens
          })
          // Update thread metadata with cost/tokens
          await window.electronAPI.history.updateMetadata(threadId, {
            totalCost: data.api_cost,
            totalTokensIn: data.usage?.input_tokens,
            totalTokensOut: data.usage?.output_tokens,
            model: data.model
          })
        } catch (err) {
          console.error('[App] Failed to save assistant message to history:', err)
        }
      }
      
      // Track successful completion
      addBreadcrumb('AI response displayed', 'chat', {
        responseLength: responseText.length,
        model: data.model,
        cost: data.api_cost,
        totalResponseTime: responseTime,
        executionRetries: deepSeekRetryCount
      })
      
      setTimeout(() => setStatus('idle'), 2000)
      
    } catch (err) {
      const responseTime = Date.now() - startTime
      console.error('[App] API Error:', err)
      
      // Track error with full context
      trackError(err as Error, { 
        context: 'chat',
        responseTime,
        messageCount: messages.length,
        hasKnowledgeContext: !!knowledgeContext,
        workspacePath
      })
      
      addBreadcrumb('API request failed', 'api.error', {
        error: (err as Error).message,
        responseTime,
        messageCount: messages.length
      }, 'error')
      
      setStatus('error')
      
      // KAN-31 FIX: Improved error classification and messaging
      const errorMsg = (err as Error).message
      const isNetworkError = errorMsg.includes('Failed to fetch') || 
                            errorMsg.includes('NetworkError') || 
                            errorMsg.includes('timeout') ||
                            errorMsg.includes('net::') ||
                            errorMsg.includes('ECONNREFUSED')
      const isAbortError = errorMsg.includes('aborted') || (err as Error).name === 'AbortError'
      const isAuthError = errorMsg.includes('401') || 
                         errorMsg.includes('Invalid API key') ||
                         errorMsg.includes('INVALID_API_KEY')
      const isCreditsError = errorMsg.includes('credits') || 
                            errorMsg.includes('INSUFFICIENT_CREDITS')
      
      // Determine if error is retryable
      const canRetry = isNetworkError || isAbortError // Only network/timeout errors are retryable
      
      setLastError({
        message: errorMsg,
        canRetry
      })
      
      // Build user-friendly error message
      let errorContent: string
      let toastMessage: string
      
      if (isNetworkError) {
        errorContent = `🌐 **Network Error**\n\nCouldn't reach the server. This could be:\n- Your internet connection\n- A temporary server issue\n\n**Click "Retry" below to try again.**`
        toastMessage = 'Network error - click Retry to try again'
      } else if (isAbortError) {
        errorContent = `⏱️ **Request Timed Out**\n\nThe AI is taking too long to respond.\n\n**Try:**\n- Simplify your question\n- Click "Retry" to try again`
        toastMessage = 'Request timed out - click Retry'
      } else if (isAuthError) {
        errorContent = `🔑 **Invalid API Key**\n\nYour API key is invalid or has expired.\n\n👉 **Check Settings** to update your API key.\n\nGet a new key at [aibuddy.life](https://aibuddy.life)`
        toastMessage = '🔑 Invalid API key - check Settings'
      } else if (isCreditsError) {
        errorContent = `💳 **Out of Credits**\n\nYou've run out of AIBuddy credits.\n\n👉 [Buy More Credits](${AIBUDDY_BUY_CREDITS_URL})`
        toastMessage = '💳 Out of credits - buy more at aibuddy.life'
      } else {
        // Generic error with more helpful guidance
        errorContent = `❌ **Request Failed**\n\n**Error:** ${errorMsg}\n\n**Common fixes:**\n1. Check your internet connection\n2. Verify your API key in Settings\n3. Try again in a moment\n\nIf this keeps happening, contact support@aibuddy.life`
        toastMessage = 'Request failed - see error details'
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error(toastMessage)
      
      setTimeout(() => setStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      try { await window.electronAPI?.clipboard?.writeText(text) } catch {}
    }
    setCopiedId(id)
    toast.success('Copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }, [])
  
  const copyResponse = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      try { await window.electronAPI?.clipboard?.writeText(content) } catch {}
    }
    setCopiedId(messageId + '-response')
    toast.success('📋 Response copied!')
    addBreadcrumb('Response copied', 'chat.action', { messageId })
    setTimeout(() => setCopiedId(null), 2000)
  }, [])
  
  // Handle message feedback (thumbs up/down) - KAN-28 fixed
  const handleFeedback = useCallback(async (messageId: string, feedback: 'up' | 'down') => {
    setMessageFeedback(prev => {
      const currentFeedback = prev[messageId]
      const newFeedback = currentFeedback === feedback ? null : feedback
      
      const persistFeedback = async () => {
        if (activeThreadId) {
          try {
            await window.electronAPI.history.updateMessageFeedback(activeThreadId, messageId, newFeedback)
            console.log('[Feedback] Persisted to disk:', { threadId: activeThreadId, messageId, feedback: newFeedback })
          } catch (error) {
            console.error('[Feedback] Failed to persist:', error)
            setMessageFeedback(p => ({ ...p, [messageId]: currentFeedback }))
            toast.error('Failed to save feedback')
            return
          }
        }
        
        if (newFeedback) {
          toast.success(newFeedback === 'up' ? '👍 Thanks for the feedback!' : '👎 Thanks for letting us know!')
          addBreadcrumb('Message feedback', 'chat.feedback', { messageId, feedback: newFeedback })
        }
      }
      persistFeedback()
      
      return { ...prev, [messageId]: newFeedback }
    })
  }, [activeThreadId])
  
  const handleRegenerate = useCallback(async () => {
    if (isLoading) return
    
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserIdx === -1) {
      toast.error('No message to regenerate')
      return
    }
    
    const actualIdx = messages.length - 1 - lastUserIdx
    const lastUser = messages[actualIdx]
    
    const newMessages = messages.slice(0, actualIdx)
    setMessages(newMessages)
    
    const contentToResubmit = lastUser.content === '📷 [Image attached - please analyze]' ? '' : lastUser.content
    setInput(contentToResubmit)
    if (lastUser.images) {
      setAttachedImages(lastUser.images)
    }
    
    toast.info('🔄 Regenerating response...')
    addBreadcrumb('Regenerating response', 'chat.action', { messageId: lastUser.id })
    
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
    }, 100)
  }, [isLoading, messages])

  const currentStatus = statusConfig[status]

  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const codeString = String(children).replace(/\n$/, '')
      
      if (!inline && match) {
        return (
          <div className="relative group my-2">
            <button
              onClick={() => copyToClipboard(codeString, className)}
              className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <Copy className="w-3 h-3 text-slate-400" />
            </button>
            <SyntaxHighlighter
              style={vscDarkPlus as any}
              language={match[1]}
              PreTag="div"
              customStyle={{ borderRadius: '8px', fontSize: '12px' }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        )
      }
      return (
        <code 
          className="px-1 py-0.5 rounded text-xs"
          style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}
          {...props}
        >
          {children}
        </code>
      )
    }
  }), [copyToClipboard])

  const renderedMessages = useMemo(() => messages.map(message => (
    <div
      key={message.id}
      className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
    >
      {message.role === 'assistant' && (
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ 
            background: 'linear-gradient(135deg, #ec4899, #f97316)',
            boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)'
          }}
        >
          <Bot className="w-7 h-7 text-white" />
        </div>
      )}
      
      <div
        className="max-w-[85%] rounded-3xl p-5"
        style={message.role === 'user' 
          ? { 
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)', 
              color: 'white',
              boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)'
            }
          : { 
              background: 'linear-gradient(135deg, #1e293b, #0f172a)', 
              border: '2px solid #334155',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }
        }
      >
        {message.role === 'assistant' ? (
          <div className="prose prose-invert prose-sm max-w-none text-slate-200 overflow-x-auto">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {message.images.map(img => (
                  <div key={img.id} className="relative">
                    <img 
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={img.name || 'image'}
                      className="max-w-[200px] max-h-[150px] object-contain rounded-lg border-2 border-cyan-400/50 cursor-pointer hover:border-cyan-400 transition-colors"
                      onClick={() => {
                        const win = window.open()
                        if (win) {
                          win.document.write(`<img src="data:${img.mimeType};base64,${img.base64}" style="max-width:100%;max-height:100vh;margin:auto;display:block;background:#1e293b;" />`)
                          win.document.title = img.name || 'image'
                        }
                      }}
                    />
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      {(img.name || 'image').substring(0, 20)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {message.role === 'assistant' && (message.cost || message.tokensIn || message.tokensOut) && (
          <div className="mt-3 pt-2 border-t border-slate-700">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {message.cost && (
                <div className="flex items-center gap-1 text-green-400/80">
                  <Coins className="w-3 h-3" />
                  <span className="font-medium">${message.cost.toFixed(4)}</span>
                </div>
              )}
              
              {(message.tokensIn || message.tokensOut) && (
                <div className="flex items-center gap-2 text-slate-500">
                  {message.tokensIn && (
                    <span className="flex items-center gap-1">
                      <span className="text-blue-400">↑</span>
                      <span>{message.tokensIn.toLocaleString()} in</span>
                    </span>
                  )}
                  {message.tokensOut && (
                    <span className="flex items-center gap-1">
                      <span className="text-purple-400">↓</span>
                      <span>{message.tokensOut.toLocaleString()} out</span>
                    </span>
                  )}
                </div>
              )}
              
              {message.model && (
                <span className="text-slate-600 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                  {message.model.includes('deepseek') ? 'AIBuddy Reasoning' : 
                   message.model.includes('opus') ? 'AIBuddy Pro' :
                   message.model.includes('sonnet') ? 'AIBuddy Fast' : 'AIBuddy'}
                </span>
              )}
            </div>
          </div>
        )}
        
        {message.role === 'assistant' && (
          <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <Tooltip text="Copy response">
              <button
                onClick={() => copyResponse(message.content, message.id)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                {copiedId === message.id + '-response' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </Tooltip>
            
            {messages[messages.length - 1]?.id === message.id && (
              <Tooltip text="Regenerate response">
                <button
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </Tooltip>
            )}
            
            <div className="w-px h-4 bg-slate-700 mx-1" />
            
            <Tooltip text="Good response">
              <button
                onClick={() => handleFeedback(message.id, 'up')}
                className={`p-1.5 rounded-lg transition-colors ${
                  messageFeedback[message.id] === 'up' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'hover:bg-slate-700/50 text-slate-400'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
            </Tooltip>
            
            <Tooltip text="Poor response">
              <button
                onClick={() => handleFeedback(message.id, 'down')}
                className={`p-1.5 rounded-lg transition-colors ${
                  messageFeedback[message.id] === 'down' 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'hover:bg-slate-700/50 text-slate-400'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {message.role === 'user' && (
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
        >
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  )), [messages, copiedId, messageFeedback, isLoading, markdownComponents, copyToClipboard, copyResponse, handleFeedback, handleRegenerate])

  const collapsedTerminalLines = useMemo(() =>
    terminalOutput
      .filter(l => l.type === 'command' || l.type === 'success' || l.type === 'error' || l.type === 'info')
      .slice(-COLLAPSED_VISIBLE_LINES),
    [terminalOutput]
  )

  if (showLanguageSelector) {
    return (
      <LanguageSelector
        onLanguageSelected={(code) => {
          setShowLanguageSelector(false)
          addBreadcrumb('Language selected', 'ui.action', { language: code })
        }}
      />
    )
  }

  // KAN-53 FIX: Show WelcomeScreen whenever no workspace is loaded.
  // KAN-78 FIX: Also skip WelcomeScreen when user clicked "Start Chatting" (chatWithoutWorkspace).
  if (!workspacePath && !chatWithoutWorkspace) {
    return (
      <WelcomeScreen
        onOpenFolder={(path) => {
          setWorkspacePath(path)
          // Save to recent workspaces
          const electronAPI = (window as any).electronAPI
          if (electronAPI?.store?.set) {
            electronAPI.store.get('recentWorkspaces').then((recent: string[] | null) => {
              const updated = [path, ...(recent || []).filter((p: string) => p !== path)].slice(0, 10)
              electronAPI.store.set('recentWorkspaces', updated)
            }).catch(() => {})
          }
        }}
        onNewChat={() => {
          setHasUsedBefore(true)
          setChatWithoutWorkspace(true)
        }}
      />
    )
  }

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ 
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: "'Nunito', 'Comic Neue', sans-serif"
      }}
      dir={['ar', 'he'].includes(i18n.language) ? 'rtl' : 'ltr'}
    >
      {/* KAN-48/40/42 FIX: Compact header - no longer blocks scrolling */}
      <header 
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ 
          borderBottom: '2px solid #334155',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%)'
        }}
      >
        {/* Logo & Status - compact */}
        <div className="flex items-center gap-3 min-w-0">
          <Tooltip text="AIBuddy - Your Coding Friend" position="bottom">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, #ec4899, #f97316)',
                boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)'
              }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </Tooltip>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-white truncate">AIBuddy</h1>
              <span 
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: 'white',
                }}
              >
                {appVersion ? `v${appVersion}` : ''}
              </span>
            </div>
          </div>
          
          {/* Status Badge - compact */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-help flex-shrink-0"
            style={{ 
              background: `${currentStatus.color}15`,
              border: `1px solid ${currentStatus.color}`,
            }}
          >
            <div style={{ color: currentStatus.color }} className="text-sm">{currentStatus.icon}</div>
            <span className="text-xs font-bold text-white hidden sm:inline">{currentStatus.text}</span>
          </div>
        </div>

        {/* KAN-42 FIX: Clean header with primary actions + hamburger menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* KAN-53 FIX: Home button to navigate back to WelcomeScreen */}
          <Tooltip text="Home — switch project" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('Home', 'Header')
                addBreadcrumb('Home button clicked — returning to WelcomeScreen', 'ui.action')
                setWorkspacePath(null)
                setChatWithoutWorkspace(false)
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all hover:scale-105 h-8"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#94a3b8',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span className="hidden sm:inline">Home</span>
            </button>
          </Tooltip>

          {/* KAN-38 FIX: Always-visible New Chat button — cancels in-flight request if needed */}
          <Tooltip text="New chat (⌘N)" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('New Chat', 'Header')
                if (isLoading && abortControllerRef.current) {
                  abortControllerRef.current.abort()
                  abortControllerRef.current = null
                  setIsLoading(false)
                  setStatus('idle')
                }
                setMessages([])
                setActiveThreadId(null)
                setMessageFeedback({})
                setLastCost(null)
                setLastModel(null)
                setInput('')
                inputRef.current?.focus()
                toast.info(t('chat.startedNewChat'))
                addBreadcrumb('New chat from header button', 'ui.action')
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-semibold text-xs transition-all hover:scale-105 h-8"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: 'white',
                border: '1px solid rgba(99, 102, 241, 0.5)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </Tooltip>

          {/* Credits Display - compact */}
          <Tooltip text={`Credits: ${credits !== null ? credits.toFixed(2) : '...'}`} position="bottom">
            <div 
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl cursor-help h-8"
              style={{ 
                background: credits !== null && credits < 5 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : 'rgba(34, 197, 94, 0.15)',
                border: `1px solid ${credits !== null && credits < 5 ? '#ef4444' : '#22c55e'}`,
              }}
            >
              <Coins className="w-3.5 h-3.5" style={{ color: credits !== null && credits < 5 ? '#ef4444' : '#22c55e' }} />
              <span 
                className="text-xs font-bold"
                style={{ color: credits !== null && credits < 5 ? '#ef4444' : '#22c55e' }}
              >
                {credits !== null ? `${credits.toFixed(0)}` : '...'}
              </span>
            </div>
          </Tooltip>

          {/* KAN-27 FIX: Last Cost - compact inline */}
          {lastCost !== null && (
            <Tooltip text={`Last: $${lastCost.toFixed(4)}${lastModel ? ` via ${lastModel}` : ''}`} position="bottom">
              <div 
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl cursor-help h-8"
                style={{ 
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                }}
              >
                <span className="text-xs" style={{ color: '#a855f7' }}>$</span>
                <span 
                  className="text-sm font-bold"
                  style={{ color: '#a855f7' }}
                >
                  {lastCost.toFixed(4)}
                </span>
                {lastModel && (
                  <span 
                    className="text-xs font-medium ml-0.5 hidden sm:inline"
                    style={{ color: 'rgba(168, 85, 247, 0.7)' }}
                  >
                    {lastModel.length > 12 ? lastModel.substring(0, 12) + '...' : lastModel}
                  </span>
                )}
              </div>
            </Tooltip>
          )}

          {/* History - quick access */}
          <Tooltip text="Chat history" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('History', 'App')
                setShowHistory(true)
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
              style={{ 
                background: showHistory ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
              }}
            >
              <History className="w-4 h-4 text-cyan-400" />
            </button>
          </Tooltip>

          {/* Interview Mode */}
          <Tooltip text="Interview Mode - AI coaching with audio" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('Interview Mode', 'App')
                setShowInterviewMode(true)
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
              style={{ 
                background: showInterviewMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
              }}
            >
              <GraduationCap className="w-4 h-4 text-purple-400" />
            </button>
          </Tooltip>

          {/* KAN-39 FIX: Settings/API Key - clear text */}
          <Tooltip text={apiKey ? 'API Key configured' : 'Add your API key'} position="bottom">
            <button
              onClick={() => {
                trackButtonClick('Settings', 'App', { hasApiKey: !!apiKey })
                setShowSettings(true)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-semibold text-xs transition-all hover:scale-105 h-8"
              style={{ 
                background: apiKey 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: apiKey ? '#22c55e' : 'white',
                border: `1px solid ${apiKey ? '#22c55e' : '#fbbf24'}`,
              }}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey ? 'API Key ✓' : 'Add Key'}</span>
            </button>
          </Tooltip>

          {/* KAN-42 FIX: Hamburger menu for secondary actions */}
          <div className="relative" ref={moreMenuRef}>
            <Tooltip text="More actions" position="bottom">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
                style={{ 
                  background: showMoreMenu ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <Menu className="w-4 h-4 text-slate-300" />
              </button>
            </Tooltip>

            {/* Dropdown menu */}
            {showMoreMenu && (
              <div 
                className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
                style={{ 
                  background: 'linear-gradient(180deg, #1e293b, #0f172a)',
                  border: '2px solid #334155',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
                }}
              >
                {/* Open Folder */}
                <button
                  onClick={() => { handleOpenFolder(); setShowMoreMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>Open Folder</span>
                  {workspacePath && <span className="ml-auto text-xs text-green-400">●</span>}
                </button>

                {/* Open Folder on Desktop — first step when user wants to "review folder on desktop" */}
                <button
                  onClick={() => { handleOpenFolder('~/Desktop'); setShowMoreMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>Open Folder on Desktop</span>
                </button>

                {/* Terminal */}
                <button
                  onClick={() => { 
                    trackButtonClick('Terminal', 'App')
                    setShowTerminal(!showTerminal)
                    setShowMoreMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-base">🖥️</span>
                  <span>Terminal</span>
                  {showTerminal && <span className="ml-auto text-xs text-green-400">Active</span>}
                  {terminalOutput.length > 0 && !showTerminal && (
                    <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-400 px-1.5 rounded-full">{terminalOutput.length}</span>
                  )}
                </button>

                {/* Knowledge Base */}
                <button
                  onClick={() => { 
                    trackButtonClick('Knowledge Base', 'App')
                    setShowKnowledgeBase(true)
                    setShowMoreMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Knowledge Base</span>
                  {knowledgeContext && <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                </button>

                {/* Share */}
                <button
                  onClick={() => { 
                    trackButtonClick('Share', 'App', { messageCount: messages.length })
                    setShowShareModal(true)
                    setShowMoreMenu(false)
                  }}
                  disabled={messages.length === 0}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors disabled:opacity-40"
                >
                  <Share2 className="w-4 h-4 text-purple-400" />
                  <span>Share Conversation</span>
                </button>

                <div className="border-t border-slate-700 my-1" />

                {/* Buy Credits */}
                <button
                  onClick={() => {
                    trackButtonClick('Buy Credits', 'App', { currentCredits: credits })
                    const electronAPI = (window as any).electronAPI
                    if (electronAPI?.shell?.openExternal) {
                      electronAPI.shell.openExternal(AIBUDDY_BUY_CREDITS_URL)
                    } else {
                      window.open(AIBUDDY_BUY_CREDITS_URL, '_blank')
                    }
                    setShowMoreMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-green-400" />
                  <span>Buy Credits</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Folder Path - clickable to switch */}
      {workspacePath && (
        <div 
          className="px-4 py-1.5 text-xs flex items-center gap-2 group cursor-pointer hover:bg-cyan-500/10 transition-colors"
          style={{ background: 'rgba(6, 182, 212, 0.05)', borderBottom: '1px solid #334155' }}
          onClick={() => handleOpenFolder()}
          title="Click to switch project folder"
        >
          <FolderOpen className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-400">{t('workspace.workingIn')}</span>
          <span className="text-cyan-400 font-semibold truncate flex-1">{workspacePath}</span>
          <span className="text-[10px] text-slate-500 group-hover:text-cyan-400 transition-colors font-medium px-1.5 py-0.5 rounded bg-slate-800/50 group-hover:bg-cyan-500/10">
            {t('workspace.switch')}
          </span>
        </div>
      )}

      {/* KAN-48 FIX: Chat Area - min-h-0 ensures flex child can scroll properly */}
      <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            {hasUsedBefore ? (
              /* Returning User - Adaptive Welcome */
              <>
                {/* Smaller greeting for returning users */}
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ 
                    background: 'linear-gradient(135deg, #ec4899, #f97316)',
                    boxShadow: '0 8px 32px rgba(236, 72, 153, 0.4)'
                  }}
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2">
                  {t('welcome.returningUser.greeting')} 👋
                </h2>
                <p className="text-lg text-slate-400 mb-6">
                  {t('welcome.returningUser.subtitle')}
                </p>
                
                {/* Recent Chats - Quick Access */}
                {recentThreads.length > 0 && (
                  <div className="w-full max-w-md mb-6">
                    <p className="text-sm font-semibold text-slate-500 mb-2 text-left">{t('welcome.returningUser.recentChats')}</p>
                    <div className="space-y-2">
                      {recentThreads.slice(0, 3).map(thread => (
                        <button
                          key={thread.id}
                          onClick={() => {
                            setMessages(thread.messages.map((m, i) => ({
                              id: m.id || i.toString(),
                              role: m.role,
                              content: m.content,
                              images: m.images?.map(img => ({
                                id: img.id,
                                base64: img.base64,
                                mimeType: img.mimeType as ImageAttachment['mimeType'],
                                name: img.name,
                                size: 0
                              }))
                            })))
                            setActiveThreadId(thread.id)
                            // KAN-28 FIX: Load persisted feedback state from recent thread
                            const loadedFeedback: Record<string, 'up' | 'down' | null> = {}
                            thread.messages.forEach(msg => {
                              if ((msg as any).feedback) {
                                loadedFeedback[msg.id] = (msg as any).feedback
                              }
                            })
                            setMessageFeedback(loadedFeedback)
                            trackButtonClick('Recent Chat', 'WelcomeScreen', { threadId: thread.id })
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155' }}
                        >
                          <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{thread.title}</p>
                            <p className="text-xs text-slate-500">{thread.messages.length} messages</p>
                          </div>
                          <span className="text-xs text-slate-600">
                            {new Date(thread.updatedAt).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowHistory(true)}
                      className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {t('welcome.returningUser.viewAllHistory')} →
                    </button>
                  </div>
                )}
                
                {/* Quick Actions for power users */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {[
                    { icon: "🐛", text: t('actions.debugCode'), prompt: t('actions.debugPrompt') },
                    { icon: "⚡", text: t('actions.quickFix'), prompt: t('actions.quickFixPrompt') },
                    { icon: "📝", text: t('actions.explain'), prompt: t('actions.explainPrompt') },
                    { icon: "🔧", text: t('actions.refactor'), prompt: t('actions.refactorPrompt') }
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(action.prompt)
                        inputRef.current?.focus()
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}
                    >
                      <span>{action.icon}</span>
                      <span>{action.text}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* New User - Full Welcome Experience */
              <>
                {/* Big Friendly Robot */}
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center mb-6 animate-bounce"
                  style={{ 
                    background: 'linear-gradient(135deg, #ec4899, #f97316)',
                    boxShadow: '0 12px 48px rgba(236, 72, 153, 0.5)',
                    animationDuration: '2s'
                  }}
                >
                  <Sparkles className="w-16 h-16 text-white" />
                </div>
                
                {/* Big Welcome Text */}
                <h2 className="text-5xl font-black text-white mb-4">
                  {t('welcome.newUser.greeting')} 👋
                </h2>
                <p className="text-2xl text-slate-300 mb-8 max-w-lg font-semibold whitespace-pre-line">
                  {t('welcome.newUser.subtitle')} 🚀
                </p>

                {/* Big Helpful Cards */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <Tooltip text={t('welcome.newUser.typeWhat')}>
                    <div 
                      className="px-6 py-4 rounded-2xl text-lg font-bold cursor-help transition-transform hover:scale-105"
                      style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '2px solid #f472b6' }}
                    >
                      💬 {t('welcome.newUser.typeWhat')}
                    </div>
                  </Tooltip>
                  <Tooltip text={t('welcome.newUser.illDoWork')}>
                    <div 
                      className="px-6 py-4 rounded-2xl text-lg font-bold cursor-help transition-transform hover:scale-105"
                      style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '2px solid #22d3ee' }}
                    >
                      🚀 {t('welcome.newUser.illDoWork')}
                    </div>
                  </Tooltip>
                  <Tooltip text={t('welcome.newUser.watchCredits')}>
                    <div 
                      className="px-6 py-4 rounded-2xl text-lg font-bold cursor-help transition-transform hover:scale-105"
                      style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '2px solid #4ade80' }}
                    >
                      💰 {t('welcome.newUser.watchCredits')}
                    </div>
                  </Tooltip>
                </div>

                {/* Example prompts */}
                <div className="text-slate-400 text-base">
                  <p className="mb-3 font-semibold">Try saying:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Make a simple website",
                      "Create a todo list app",
                      "Help me fix this bug",
                      "Explain this code"
                    ].map((example, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          trackButtonClick('Example Prompt', 'WelcomeScreen', { prompt: example })
                          addBreadcrumb('User clicked example prompt', 'ui.click', { 
                            prompt: example,
                            index: i 
                          })
                          setInput(example)
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                        style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
                      >
                        "{example}"
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {renderedMessages}

            {/* Loading */}
            {/* Enhanced Loading/Streaming Indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse"
                  style={{ 
                    background: 'linear-gradient(135deg, #ec4899, #f97316)',
                    boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)'
                  }}
                >
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div 
                  className="rounded-2xl p-4 max-w-md"
                  style={{ background: '#1e293b', border: '2px solid #334155' }}
                >
                  <div className="flex items-center gap-3">
                    <div style={{ color: currentStatus.color }}>{currentStatus.icon}</div>
                    <span className="text-sm text-white font-semibold">{currentStatus.text}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden w-48">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: status === 'validating' ? '15%' : 
                               status === 'reading' ? '30%' : 
                               status === 'sending' ? '50%' : 
                               status === 'thinking' ? '70%' : 
                               status === 'generating' ? '90%' : '100%',
                        background: `linear-gradient(90deg, ${currentStatus.color}, ${currentStatus.color}88)`
                      }}
                    />
                  </div>
                  
                  {/* Animated typing dots for thinking/generating states */}
                  {(status === 'thinking' || status === 'generating') && (
                    <div className="mt-3 flex items-center gap-1">
                      <span className="text-xs text-slate-500">AIBuddy is typing</span>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Offline Banner */}
      {isOffline && (
        <div 
          className="mx-4 mb-2 p-3 rounded-xl flex items-center justify-between"
          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-300 font-medium">You're offline. Check your internet connection.</span>
          </div>
        </div>
      )}
      
      {/* Retry Button after error */}
      {lastError?.canRetry && !isLoading && status !== 'idle' && (
        <div className="mx-4 mb-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setLastError(null)
              setStatus('idle')
              handleRegenerate()
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
            style={{ 
              background: 'linear-gradient(135deg, #f97316, #ec4899)',
              boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)'
            }}
          >
            <RefreshCw className="w-4 h-4 text-white" />
            <span className="text-white font-medium">Retry Request</span>
          </button>
        </div>
      )}

      {/* Input */}
      <footer className="p-4" style={{ borderTop: '2px solid #334155', paddingBottom: showTerminal ? (terminalCollapsed ? '130px' : `${terminalHeight + 16}px`) : undefined }}>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {/* Image Attachments Preview - Chip-style like ChatGPT */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedImages.map(img => {
                // Get file type badge color
                const fileTypeColor = {
                  'image/png': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'PNG' },
                  'image/jpeg': { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'JPG' },
                  'image/gif': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'GIF' },
                  'image/webp': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'WebP' }
                }[img.mimeType] || { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'IMG' }
                
                // Format file size
                const formatSize = (bytes: number) => {
                  if (bytes < 1024) return `${bytes} B`
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
                  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                }
                
                return (
                  <div 
                    key={img.id}
                    className="group relative flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ 
                      background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                      border: '2px solid #334155'
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={`data:${img.mimeType};base64,${img.base64}`}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      {/* File type badge */}
                      <span className={`absolute bottom-0 left-0 right-0 text-[9px] font-bold text-center py-0.5 ${fileTypeColor.bg} ${fileTypeColor.text}`}>
                        {fileTypeColor.label}
                      </span>
                    </div>
                    
                    {/* File info */}
                    <div className="flex flex-col min-w-0 max-w-[120px]">
                      <span className="text-xs font-medium text-white truncate" title={img.name}>
                        {img.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatSize(img.size)}
                      </span>
                    </div>
                    
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="p-1 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all ml-1"
                      aria-label={`Remove ${img.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
              
              {/* Clear all button (when multiple) */}
              {attachedImages.length > 1 && (
                <button
                  type="button"
                  onClick={clearAllImages}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  style={{ border: '2px dashed #334155' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              )}
            </div>
          )}
          
          {/* KAN-6 FIX: Code File Attachments Preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedFiles.map(file => {
                // Language colors
                const langColors: Record<string, { bg: string, text: string }> = {
                  'typescript': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
                  'javascript': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
                  'python': { bg: 'bg-green-500/20', text: 'text-green-400' },
                  'java': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
                  'rust': { bg: 'bg-red-500/20', text: 'text-red-400' },
                  'go': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
                  'html': { bg: 'bg-pink-500/20', text: 'text-pink-400' },
                  'css': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
                }
                const langColor = langColors[file.language] || { bg: 'bg-slate-500/20', text: 'text-slate-400' }
                
                const formatSize = (bytes: number) => {
                  if (bytes < 1024) return `${bytes} B`
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
                  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                }
                
                return (
                  <div 
                    key={file.id}
                    className="group relative flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ 
                      background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                      border: '2px solid #334155'
                    }}
                  >
                    {/* File icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${langColor.bg}`}>
                      <FileCode className={`w-4 h-4 ${langColor.text}`} />
                    </div>
                    
                    {/* File info */}
                    <div className="flex flex-col min-w-0 max-w-[140px]">
                      <span className="text-xs font-medium text-white truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatSize(file.size)} • {file.language}
                      </span>
                    </div>
                    
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(file.id)}
                      className="p-1 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all ml-1"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
              
              {/* Clear all code files */}
              {attachedFiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAttachedFiles([])}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  style={{ border: '2px dashed #334155' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear files
                </button>
              )}
            </div>
          )}
          
          {/* Supported file types hint (shown during drag) */}
          {isDraggingOver && (
            <div className="mb-3 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
              <p className="text-xs text-indigo-300 text-center">
                <span className="font-semibold">Supported:</span> Images (PNG, JPG, GIF, WebP) • Code files (.ts, .js, .py, .java, etc.)
              </p>
            </div>
          )}
          
          {/* Input Container - with drag and drop support */}
          <div 
            className={`relative rounded-3xl transition-all ${isDraggingOver ? 'scale-[1.02]' : ''}`}
            style={{ 
              background: isDraggingOver 
                ? 'linear-gradient(135deg, #4c1d95, #7c3aed)' 
                : 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: isDraggingOver 
                ? '3px dashed #a78bfa' 
                : '3px solid #334155',
              boxShadow: isDraggingOver 
                ? '0 8px 32px rgba(139, 92, 246, 0.5)' 
                : '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay indicator */}
            {isDraggingOver && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl pointer-events-none z-10">
                <div className="text-center">
                  <Paperclip className="w-12 h-12 text-indigo-300 mx-auto mb-2 animate-bounce" />
                  <p className="text-indigo-200 font-bold text-lg">Drop files here!</p>
                  <p className="text-indigo-300/60 text-xs mt-1">Images, code files, documents</p>
                </div>
              </div>
            )}
            
            {/* Hidden file input (fallback for paste) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.ts,.tsx,.js,.jsx,.py,.java,.cpp,.c,.go,.rs,.rb,.php,.html,.css,.json,.yaml,.md,.txt"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {/* Main input row - properly aligned with items-center for vertical centering */}
            <div className="flex items-center gap-3 p-3 sm:p-4">
              {/* KAN-96 FIX: Single unified attachment button (Paperclip) */}
              <Tooltip text="Attach file or image">
                <button
                  type="button"
                  onClick={handleAttachFileWithElectron}
                  disabled={isLoading}
                  className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0 self-center"
                  style={{ 
                    background: (attachedImages.length > 0 || attachedFiles.length > 0)
                      ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
                      : 'rgba(99, 102, 241, 0.15)',
                    border: (attachedImages.length > 0 || attachedFiles.length > 0)
                      ? '2px solid #6366f1'
                      : '2px solid rgba(99, 102, 241, 0.3)'
                  }}
                  aria-label="Attach file or image"
                >
                  <Paperclip className="w-5 h-5 text-indigo-300" />
                </button>
              </Tooltip>
              
              {/* AIBuddy Smart AI Badge - Backend handles model selection */}
              <Tooltip text="Smart AI: Automatically selects the best model for your task">
                <div 
                  className="flex items-center gap-1.5 px-2.5 h-10 sm:h-11 rounded-lg flex-shrink-0"
                  style={{ 
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-300 font-medium">AIBuddy</span>
                </div>
              </Tooltip>
            
              {/* Input Area - flex-1 to take remaining space, vertically centered */}
              <div className="flex-1 min-w-0 flex items-center self-center">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  onPaste={handlePasteImage}
                  placeholder={attachedImages.length > 0 
                    ? `📷 ${t('chat.placeholderImage')}`
                    : `🤔 ${t('chat.placeholder')}`
                  }
                  className="w-full bg-transparent text-white text-base resize-none outline-none placeholder-slate-400 font-medium leading-normal py-2"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                  rows={1}
                  disabled={isLoading}
                  aria-label="Message input"
                />
              </div>
              
              {/* KAN-17 FIX: Voice Input Button - always visible, shows error if not supported */}
              <Tooltip text={
                !voiceSupported 
                  ? t('voice.notAvailable')
                  : voiceState === 'listening' 
                    ? 'Stop dictation' 
                    : 'Start voice dictation'
              }>
                <button
                  type="button"
                  onClick={() => {
                    if (!voiceSupported) {
                      toast.error('🎤 Voice input is not available in this environment. Try using the desktop app on a system with microphone permissions enabled.')
                      addBreadcrumb('Voice input not supported', 'ui.action', { reason: 'no_speech_api' }, 'warning')
                      return
                    }
                    toggleVoice()
                  }}
                  disabled={isLoading}
                  className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0 self-center ${
                    voiceState === 'listening' ? 'animate-pulse' : ''
                  }`}
                  style={{ 
                    background: voiceState === 'listening' 
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                      : !voiceSupported
                        ? 'rgba(107, 114, 128, 0.1)'
                        : 'rgba(107, 114, 128, 0.2)',
                    border: voiceState === 'listening' 
                      ? '2px solid #ef4444' 
                      : '2px solid #6b7280',
                    boxShadow: voiceState === 'listening' 
                      ? '0 0 20px rgba(239, 68, 68, 0.5)' 
                      : 'none',
                    opacity: !voiceSupported ? 0.5 : 1
                  }}
                  aria-label={voiceState === 'listening' ? 'Stop voice input' : 'Start voice input'}
                >
                  {voiceState === 'listening' ? (
                    <MicOff className="w-5 h-5 text-white" />
                  ) : (
                    <Mic className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </Tooltip>
              
              {/* KAN-35 FIX: Stop Button - prominent, like ChatGPT/Claude stop button */}
              {isLoading && (
                <Tooltip text="Stop generating (Esc)">
                  <button
                    type="button"
                    onClick={() => {
                      if (abortControllerRef.current) {
                        abortControllerRef.current.abort()
                        abortControllerRef.current = null
                      }
                      setIsLoading(false)
                      setStatus('idle')
                      toast.info('⏹ Response stopped')
                      addBreadcrumb('User stopped request', 'ui.action')
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 h-10 sm:h-11 rounded-xl transition-all hover:scale-105 active:scale-95 flex-shrink-0 self-center animate-pulse"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.5)',
                      border: '2px solid rgba(239, 68, 68, 0.6)'
                    }}
                    aria-label="Stop generating"
                  >
                    <Square className="w-4 h-4 text-white fill-white" />
                    <span className="text-white text-sm font-bold">Stop</span>
                  </button>
                </Tooltip>
              )}

              {/* Send Button - aligned with input */}
              <Tooltip text="🚀 Send message">
                <button
                  type="submit"
                  disabled={(!input.trim() && attachedImages.length === 0) || isLoading}
                  className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0 self-center"
                  style={{ 
                    background: (input.trim() || attachedImages.length > 0) && !isLoading 
                      ? 'linear-gradient(135deg, #ec4899, #f97316)'
                      : 'rgba(100,100,100,0.3)',
                    boxShadow: (input.trim() || attachedImages.length > 0) && !isLoading 
                      ? '0 4px 16px rgba(236, 72, 153, 0.4)'
                      : 'none'
                  }}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </Tooltip>
            </div>
            
            {/* Helper text - outside the main row */}
            <div className="px-4 pb-3 pt-1">
              <p className="text-xs text-slate-500">
                ↵ Enter to send • ⇧↵ New line • Drag/paste images • <span className="text-purple-400">Supports PNG, JPG, GIF, WebP</span>
              </p>
            </div>
          </div>
          
          {/* Keyboard shortcuts hint */}
          <p className="text-center text-slate-500 text-xs mt-2">
            <Keyboard className="w-3 h-3 inline mr-1" />
            <span className="text-slate-600">⌘K</span> Settings • <span className="text-slate-600">⌘N</span> New Chat • <span className="text-slate-600">⌘H</span> History
          </p>
        </form>
      </footer>

      {/* Settings Modal - Big & Friendly */}
      {/* KAN-22/KAN-19 FIX: Added overflow-y-auto and max-h for scrollable settings */}
      {showSettings && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
        >
          <div 
            className="w-full max-w-lg p-8 pb-12 rounded-3xl animate-bounce-in overflow-y-auto"
            style={{ 
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '4px solid #334155',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              maxHeight: '85vh' // KAN-19: Reduced to 85vh to ensure UsageLimits panel is visible
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                >
                  <Key className="w-7 h-7 text-white" />
                </div>
                API Key 🔑
              </h2>
              <Tooltip text="Close this window">
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-3 rounded-xl hover:bg-slate-700 text-slate-400 transition-all hover:scale-110"
                >
                  <X className="w-6 h-6" />
                </button>
              </Tooltip>
            </div>

            {/* Explanation */}
            <div 
              className="p-4 rounded-2xl mb-6"
              style={{ background: 'rgba(6, 182, 212, 0.1)', border: '2px solid #06b6d4' }}
            >
              <p className="text-lg text-cyan-300 font-semibold">
                🤔 <strong>What's an API key?</strong>
              </p>
              <p className="text-base text-slate-300 mt-2">
                It's like a special password that lets you talk to me! 
                You need one to use AIBuddy.
              </p>
            </div>

            {/* Get Key Link */}
            <p className="text-lg text-slate-300 mb-4 font-semibold">
              Don't have one? 
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  const electronAPI = (window as any).electronAPI
                  if (electronAPI?.shell?.openExternal) {
                    electronAPI.shell.openExternal(AIBUDDY_BUY_CREDITS_URL)
                  }
                }}
                className="text-pink-400 hover:underline ml-2 font-bold"
              >
                Click here to get one! 🎉
              </a>
            </p>

            {/* Input Field - Big */}
            <div className="mb-6">
              <label className="block text-base font-bold text-slate-400 mb-2">
                Paste your API key here:
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="aibuddy_xxxxxxxx..."
                className="w-full px-5 py-4 rounded-2xl text-white text-lg font-mono"
                style={{ 
                  background: '#0f172a', 
                  border: '3px solid #334155',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#06b6d4'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>

            {/* Save Button - Big & Friendly */}
            <Tooltip text="Click to save your API key!">
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="w-full py-4 rounded-2xl font-black text-xl text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                style={{ 
                  background: apiKeyInput.trim() 
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'rgba(100,100,100,0.3)',
                  boxShadow: apiKeyInput.trim() 
                    ? '0 8px 24px rgba(34, 197, 94, 0.4)'
                    : 'none'
                }}
              >
                {apiKeyInput.trim() ? '✅ Save My Key!' : '⬆️ Enter your key above'}
              </button>
            </Tooltip>

            {/* Current Key Status */}
            {apiKey && (
              <div 
                className="mt-4 p-3 rounded-xl text-center"
                style={{ background: 'rgba(34, 197, 94, 0.1)', border: '2px solid #22c55e' }}
              >
                <p className="text-green-400 font-bold">
                  ✅ You already have a key saved!
                </p>
              </div>
            )}
            
            {/* Divider */}
            <div className="my-6 border-t border-slate-700" />
            
            {/* Appearance Settings */}
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              Appearance
            </h3>
            
            {/* Theme Selection */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-400 mb-2">Theme</label>
              <div className="flex gap-2">
                {(['dark', 'darker', 'system'] as Theme[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      theme === t 
                        ? 'bg-purple-500/30 border-purple-500 text-purple-300' 
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                    }`}
                    style={{ border: '2px solid' }}
                  >
                    {t === 'dark' ? '🌙 Dark' : t === 'darker' ? '🌑 Darker' : '💻 System'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Font Size */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-400 mb-2">Font Size</label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as FontSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all ${
                      fontSize === size 
                        ? 'bg-blue-500/30 border-blue-500 text-blue-300' 
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                    }`}
                    style={{ 
                      border: '2px solid',
                      fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px'
                    }}
                  >
                    {size === 'small' ? 'A Small' : size === 'large' ? 'A Large' : 'A Medium'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Keyboard Shortcuts Reference */}
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6' }}>
              <p className="text-sm font-bold text-purple-300 mb-2">⌨️ Keyboard Shortcuts</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div><kbd className="mr-1">⌘K</kbd> Settings</div>
                <div><kbd className="mr-1">⌘N</kbd> New Chat</div>
                <div><kbd className="mr-1">⌘H</kbd> History</div>
                <div><kbd className="mr-1">⌘/</kbd> Focus Input</div>
                <div><kbd className="mr-1">↵</kbd> Send Message</div>
                <div><kbd className="mr-1">Esc</kbd> Close Panel</div>
              </div>
            </div>
            
            {/* Divider */}
            <div className="my-6 border-t border-slate-700" />
            
            {/* Usage Limits */}
            <UsageLimitsPanel 
              credits={credits ?? undefined} 
              sessionMessages={messages.length}
            />
          </div>
        </div>
      )}

      <Toaster position="top-right" theme="dark" richColors />

      {/* Terminal Output Panel - Cursor-style resizable bottom panel */}
      {showTerminal && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-40 flex flex-col"
          style={{ 
            height: terminalCollapsed ? 'auto' : `${terminalHeight}px`,
            maxHeight: terminalCollapsed ? '120px' : `${terminalHeight}px`,
            background: 'linear-gradient(180deg, #0c0c0c 0%, #1a1a1a 100%)',
            borderTop: '1px solid #334155',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.4)'
          }}
        >
          {/* Drag handle - Cursor-style resize bar */}
          {!terminalCollapsed && (
            <div
              className="resize-handle-horizontal w-full flex-shrink-0 group"
              style={{ height: '6px', cursor: 'row-resize', background: 'transparent' }}
              onMouseDown={handleTerminalDragStart}
            >
              <div className="mx-auto mt-1 rounded-full transition-colors group-hover:bg-pink-500/60"
                style={{ width: '40px', height: '3px', background: 'rgba(100,116,139,0.4)' }} />
            </div>
          )}

          {/* Terminal Header with progress summary */}
          <div 
            className="flex items-center justify-between px-4 py-1.5 cursor-pointer select-none flex-shrink-0"
            style={{ borderBottom: '1px solid #1e293b', background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setTerminalCollapsed(c => !c)}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex gap-1.5 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>

              {taskProgress ? (
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {isExecutingCommands ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-slate-300 truncate">
                    {isExecutingCommands 
                      ? `Step ${taskProgress.completedCommands + 1}/${taskProgress.totalCommands}: ${taskProgress.currentStep}`
                      : `Done — ${taskProgress.passedCommands} passed${taskProgress.failedCommands > 0 ? `, ${taskProgress.failedCommands} failed` : ''}`
                    }
                  </span>
                  <div className="h-1.5 flex-1 max-w-[120px] rounded-full overflow-hidden flex-shrink-0" style={{ background: '#1e293b' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${taskProgress.totalCommands > 0 ? (taskProgress.completedCommands / taskProgress.totalCommands) * 100 : 0}%`,
                        background: taskProgress.failedCommands > 0 ? '#ef4444' : '#22c55e',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <span className="text-sm font-bold text-slate-300">Terminal</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const text = terminalOutput.map(l => l.text).join('\n')
                  navigator.clipboard.writeText(text)
                  toast.success('Terminal output copied')
                }}
                className="px-2 py-0.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Copy all terminal output"
              >
                Copy
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTerminalCollapsed(c => !c) }}
                className="px-2 py-0.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                {terminalCollapsed ? 'Expand' : 'Collapse'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); clearTerminal() }}
                className="px-2 py-0.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowTerminal(false) }}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Collapsed: show last few status lines only */}
          {terminalCollapsed ? (
            <div className="px-4 py-2 font-mono text-xs overflow-hidden" style={{ background: '#0c0c0c', userSelect: 'text' }}>
              {terminalOutput.length === 0 ? (
                <span className="text-slate-500">Waiting for commands...</span>
              ) : (
                collapsedTerminalLines.map((line, i) => (
                  <div 
                    key={i}
                    className={`truncate ${
                      line.type === 'command' ? 'text-cyan-400' :
                      line.type === 'success' ? 'text-green-500' :
                      line.type === 'error' ? 'text-red-500' :
                      'text-blue-400'
                    }`}
                  >
                    {line.text}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Expanded: full scrollable output with text selection enabled */
            <div 
              id="terminal-output"
              className="overflow-y-auto p-4 font-mono text-sm flex-1 min-h-0"
              style={{ background: '#0c0c0c', userSelect: 'text' }}
            >
              {terminalOutput.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  Terminal output will appear here when commands are executed...
                </div>
              ) : (
                terminalOutput.map((line, i) => (
                  <div 
                    key={i}
                    className={`whitespace-pre-wrap break-all ${
                      line.type === 'command' ? 'text-cyan-400 font-bold mt-2' :
                      line.type === 'stdout' ? 'text-green-400' :
                      line.type === 'stderr' ? 'text-red-400' :
                      line.type === 'info' ? 'text-blue-400' :
                      line.type === 'success' ? 'text-green-500 font-bold' :
                      line.type === 'error' ? 'text-red-500 font-bold' :
                      'text-slate-300'
                    }`}
                    style={{ userSelect: 'text' }}
                  >
                    {line.text}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Knowledge Base Panel */}
      <CloudKnowledgePanel
        isOpen={showKnowledgeBase}
        onClose={() => setShowKnowledgeBase(false)}
        onSshConnect={(server) => {
          // Copy SSH command to clipboard
          if (server.sshCommand) {
            navigator.clipboard.writeText(server.sshCommand)
            toast.success(`📋 SSH command copied!\n${server.sshCommand}`)
          }
        }}
        onQuickAction={(action, provider) => {
          // Add action to chat
          setInput(`${action} for ${provider.name}`)
          setShowKnowledgeBase(false)
          inputRef.current?.focus()
        }}
      />

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        activeThreadId={activeThreadId}
        onSelectThread={(thread) => {
          // Load thread messages into chat
          const loadedMessages: Message[] = thread.messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            // KAN-27 FIX: Include cost and model in loaded messages
            cost: (msg as any).cost,
            model: (msg as any).model,
            images: msg.images?.map(img => ({
              id: img.id,
              base64: img.base64,
              mimeType: img.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              name: img.name,
              size: 0 // Size not stored in history, default to 0
            }))
          }))
          setMessages(loadedMessages)
          setActiveThreadId(thread.id)
          
          // KAN-27 FIX: Restore cost and model from thread metadata
          if (thread.totalCost !== undefined) {
            setLastCost(thread.totalCost)
          } else {
            setLastCost(null)
          }
          if (thread.model) {
            setLastModel(thread.model)
          } else {
            setLastModel(null)
          }
          
          // KAN-28 FIX: Load persisted feedback state from history
          const loadedFeedback: Record<string, 'up' | 'down' | null> = {}
          thread.messages.forEach(msg => {
            if ((msg as any).feedback) {
              loadedFeedback[msg.id] = (msg as any).feedback
            }
          })
          setMessageFeedback(loadedFeedback)
          
          setShowHistory(false)
          toast.success(`📜 Loaded: ${thread.title}`)
          addBreadcrumb('Loaded chat thread', 'history', { threadId: thread.id, messageCount: thread.messages.length, totalCost: thread.totalCost, model: thread.model })
        }}
        onNewThread={() => {
          // Clear current chat and start fresh
          setMessages([])
          setActiveThreadId(null)
          setMessageFeedback({}) // KAN-28 FIX: Clear feedback when starting new chat
          // KAN-27 FIX: Clear cost and model when starting new chat
          setLastCost(null)
          setLastModel(null)
          handoffSentRef.current = false // KAN-54: Reset handoff doc for new conversation
          setShowHistory(false)
          toast.success('✨ Started new chat!')
          addBreadcrumb('Started new chat thread', 'history')
          inputRef.current?.focus()
        }}
      />

      {/* Share Modal - KAN-18 FIX: Pass messages prop for Copy as Text functionality */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        threadId={activeThreadId || 'temp-' + Date.now()}
        threadTitle={messages.length > 0 && messages[0].content ? messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '...' : '') : undefined}
        messageCount={messages.length}
        messages={messages.map(({ role, content }) => ({ role, content }))}
      />

      {/* Interview Mode Panel */}
      <InterviewPanel
        isOpen={showInterviewMode}
        onClose={() => setShowInterviewMode(false)}
        apiKey={apiKey || ''}
        apiUrl={AIBUDDY_API_INFERENCE_URL}
        appVersion={appVersion || 'unknown'}
      />
    </div>
  )
}

export default App
