import { useEffect, useRef, useState, useCallback } from 'react'
import { functions } from '@/lib/functions'

interface RealtimeMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface RealtimeConfig {
  conversationId: string
  userId: string
  onMessage?: (message: RealtimeMessage) => void
  onFunctionCall?: (name: string, args: any) => void
  onError?: (error: Error) => void
}

export function useRealtime(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<RealtimeMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioQueueRef = useRef<AudioBuffer[]>([])
  const isPlayingRef = useRef(false)
  const currentTranscriptRef = useRef<string>('')
  const currentResponseIdRef = useRef<string | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const recognitionRef = useRef<any>(null)
  const userTranscriptRef = useRef<string>('')
  const assistantMessageSentRef = useRef<boolean>(false)

  const connect = useCallback(async () => {
    try {
      // Get ephemeral token from our API
      const response = await fetch('/api/realtime', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to get session token')
      }

      const { token } = await response.json()

      // Connect to OpenAI Realtime API
      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        ['realtime', `openai-insecure-api-key.${token}`]
      )

      ws.onopen = () => {
        console.log('Connected to OpenAI Realtime API')
        setIsConnected(true)
        // Don't send config yet - wait for session.created event
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)

        // Debug logging to understand flow
        console.log('📨 Event:', data.type)

        switch (data.type) {
          case 'session.created':
            console.log('✅ Session created')

            // Disable VAD - turn_detection goes in audio.input per session.updated structure
            ws.send(JSON.stringify({
              type: 'session.update',
              session: {
                type: 'realtime',
                audio: {
                  input: {
                    turn_detection: null
                  }
                }
              }
            }))
            console.log('📤 Sent session config with turn_detection=null')
            break

          case 'session.updated':
            console.log('✅ Session updated confirmed')
            console.log('🔍 FULL SESSION DATA:', JSON.stringify(data.session, null, 2))
            break

          case 'input_audio_buffer.speech_started':
            console.log('🚨 VAD DETECTED SPEECH START - THIS SHOULD NOT HAPPEN!')
            break

          case 'input_audio_buffer.speech_stopped':
            console.log('🚨 VAD DETECTED SPEECH STOP - CANCELLING AUTO RESPONSE!')
            // Cancel any automatic response that VAD triggered
            ws.send(JSON.stringify({
              type: 'response.cancel'
            }))
            // Don't clear buffer - we want to keep it for manual commit
            break

          case 'input_audio_buffer.committed':
            console.log('⚠️ Audio buffer was committed (likely by VAD)')
            break

          case 'response.created':
            // New response starting - reset state
            console.log('🔄 Response created - resetting flags')
            console.log('⚠️ Was this triggered by user stopping recording? Check for 📤 log above')
            assistantMessageSentRef.current = false
            currentTranscriptRef.current = ''
            currentResponseIdRef.current = data.response?.id || Date.now().toString()
            break

          case 'conversation.item.done':
            // Item is complete - check if it's an assistant message with transcript
            if (data.item?.type === 'message') {
              if (data.item.role === 'assistant') {
                // Assistant message - get transcript from output_audio content
                const content = data.item.content?.find((c: any) => c.type === 'output_audio')
                if (content?.transcript) {
                  console.log('📝 conversation.item.done with transcript:', content.transcript)
                  console.log('📌 assistantMessageSentRef:', assistantMessageSentRef.current)

                  if (!assistantMessageSentRef.current) {
                    console.log('💬 Sending AI message (item.done):', content.transcript)
                    assistantMessageSentRef.current = true
                    config.onMessage?.({
                      role: 'assistant',
                      content: content.transcript,
                      timestamp: new Date()
                    })
                  } else {
                    console.log('⚠️ Skipping duplicate - already sent via delta')
                  }
                  // Clear accumulated transcript
                  currentTranscriptRef.current = ''
                }
              }
            }
            break

          case 'conversation.item.input_audio_transcription.completed':
          case 'input_audio_transcription.completed':
          case 'input_audio_buffer.transcription.completed':
            // User's speech transcript is complete
            if (data.transcript) {
              config.onMessage?.({
                role: 'user',
                content: data.transcript,
                timestamp: new Date()
              })
            }
            break

          case 'conversation.item.input_audio_transcription.failed':
          case 'input_audio_transcription.failed':
          case 'input_audio_buffer.transcription.failed':
            console.error('❌ Transcription failed:', data)
            break

          case 'response.output_audio.delta':
            // Play audio chunk (GA API event name)
            if (data.delta) {
              playAudioChunk(data.delta)
            }
            break

          case 'response.output_audio_transcript.delta':
          case 'response.audio_transcript.delta':
            // Just accumulate transcript deltas, don't send message yet
            if (data.delta) {
              currentTranscriptRef.current += data.delta
              console.log('📝 Accumulating transcript:', currentTranscriptRef.current)
            }
            break

          case 'response.output_audio_transcript.done':
          case 'response.audio_transcript.done':
            // Transcript complete - send it immediately
            if (currentTranscriptRef.current && !assistantMessageSentRef.current) {
              console.log('💬 Sending AI message (transcript.done):', currentTranscriptRef.current)
              assistantMessageSentRef.current = true
              config.onMessage?.({
                role: 'assistant',
                content: currentTranscriptRef.current,
                timestamp: new Date()
              })
            }
            currentTranscriptRef.current = ''
            break

          case 'response.function_call_arguments.done':
            // Execute function call
            const { name, arguments: args } = data
            config.onFunctionCall?.(name, JSON.parse(args))

            // Execute the function and send result back
            try {
              const result = await fetch('/api/functions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, arguments: JSON.parse(args) })
              }).then(r => r.json())

              ws.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: data.call_id,
                  output: JSON.stringify(result.result)
                }
              }))
            } catch (err) {
              console.error('Function call error:', err)
            }
            break

          case 'response.done':
            // Response complete
            break

          case 'error':
            console.error('Realtime API error:', data.error)
            config.onError?.(new Error(data.error.message))
            break
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error')
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log('Disconnected from OpenAI Realtime API')
        setIsConnected(false)
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Connection error:', err)
      setError((err as Error).message)
      config.onError?.(err as Error)
    }
  }, [config])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    // Clean up playback audio context
    cleanupAudioPlayback()
    setIsConnected(false)
    setIsRecording(false)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      // Cancel any ongoing AI response first
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        if (currentResponseIdRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'response.cancel'
          }))
          currentResponseIdRef.current = null
          currentTranscriptRef.current = ''
        }

        // Clear any pending audio buffer
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.clear'
        }))

        // Stop any playing audio
        stopAudioPlayback()
      }

      // Start browser-based speech recognition as backup
      userTranscriptRef.current = ''
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true // Enable interim results
          recognition.lang = 'en-US'

          console.log('🎤 Starting browser speech recognition')

          recognition.onstart = () => {
            console.log('🎤 Speech recognition started')
          }

          recognition.onresult = (event: any) => {
            console.log('🎤 Recognition result event:', event.results.length)
            // Get the latest result
            let transcript = ''
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' '
            }
            transcript = transcript.trim()

            if (transcript) {
              userTranscriptRef.current = transcript
              console.log('🎤 Browser transcription:', transcript)
            }
          }

          recognition.onerror = (event: any) => {
            console.error('🎤 Speech recognition error:', event.error)
          }

          recognition.onend = () => {
            console.log('🎤 Speech recognition ended, final transcript:', userTranscriptRef.current)
          }

          recognition.start()
          recognitionRef.current = recognition
        } else {
          console.warn('🎤 Speech recognition not available in this browser')
        }
      } catch (err) {
        console.error('🎤 Failed to start speech recognition:', err)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      console.log('🎙️ Microphone stream obtained:', stream.getAudioTracks().length, 'tracks')
      console.log('🎙️ Audio track settings:', stream.getAudioTracks()[0]?.getSettings())

      // Use default sample rate (browser will match microphone)
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      console.log('🎙️ AudioContext sample rate:', audioContext.sampleRate)

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      let chunkCount = 0
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)

          // Check if we're actually getting audio
          const hasAudio = inputData.some(sample => Math.abs(sample) > 0.01)
          if (chunkCount < 5) {
            console.log('🎙️ Audio chunk', chunkCount, 'has audio:', hasAudio, 'max:', Math.max(...Array.from(inputData)))
            chunkCount++
          }

          // Resample to 24kHz if needed (OpenAI expects 24kHz)
          const targetSampleRate = 24000
          const resampled = resampleAudio(inputData, audioContext.sampleRate, targetSampleRate)
          const pcm16 = float32ToPCM16(resampled)

          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: arrayBufferToBase64(pcm16)
          }))
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsRecording(true)
    } catch (err) {
      console.error('Microphone error:', err)
      setError('Failed to access microphone')
    }
  }, [])

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording')

    // Stop browser speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.warn('Error stopping recognition:', e)
      }
    }

    // Show user message IMMEDIATELY with browser transcript or placeholder
    const userMessage = userTranscriptRef.current || '[Audio message]'
    console.log('💬 Showing user message instantly:', userMessage)
    config.onMessage?.({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    })

    // Clear the transcript for next recording
    userTranscriptRef.current = ''

    // Send the recorded audio to AI immediately
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending recorded audio to AI')
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }))

      wsRef.current.send(JSON.stringify({
        type: 'response.create'
      }))
    }

    // Now disconnect audio processor to stop sending audio
    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    recognitionRef.current = null

    setIsRecording(false)
  }, [config])

  const sendRecordedAudio = useCallback(() => {
    console.log('📤 Manually sending recorded audio to AI')
    // Commit the audio buffer and request response
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }))

      wsRef.current.send(JSON.stringify({
        type: 'response.create'
      }))
    }
  }, [])

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }]
        }
      }))

      wsRef.current.send(JSON.stringify({
        type: 'response.create'
      }))
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isRecording,
    messages,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendRecordedAudio,
    sendMessage
  }
}

// Helper functions
function resampleAudio(audioData: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  // If sample rates match, no resampling needed
  if (sourceSampleRate === targetSampleRate) {
    return audioData
  }

  const sampleRateRatio = sourceSampleRate / targetSampleRate
  const newLength = Math.round(audioData.length / sampleRateRatio)
  const result = new Float32Array(newLength)

  // Simple linear interpolation resampling
  for (let i = 0; i < newLength; i++) {
    const position = i * sampleRateRatio
    const index = Math.floor(position)
    const fraction = position - index

    if (index + 1 < audioData.length) {
      // Linear interpolation between two samples
      result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction
    } else {
      result[i] = audioData[index]
    }
  }

  return result
}

function float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
  const pcm16 = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return pcm16.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Create audio context for playback
let playbackAudioContext: AudioContext | null = null
let audioQueue: AudioBufferSourceNode[] = []
let nextPlayTime = 0

function playAudioChunk(base64Audio: string) {
  try {
    // Initialize audio context if needed
    if (!playbackAudioContext) {
      playbackAudioContext = new AudioContext({ sampleRate: 24000 })
    }

    // Decode base64 to PCM16
    const binaryString = atob(base64Audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Convert PCM16 to Float32
    const pcm16 = new Int16Array(bytes.buffer)
    const float32 = new Float32Array(pcm16.length)
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0
    }

    // Create audio buffer
    const audioBuffer = playbackAudioContext.createBuffer(1, float32.length, 24000)
    audioBuffer.getChannelData(0).set(float32)

    // Create source and schedule playback
    const source = playbackAudioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(playbackAudioContext.destination)

    // Schedule playback to ensure smooth audio
    const currentTime = playbackAudioContext.currentTime
    if (nextPlayTime < currentTime) {
      nextPlayTime = currentTime
    }

    source.start(nextPlayTime)
    nextPlayTime += audioBuffer.duration

    audioQueue.push(source)

    // Clean up old sources
    source.onended = () => {
      const index = audioQueue.indexOf(source)
      if (index > -1) {
        audioQueue.splice(index, 1)
      }
    }
  } catch (err) {
    console.error('Audio playback error:', err)
  }
}

function stopAudioPlayback() {
  // Stop all currently playing audio
  audioQueue.forEach(source => {
    try {
      source.stop()
    } catch (e) {
      // Ignore if already stopped
    }
  })
  audioQueue = []
  nextPlayTime = 0
}

function cleanupAudioPlayback() {
  stopAudioPlayback()
  if (playbackAudioContext) {
    playbackAudioContext.close()
    playbackAudioContext = null
  }
}
