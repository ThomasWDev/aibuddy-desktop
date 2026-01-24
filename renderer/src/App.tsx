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
  AlertTriangle
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { trackButtonClick, trackError, addBreadcrumb } from './lib/sentry'

// Simple tooltip
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap z-50"
          style={{ 
            background: 'linear-gradient(135deg, #1e293b, #334155)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            border: '2px solid #475569'
          }}
        >
          {text}
        </div>
      )}
    </div>
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load on mount
  useEffect(() => {
    const init = async () => {
      const electronAPI = (window as any).electronAPI
      
      // Get API key
      if (electronAPI?.store?.get) {
        try {
          const key = await electronAPI.store.get('apiKey')
          if (key) {
            setApiKey(key)
            // Validate key and get credits
            validateApiKey(key)
          } else {
            setShowSettings(true)
          }
        } catch {}
      }
      
      // Get version
      if (electronAPI?.app?.getVersion) {
        try {
          const v = await electronAPI.app.getVersion()
          setAppVersion(v)
        } catch {}
      }
      
      // Get recent workspace
      if (electronAPI?.store?.get) {
        try {
          const recent = await electronAPI.store.get('recentWorkspaces')
          if (recent && recent.length > 0) {
            setWorkspacePath(recent[0])
          }
        } catch {}
      }
    }
    init()
  }, [])

  // Validate API key and get credits
  const validateApiKey = async (key: string) => {
    setStatus('validating')
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
      
      const data = await response.json()
      console.log('[App] API validation response:', data)
      
      if (data.remaining_credits !== undefined) {
        setCredits(data.remaining_credits)
        toast.success(`✅ API key valid! You have ${data.remaining_credits.toFixed(2)} credits`)
      }
      setStatus('idle')
    } catch (err) {
      console.error('[App] API validation error:', err)
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
        addBreadcrumb(`Opened folder: ${path}`, 'user')
      }
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    trackButtonClick('Save API Key', 'App')
    
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.store?.set) {
      await electronAPI.store.set('apiKey', apiKeyInput.trim())
    }
    
    setApiKey(apiKeyInput.trim())
    setShowSettings(false)
    
    // Validate and get credits
    validateApiKey(apiKeyInput.trim())
    setApiKeyInput('')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    if (!apiKey) {
      setShowSettings(true)
      toast.error('🔑 Please add your API key first!')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

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

    try {
      console.log('[App] Sending API request...')
      
      const chatMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
      chatMessages.push({ role: 'user', content: userMessage.content })

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
              content: `You are AIBuddy, a friendly AI coding assistant for kids and beginners. 

RULES:
- Use simple words an 8-year-old can understand
- Be encouraging! Use emojis 🎉
- Explain code simply
- Keep responses short and clear
- Use bullet points
- Celebrate completed tasks! 🌟

Working folder: ${workspacePath || 'None selected'}`
            },
            ...chatMessages
          ],
          max_tokens: 4096,
          temperature: 0.7,
        })
      })

      console.log('[App] API response status:', response.status)
      
      setStatus('generating')
      
      const data = await response.json()
      console.log('[App] API response data:', data)

      // Update credits
      if (data.remaining_credits !== undefined) {
        const oldCredits = credits
        setCredits(data.remaining_credits)
        if (oldCredits !== null && data.api_cost) {
          toast.info(`💰 Used ${data.api_cost.toFixed(4)} credits`)
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
      
      setTimeout(() => setStatus('idle'), 2000)
      
    } catch (err) {
      console.error('[App] API Error:', err)
      trackError(err as Error, { context: 'chat' })
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
      {/* Header */}
      <header 
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '2px solid #334155' }}
      >
        {/* Logo & Status */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, #ec4899, #f97316)',
              boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
            }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AIBuddy</h1>
            <p className="text-[10px] text-slate-500">v{appVersion}</p>
          </div>
          
          {/* Status Badge */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full ml-2"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155' }}
          >
            <div style={{ color: currentStatus.color }}>{currentStatus.icon}</div>
            <span className="text-sm font-semibold text-white">{currentStatus.text}</span>
          </div>
        </div>

        {/* Credits & Actions */}
        <div className="flex items-center gap-2">
          {/* Credits Display */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ 
              background: credits !== null && credits < 5 
                ? 'rgba(239, 68, 68, 0.2)' 
                : 'rgba(34, 197, 94, 0.1)',
              border: `1px solid ${credits !== null && credits < 5 ? '#ef4444' : '#22c55e'}`
            }}
          >
            <Coins className="w-4 h-4" style={{ color: credits !== null && credits < 5 ? '#ef4444' : '#22c55e' }} />
            <span 
              className="text-sm font-bold"
              style={{ color: credits !== null && credits < 5 ? '#ef4444' : '#22c55e' }}
            >
              {credits !== null ? `${credits.toFixed(2)} credits` : 'Loading...'}
            </span>
            {credits !== null && credits < 5 && (
              <span className="text-xs text-red-400">⚠️ Low</span>
            )}
          </div>

          {/* Last Cost */}
          {lastCost !== null && (
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}
            >
              <Zap className="w-3 h-3" />
              <span>-{lastCost.toFixed(4)}</span>
            </div>
          )}

          {/* Model Used */}
          {lastModel && (
            <div 
              className="px-2 py-1 rounded-lg text-xs font-mono"
              style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#22d3ee' }}
            >
              {lastModel.includes('deepseek') ? '🤖 DeepSeek' : '🧠 Claude'}
            </div>
          )}

          <Tooltip text="📁 Open your code folder">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: 'white'
              }}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open</span>
            </button>
          </Tooltip>

          <Tooltip text="🔑 API Key Settings">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ 
                background: apiKey ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                color: apiKey ? '#22c55e' : '#fbbf24',
                border: `1px solid ${apiKey ? '#22c55e' : '#fbbf24'}`
              }}
            >
              <Key className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip text="💳 Buy Credits">
            <button
              onClick={() => {
                const electronAPI = (window as any).electronAPI
                if (electronAPI?.shell?.openExternal) {
                  electronAPI.shell.openExternal('https://aibuddy.life/pricing')
                } else {
                  window.open('https://aibuddy.life/pricing', '_blank')
                }
              }}
              className="p-2 rounded-xl transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
            >
              <CreditCard className="w-4 h-4" />
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
      <main className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
              style={{ 
                background: 'linear-gradient(135deg, #ec4899, #f97316)',
                boxShadow: '0 8px 40px rgba(236, 72, 153, 0.4)'
              }}
            >
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">Hi there! 👋</h2>
            <p className="text-lg text-slate-400 mb-6 max-w-md">
              Tell me what you want to build and I'll help you!
            </p>

            <div className="flex gap-3">
              <div className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#f472b6' }}>
                💬 Just type what you want
              </div>
              <div className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#22d3ee' }}>
                🚀 I'll do the work
              </div>
              <div className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}>
                💰 Watch your credits
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
                  >
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div
                  className="max-w-[80%] rounded-xl p-3"
                  style={message.role === 'user' 
                    ? { background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white' }
                    : { background: '#1e293b', border: '1px solid #334155' }
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
                          <span>{message.model.includes('deepseek') ? 'DeepSeek' : 'Claude'}</span>
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
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div 
            className="flex items-end gap-3 p-3 rounded-xl"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          >
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
              placeholder="Tell me what you want to build... 🚀"
              className="flex-1 bg-transparent text-white text-base resize-none outline-none placeholder-slate-500"
              style={{ minHeight: '50px', maxHeight: '120px' }}
              rows={2}
              disabled={isLoading}
            />
            <Tooltip text="Send (Enter)">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                style={{ 
                  background: 'linear-gradient(135deg, #ec4899, #f97316)',
                  boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
                }}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </Tooltip>
          </div>
          <p className="text-center text-slate-500 text-xs mt-2">
            Press Enter to send • Powered by AIBuddy ✨
          </p>
        </form>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          <div 
            className="w-full max-w-md p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '2px solid #334155'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-6 h-6 text-amber-400" />
                API Key
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 mb-4 text-sm">
              Enter your AIBuddy API key. 
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  const electronAPI = (window as any).electronAPI
                  if (electronAPI?.shell?.openExternal) {
                    electronAPI.shell.openExternal('https://aibuddy.life/pricing')
                  }
                }}
                className="text-cyan-400 hover:underline ml-1"
              >
                Get one here!
              </a>
            </p>

            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="aibuddy_xxxxxxxx..."
              className="w-full px-4 py-3 rounded-xl text-white mb-4"
              style={{ background: '#0f172a', border: '1px solid #334155' }}
            />

            <button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
              className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
            >
              Save Key ✨
            </button>
          </div>
        </div>
      )}

      <Toaster position="top-right" theme="dark" richColors />
    </div>
  )
}

export default App
