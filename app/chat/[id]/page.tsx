'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/hooks/useRealtime'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { cache } from '@/lib/cache'

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
  functionCalls?: any
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/login')
        return
      }
      const data = await response.json()
      setUserId(data.user.id)
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    }
  }

  const realtime = useRealtime({
    conversationId: id,
    userId: userId || '',
    onMessage: async (msg) => {
      // Stop generating indicator when AI finishes
      if (msg.role === 'assistant') {
        setIsGenerating(false)
      }

      // Save message to database
      await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: msg.role,
          content: msg.content
        })
      })

      // Add to local state
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: msg.role,
        content: msg.content,
        createdAt: new Date().toISOString()
      }])
    },
    onFunctionCall: (name, args) => {
      console.log('Function called:', name, args)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Called function: ${name}`,
        createdAt: new Date().toISOString(),
        functionCalls: { name, args }
      }])
    },
    onError: (error) => {
      console.error('Realtime error:', error)
      setIsGenerating(false)
    }
  })

  useEffect(() => {
    loadConversation()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversation = async () => {
    // Check cache first
    const cacheKey = `conversation:${id}`
    const cached = cache.get<Conversation>(cacheKey)

    if (cached) {
      setConversation(cached)
      setMessages(cached.messages || [])
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/conversations/${id}`)
      const { conversation: conv } = await response.json()

      // Cache the result
      cache.set(cacheKey, conv)

      setConversation(conv)
      setMessages(conv.messages || [])
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendText = async () => {
    if (!inputText.trim() || isGenerating) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      createdAt: new Date().toISOString()
    }

    const messageText = inputText
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsGenerating(true)

    // Save user message to database
    await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: messageText
      })
    })

    // Send to realtime API if connected, otherwise use text API
    if (realtime.isConnected) {
      realtime.sendMessage(messageText)
      setIsGenerating(false)
    } else {
      // Use text-based API as fallback
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.concat(userMessage).map(m => ({
              role: m.role,
              content: m.content
            })),
            conversationId: id
          })
        })

        const data = await response.json()

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          createdAt: new Date().toISOString(),
          functionCalls: data.functionCalls
        }

        setMessages(prev => [...prev, assistantMessage])

        // Save assistant message to database
        await fetch(`/api/conversations/${id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'assistant',
            content: data.message
          })
        })

        // Invalidate cache since messages changed
        cache.invalidate(`conversation:${id}`)
        cache.invalidate('conversations')
      } catch (error) {
        console.error('Error getting response:', error)
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: 'Sorry, I encountered an error. Please try again.',
          createdAt: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsGenerating(false)
      }
    }
  }

  const handleVoiceToggle = () => {
    if (realtime.isRecording) {
      realtime.stopRecording()
      // Set generating state when user stops recording and sends
      setIsGenerating(true)
    } else {
      if (!realtime.isConnected) {
        realtime.connect()
      }
      realtime.startRecording()
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              TutorFlow
            </button>
            <button
              onClick={() => router.push('/conversations')}
              className="text-gray-600 hover:text-gray-900"
              title="Back to conversations"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="border-l border-gray-300 pl-4">
              <h2 className="text-lg font-semibold text-gray-900">{conversation?.title}</h2>
              <p className="text-sm text-gray-500">
                {realtime.isConnected ? (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Connected
                  </span>
                ) : (
                  'Not connected'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => realtime.isConnected ? realtime.disconnect() : realtime.connect()}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              realtime.isConnected
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {realtime.isConnected ? 'Disconnect' : 'Connect Voice'}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">Start the conversation</h2>
              <p className="text-gray-600">
                Ask me anything about your studies, create quizzes, track progress, or get study recommendations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : message.role === 'system'
                        ? 'bg-gray-200 text-gray-700 text-sm'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    }`}
                  >
                    {message.functionCalls && (
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Function: {message.functionCalls.name}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white text-gray-900 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white">
        <div className="container mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendText()
                  }
                }}
                placeholder="Type your message or use voice..."
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleVoiceToggle}
              disabled={!realtime.isConnected || isGenerating}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                realtime.isRecording
                  ? 'bg-red-600 hover:bg-red-700 shadow-lg animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              title={
                !realtime.isConnected
                  ? 'Connect voice first'
                  : isGenerating
                  ? 'Wait for AI to finish'
                  : realtime.isRecording
                  ? 'Click to stop & send'
                  : 'Click to speak'
              }
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {realtime.isRecording ? (
                  <rect x="9" y="9" width="6" height="6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                )}
              </svg>
            </button>
            <button
              onClick={handleSendText}
              disabled={!inputText.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          {realtime.isConnected && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              {realtime.isRecording ? (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span>Recording... Click stop to send</span>
                </>
              ) : isGenerating ? (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span>AI is responding...</span>
                </>
              ) : (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                  <span>Ready - Click mic to speak</span>
                </>
              )}
            </div>
          )}
          {realtime.error && (
            <p className="mt-2 text-sm text-red-600">{realtime.error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
