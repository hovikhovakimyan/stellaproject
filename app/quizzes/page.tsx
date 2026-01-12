'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cache } from '@/lib/cache'

type QuizAttempt = {
  id: string
  score: number
  completedAt: string
}

type Quiz = {
  id: string
  subject: string
  topic: string
  questions: any
  createdAt: string
  attempts: QuizAttempt[]
}

export default function QuizzesPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
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
      const cacheKey = `quizzes:${user.id}`
      const cached = cache.get<Quiz[]>(cacheKey)

      if (cached) {
        setQuizzes(cached)
        setIsLoading(false)
        return
      }

      // Load quizzes
      const response = await fetch(`/api/quizzes?userId=${user.id}`)
      const data = await response.json()
      const quizzesData = data.quizzes || []

      // Cache the result
      cache.set(cacheKey, quizzesData)

      setQuizzes(quizzesData)
    } catch (error) {
      console.error('Error loading quizzes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteQuiz = async (quizId: string, e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation to quiz page

    if (!confirm('Are you sure you want to delete this quiz? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete quiz')
      }

      // Update local state
      setQuizzes(prev => prev.filter(q => q.id !== quizId))

      // Invalidate cache
      if (userId) {
        cache.invalidate(`quizzes:${userId}`)
      }
    } catch (error) {
      console.error('Error deleting quiz:', error)
      alert('Failed to delete quiz. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading quizzes...</p>
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
          <h1 className="text-xl font-semibold text-gray-900">My Quizzes</h1>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {quizzes.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 mb-4">
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No quizzes yet</h2>
            <p className="text-gray-600 mb-6">Start a conversation with your AI tutor and ask to create a quiz!</p>
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
            {quizzes.map((quiz) => {
              const lastAttempt = quiz.attempts[0]
              const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0

              return (
                <div key={quiz.id} className="group relative">
                  <Link
                    href={`/quizzes/${quiz.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-purple-300"
                  >
                    <div className="mb-3">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{quiz.topic}</h3>
                        {lastAttempt && (
                          <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                            lastAttempt.score >= 80 ? 'bg-green-100 text-green-700' :
                            lastAttempt.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {Math.round(lastAttempt.score)}%
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{quiz.subject}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{questionCount} questions</span>
                      <span>{quiz.attempts.length} {quiz.attempts.length === 1 ? 'attempt' : 'attempts'}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-purple-600 font-medium">
                      <span>{lastAttempt ? 'Retake Quiz' : 'Take Quiz'}</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => deleteQuiz(quiz.id, e)}
                    className="absolute right-2 top-2 rounded p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    title="Delete quiz"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
