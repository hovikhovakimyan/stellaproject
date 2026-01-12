'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cache } from '@/lib/cache'

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Array<{
    id: string
    role: string
    content: string
  }>
}

export default function ConversationsPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      const authResponse = await fetch('/api/auth/me')
      if (!authResponse.ok) {
        router.push('/login')
        return
      }
      await loadConversations()
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    }
  }

  const loadConversations = async () => {
    // Check cache first
    const cacheKey = 'conversations'
    const cached = cache.get<Conversation[]>(cacheKey)

    if (cached) {
      setConversations(cached)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/conversations')
      if (!response.ok) {
        throw new Error('Failed to load conversations')
      }
      const { conversations: convs } = await response.json()

      // Cache the result
      cache.set(cacheKey, convs)

      setConversations(convs)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return

    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'DELETE'
      })
      setConversations(prev => prev.filter(c => c.id !== id))

      // Invalidate cache
      cache.invalidate('conversations')
      cache.invalidate(`conversation:${id}`)
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Study Session ${new Date().toLocaleDateString()}`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const { conversation } = await response.json()

      // Invalidate conversations cache since we added a new one
      cache.invalidate('conversations')

      router.push(`/chat/${conversation.id}`)
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900"
                title="Back to home"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                TutorFlow
              </button>
              <button
                onClick={() => router.push('/flashcards')}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                title="My Flashcards"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Flashcards
              </button>
              <button
                onClick={() => router.push('/quizzes')}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                title="My Quizzes"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Quizzes
              </button>
              <span className="text-2xl font-bold text-gray-300">|</span>
              <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
            </div>
            <button
              onClick={createNewConversation}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Conversation
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">No conversations yet</h2>
            <p className="mb-6 text-gray-600">
              Start your first conversation to begin tracking your learning progress
            </p>
            <button
              onClick={createNewConversation}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Start First Conversation
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="group relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  onClick={() => router.push(`/chat/${conversation.id}`)}
                  className="w-full text-left"
                >
                  <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-indigo-600">
                    {conversation.title}
                  </h3>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                    {conversation.messages[0]?.content || 'No messages yet'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{conversation.messages.length} messages</span>
                    <span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
                <button
                  onClick={() => deleteConversation(conversation.id)}
                  className="absolute right-2 top-2 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
