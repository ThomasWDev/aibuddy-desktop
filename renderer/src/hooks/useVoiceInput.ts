import { useState, useCallback, useRef, useEffect } from 'react'
import { AIBUDDY_API_TRANSCRIBE_URL } from '../../../src/constants/urls'

/**
 * Voice Input Hook — KAN-17 FIX
 *
 * Root cause: Web Speech API (SpeechRecognition) requires Google's server-side
 * speech service. Electron's Chromium build doesn't embed the API key, so
 * recognition.start() fires a "network" error immediately.
 *
 * Fix: Use MediaRecorder to capture audio from the microphone, then send the
 * base64 audio to the AIBuddy backend which calls OpenAI Whisper for
 * transcription. This works offline-first (recording) and only needs network
 * for the transcription call, with a clear error message if it fails.
 */

export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error'

const MAX_RECORDING_MS = 60_000

interface UseVoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

interface UseVoiceInputReturn {
  state: VoiceInputState
  isSupported: boolean
  interimTranscript: string
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  errorMessage: string | null
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { language, onResult, onError } = options

  const [state, setState] = useState<VoiceInputState>('idle')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSupported] = useState(() =>
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  )

  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
  }, [])

  const setError = useCallback((msg: string) => {
    setErrorMessage(msg)
    setState('error')
    onErrorRef.current?.(msg)
    setTimeout(() => { setState('idle'); setErrorMessage(null) }, 5000)
  }, [])

  const sendToWhisper = useCallback(async (audioBlob: Blob) => {
    setState('processing')
    setInterimTranscript('Transcribing…')

    try {
      const electronAPI = (window as any).electronAPI
      const apiKey = electronAPI?.store?.get?.('apiKey') || localStorage.getItem('aibuddy_api_key') || ''

      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const res = await fetch(AIBUDDY_API_TRANSCRIBE_URL, {
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
          language: language || undefined,
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: 'Transcription failed' }))
        throw new Error(errBody.message || `Server error ${res.status}`)
      }

      const data = await res.json()

      if (data.text && data.text.trim()) {
        setInterimTranscript('')
        onResultRef.current?.(data.text.trim(), true)
      } else {
        setInterimTranscript('')
        setError('No speech detected. Please try again.')
        return
      }

      setState('idle')
    } catch (err: any) {
      setInterimTranscript('')
      setError(err.message || 'Failed to transcribe audio. Please try again.')
    }
  }, [language, setError])

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Microphone not available in this environment')
      return
    }

    // Check Electron microphone permissions
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
        if (blob.size > 0) {
          sendToWhisper(blob)
        } else {
          setState('idle')
        }
      }

      recorder.onerror = () => {
        cleanup()
        setError('Microphone recording failed. Please check your audio settings.')
      }

      recorder.start()
      setState('listening')
      setErrorMessage(null)
      setInterimTranscript('Listening…')

      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, MAX_RECORDING_MS)

    } catch (err: any) {
      cleanup()
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser/system settings.')
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError(`Microphone error: ${err.message}`)
      }
    }
  }, [isSupported, cleanup, sendToWhisper, setError])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
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
