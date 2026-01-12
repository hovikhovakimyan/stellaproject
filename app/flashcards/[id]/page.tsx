'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

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

export default function FlashcardSetPage() {
  const router = useRouter()
  const params = useParams()
  const setId = params.id as string

  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadFlashcardSet()
  }, [setId])

  const loadFlashcardSet = async () => {
    try {
      // Check auth
      const authResponse = await fetch('/api/auth/me')
      if (!authResponse.ok) {
        router.push('/login')
        return
      }

      const { user } = await authResponse.json()

      // Load flashcard sets and find the one we want
      const response = await fetch(`/api/flashcards?userId=${user.id}`)
      const data = await response.json()
      const set = data.flashcardSets?.find((s: FlashcardSet) => s.id === setId)

      if (!set) {
        router.push('/flashcards')
        return
      }

      setFlashcardSet(set)
    } catch (error) {
      console.error('Error loading flashcard set:', error)
      router.push('/flashcards')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleNext = () => {
    if (flashcardSet && currentIndex < flashcardSet.flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
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

  if (!flashcardSet || flashcardSet.flashcards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No flashcards found</p>
          <Link href="/flashcards" className="mt-4 text-indigo-600 hover:text-indigo-700">
            Back to Flashcards
          </Link>
        </div>
      </div>
    )
  }

  const currentCard = flashcardSet.flashcards[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/flashcards"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">{flashcardSet.topic}</h1>
          </div>
          <div className="text-sm text-gray-600">
            {currentIndex + 1} / {flashcardSet.flashcards.length}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Flashcard */}
          <div
            onClick={handleFlip}
            className="relative h-96 cursor-pointer perspective-1000"
            style={{ perspective: '1000px' }}
          >
            <div
              className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              {/* Front */}
              <div
                className="absolute h-full w-full backface-hidden rounded-xl border-2 border-indigo-200 bg-white p-8 shadow-lg flex items-center justify-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-center">
                  <p className="text-xs font-medium text-indigo-600 mb-4 uppercase">Question</p>
                  <p className="text-2xl font-semibold text-gray-900">{currentCard.front}</p>
                  <p className="mt-8 text-sm text-gray-500">Click to reveal answer</p>
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute h-full w-full backface-hidden rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-8 shadow-lg flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <div className="text-center">
                  <p className="text-xs font-medium text-purple-600 mb-4 uppercase">Answer</p>
                  <p className="text-xl text-gray-900 whitespace-pre-wrap">{currentCard.back}</p>
                  {currentCard.difficulty && (
                    <div className="mt-6">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        currentCard.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        currentCard.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {currentCard.difficulty}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <button
              onClick={handleFlip}
              className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
            >
              {isFlipped ? 'Show Question' : 'Show Answer'}
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === flashcardSet.flashcards.length - 1}
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-8 h-2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / flashcardSet.flashcards.length) * 100}%` }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
