'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Question = {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

type Quiz = {
  id: string
  subject: string
  topic: string
  questions: Question[]
  createdAt: string
}

export default function QuizTakePage() {
  const router = useRouter()
  const params = useParams()
  const quizId = params.id as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadQuiz()
  }, [quizId])

  const loadQuiz = async () => {
    try {
      // Check auth
      const authResponse = await fetch('/api/auth/me')
      if (!authResponse.ok) {
        router.push('/login')
        return
      }

      const { user } = await authResponse.json()

      // Load quizzes and find the one we want
      const response = await fetch(`/api/quizzes?userId=${user.id}`)
      const data = await response.json()
      const foundQuiz = data.quizzes?.find((q: Quiz) => q.id === quizId)

      if (!foundQuiz) {
        router.push('/quizzes')
        return
      }

      setQuiz(foundQuiz)
    } catch (error) {
      console.error('Error loading quiz:', error)
      router.push('/quizzes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answerIndex
    }))
  }

  const handleNext = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    if (!quiz) return

    setIsSubmitting(true)
    try {
      // Calculate score
      let correct = 0
      quiz.questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.correctAnswer) {
          correct++
        }
      })

      const score = (correct / quiz.questions.length) * 100

      // Save attempt to database
      await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          answers: selectedAnswers
        })
      })

      setShowResults(true)
    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Quiz not found or has no questions</p>
          <Link href="/quizzes" className="mt-4 text-indigo-600 hover:text-indigo-700">
            Back to Quizzes
          </Link>
        </div>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100
  const allAnswered = Object.keys(selectedAnswers).length === quiz.questions.length

  if (showResults) {
    const correctCount = quiz.questions.filter((q, i) => selectedAnswers[i] === q.correctAnswer).length
    const score = (correctCount / quiz.questions.length) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="container mx-auto flex items-center justify-between px-6 py-4">
            <Link href="/quizzes" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              ← Back to Quizzes
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">{quiz.topic}</h1>
            <div className="w-24"></div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className={`inline-flex h-24 w-24 items-center justify-center rounded-full mb-6 ${
              score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className={`text-4xl font-bold ${
                score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(score)}%
              </span>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good Job!' : 'Keep Practicing!'}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              You got {correctCount} out of {quiz.questions.length} questions correct
            </p>

            <div className="space-y-4 mb-8">
              {quiz.questions.map((q, index) => {
                const userAnswer = selectedAnswers[index]
                const isCorrect = userAnswer === q.correctAnswer

                return (
                  <div key={q.id} className="bg-white rounded-lg border border-gray-200 p-6 text-left">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                        isCorrect ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {isCorrect ? (
                          <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                        <p className="text-sm text-gray-600">
                          Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                            {q.options[userAnswer]}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-gray-600 mt-1">
                            Correct answer: <span className="text-green-600">{q.options[q.correctAnswer]}</span>
                          </p>
                        )}
                        {q.explanation && (
                          <p className="text-sm text-gray-500 mt-2 italic">{q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/quizzes"
                className="rounded-lg bg-gray-100 px-6 py-3 font-medium text-gray-700 hover:bg-gray-200"
              >
                Back to Quizzes
              </Link>
              <button
                onClick={() => {
                  setSelectedAnswers({})
                  setCurrentQuestionIndex(0)
                  setShowResults(false)
                }}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
              >
                Retake Quiz
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/quizzes"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">{quiz.topic}</h1>
          </div>
          <div className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} / {quiz.questions.length}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Progress bar */}
          <div className="mb-8 h-2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentQuestion.question}</h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedAnswers[currentQuestionIndex] === index
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswers[currentQuestionIndex] === index
                        ? 'border-purple-600 bg-purple-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedAnswers[currentQuestionIndex] === index && (
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-900">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || isSubmitting}
                className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={selectedAnswers[currentQuestionIndex] === undefined}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Answer progress indicator */}
          <div className="mt-6 flex justify-center gap-2">
            {quiz.questions.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  selectedAnswers[index] !== undefined ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
