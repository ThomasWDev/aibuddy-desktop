import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Voice Input Hook - Issue #17
 * 
 * Provides voice-to-text functionality using the Web Speech API.
 * Designed for use in the chat input area.
 */

export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error'

interface UseVoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

interface UseVoiceInputReturn {
  /** Current state of voice input */
  state: VoiceInputState
  /** Whether voice input is supported in this browser */
  isSupported: boolean
  /** Current interim transcript (while speaking) */
  interimTranscript: string
  /** Start voice recognition */
  startListening: () => void
  /** Stop voice recognition */
  stopListening: () => void
  /** Toggle voice recognition on/off */
  toggleListening: () => void
  /** Last error message */
  errorMessage: string | null
}

// Get the SpeechRecognition constructor (with webkit prefix fallback)
const SpeechRecognition = typeof window !== 'undefined' 
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    onResult,
    onError
  } = options

  const [state, setState] = useState<VoiceInputState>('idle')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const isSupported = !!SpeechRecognition

  // Initialize recognition instance
  useEffect(() => {
    if (!isSupported) return

    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults

    recognition.onstart = () => {
      setState('listening')
      setErrorMessage(null)
      setInterimTranscript('')
    }

    recognition.onend = () => {
      setState('idle')
      setInterimTranscript('')
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim)

      if (final) {
        setState('processing')
        onResult?.(final, true)
        setTimeout(() => setState('idle'), 100)
      } else if (interim) {
        onResult?.(interim, false)
      }
    }

    recognition.onerror = (event: any) => {
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone permission denied. Please allow microphone access.',
        'no-speech': 'No speech detected. Please try again.',
        'network': 'Network error. Please check your connection.',
        'audio-capture': 'Microphone not available. Please check your audio settings.',
        'aborted': '' // Not a real error, user cancelled
      }

      const message = errorMessages[event.error] || `Voice input error: ${event.error}`
      
      if (event.error !== 'aborted') {
        setErrorMessage(message)
        setState('error')
        onError?.(message)
        
        // Reset to idle after 3 seconds
        setTimeout(() => {
          setState('idle')
          setErrorMessage(null)
        }, 3000)
      } else {
        setState('idle')
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [language, continuous, interimResults, onResult, onError, isSupported])

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setErrorMessage('Voice input not supported in this browser')
      return
    }

    try {
      recognitionRef.current.start()
    } catch (err) {
      // Recognition might already be running
      console.warn('Speech recognition start error:', err)
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (state === 'listening') {
      stopListening()
    } else {
      startListening()
    }
  }, [state, startListening, stopListening])

  return {
    state,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    errorMessage
  }
}

export default useVoiceInput
