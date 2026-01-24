import React, { useState, useRef, useEffect } from 'react'
import { 
  X, 
  Send, 
  Plus, 
  Settings, 
  Sparkles,
  User,
  Bot,
  Copy,
  Check,
  Key,
  AlertCircle,
  Loader2,
  Brain,
  Code,
  FileSearch,
  Zap,
  ChevronDown
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { aibuddyClient } from '../../../../src/api/aibuddy-client'
import { trackButtonClick, trackError, addBreadcrumb, trackAIRequest, trackAIResponse } from '../../lib/sentry'

// AI Status steps for progress display - Cursor-like
type AIStatus = 'idle' | 'sending' | 'thinking' | 'analyzing' | 'generating' | 'complete' | 'error'

const statusConfig: Record<AIStatus, { text: string; color: string; bgColor: string }> = {
  idle: { text: 'Ready', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
  sending: { text: 'Sending...', color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.1)' },
  thinking: { text: 'Thinking...', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
  analyzing: { text: 'Analyzing code...', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  generating: { text: 'Writing response...', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  complete: { text: 'Done', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
  error: { text: 'Error', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
}

// Tooltip component
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md whitespace-nowrap z-50 shadow-lg border border-slate-700">
          {text}
        </div>
      )}
    </div>
  )
}

interface AIPanelProps {
  workspacePath: string
  onClose: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIPanel({ workspacePath, onClose }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      const key = await aibuddyClient.getApiKey()
      setApiKey(key)
      if (!key) {
        setShowApiKeyInput(true)
      }
    }
    checkApiKey()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    
    trackButtonClick('Save API Key', 'AIPanel')
    addBreadcrumb('Saving API key', 'user')
    
    try {
      await aibuddyClient.saveApiKey(apiKeyInput.trim())
      setApiKey(apiKeyInput.trim())
      setShowApiKeyInput(false)
      setApiKeyInput('')
      setError(null)
    } catch (err) {
      setError('Failed to save API key')
      trackError(err as Error, { context: 'saveApiKey' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[AIPanel] handleSubmit called')
    
    if (!input.trim() || isLoading) return

    if (!apiKey) {
      setShowApiKeyInput(true)
      setError('Please enter your AIBuddy API key first')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setAiStatus('sending')
    setError(null)

    const startTime = Date.now()
    trackAIRequest({ model: 'aibuddy-pro', messageCount: messages.length + 1 })
    addBreadcrumb('Sending AI request', 'ai', { messageLength: userMessage.content.length })

    // Progress simulation
    setTimeout(() => setAiStatus('thinking'), 500)
    setTimeout(() => setAiStatus('analyzing'), 1500)
    setTimeout(() => setAiStatus('generating'), 3000)

    try {
      const chatMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
      chatMessages.push({ role: 'user', content: userMessage.content })

      const response = await aibuddyClient.chat({
        messages: chatMessages,
        system: `You are AIBuddy, a helpful AI coding assistant. You are helping the user with their project at: ${workspacePath}. Be friendly, helpful, and provide clear explanations. Use code blocks with syntax highlighting when showing code.`,
        max_tokens: 4096,
        temperature: 0.7
      })

      const responseTime = Date.now() - startTime
      const responseText = response.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n')

      trackAIResponse({
        model: response.model,
        outputTokens: response.usage?.output_tokens || 0,
        responseTime,
        success: true
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || 'I received your message but had no response.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setAiStatus('complete')
      setTimeout(() => setAiStatus('idle'), 2000)
    } catch (err) {
      console.error('[AIPanel] API Error:', err)
      trackError(err as Error, { context: 'aiChat' })
      trackAIResponse({
        model: 'unknown',
        outputTokens: 0,
        responseTime: Date.now() - startTime,
        success: false
      })
      
      setAiStatus('error')
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to get response: ${errorMessage}`)
      
      const errorAssistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**Error:** ${errorMessage}\n\nPlease check your API key and try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorAssistantMessage])
      setTimeout(() => setAiStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearChat = () => {
    setMessages([])
  }

  const currentStatus = statusConfig[aiStatus]

  return (
    <div 
      className="ai-panel flex flex-col overflow-hidden"
      style={{ 
        background: '#1e293b',
        borderLeft: '1px solid #334155',
        fontFamily: "'Nunito', sans-serif"
      }}
    >
      {/* Header - Cursor-like minimal */}
      <div 
        className="h-10 flex items-center justify-between px-3 border-b"
        style={{ borderColor: '#334155', background: '#0f172a' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">AI Assistant</span>
          
          {/* Status Badge */}
          <div 
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: currentStatus.bgColor, color: currentStatus.color }}
          >
            {aiStatus === 'idle' ? (
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: currentStatus.color }} />
            ) : aiStatus === 'complete' ? (
              <Check className="w-3 h-3" />
            ) : aiStatus === 'error' ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            <span>{currentStatus.text}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-0.5">
          <Tooltip text="New chat">
            <button
              onClick={clearChat}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="Settings">
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="Close">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div className="p-3 border-b" style={{ borderColor: '#334155', background: 'rgba(251, 191, 36, 0.05)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-amber-400 text-sm">Enter API Key</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="aibuddy_xxxxxxxx..."
              className="flex-1 px-3 py-1.5 rounded-md text-sm text-white placeholder-slate-500"
              style={{ background: '#0f172a', border: '1px solid #334155' }}
            />
            <button
              onClick={handleSaveApiKey}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-md text-sm font-semibold transition-all"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Get your key at <a href="https://aibuddy.life" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">aibuddy.life</a>
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: '#334155', background: 'rgba(239, 68, 68, 0.1)' }}>
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-xs flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Welcome to AIBuddy!
            </h3>
            <p className="text-sm text-slate-400 max-w-[250px] mb-4">
              Ask me anything about your code. I can help you write, debug, and improve it.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-2.5 py-1 bg-pink-500/10 text-pink-400 rounded-md text-xs font-medium">Ask questions</span>
              <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 rounded-md text-xs font-medium">Debug code</span>
              <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-md text-xs font-medium">Write code</span>
            </div>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white'
                    : ''
                }`}
                style={message.role === 'assistant' ? { background: '#0f172a', border: '1px solid #334155' } : {}}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none text-slate-200" style={{ fontSize: '13px', lineHeight: '1.6' }}>
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
                                  className="absolute right-2 top-2 p-1 rounded bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {copiedId === message.id + className ? (
                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </button>
                                <SyntaxHighlighter
                                  style={vscDarkPlus as any}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ borderRadius: '8px', fontSize: '12px', margin: 0 }}
                                  {...props}
                                >
                                  {codeString}
                                </SyntaxHighlighter>
                              </div>
                            )
                          }
                          return (
                            <code className="bg-slate-700 text-pink-400 px-1 py-0.5 rounded text-xs" {...props}>
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
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator - Cursor-like */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f172a', border: '1px solid #334155' }}>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: currentStatus.color }} />
                <span className="text-sm" style={{ color: currentStatus.color }}>{currentStatus.text}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden w-32">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: aiStatus === 'sending' ? '25%' : 
                           aiStatus === 'thinking' ? '50%' : 
                           aiStatus === 'analyzing' ? '75%' : 
                           aiStatus === 'generating' ? '90%' : '100%',
                    background: currentStatus.color
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - Cursor-like */}
      <div className="p-3 border-t" style={{ borderColor: '#334155', background: '#0f172a' }}>
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AIBuddy anything..."
            className="w-full px-3 py-2.5 pr-12 rounded-lg resize-none text-sm text-white placeholder-slate-500"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
            rows={2}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 rounded-md bg-gradient-to-r from-pink-500 to-orange-400 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          Powered by AIBuddy • Press Enter to send
        </p>
      </div>
    </div>
  )
}
