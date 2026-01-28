import React, { useState, useEffect, useRef } from 'react'
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
  MicOff
} from 'lucide-react'
import { CloudKnowledgePanel } from './components/knowledge'
import { HistorySidebar } from './components/HistorySidebar'
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
import { generateSystemPrompt } from '../../src/constants/system-prompt'

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

// Model options for user selection
interface ModelOption {
  id: string
  name: string
  description: string
  speed: 'fast' | 'medium' | 'slow'
  cost: 'low' | 'medium' | 'high'
}

const MODEL_OPTIONS: ModelOption[] = [
  { 
    id: 'auto', 
    name: 'Auto (Recommended)', 
    description: 'Smart routing: Fast model first, upgrades if needed',
    speed: 'fast',
    cost: 'low'
  },
  { 
    id: 'deepseek-chat', 
    name: 'DeepSeek Chat', 
    description: 'Fast & affordable for most tasks',
    speed: 'fast',
    cost: 'low'
  },
  { 
    id: 'deepseek-reasoner', 
    name: 'DeepSeek Reasoner', 
    description: 'Better reasoning, slightly slower',
    speed: 'medium',
    cost: 'low'
  },
  { 
    id: 'claude-sonnet-4-20250514', 
    name: 'Claude Sonnet 4', 
    description: 'Balanced performance and cost',
    speed: 'medium',
    cost: 'medium'
  },
  { 
    id: 'claude-opus-4-20250514', 
    name: 'Claude Opus 4', 
    description: 'Most capable, best for complex tasks',
    speed: 'slow',
    cost: 'high'
  }
]

// Model routing configuration - DeepSeek first, then Opus 4.5
const MODEL_CONFIG = {
  // DeepSeek for command execution (fast, cheap)
  execution: 'deepseek-chat',
  // Opus 4.5 for complex analysis (fallback after 2 DeepSeek failures)
  analysis: 'claude-opus-4-20250514',
  // Max DeepSeek retries before escalating to Opus
  maxDeepSeekRetries: 2
}

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
function extractCommands(codeBlock: string): string[] {
  return codeBlock
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Skip empty lines
      if (!line) return false
      // Skip comments
      if (line.startsWith('#')) return false
      if (line.startsWith('//')) return false
      // Skip echo explanations
      if (line.startsWith('echo "')) return false
      // Skip lines that look like terminal output (not commands)
      if (line.startsWith('total ')) return false // ls output
      if (line.match(/^[d-][rwx-]{9}/)) return false // ls -l output (drwxr-xr-x)
      if (line.match(/^[a-z0-9_-]+\s+\d+\s+\d+/i)) return false // ps output
      if (line.startsWith('List of devices')) return false // adb output
      if (line.match(/^\d+\s+actionable/)) return false // gradle output
      if (line.startsWith('BUILD ')) return false // gradle output
      if (line.startsWith('> Task')) return false // gradle task output
      if (line.startsWith('Starting:')) return false // adb output
      if (line.startsWith('Installed on')) return false // adb output
      if (line.startsWith('Error type')) return false // error messages
      if (line.startsWith('Error:')) return false // error messages
      if (line.startsWith('WARNING:')) return false // warnings
      if (line.startsWith('INFO')) return false // info messages
      if (line.startsWith('FAILURE:')) return false // gradle failures
      if (line.match(/^[A-Z][a-z]+:$/)) return false // Section headers like "Output:"
      // Skip lines that are clearly not commands (contain only special chars or look like output)
      if (line.match(/^[\s\-\|=\+]+$/)) return false // Separator lines
      if (line.match(/^\d+\.\d+\.\d+/)) return false // Version numbers
      // Skip gradle/java output patterns
      if (line.includes('at org.gradle')) return false
      if (line.includes('at java.base')) return false
      if (line.includes('Caused by:')) return false
      return true
    })
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

function App() {
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
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState('1.4.27')
  
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
  
  // Error recovery state
  const [deepSeekRetryCount, setDeepSeekRetryCount] = useState(0)
  
  // Image attachments
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Chat history
  const [showHistory, setShowHistory] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  
  // Message feedback state (thumbs up/down)
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down' | null>>({})
  
  // Track last user message for regenerate feature
  const [lastUserMessage, setLastUserMessage] = useState<{ content: string; images?: ImageAttachment[] } | null>(null)
  
  // Model selection
  const [selectedModel, setSelectedModel] = useState<string>('auto')
  const [showModelSelector, setShowModelSelector] = useState(false)
  
  // Error and retry state
  const [lastError, setLastError] = useState<{ message: string; canRetry: boolean } | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null)
  
  // Recent threads for adaptive empty state
  const [recentThreads, setRecentThreads] = useState<ChatThread[]>([])
  const [hasUsedBefore, setHasUsedBefore] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Load on mount - FAST startup, no blocking network calls
  useEffect(() => {
    const init = async () => {
      const startTime = Date.now()
      addBreadcrumb('App initializing', 'app.lifecycle', { timestamp: new Date().toISOString() })
      
      const electronAPI = (window as any).electronAPI
      
      // PHASE 1: Load local data FAST (no network)
      // This should complete in <100ms
      
      // Get version (local)
      if (electronAPI?.app?.getVersion) {
        try {
          const v = await electronAPI.app.getVersion()
          setAppVersion(v)
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
            const cachedCredits = await electronAPI.store.get('cachedCredits')
            if (cachedCredits) {
              setCredits(cachedCredits)
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
          }
        } catch {}
        
        // Get recent workspace (local)
        try {
          const recent = await electronAPI.store.get('recentWorkspaces')
          if (recent && recent.length > 0) {
            setWorkspacePath(recent[0])
          }
        } catch {}
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
      } else if (!hasKey) {
        // No key - show settings after a brief delay so UI renders first
        setTimeout(() => setShowSettings(true), 100)
      }
      
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
        if (showSettings) {
          setShowSettings(false)
        } else if (showHistory) {
          setShowHistory(false)
        } else if (showModelSelector) {
          setShowModelSelector(false)
        } else if (showKnowledgeBase) {
          setShowKnowledgeBase(false)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettings, showHistory, showModelSelector, showKnowledgeBase])

  // Validate API key and get credits (non-blocking, background operation)
  const validateApiKey = async (key: string, showToast = true) => {
    // Don't block UI - validation happens in background
    // Status stays 'idle' so user can interact immediately
    addBreadcrumb('Validating API key (background)', 'api.validation', { keyPrefix: key.substring(0, 10) + '...' })
    
    const startTime = Date.now()
    
    // Use AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout for validation
    
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
      console.log('[App] API validation skipped (network issue):', (err as Error).message)
      
      // Try to load cached credits
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.store?.get) {
        try {
          const cachedCredits = await electronAPI.store.get('cachedCredits')
          const lastUpdated = await electronAPI.store.get('creditsLastUpdated')
          if (cachedCredits && lastUpdated) {
            const ageMinutes = (Date.now() - lastUpdated) / 60000
            if (ageMinutes < 60) { // Use cache if less than 1 hour old
              setCredits(cachedCredits)
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

  const handleOpenFolder = async () => {
    trackButtonClick('Open Folder', 'App')
    addBreadcrumb('User clicked Open Folder', 'ui.click', { component: 'header' })
    
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.dialog?.openFolder) {
      const path = await electronAPI.dialog.openFolder()
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
  
  // Add terminal output helper
  const addTerminalLine = (type: TerminalOutput['type'], text: string) => {
    setTerminalOutput(prev => [...prev, { type, text, timestamp: Date.now() }])
  }
  
  // Clear terminal
  const clearTerminal = () => {
    setTerminalOutput([])
  }
  
  // Image handling functions - using Electron native dialog
  const handleImageSelectWithElectron = async () => {
    try {
      // Use Electron's native dialog to select images (fixes macOS sandbox issue)
      const filePath = await window.electronAPI.dialog.openFile([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
      ])
      
      if (!filePath) return // User cancelled
      
      // Read the file using Electron's fs API
      const fileBuffer = await window.electronAPI.fs.readFile(filePath) as Buffer
      const base64 = Buffer.from(fileBuffer).toString('base64')
      
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
      
      // Get file size
      const stat = await window.electronAPI.fs.stat(filePath)
      const fileSize = stat.size
      
      // Check file size (max 10MB)
      if (fileSize > 10 * 1024 * 1024) {
        toast.error(`${fileName} is too large (max 10MB)`)
        return
      }
      
      setAttachedImages(prev => [...prev, {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        base64,
        mimeType,
        name: fileName,
        size: fileSize
      }])
      
      toast.success(`📷 Added: ${fileName}`)
      addBreadcrumb('Image attached via dialog', 'chat.image', { 
        name: fileName, 
        size: fileSize,
        type: mimeType 
      })
    } catch (error) {
      console.error('Failed to select image:', error)
      toast.error('Failed to select image. Please try again.')
    }
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
      
      // Convert to base64
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        const mimeType = file.type as ImageAttachment['mimeType']
        
        setAttachedImages(prev => [...prev, {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          base64,
          mimeType,
          name: file.name,
          size: file.size
        }])
        
        toast.success(`📷 Added: ${file.name}`)
        addBreadcrumb('Image attached', 'chat.image', { 
          name: file.name, 
          size: file.size,
          type: mimeType 
        })
      }
      reader.readAsDataURL(file)
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          const mimeType = file.type as ImageAttachment['mimeType']
          
          setAttachedImages(prev => [...prev, {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            base64,
            mimeType,
            name: `pasted-image-${Date.now()}.${mimeType.split('/')[1]}`,
            size: file.size
          }])
          
          toast.success('📷 Image pasted from clipboard!')
          addBreadcrumb('Image pasted', 'chat.image', { 
            size: file.size,
            type: mimeType 
          })
        }
        reader.readAsDataURL(file)
      }
    }
  }
  
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
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    
    let addedCount = 0
    for (const file of Array.from(files)) {
      // Only accept images
      const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      const isImage = file.type.startsWith('image/') || imageExtensions.includes(extension)
      
      if (!isImage) {
        toast.error(`${file.name} is not an image`)
        continue
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`)
        continue
      }
      
      try {
        // In Electron, dropped files have a 'path' property
        const filePath = (file as File & { path?: string }).path
        
        if (filePath && window.electronAPI?.fs) {
          // Use Electron's native FS API for better compatibility
          const fileBuffer = await window.electronAPI.fs.readFile(filePath) as Buffer
          const base64 = Buffer.from(fileBuffer).toString('base64')
          
          const mimeTypes: Record<string, ImageAttachment['mimeType']> = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
          }
          const mimeType = mimeTypes[extension] || 'image/png'
          
          setAttachedImages(prev => [...prev, {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            base64,
            mimeType,
            name: file.name,
            size: file.size
          }])
          
          addBreadcrumb('Image dropped (Electron)', 'chat.image', { 
            name: file.name, 
            size: file.size,
            type: mimeType 
          })
          addedCount++
        } else {
          // Fallback to FileReader API
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            const mimeType = file.type as ImageAttachment['mimeType']
            
            setAttachedImages(prev => [...prev, {
              id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              base64,
              mimeType,
              name: file.name,
              size: file.size
            }])
            
            addBreadcrumb('Image dropped (FileReader)', 'chat.image', { 
              name: file.name, 
              size: file.size,
              type: mimeType 
            })
          }
          reader.readAsDataURL(file)
          addedCount++
        }
      } catch (error) {
        console.error('Failed to process dropped file:', error)
        toast.error(`Failed to process ${file.name}`)
      }
    }
    
    if (addedCount > 0) {
      toast.success(`📷 Added ${addedCount} image${addedCount > 1 ? 's' : ''}!`)
    }
  }
  
  // Call AI with model routing - respects user selection or uses smart routing
  const callAIWithRouting = async (
    messages: { role: string; content: string }[],
    systemPrompt: string,
    purpose: 'execution' | 'analysis' = 'execution',
    retryCount = 0
  ): Promise<{ response: string; model: string; cost: number; credits: number }> => {
    let model: string
    
    // If user selected a specific model (not 'auto'), use that
    if (selectedModel !== 'auto') {
      model = selectedModel
      addBreadcrumb('AI call with user-selected model', 'api.routing', {
        purpose,
        model,
        userSelected: true
      })
    } else {
      // Auto mode: Use DeepSeek for execution tasks, Opus for analysis
      // After 2 DeepSeek failures, escalate to Opus
      const useOpus = purpose === 'analysis' || retryCount >= MODEL_CONFIG.maxDeepSeekRetries
      model = useOpus ? MODEL_CONFIG.analysis : MODEL_CONFIG.execution
      
      addBreadcrumb('AI call with auto routing', 'api.routing', {
        purpose,
        model,
        retryCount,
        escalatedToOpus: useOpus && purpose === 'execution'
      })
      
      if (useOpus && purpose === 'execution' && retryCount >= MODEL_CONFIG.maxDeepSeekRetries) {
        toast.info('🧠 Escalating to Opus 4.5 for complex analysis...')
      }
    }
    
    const response = await fetch(AIBUDDY_API_INFERENCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIBuddy-API-Key': apiKey || '',
      },
      body: JSON.stringify({
        api_key: apiKey,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 4096,
        temperature: 0.7,
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
      model: data.model || model,
      cost: data.api_cost || 0,
      credits: data.remaining_credits || 0
    }
  }
  
  // Execute commands with error recovery loop
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
    
    // Show terminal panel
    setShowTerminal(true)
    setIsExecutingCommands(true)
    
    for (const command of commands) {
      setCurrentCommand(command)
      addTerminalLine('command', `$ ${command}`)
      toast.info(`⚡ Running: ${command.substring(0, 50)}...`)
      
      try {
        const result = await electronAPI.terminal.execute(command, workspacePath)
        
        results.push({
          command,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executed: true
        })
        
        // Add output to terminal
        if (result.stdout) {
          addTerminalLine('stdout', result.stdout)
        }
        if (result.stderr) {
          addTerminalLine('stderr', result.stderr)
        }
        
        if (result.exitCode === 0) {
          addTerminalLine('success', `✓ Command succeeded (exit code: 0)`)
          toast.success(`✅ ${command.substring(0, 30)}... succeeded`)
        } else {
          hasErrors = true
          errorSummary += `Command "${command}" failed with exit code ${result.exitCode}:\n${result.stderr || result.stdout}\n\n`
          addTerminalLine('error', `✗ Command failed (exit code: ${result.exitCode})`)
          toast.warning(`⚠️ ${command.substring(0, 30)}... failed`)
        }
        
      } catch (execErr) {
        hasErrors = true
        const errMsg = (execErr as Error).message
        errorSummary += `Command "${command}" threw error: ${errMsg}\n\n`
        
        results.push({
          command,
          stdout: '',
          stderr: errMsg,
          exitCode: -1,
          executed: false
        })
        
        addTerminalLine('error', `✗ Error: ${errMsg}`)
        toast.error(`❌ ${command.substring(0, 30)}... error`)
      }
    }
    
    setCurrentCommand(null)
    setIsExecutingCommands(false)
    
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

Analyze these errors and provide:
1. A brief explanation of what went wrong
2. The EXACT commands to fix the issue (in bash code blocks)
3. If it's a version/compatibility issue, suggest the specific fix

Be concise and actionable. Focus on fixing the immediate problem.`

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
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return

    // Track user action
    trackButtonClick('send_message', 'App', { 
      messageLength: input.trim().length,
      imageCount: attachedImages.length 
    })

    if (!apiKey) {
      setShowSettings(true)
      toast.error('🔑 Please add your AIBuddy API key first! Get one at aibuddy.life')
      addBreadcrumb('API key missing - showing settings', 'user.action', { trigger: 'send_message' }, 'warning')
      return
    }

    const trimmedInput = input.trim()
    const currentImages = [...attachedImages] // Copy images before clearing
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput || (currentImages.length > 0 ? '📷 [Image attached - please analyze]' : ''),
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

    // Progress through status steps
    setStatus('validating')
    await new Promise(r => setTimeout(r, 200))
    
    setStatus('reading')
    await new Promise(r => setTimeout(r, 300))
    
    setStatus('sending')
    await new Promise(r => setTimeout(r, 200))
    
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
      if (currentImages.length > 0) {
        chatMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: trimmedInput || 'Please analyze this image and help me fix any issues you see.' },
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

      // Determine model - use Opus for image analysis (vision capable)
      // DeepSeek doesn't support vision, so always use Opus for images
      const isExecutionTask = userWantsExecution !== null && !hasImages
      const initialModel = hasImages ? MODEL_CONFIG.analysis : (isExecutionTask ? MODEL_CONFIG.execution : MODEL_CONFIG.analysis)
      
      // Track AI request
      trackAIRequest({
        model: initialModel,
        messageCount: chatMessages.length + 1, // +1 for system
        hasImages,
        hasTools: false
      })
      addBreadcrumb('Sending AI request', 'api.request', {
        model: initialModel,
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

      // Prepare request body
      const requestBody = {
        api_key: apiKey,
        model: initialModel,
        messages: [
          { 
            role: 'system', 
            content: generateSystemPrompt({
              workspacePath: workspacePath || undefined,
              projectType: workspacePath ? detectProjectType(workspacePath) : undefined,
              knowledgeContext: knowledgeContext || undefined,
              environmentSummary: environmentSummary || undefined,
              hasImages
            })
          },
          ...chatMessages
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }

      try {
        toast.info(`🚀 Sending to AI...`)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.log(`[App] Request timeout after ${TIMEOUT_MS/1000}s, aborting...`)
          controller.abort()
        }, TIMEOUT_MS)

        response = await fetch(AIBUDDY_API_INFERENCE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AIBuddy-API-Key': apiKey || '',
            'X-Requested-With': 'AIBuddy-Desktop',
            'User-Agent': 'AIBuddy-Desktop/1.4.29',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

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
      
      setStatus('generating')
      
      const data = await response.json()
      console.log('[App] API response data:', data)

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
      
      // Track cost and model
      if (data.api_cost) setLastCost(data.api_cost)
      if (data.model) setLastModel(data.model)

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
          
          // Collect all commands from all code blocks
          const allCommands: string[] = []
          for (const block of codeBlocks) {
            const commands = extractCommands(block.code)
            allCommands.push(...commands)
          }
          
          // Execute commands with error recovery
          let currentRetry = 0
          const MAX_ERROR_RETRIES = MODEL_CONFIG.maxDeepSeekRetries + 1 // +1 for Opus escalation
          let commandsToRun = allCommands
          
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
                fixCommands.push(...extractCommands(block.code))
              }
              
              if (fixCommands.length > 0) {
                commandsToRun = fixCommands
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

      // Build execution output to append to response
      let executionOutput = ''
      if (executionResults.length > 0) {
        executionOutput = '\n\n---\n\n## 🖥️ Execution Results\n\n'
        for (const result of executionResults) {
          const statusIcon = result.exitCode === 0 ? '✅' : '❌'
          executionOutput += `### ${statusIcon} \`${result.command}\`\n\n`
          if (result.stdout) {
            executionOutput += `**Output:**\n\`\`\`\n${result.stdout.substring(0, 2000)}\n\`\`\`\n\n`
          }
          if (result.stderr) {
            executionOutput += `**Errors:**\n\`\`\`\n${result.stderr.substring(0, 1000)}\n\`\`\`\n\n`
          }
          executionOutput += `**Exit Code:** ${result.exitCode}\n\n`
        }
        
        // Add any fix attempt outputs
        if (totalExecutionOutput) {
          executionOutput += totalExecutionOutput
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
          await window.electronAPI.history.addMessage(threadId, {
            role: 'assistant',
            content: assistantMessage.content
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
      
      // Determine error type and if retry is possible
      const errorMsg = (err as Error).message
      const isNetworkError = errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('timeout')
      const isAuthError = errorMsg.includes('401') || errorMsg.includes('API key')
      
      setLastError({
        message: errorMsg,
        canRetry: !isAuthError // Can retry network errors, not auth errors
      })
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isNetworkError 
          ? `🌐 **Network Error**\n\nCouldn't reach the server. This could be:\n- Your internet connection\n- A temporary server issue\n\n**Click "Retry" below to try again.**`
          : `😅 **Oops!** Something went wrong.\n\n**Error:** ${errorMsg}\n\n**Try:**\n1. Check your internet connection\n2. Make sure your AIBuddy API key is correct\n3. Get your API key at https://aibuddy.life\n4. Try again in a moment`
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error(isNetworkError ? 'Network error - click Retry to try again' : 'Failed to get response')
      
      setTimeout(() => setStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }
  
  // Copy entire response to clipboard
  const copyResponse = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(messageId + '-response')
    toast.success('📋 Response copied!')
    addBreadcrumb('Response copied', 'chat.action', { messageId })
    setTimeout(() => setCopiedId(null), 2000)
  }
  
  // Handle message feedback (thumbs up/down)
  const handleFeedback = (messageId: string, feedback: 'up' | 'down') => {
    const currentFeedback = messageFeedback[messageId]
    const newFeedback = currentFeedback === feedback ? null : feedback
    
    setMessageFeedback(prev => ({ ...prev, [messageId]: newFeedback }))
    
    if (newFeedback) {
      toast.success(newFeedback === 'up' ? '👍 Thanks for the feedback!' : '👎 Thanks for letting us know!')
      addBreadcrumb('Message feedback', 'chat.feedback', { messageId, feedback: newFeedback })
    }
  }
  
  // Regenerate the last response
  const handleRegenerate = async () => {
    if (isLoading) return
    
    // Find the last user message
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserIdx === -1) {
      toast.error('No message to regenerate')
      return
    }
    
    const actualIdx = messages.length - 1 - lastUserIdx
    const lastUser = messages[actualIdx]
    
    // Remove the assistant response after the last user message (if any)
    const newMessages = messages.slice(0, actualIdx + 1)
    setMessages(newMessages)
    
    // Re-trigger the submission with the last user message content
    setInput(lastUser.content === '📷 [Image attached - please analyze]' ? '' : lastUser.content)
    if (lastUser.images) {
      setAttachedImages(lastUser.images)
    }
    
    toast.info('🔄 Regenerating response...')
    addBreadcrumb('Regenerating response', 'chat.action', { messageId: lastUser.id })
    
    // Trigger submit after state updates
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
    }, 100)
  }

  const currentStatus = statusConfig[status]

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ 
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: "'Nunito', 'Comic Neue', sans-serif"
      }}
    >
      {/* Header - Big & Friendly */}
      <header 
        className="flex items-center justify-between px-6 py-4"
        style={{ 
          borderBottom: '3px solid #334155',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.9) 100%)'
        }}
      >
        {/* Logo & Status */}
        <div className="flex items-center gap-4">
          {/* Big Logo */}
          <Tooltip text="🌟 Hi! I'm AIBuddy, your coding friend!" position="bottom">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
              style={{ 
                background: 'linear-gradient(135deg, #ec4899, #f97316)',
                boxShadow: '0 8px 24px rgba(236, 72, 153, 0.5)'
              }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </Tooltip>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">AIBuddy</h1>
              <span 
                className="px-2 py-0.5 text-xs font-bold rounded-full"
                style={{ 
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)'
                }}
              >
                v{appVersion}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-semibold">Your Coding Friend! 🚀</p>
          </div>
          
          {/* Status Badge - Bigger */}
          <Tooltip text="👀 This shows what I'm doing right now!" position="bottom">
            <div 
              className="flex items-center gap-3 px-5 py-3 rounded-2xl ml-4 cursor-help"
              style={{ 
                background: `${currentStatus.color}20`,
                border: `2px solid ${currentStatus.color}`,
                boxShadow: `0 4px 16px ${currentStatus.color}30`
              }}
            >
              <div style={{ color: currentStatus.color }} className="text-xl">{currentStatus.icon}</div>
              <span className="text-lg font-bold text-white">{currentStatus.text}</span>
            </div>
          </Tooltip>
        </div>

        {/* Credits & Actions - Consistent Button Sizes */}
        <div className="flex items-center gap-2">
          {/* Credits Display */}
          <Tooltip text="💰 These are your AIBuddy credits! Each question uses some credits." position="bottom">
            <div 
              className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-help h-10"
              style={{ 
                background: credits !== null && credits < 5 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : 'rgba(34, 197, 94, 0.15)',
                border: `2px solid ${credits !== null && credits < 5 ? '#ef4444' : '#22c55e'}`,
              }}
            >
              <Coins className="w-5 h-5" style={{ color: credits !== null && credits < 5 ? '#ef4444' : '#22c55e' }} />
              <span 
                className="text-sm font-bold"
                style={{ color: credits !== null && credits < 5 ? '#ef4444' : '#22c55e' }}
              >
                {credits !== null ? `${credits.toFixed(0)}` : '...'}
              </span>
            </div>
          </Tooltip>

          {/* Open Folder Button */}
          <Tooltip text="📁 Open your code folder" position="bottom">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 h-10"
              style={{ 
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: 'white',
              }}
            >
              <FolderOpen className="w-5 h-5" />
              <span>Open Folder</span>
            </button>
          </Tooltip>

          {/* Terminal Button */}
          <Tooltip text="🖥️ Show/hide terminal" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('Terminal', 'App')
                trackPanelToggle('Terminal', !showTerminal)
                setShowTerminal(!showTerminal)
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 h-10"
              style={{ 
                background: showTerminal 
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                  : 'rgba(34, 197, 94, 0.2)',
                color: 'white',
                border: `2px solid #22c55e`,
              }}
            >
              <span>🖥️</span>
              <span>Terminal</span>
              {terminalOutput.length > 0 && (
                <span 
                  className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  {terminalOutput.length}
                </span>
              )}
            </button>
          </Tooltip>

          {/* History Button */}
          <Tooltip text="📜 Chat history" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('History', 'App')
                trackPanelToggle('History', true)
                addBreadcrumb('Opening History panel', 'ui.panel', { panel: 'history' })
                setShowHistory(true)
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 h-10"
              style={{ 
                background: showHistory 
                  ? 'linear-gradient(135deg, #06b6d4, #0891b2)' 
                  : 'rgba(6, 182, 212, 0.2)',
                color: 'white',
                border: `2px solid #06b6d4`,
              }}
            >
              <History className="w-5 h-5" />
              <span>History</span>
            </button>
          </Tooltip>

          {/* Knowledge Base Button */}
          <Tooltip text="📚 Knowledge base" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('Knowledge Base', 'App')
                trackPanelToggle('Knowledge Base', true)
                addBreadcrumb('Opening Knowledge Base panel', 'ui.panel', { panel: 'knowledge_base' })
                setShowKnowledgeBase(true)
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 h-10"
              style={{ 
                background: showKnowledgeBase 
                  ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' 
                  : 'rgba(139, 92, 246, 0.2)',
                color: 'white',
                border: `2px solid #8b5cf6`,
              }}
            >
              <BookOpen className="w-5 h-5" />
              <span>Knowledge</span>
              {knowledgeContext && (
                <span 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}
                />
              )}
            </button>
          </Tooltip>

          {/* Settings Button */}
          <Tooltip text="🔑 API key settings" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('Settings', 'App', { hasApiKey: !!apiKey })
                trackPanelToggle('Settings', true)
                addBreadcrumb('Opening settings panel', 'ui.panel', { 
                  panel: 'settings',
                  hasApiKey: !!apiKey 
                })
                setShowSettings(true)
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 h-10"
              style={{ 
                background: apiKey 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: apiKey ? '#22c55e' : 'white',
                border: `2px solid ${apiKey ? '#22c55e' : '#fbbf24'}`,
              }}
            >
              <Key className="w-5 h-5" />
              <span>{apiKey ? '✓ Key Set' : 'Add Key'}</span>
            </button>
          </Tooltip>

          {/* Buy Credits Button */}
          <Tooltip text="💳 Buy more credits" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('Buy Credits', 'App', { currentCredits: credits })
                addBreadcrumb('User clicked Buy Credits', 'ui.click', { 
                  currentCredits: credits,
                  destination: AIBUDDY_BUY_CREDITS_URL 
                })
                const electronAPI = (window as any).electronAPI
                if (electronAPI?.shell?.openExternal) {
                  electronAPI.shell.openExternal(AIBUDDY_BUY_CREDITS_URL)
                } else {
                  window.open(AIBUDDY_BUY_CREDITS_URL, '_blank')
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 h-10"
              style={{ 
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
              }}
            >
              <CreditCard className="w-5 h-5" />
              <span>Buy Credits</span>
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Folder Path */}
      {workspacePath && (
        <div 
          className="px-4 py-1.5 text-xs flex items-center gap-2"
          style={{ background: 'rgba(6, 182, 212, 0.05)', borderBottom: '1px solid #334155' }}
        >
          <FolderOpen className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-400">Working in:</span>
          <span className="text-cyan-400 font-semibold">{workspacePath}</span>
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6">
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
                  Welcome back! 👋
                </h2>
                <p className="text-lg text-slate-400 mb-6">
                  What would you like to work on today?
                </p>
                
                {/* Recent Chats - Quick Access */}
                {recentThreads.length > 0 && (
                  <div className="w-full max-w-md mb-6">
                    <p className="text-sm font-semibold text-slate-500 mb-2 text-left">Recent Chats</p>
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
                      View all history →
                    </button>
                  </div>
                )}
                
                {/* Quick Actions for power users */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {[
                    { icon: "🐛", text: "Debug code", prompt: "Help me debug this code:" },
                    { icon: "⚡", text: "Quick fix", prompt: "Fix this error:" },
                    { icon: "📝", text: "Explain", prompt: "Explain this code:" },
                    { icon: "🔧", text: "Refactor", prompt: "Refactor this code to be cleaner:" }
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
                  Hi there! 👋
                </h2>
                <p className="text-2xl text-slate-300 mb-8 max-w-lg font-semibold">
                  I'm <span style={{ color: '#ec4899' }}>AIBuddy</span>, your coding friend!
                  <br />
                  Tell me what you want to build! 🚀
                </p>

                {/* Big Helpful Cards */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <Tooltip text="Just type what you want me to do in the box below!">
                    <div 
                      className="px-6 py-4 rounded-2xl text-lg font-bold cursor-help transition-transform hover:scale-105"
                      style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '2px solid #f472b6' }}
                    >
                      💬 Type what you want
                    </div>
                  </Tooltip>
                  <Tooltip text="I'll write the code and do all the hard work for you!">
                    <div 
                      className="px-6 py-4 rounded-2xl text-lg font-bold cursor-help transition-transform hover:scale-105"
                      style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '2px solid #22d3ee' }}
                    >
                      🚀 I'll do the work
                    </div>
                  </Tooltip>
                  <Tooltip text="Each question uses some credits - check the green number at the top!">
                    <div 
                      className="px-6 py-4 rounded-2xl text-lg font-bold cursor-help transition-transform hover:scale-105"
                      style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '2px solid #4ade80' }}
                    >
                      💰 Watch your credits
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
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {/* AI Avatar - Big & Friendly */}
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
                
                {/* Message Bubble - Bigger & More Readable */}
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
                    <div className="prose prose-invert prose-sm max-w-none text-slate-200">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const codeString = String(children).replace(/\n$/, '')
                            
                            if (!inline && match) {
                              return (
                                <div className="relative group my-2">
                                  <button
                                    onClick={() => copyToClipboard(codeString, message.id + className)}
                                    className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: 'rgba(255,255,255,0.1)' }}
                                  >
                                    {copiedId === message.id + className ? (
                                      <Check className="w-3 h-3 text-green-400" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-slate-400" />
                                    )}
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
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div>
                      {/* User message text */}
                      <p className="text-sm">{message.content}</p>
                      
                      {/* User attached images */}
                      {message.images && message.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.images.map(img => (
                            <div key={img.id} className="relative">
                              <img 
                                src={`data:${img.mimeType};base64,${img.base64}`}
                                alt={img.name}
                                className="max-w-[200px] max-h-[150px] object-contain rounded-lg border-2 border-cyan-400/50 cursor-pointer hover:border-cyan-400 transition-colors"
                                onClick={() => {
                                  // Open image in new window for full view
                                  const win = window.open()
                                  if (win) {
                                    win.document.write(`<img src="data:${img.mimeType};base64,${img.base64}" style="max-width:100%;max-height:100vh;margin:auto;display:block;background:#1e293b;" />`)
                                    win.document.title = img.name
                                  }
                                }}
                              />
                              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                📷 {img.name.substring(0, 20)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Token Usage & Cost Display for assistant messages */}
                  {message.role === 'assistant' && (message.cost || message.tokensIn || message.tokensOut) && (
                    <div className="mt-3 pt-2 border-t border-slate-700">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {/* Cost */}
                        {message.cost && (
                          <div className="flex items-center gap-1 text-green-400/80">
                            <Coins className="w-3 h-3" />
                            <span className="font-medium">${message.cost.toFixed(4)}</span>
                          </div>
                        )}
                        
                        {/* Token Usage */}
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
                        
                        {/* Model */}
                        {message.model && (
                          <span className="text-slate-600 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                            {message.model.includes('deepseek') ? 'DeepSeek' : 
                             message.model.includes('opus') ? 'Claude Opus' :
                             message.model.includes('sonnet') ? 'Claude Sonnet' : 'AIBuddy'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Message Controls for assistant messages */}
                  {message.role === 'assistant' && (
                    <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                      {/* Copy Response */}
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
                      
                      {/* Regenerate (only show on last assistant message) */}
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
                      
                      {/* Thumbs Up */}
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
                      
                      {/* Thumbs Down */}
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
            ))}

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
      <footer className="p-4" style={{ borderTop: '2px solid #334155' }}>
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
          
          {/* Supported file types hint (shown when no attachments) */}
          {attachedImages.length === 0 && isDraggingOver && (
            <div className="mb-3 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <p className="text-xs text-purple-300 text-center">
                <span className="font-semibold">Supported formats:</span> PNG, JPG, GIF, WebP • Max 10MB per file
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
                  <ImageIcon className="w-12 h-12 text-purple-300 mx-auto mb-2 animate-bounce" />
                  <p className="text-purple-200 font-bold text-lg">Drop images here!</p>
                </div>
              </div>
            )}
            
            {/* Hidden file input (fallback for paste) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {/* Main input row - properly aligned with items-center for vertical centering */}
            <div className="flex items-center gap-3 p-3 sm:p-4">
              {/* Image Upload Button - Uses Electron native dialog */}
              <Tooltip text="📷 Attach an image (screenshot, error, UI) for analysis">
                <button
                  type="button"
                  onClick={handleImageSelectWithElectron}
                  disabled={isLoading}
                  className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0 self-center"
                  style={{ 
                    background: attachedImages.length > 0 
                      ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' 
                      : 'rgba(139, 92, 246, 0.2)',
                    border: '2px solid #8b5cf6'
                  }}
                  aria-label="Attach image"
                >
                  <ImageIcon className="w-5 h-5 text-purple-300" />
                </button>
              </Tooltip>
              
              {/* Model Selector */}
              <div className="relative self-center">
                <Tooltip text="Select AI model">
                  <button
                    type="button"
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-2.5 h-10 sm:h-11 rounded-lg transition-all hover:bg-slate-700/50 disabled:opacity-50 flex-shrink-0"
                    style={{ 
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    aria-label="Select AI model"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs text-blue-300 font-medium">
                      {MODEL_OPTIONS.find(m => m.id === selectedModel)?.name.split(' ')[0] || 'Auto'}
                    </span>
                  </button>
                </Tooltip>
                
                {/* Model Dropdown */}
                {showModelSelector && (
                  <div 
                    className="absolute bottom-full left-0 mb-2 w-64 rounded-xl overflow-hidden z-50"
                    style={{ 
                      background: '#1e293b',
                      border: '2px solid #334155',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}
                  >
                    <div className="p-2 border-b border-slate-700">
                      <p className="text-xs font-semibold text-slate-400">Select AI Model</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {MODEL_OPTIONS.map(model => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(model.id)
                            setShowModelSelector(false)
                            addBreadcrumb('Model changed', 'settings', { model: model.id })
                          }}
                          className={`w-full text-left px-3 py-2.5 transition-colors ${
                            selectedModel === model.id 
                              ? 'bg-blue-500/20' 
                              : 'hover:bg-slate-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{model.name}</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                model.speed === 'fast' ? 'bg-green-500/20 text-green-400' :
                                model.speed === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {model.speed}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                model.cost === 'low' ? 'bg-green-500/20 text-green-400' :
                                model.cost === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                ${model.cost}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{model.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            
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
                    ? "📷 Describe what you need help with..."
                    : "🤔 What do you want to build today?"
                  }
                  className="w-full bg-transparent text-white text-base resize-none outline-none placeholder-slate-400 font-medium leading-normal py-2"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                  rows={1}
                  disabled={isLoading}
                  aria-label="Message input"
                />
              </div>
              
              {/* Voice Input Button - Dictation */}
              {voiceSupported && (
                <Tooltip text={voiceState === 'listening' ? '🛑 Stop dictation' : '🎤 Start dictation'}>
                  <button
                    type="button"
                    onClick={toggleVoice}
                    disabled={isLoading}
                    className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0 self-center ${
                      voiceState === 'listening' ? 'animate-pulse' : ''
                    }`}
                    style={{ 
                      background: voiceState === 'listening' 
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                        : 'rgba(107, 114, 128, 0.2)',
                      border: voiceState === 'listening' 
                        ? '2px solid #ef4444' 
                        : '2px solid #6b7280',
                      boxShadow: voiceState === 'listening' 
                        ? '0 0 20px rgba(239, 68, 68, 0.5)' 
                        : 'none'
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
      {showSettings && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
        >
          <div 
            className="w-full max-w-lg p-8 rounded-3xl animate-bounce-in"
            style={{ 
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '4px solid #334155',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
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
          </div>
        </div>
      )}

      <Toaster position="top-right" theme="dark" richColors />

      {/* Terminal Output Panel - Slide up from bottom */}
      {showTerminal && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300"
          style={{ 
            height: '300px',
            background: 'linear-gradient(180deg, #0c0c0c 0%, #1a1a1a 100%)',
            borderTop: '3px solid #334155',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.5)'
          }}
        >
          {/* Terminal Header */}
          <div 
            className="flex items-center justify-between px-4 py-2"
            style={{ borderBottom: '1px solid #334155', background: 'rgba(0,0,0,0.3)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-sm font-bold text-slate-300">
                🖥️ Terminal Output
              </span>
              {isExecutingCommands && (
                <span className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running: {currentCommand?.substring(0, 40)}...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearTerminal}
                className="px-3 py-1 rounded text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowTerminal(false)}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Terminal Content */}
          <div 
            id="terminal-output"
            className="h-[calc(100%-40px)] overflow-y-auto p-4 font-mono text-sm"
            style={{ background: '#0c0c0c' }}
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
                >
                  {line.text}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
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
          setShowHistory(false)
          toast.success(`📜 Loaded: ${thread.title}`)
          addBreadcrumb('Loaded chat thread', 'history', { threadId: thread.id, messageCount: thread.messages.length })
        }}
        onNewThread={() => {
          // Clear current chat and start fresh
          setMessages([])
          setActiveThreadId(null)
          setShowHistory(false)
          toast.success('✨ Started new chat!')
          addBreadcrumb('Started new chat thread', 'history')
          inputRef.current?.focus()
        }}
      />
    </div>
  )
}

export default App
