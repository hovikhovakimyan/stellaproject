'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type User = {
  id: string
  email: string
  name: string | null
}

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const authCheckStarted = useRef(false)

  // Only check auth when component mounts, but don't block rendering
  useEffect(() => {
    if (!authCheckStarted.current) {
      authCheckStarted.current = true
      checkAuth()
    }
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        cache: 'force-cache',
        credentials: 'same-origin',
        next: { revalidate: 0 }
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setAuthChecked(true)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const startNewSession = async () => {
    // If auth hasn't been checked yet, check it now
    if (!authChecked) {
      setIsLoading(true)
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setAuthChecked(true)
          setIsLoading(false)
          router.push('/conversations')
        } else {
          setAuthChecked(true)
          setIsLoading(false)
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setAuthChecked(true)
        setIsLoading(false)
        router.push('/login')
      }
      return
    }

    // If no user after check, redirect to login
    if (!user) {
      router.push('/login')
      return
    }

    // Go to conversations list
    router.push('/conversations')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-indigo-600">TutorFlow</h1>
          <div className="flex items-center gap-4">
            {authChecked && (
              <>
                {user ? (
                  <>
                    <button
                      onClick={() => router.push('/conversations')}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      History
                    </button>
                    <span className="text-sm text-gray-600">{user.name || user.email}</span>
                    <button
                      onClick={handleLogout}
                      className="text-sm font-medium text-gray-700 hover:text-indigo-600"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-indigo-600">
                      Login
                    </Link>
                    <Link href="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl text-center">
          <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
            <svg
              className="h-10 w-10 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>

          <h2 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
            Your AI Learning Companion
          </h2>

          <p className="mb-8 text-lg text-gray-600">
            Study smarter with voice conversations, interactive quizzes, and personalized progress tracking.
            Let's help you achieve your learning goals.
          </p>

          <div className="mb-12 grid gap-4 text-left sm:grid-cols-2">
            <div className="rounded-lg border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <h3 className="font-semibold text-gray-900">Voice Conversations</h3>
              </div>
              <p className="text-sm text-gray-600">
                Talk naturally with your AI tutor using real-time voice interaction
              </p>
            </div>

            <div className="rounded-lg border border-purple-100 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="font-semibold text-gray-900">Interactive Quizzes</h3>
              </div>
              <p className="text-sm text-gray-600">
                Test your knowledge with AI-generated quizzes tailored to your topics
              </p>
            </div>

            <div className="rounded-lg border border-pink-100 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-5 w-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="font-semibold text-gray-900">Progress Tracking</h3>
              </div>
              <p className="text-sm text-gray-600">
                Monitor your study sessions and see your improvement over time
              </p>
            </div>

            <div className="rounded-lg border border-amber-100 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="font-semibold text-gray-900">Smart Recommendations</h3>
              </div>
              <p className="text-sm text-gray-600">
                Get personalized suggestions for topics to review based on your performance
              </p>
            </div>
          </div>

          <button
            onClick={startNewSession}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Start Learning
              </>
            )}
          </button>

          <p className="mt-6 text-sm text-gray-500">
            Your conversation history will be saved so you can pick up where you left off
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 text-center text-sm text-gray-600">
          Built for the Stella Foster Engineering Demo
        </div>
      </footer>
    </div>
  )
}
