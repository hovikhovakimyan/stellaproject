'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cache } from '@/lib/cache'

type Flashcard = {
  id: string
  front: string
  back: string
  difficulty: string | null
}

type FlashcardSet = {
  id: string
  topic: string
  createdAt: string
  flashcards: Flashcard[]
}

export default function FlashcardsPage() {
  const router = useRouter()
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      // Check auth
      const authResponse = await fetch('/api/auth/me')
      if (!authResponse.ok) {
        router.push('/login')
        return
      }

      const { user } = await authResponse.json()
      setUserId(user.id)

      // Check cache first
      const cacheKey = `flashcards:${user.id}`
      const cached = cache.get<FlashcardSet[]>(cacheKey)

      if (cached) {
        setFlashcardSets(cached)
        setIsLoading(false)
        return
      }

      // Load flashcard sets
      const response = await fetch(`/api/flashcards?userId=${user.id}`)
      const data = await response.json()
      const flashcardSetsData = data.flashcardSets || []

      // Cache the result
      cache.set(cacheKey, flashcardSetsData)

      setFlashcardSets(flashcardSetsData)
    } catch (error) {
      console.error('Error loading flashcards:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteFlashcardSet = async (setId: string, e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation to flashcard set page

    if (!confirm('Are you sure you want to delete this flashcard set? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/flashcards/${setId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete flashcard set')
      }

      // Update local state
      setFlashcardSets(prev => prev.filter(s => s.id !== setId))

      // Invalidate cache
      if (userId) {
        cache.invalidate(`flashcards:${userId}`)
      }
    } catch (error) {
      console.error('Error deleting flashcard set:', error)
      alert('Failed to delete flashcard set. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-2xl font-bold text-indigo-600 hover:text-indigo-700"
            >
              TutorFlow
            </Link>
            <Link
              href="/conversations"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">My Flashcards</h1>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {flashcardSets.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 mb-4">
              <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No flashcards yet</h2>
            <p className="text-gray-600 mb-6">Start a conversation with your AI tutor and ask to create flashcards!</p>
            <Link
              href="/conversations"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Start Chatting
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flashcardSets.map((set) => (
              <div key={set.id} className="group relative">
                <Link
                  href={`/flashcards/${set.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-300"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{set.topic}</h3>
                    <div className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                      {set.flashcards.length} cards
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Created {new Date(set.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600 font-medium">
                    <span>Practice</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
                <button
                  onClick={(e) => deleteFlashcardSet(set.id, e)}
                  className="absolute right-2 top-2 rounded p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  title="Delete flashcard set"
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
