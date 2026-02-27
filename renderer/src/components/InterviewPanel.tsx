import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic, MicOff, X, Play, Square, Trash2, ChevronDown, ChevronUp,
  Lightbulb, GraduationCap, Volume2, Loader2, AlertCircle,
  RotateCcw, Settings2, Clock
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const INTERVIEW_SYSTEM_PROMPT = `You are an Interview Coach AI. You help users ace technical and behavioral interviews by listening to interview questions and providing excellent answers.

RESPONSE FORMAT — Always structure your answer in exactly two sections:

## 💡 Simple Explanation
Explain the concept in plain, everyday language as if talking to a friend who isn't technical. Use analogies and real-world examples. Keep it 2-3 sentences max.

## 🎯 Expert Answer
Now provide the interview-quality answer. Be specific, use proper terminology, mention best practices, and include a brief code example if it's a technical question. This is what you'd say to impress the interviewer. Keep it concise but thorough — aim for 30-60 seconds of speaking time.

RULES:
- If the question is behavioral (tell me about a time...), provide a STAR-format answer in the Expert section
- If the question is technical, include a short code snippet in the Expert section when helpful
- If you hear follow-up context, incorporate it naturally
- Be confident and direct — no hedging or "I think" language
- If the transcript is unclear or partial, ask for clarification rather than guessing
- Tailor complexity to what's being asked — don't over-explain simple questions`

interface TranscriptEntry {
  id: string
  text: string
  timestamp: Date
  isFinal: boolean
}

interface AIResponse {
  id: string
  question: string
  answer: string
  timestamp: Date
  isLoading: boolean
}

interface InterviewPanelProps {
  isOpen: boolean
  onClose: () => void
  apiKey: string
  apiUrl: string
  appVersion: string
}

type InterviewMode = 'realtime' | 'manual'

// KAN-17 FIX: Use MediaRecorder + Whisper instead of broken SpeechRecognition
const hasMediaRecorder = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export function InterviewPanel({ isOpen, onClose, apiKey, apiUrl, appVersion }: InterviewPanelProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [currentInterim, setCurrentInterim] = useState('')
  const [responses, setResponses] = useState<AIResponse[]>([])
  const [mode, setMode] = useState<InterviewMode>('realtime')
  const [manualQuestion, setManualQuestion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set())
  const [autoScroll, setAutoScroll] = useState(true)
  const [silenceTimer, setSilenceTimer] = useState<number>(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const responsesEndRef = useRef<HTMLDivElement>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSpeechRef = useRef<number>(Date.now())
  const pendingTextRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isSupported = hasMediaRecorder

  // Auto-scroll transcript
  useEffect(() => {
    if (autoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcript, currentInterim, autoScroll])

  // Auto-scroll responses
  useEffect(() => {
    if (autoScroll && responsesEndRef.current) {
      responsesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [responses, autoScroll])

  const sendToAI = useCallback(async (question: string) => {
    if (!apiKey || !question.trim()) return

    const responseId = `resp-${Date.now()}`
    const newResponse: AIResponse = {
      id: responseId,
      question: question.trim(),
      answer: '',
      timestamp: new Date(),
      isLoading: true,
    }

    setResponses(prev => [...prev, newResponse])
    setExpandedResponses(prev => new Set([...prev, responseId]))

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const requestBody = {
        api_key: apiKey,
        messages: [
          { role: 'system', content: INTERVIEW_SYSTEM_PROMPT },
          { role: 'user', content: `Interview question heard: "${question.trim()}"` }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AIBuddy-API-Key': apiKey,
          'X-Requested-With': 'AIBuddy-Desktop',
          'User-Agent': `AIBuddy-Desktop/${appVersion}`,
          'X-Interview-Mode': 'true',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        throw new Error('Non-JSON response from API')
      }

      const data = await response.json()
      const aiText = data?.choices?.[0]?.message?.content
        || data?.response
        || data?.content
        || 'No response received'

      setResponses(prev =>
        prev.map(r => r.id === responseId ? { ...r, answer: aiText, isLoading: false } : r)
      )
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('[Interview] API error:', err)
      setResponses(prev =>
        prev.map(r => r.id === responseId
          ? { ...r, answer: `Error: ${err.message}. Try again or check your API key.`, isLoading: false }
          : r
        )
      )
    }
  }, [apiKey, apiUrl, appVersion])

  // Silence detection: when user stops speaking for 3s, send accumulated text
  useEffect(() => {
    if (!isListening) {
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current)
      setSilenceTimer(0)
      return
    }

    silenceTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - lastSpeechRef.current) / 1000
      setSilenceTimer(Math.floor(elapsed))

      if (elapsed >= 3 && pendingTextRef.current.trim().length > 10) {
        const question = pendingTextRef.current.trim()
        pendingTextRef.current = ''
        sendToAI(question)
      }
    }, 500)

    return () => {
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current)
    }
  }, [isListening, sendToAI])

  // KAN-17 FIX: Helper to transcribe a recorded segment via Whisper
  const transcribeSegment = useCallback(async (audioBlob: Blob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AIBuddy-API-Key': apiKey,
          'X-Requested-With': 'AIBuddy-Desktop',
        },
        body: JSON.stringify({
          mode: 'transcribe',
          api_key: apiKey,
          audio_base64: base64,
          audio_format: 'webm',
        }),
      })

      if (!res.ok) return
      const data = await res.json()
      if (!data.text?.trim()) return

      const finalText = data.text.trim()
      lastSpeechRef.current = Date.now()
      pendingTextRef.current += ' ' + finalText

      setTranscript(prev => [...prev, {
        id: `t-${Date.now()}`,
        text: finalText,
        timestamp: new Date(),
        isFinal: true,
      }])
      setCurrentInterim('')
    } catch (err) {
      console.error('[Interview] Transcription segment error:', err)
    }
  }, [apiKey, apiUrl])

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Microphone is not available in this environment')
      return
    }

    // KAN-62: Check macOS microphone permission
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.microphone?.getStatus) {
        const status = await electronAPI.microphone.getStatus()
        if (status === 'denied') {
          setError('Microphone access denied. Open System Settings > Privacy & Security > Microphone to grant access.')
          return
        }
        if (status !== 'granted') {
          const granted = await electronAPI.microphone.requestAccess()
          if (!granted) {
            setError('Microphone permission not granted. Please allow access in System Settings.')
            return
          }
        }
      }
    } catch {
      // Not in Electron or IPC unavailable
    }

    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        if (blob.size > 0) transcribeSegment(blob)
      }

      recorder.onerror = () => {
        setError('Microphone recording failed. Please check your audio settings.')
        setIsListening(false)
      }

      recorder.start()
      setIsListening(true)
      lastSpeechRef.current = Date.now()
      pendingTextRef.current = ''
      setCurrentInterim('Listening…')
      console.log('[Interview] MediaRecorder listening started')

      // Auto-segment every 8 seconds for continuous transcription
      segmentTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
          chunksRef.current = []
          mediaRecorderRef.current.start()
        }
      }, 8000)

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access.')
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.')
      } else {
        setError(`Microphone error: ${err.message}`)
      }
    }
  }, [isSupported, transcribeSegment])

  const stopListening = useCallback(() => {
    // KAN-17 FIX: Stop MediaRecorder and clean up stream
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current)
      segmentTimerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsListening(false)
    setCurrentInterim('')

    // Send any remaining pending text
    if (pendingTextRef.current.trim().length > 10) {
      sendToAI(pendingTextRef.current.trim())
      pendingTextRef.current = ''
    }
  }, [sendToAI])

  const handleManualSubmit = () => {
    if (!manualQuestion.trim()) return
    sendToAI(manualQuestion.trim())

    setTranscript(prev => [...prev, {
      id: `t-${Date.now()}`,
      text: manualQuestion.trim(),
      timestamp: new Date(),
      isFinal: true,
    }])
    setManualQuestion('')
  }

  const clearAll = () => {
    stopListening()
    setTranscript([])
    setResponses([])
    setCurrentInterim('')
    pendingTextRef.current = ''
    if (abortControllerRef.current) abortControllerRef.current.abort()
  }

  const toggleResponseExpand = (id: string) => {
    setExpandedResponses(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopListening()
    }
  }, [isOpen, stopListening])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="flex flex-col w-full h-full"
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Interview Mode</h2>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800">
              <button
                onClick={() => setMode('realtime')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  mode === 'realtime'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3 h-3 inline mr-1" />
                Live Audio
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  mode === 'manual'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Type Question
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Main Content - Split View */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel: Live Transcript */}
          <div className="w-2/5 flex flex-col border-r border-slate-700/50">
            <div className="px-4 py-2 border-b border-slate-700/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-slate-300">Live Transcript</span>
              </div>
              {isListening && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-400">Listening</span>
                  {silenceTimer >= 1 && (
                    <span className="text-xs text-slate-500 ml-1">
                      <Clock className="w-3 h-3 inline" /> {silenceTimer}s
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {transcript.length === 0 && !currentInterim && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4">
                  <Mic className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No transcript yet</p>
                  <p className="text-xs mt-1">
                    {mode === 'realtime'
                      ? 'Click the mic button to start listening to the interview'
                      : 'Type a question below to get AI coaching'
                    }
                  </p>
                </div>
              )}

              {transcript.map(entry => (
                <div key={entry.id} className="group">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-600 mt-0.5 flex-shrink-0 font-mono">
                      {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <p className="text-sm text-slate-300 leading-relaxed">{entry.text}</p>
                  </div>
                </div>
              ))}

              {currentInterim && (
                <div className="flex items-start gap-2 opacity-60">
                  <span className="text-[10px] text-slate-600 mt-0.5 flex-shrink-0 font-mono">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <p className="text-sm text-cyan-300 italic leading-relaxed">{currentInterim}...</p>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Audio Controls / Manual Input */}
            <div className="p-3 border-t border-slate-700/30">
              {mode === 'realtime' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={!isSupported}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isListening
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/25'
                    } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isListening ? (
                      <>
                        <Square className="w-4 h-4" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Start Listening
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualQuestion}
                    onChange={(e) => setManualQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="Type the interview question..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualQuestion.trim()}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Ask AI
                  </button>
                </div>
              )}
              {!isSupported && mode === 'realtime' && (
                <p className="text-xs text-amber-400 mt-2 text-center">
                  Speech recognition not available. Use "Type Question" mode instead.
                </p>
              )}
            </div>
          </div>

          {/* Right Panel: AI Responses */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 border-b border-slate-700/30 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-slate-300">AI Interview Coach</span>
              <span className="text-xs text-slate-500 ml-auto">{responses.length} answers</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {responses.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-8">
                  <GraduationCap className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Ready to coach you</p>
                  <p className="text-xs mt-2 leading-relaxed">
                    Start listening or type a question. The AI will provide two answers: a simple explanation first, then an expert-level answer to ace the interview.
                  </p>
                </div>
              )}

              {responses.map(resp => (
                <div
                  key={resp.id}
                  className="rounded-xl border border-slate-700/50 overflow-hidden"
                  style={{ background: 'rgba(30, 41, 59, 0.5)' }}
                >
                  {/* Question */}
                  <div
                    className="flex items-start gap-2 px-4 py-3 cursor-pointer hover:bg-slate-700/20 transition-colors"
                    onClick={() => toggleResponseExpand(resp.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {resp.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300">
                          Q
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium">&ldquo;{resp.question}&rdquo;</p>
                    </div>
                    {expandedResponses.has(resp.id) ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />
                    )}
                  </div>

                  {/* Answer */}
                  {expandedResponses.has(resp.id) && (
                    <div className="px-4 pb-4 border-t border-slate-700/30">
                      {resp.isLoading ? (
                        <div className="flex items-center gap-2 py-4 text-purple-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <div className="mt-3 prose prose-invert prose-sm max-w-none
                          prose-h2:text-base prose-h2:font-bold prose-h2:mt-3 prose-h2:mb-2
                          prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-sm
                          prose-code:text-cyan-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                          prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-lg
                          prose-strong:text-white prose-em:text-slate-300
                          prose-li:text-slate-300 prose-li:text-sm"
                        >
                          <ReactMarkdown>{resp.answer}</ReactMarkdown>
                        </div>
                      )}

                      {!resp.isLoading && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/20">
                          <button
                            onClick={() => sendToAI(resp.question)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-purple-300 hover:bg-purple-600/10 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Regenerate
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(resp.answer)
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-cyan-300 hover:bg-cyan-600/10 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={responsesEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InterviewPanel
