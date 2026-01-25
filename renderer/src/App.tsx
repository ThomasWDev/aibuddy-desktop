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
  BookOpen
} from 'lucide-react'
import { CloudKnowledgePanel } from './components/knowledge'
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

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  cost?: number
  model?: string
}

// Status steps for visual feedback
type StatusStep = 'idle' | 'validating' | 'reading' | 'sending' | 'thinking' | 'generating' | 'done' | 'error'

const statusConfig: Record<StatusStep, { text: string; icon: React.ReactNode; color: string }> = {
  idle: { text: 'Ready to help! 🚀', icon: <Sparkles className="w-5 h-5" />, color: '#22c55e' },
  validating: { text: '🔑 Checking your API key...', icon: <Key className="w-5 h-5" />, color: '#f59e0b' },
  reading: { text: '📂 Reading your files...', icon: <FileSearch className="w-5 h-5" />, color: '#3b82f6' },
  sending: { text: '☁️ Sending to AI...', icon: <Cloud className="w-5 h-5" />, color: '#8b5cf6' },
  thinking: { text: '🧠 AI is thinking...', icon: <Loader2 className="w-5 h-5 animate-spin" />, color: '#f97316' },
  generating: { text: '✍️ Writing response...', icon: <Zap className="w-5 h-5" />, color: '#ec4899' },
  done: { text: '✅ Done!', icon: <CheckCircle className="w-5 h-5" />, color: '#22c55e' },
  error: { text: '❌ Something went wrong', icon: <AlertTriangle className="w-5 h-5" />, color: '#ef4444' },
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load on mount
  useEffect(() => {
    const init = async () => {
      const startTime = Date.now()
      addBreadcrumb('App initializing', 'app.lifecycle', { timestamp: new Date().toISOString() })
      
      const electronAPI = (window as any).electronAPI
      
      // Get API key
      if (electronAPI?.store?.get) {
        try {
          const key = await electronAPI.store.get('apiKey')
          if (key) {
            setApiKey(key)
            addBreadcrumb('API key loaded from store', 'app.init', { hasKey: true })
            // Validate key and get credits
            validateApiKey(key)
          } else {
            setShowSettings(true)
            addBreadcrumb('No API key found - showing settings', 'app.init', { hasKey: false })
          }
        } catch (err) {
          addBreadcrumb('Failed to load API key', 'app.init', { error: (err as Error).message }, 'error')
        }
      }
      
      // Get version
      if (electronAPI?.app?.getVersion) {
        try {
          const v = await electronAPI.app.getVersion()
          setAppVersion(v)
          addBreadcrumb('App version loaded', 'app.init', { version: v })
        } catch {}
      }
      
      // Get recent workspace
      if (electronAPI?.store?.get) {
        try {
          const recent = await electronAPI.store.get('recentWorkspaces')
          if (recent && recent.length > 0) {
            setWorkspacePath(recent[0])
            addBreadcrumb('Recent workspace loaded', 'app.init', { 
              path: recent[0],
              recentCount: recent.length 
            })
          }
        } catch {}
      }
      
      // Detect development environment
      if (electronAPI?.environment?.getSummary) {
        try {
          const envSummary = await electronAPI.environment.getSummary()
          if (envSummary) {
            setEnvironmentSummary(envSummary)
            addBreadcrumb('Environment detected', 'app.init', { 
              summaryLength: envSummary.length 
            })
          }
        } catch (err) {
          console.log('[App] Environment detection not available:', err)
        }
      }
      
      const initTime = Date.now() - startTime
      addBreadcrumb('App initialization complete', 'app.lifecycle', { 
        initTimeMs: initTime,
        hasApiKey: !!electronAPI?.store?.get,
        platform: navigator.platform,
        userAgent: navigator.userAgent.substring(0, 50)
      })
      
      // Track slow initialization
      trackSlowOperation('App Initialization', initTime, 2000)
    }
    init()
  }, [])

  // Validate API key and get credits
  const validateApiKey = async (key: string) => {
    setStatus('validating')
    addBreadcrumb('Validating API key', 'api.validation', { keyPrefix: key.substring(0, 10) + '...' })
    
    const startTime = Date.now()
    try {
      const response = await fetch('https://i6f81wuqo0.execute-api.us-east-2.amazonaws.com/dev/v1/inference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: key,
          model: 'claude-3-5-haiku-20241022',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 10,
        })
      })
      
      const responseTime = Date.now() - startTime
      const data = await response.json()
      console.log('[App] API validation response:', data)
      
      if (data.remaining_credits !== undefined) {
        setCredits(data.remaining_credits)
        toast.success(`✅ API key valid! You have ${data.remaining_credits.toFixed(2)} credits`)
        
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
        }
      }
      setStatus('idle')
    } catch (err) {
      const responseTime = Date.now() - startTime
      console.error('[App] API validation error:', err)
      
      // Track validation failure
      addBreadcrumb('API key validation failed', 'api.validation', {
        error: (err as Error).message,
        responseTime
      }, 'error')
      trackError(err as Error, { context: 'api_validation' })
      
      setStatus('idle')
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    // Track user action
    trackButtonClick('send_message', 'App', { messageLength: input.trim().length })

    if (!apiKey) {
      setShowSettings(true)
      toast.error('🔑 Please add your API key first!')
      addBreadcrumb('API key missing - showing settings', 'user.action', { trigger: 'send_message' }, 'warning')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    // Track user message
    trackUserMessage(userMessage.content.length, false, false, messages.length === 0)
    addBreadcrumb('User sent message', 'chat', { 
      messageLength: userMessage.content.length,
      isFirstMessage: messages.length === 0,
      hasKnowledgeContext: !!knowledgeContext,
      workspacePath: workspacePath || 'none'
    })

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setLastCost(null)
    setLastModel(null)

    // Progress through status steps
    setStatus('validating')
    await new Promise(r => setTimeout(r, 300))
    
    setStatus('reading')
    await new Promise(r => setTimeout(r, 500))
    
    setStatus('sending')
    await new Promise(r => setTimeout(r, 300))
    
    setStatus('thinking')

    const startTime = Date.now()

    try {
      console.log('[App] Sending API request...')
      
      const chatMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
      chatMessages.push({ role: 'user', content: userMessage.content })

      // Track AI request
      trackAIRequest({
        model: 'claude-opus-4-20250514',
        messageCount: chatMessages.length + 1, // +1 for system
        hasImages: false,
        hasTools: false
      })
      addBreadcrumb('Sending AI request', 'api.request', {
        model: 'claude-opus-4-20250514',
        messageCount: chatMessages.length + 1,
        hasKnowledgeContext: !!knowledgeContext
      })

      const response = await fetch('https://i6f81wuqo0.execute-api.us-east-2.amazonaws.com/dev/v1/inference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            api_key: apiKey,
            model: 'claude-opus-4-20250514',
            messages: [
              { 
                role: 'system', 
                content: generateSystemPrompt({
                  workspacePath: workspacePath || undefined,
                  projectType: workspacePath ? detectProjectType(workspacePath) : undefined,
                  knowledgeContext: knowledgeContext || undefined,
                  environmentSummary: environmentSummary || undefined
                })
              },
              ...chatMessages
            ],
          max_tokens: 4096,
          temperature: 0.7,
        })
      })

      const responseTime = Date.now() - startTime
      console.log('[App] API response status:', response.status)
      
      // Track response status
      addBreadcrumb('API response received', 'api.response', {
        status: response.status,
        responseTime,
        ok: response.ok
      })
      
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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || "I'm here to help! What would you like me to do? 🤖",
        cost: data.api_cost,
        model: data.model
      }

      setMessages(prev => [...prev, assistantMessage])
      setStatus('done')
      
      // Track successful completion
      addBreadcrumb('AI response displayed', 'chat', {
        responseLength: responseText.length,
        model: data.model,
        cost: data.api_cost,
        totalResponseTime: responseTime
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
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `😅 **Oops!** Something went wrong.\n\n**Error:** ${(err as Error).message}\n\n**Try:**\n1. Check your internet\n2. Make sure your API key is correct\n3. Try again in a moment`
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error('Failed to get response')
      
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
            <h1 className="text-2xl font-black text-white">AIBuddy</h1>
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

        {/* Credits & Actions - Bigger Buttons */}
        <div className="flex items-center gap-3">
          {/* Credits Display - Big & Clear */}
          <Tooltip text="💰 These are your AIBuddy credits! Each question uses some credits." position="bottom">
            <div 
              className="flex items-center gap-3 px-5 py-3 rounded-2xl cursor-help"
              style={{ 
                background: credits !== null && credits < 5 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : 'rgba(34, 197, 94, 0.15)',
                border: `3px solid ${credits !== null && credits < 5 ? '#ef4444' : '#22c55e'}`,
                boxShadow: `0 4px 16px ${credits !== null && credits < 5 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
              }}
            >
              <Coins className="w-6 h-6" style={{ color: credits !== null && credits < 5 ? '#ef4444' : '#22c55e' }} />
              <span 
                className="text-lg font-black"
                style={{ color: credits !== null && credits < 5 ? '#ef4444' : '#22c55e' }}
              >
                {credits !== null ? `${credits.toFixed(0)} Credits` : '...'}
              </span>
              {credits !== null && credits < 5 && (
                <span className="text-sm font-bold text-red-400 animate-pulse">⚠️ Low!</span>
              )}
            </div>
          </Tooltip>

          {/* Last Cost - Only show if recent */}
          {lastCost !== null && (
            <Tooltip text="⚡ This is how many credits your last question used" position="bottom">
              <div 
                className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-help"
                style={{ background: 'rgba(139, 92, 246, 0.15)', border: '2px solid #8b5cf6' }}
              >
                <Zap className="w-5 h-5 text-purple-400" />
                <span className="text-base font-bold text-purple-300">-{lastCost.toFixed(2)}</span>
              </div>
            </Tooltip>
          )}

          {/* Model Used */}
          {lastModel && (
            <Tooltip text="🧠 This shows which AI brain answered your question!" position="bottom">
              <div 
                className="px-4 py-2 rounded-xl cursor-help"
                style={{ background: 'rgba(6, 182, 212, 0.15)', border: '2px solid #22d3ee' }}
              >
                <span className="text-base font-bold text-cyan-300">
                  🤖 AIBuddy
                </span>
              </div>
            </Tooltip>
          )}

          {/* Big Action Buttons */}
          <Tooltip text="📁 Click here to open your code folder! This tells me which project you're working on." position="bottom">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)'
              }}
            >
              <FolderOpen className="w-6 h-6" />
              <span className="text-base">Open Folder</span>
            </button>
          </Tooltip>

          {/* Knowledge Base Button - Big & Friendly */}
          <Tooltip text="📚 Save your server info here! I'll remember it forever and help you connect!" position="bottom">
            <button
              onClick={() => {
                trackButtonClick('Knowledge Base', 'App')
                trackPanelToggle('Knowledge Base', true)
                addBreadcrumb('Opening Knowledge Base panel', 'ui.panel', { panel: 'knowledge_base' })
                setShowKnowledgeBase(true)
              }}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
              style={{ 
                background: showKnowledgeBase 
                  ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' 
                  : 'rgba(139, 92, 246, 0.2)',
                color: 'white',
                border: `3px solid #8b5cf6`,
                boxShadow: showKnowledgeBase ? '0 8px 24px rgba(139, 92, 246, 0.4)' : 'none'
              }}
            >
              <BookOpen className="w-6 h-6" />
              <span>Knowledge</span>
              {knowledgeContext && (
                <span 
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}
                />
              )}
            </button>
          </Tooltip>

          {/* Settings Button - Big & Clear */}
          <Tooltip text="🔑 Click here to add your API key! You need this to talk to me." position="bottom">
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
              className="flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
              style={{ 
                background: apiKey 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: apiKey ? '#22c55e' : 'white',
                border: `3px solid ${apiKey ? '#22c55e' : '#fbbf24'}`,
                boxShadow: !apiKey ? '0 8px 24px rgba(251, 191, 36, 0.4)' : 'none'
              }}
            >
              <Key className="w-6 h-6" />
              <span>{apiKey ? '✓ Key Set' : 'Add Key'}</span>
            </button>
          </Tooltip>

          {/* Buy Credits - Big & Friendly */}
          <Tooltip text="💳 Need more credits? Click here to get more so we can keep coding together!" position="bottom">
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
              className="flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
              style={{ 
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)'
              }}
            >
              <CreditCard className="w-6 h-6" />
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
                    <p className="text-sm">{message.content}</p>
                  )}
                  
                  {/* Cost indicator for assistant messages */}
                  {message.role === 'assistant' && message.cost && (
                    <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
                      <Coins className="w-3 h-3" />
                      <span>Cost: {message.cost.toFixed(4)} credits</span>
                      {message.model && (
                        <>
                          <span>•</span>
                          <span>AIBuddy</span>
                        </>
                      )}
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
            {isLoading && (
              <div className="flex gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div 
                  className="rounded-xl p-3"
                  style={{ background: '#1e293b', border: '1px solid #334155' }}
                >
                  <div className="flex items-center gap-2">
                    <div style={{ color: currentStatus.color }}>{currentStatus.icon}</div>
                    <span className="text-sm text-white font-semibold">{currentStatus.text}</span>
                  </div>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden w-40">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: status === 'validating' ? '15%' : 
                               status === 'reading' ? '30%' : 
                               status === 'sending' ? '50%' : 
                               status === 'thinking' ? '70%' : 
                               status === 'generating' ? '90%' : '100%',
                        background: currentStatus.color
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input */}
      <footer className="p-4" style={{ borderTop: '2px solid #334155' }}>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {/* Big Input Box */}
          <div 
            className="flex items-end gap-4 p-4 rounded-3xl"
            style={{ 
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '3px solid #334155',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            {/* Input Area */}
            <div className="flex-1 relative">
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
                placeholder="🤔 What do you want to build today? Type here..."
                className="w-full bg-transparent text-white text-lg resize-none outline-none placeholder-slate-400 font-semibold"
                style={{ minHeight: '60px', maxHeight: '150px' }}
                rows={2}
                disabled={isLoading}
              />
              {/* Helper text */}
              <p className="text-xs text-slate-500 mt-1">
                💡 Tip: Press Enter to send, Shift+Enter for new line
              </p>
            </div>
            
            {/* Big Send Button */}
            <Tooltip text="🚀 Click here to send your message to me!">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                style={{ 
                  background: input.trim() && !isLoading 
                    ? 'linear-gradient(135deg, #ec4899, #f97316)'
                    : 'rgba(100,100,100,0.3)',
                  boxShadow: input.trim() && !isLoading 
                    ? '0 8px 24px rgba(236, 72, 153, 0.5)'
                    : 'none'
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <Send className="w-7 h-7 text-white" />
                )}
                <span className="text-white font-bold text-lg hidden sm:block">
                  {isLoading ? 'Thinking...' : 'Send'}
                </span>
              </button>
            </Tooltip>
          </div>
          
          {/* Helpful Footer */}
          <p className="text-center text-slate-400 text-sm mt-3 font-semibold">
            Press Enter to send • Powered by AIBuddy ✨
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
          </div>
        </div>
      )}

      <Toaster position="top-right" theme="dark" richColors />

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
    </div>
  )
}

export default App
