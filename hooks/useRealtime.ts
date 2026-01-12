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

        // Send session configuration - GA API
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are TutorFlow, an AI learning companion. Help students study effectively by creating quizzes, tracking progress, setting goals, and providing study recommendations.

Be encouraging, patient, and adaptive to each student's learning style. Keep responses concise and conversational.

IMPORTANT: Always respond in English unless the user specifically asks you to use another language.`,
            voice: 'sage',
            temperature: 0.8,
            max_response_output_tokens: 4096,
            turn_detection: null, // Disable automatic turn detection - manual turn-taking
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        }))
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)

        console.log('Realtime event:', data.type, data)

        switch (data.type) {
          case 'conversation.item.created':
            // Check if this is a user message with transcript
            console.log('Item created:', data.item)
            if (data.item?.type === 'message' && data.item?.role === 'user') {
              const content = data.item.content?.find((c: any) => c.type === 'input_audio')
              console.log('User audio content:', content)
              if (content?.transcript) {
                config.onMessage?.({
                  role: 'user',
                  content: content.transcript,
                  timestamp: new Date()
                })
              }
            }
            break

          case 'conversation.item.input_audio_transcription.completed':
            // User's speech transcript is complete
            console.log('Transcription completed:', data)
            if (data.transcript) {
              config.onMessage?.({
                role: 'user',
                content: data.transcript,
                timestamp: new Date()
              })
            }
            break

          case 'response.output_audio.delta':
            // Play audio chunk (GA API event name)
            if (data.delta) {
              playAudioChunk(data.delta)
            }
            break

          case 'response.created':
            // Start of new response - reset transcript accumulator
            currentTranscriptRef.current = ''
            currentResponseIdRef.current = data.response?.id || Date.now().toString()
            break

          case 'response.output_audio_transcript.delta':
            // Accumulate transcript deltas
            if (data.delta) {
              currentTranscriptRef.current += data.delta
            }
            break

          case 'response.output_audio_transcript.done':
            // Full transcript is complete - send as one message
            if (currentTranscriptRef.current) {
              config.onMessage?.({
                role: 'assistant',
                content: currentTranscriptRef.current,
                timestamp: new Date()
              })
              currentTranscriptRef.current = ''
            }
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Use default sample rate (browser will match microphone)
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)

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
    // Disconnect audio processor first to stop sending audio
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

    // Commit the audio buffer and trigger response when user stops recording
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }))

      wsRef.current.send(JSON.stringify({
        type: 'response.create'
      }))
    }

    setIsRecording(false)
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
