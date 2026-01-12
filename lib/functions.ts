import { prisma } from './db'
import { z } from 'zod'

// Define function schemas for OpenAI
export const functions = [
  {
    name: 'create_quiz',
    description: 'Create a new quiz on a specific subject and topic. Generate questions based on the topic and difficulty level.',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The ID of the user creating the quiz'
        },
        subject: {
          type: 'string',
          description: 'The subject area (e.g., Math, Science, History)'
        },
        topic: {
          type: 'string',
          description: 'The specific topic within the subject'
        },
        questionCount: {
          type: 'number',
          description: 'Number of questions to generate',
          default: 5
        },
        difficulty: {
          type: 'string',
          enum: ['easy', 'medium', 'hard'],
          description: 'Difficulty level of the quiz'
        }
      },
      required: ['userId', 'subject', 'topic', 'difficulty']
    }
  },
  {
    name: 'log_study_session',
    description: 'Log a completed study session with duration and subject',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The ID of the user'
        },
        subject: {
          type: 'string',
          description: 'The subject studied'
        },
        topic: {
          type: 'string',
          description: 'The specific topic studied'
        },
        duration: {
          type: 'number',
          description: 'Duration of the session in minutes'
        }
      },
      required: ['userId', 'subject', 'duration']
    }
  },
  {
    name: 'get_study_progress',
    description: 'Get study progress statistics for a user, optionally filtered by subject',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The ID of the user'
        },
        subject: {
          type: 'string',
          description: 'Optional: filter by specific subject'
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default 30)',
          default: 30
        }
      },
      required: ['userId']
    }
  },
  {
    name: 'set_study_goal',
    description: 'Create a new study goal with a target and deadline',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The ID of the user'
        },
        subject: {
          type: 'string',
          description: 'The subject for the goal'
        },
        targetHours: {
          type: 'number',
          description: 'Target study hours'
        },
        deadline: {
          type: 'string',
          description: 'Deadline in ISO format'
        }
      },
      required: ['userId', 'subject', 'targetHours', 'deadline']
    }
  },
  {
    name: 'get_quiz_history',
    description: 'Get quiz attempt history for a user, including scores',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The ID of the user'
        },
        subject: {
          type: 'string',
          description: 'Optional: filter by subject'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        }
      },
      required: ['userId']
    }
  },
  {
    name: 'recommend_review_topics',
    description: 'Analyze past quizzes and study sessions to recommend topics that need review based on scores and time since last studied',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The ID of the user'
        },
        subject: {
          type: 'string',
          description: 'Optional: focus on specific subject'
        }
      },
      required: ['userId']
    }
  },
  {
    name: 'search_learning_resources',
    description: 'Search for learning resources (articles, videos) on a specific topic',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to search for'
        },
        resourceType: {
          type: 'string',
          enum: ['article', 'video', 'tutorial', 'any'],
          description: 'Type of resource to search for',
          default: 'any'
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'generate_flashcards',
    description: 'Generate flashcards from study material to help memorize key concepts. Use when the user wants to memorize facts, definitions, or concepts from the current topic.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic these flashcards cover'
        },
        content: {
          type: 'string',
          description: 'The study material or concepts to create flashcards from. Include all the key facts, definitions, and concepts that should be turned into flashcards.'
        },
        count: {
          type: 'number',
          description: 'Number of flashcards to generate',
          default: 5
        }
      },
      required: ['topic', 'content']
    }
  }
]

// Function implementations
export async function createQuiz(args: {
  userId: string
  subject: string
  topic: string
  questionCount?: number
  difficulty: 'easy' | 'medium' | 'hard'
}) {
  const { userId, subject, topic, questionCount = 5, difficulty } = args

  // Generate quiz questions based on topic and difficulty
  const questions = await generateQuizQuestions(topic, questionCount, difficulty)

  const quiz = await prisma.quiz.create({
    data: {
      userId,
      subject,
      topic,
      questions: questions as any
    }
  })

  return {
    success: true,
    quizId: quiz.id,
    message: `Created a ${difficulty} quiz on ${topic} with ${questionCount} questions. Visit the Quizzes tab to take it!`
  }
}

export async function logStudySession(args: {
  userId: string
  subject: string
  topic?: string
  duration: number
}) {
  const now = new Date()
  const startedAt = new Date(now.getTime() - args.duration * 60000)

  const session = await prisma.studySession.create({
    data: {
      userId: args.userId,
      subject: args.subject,
      topic: args.topic,
      duration: args.duration,
      startedAt,
      completedAt: now
    }
  })

  // Update any active goals
  await updateGoalProgress(args.userId, args.subject, args.duration / 60)

  return {
    success: true,
    sessionId: session.id,
    message: `Logged ${args.duration} minutes of ${args.subject}${args.topic ? ` on ${args.topic}` : ''}`
  }
}

export async function getStudyProgress(args: {
  userId: string
  subject?: string
  days?: number
}) {
  const { userId, subject, days = 30 } = args
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      subject: subject || undefined,
      startedAt: { gte: startDate }
    },
    orderBy: { startedAt: 'desc' }
  })

  const totalMinutes = sessions.reduce((sum: number, s) => sum + s.duration, 0)
  const subjectBreakdown = sessions.reduce((acc: Record<string, number>, s) => {
    acc[s.subject] = (acc[s.subject] || 0) + s.duration
    return acc
  }, {} as Record<string, number>)

  return {
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    sessionsCount: sessions.length,
    subjectBreakdown,
    averageSessionMinutes: Math.round(totalMinutes / sessions.length) || 0
  }
}

export async function setStudyGoal(args: {
  userId: string
  subject: string
  targetHours: number
  deadline: string
}) {
  const goal = await prisma.studyGoal.create({
    data: {
      userId: args.userId,
      subject: args.subject,
      targetHours: args.targetHours,
      deadline: new Date(args.deadline)
    }
  })

  return {
    success: true,
    goalId: goal.id,
    message: `Set goal to study ${args.targetHours} hours of ${args.subject} by ${new Date(args.deadline).toLocaleDateString()}`
  }
}

export async function getQuizHistory(args: {
  userId: string
  subject?: string
  limit?: number
}) {
  const { userId, subject, limit = 10 } = args

  const quizzes = await prisma.quiz.findMany({
    where: {
      userId,
      subject: subject || undefined
    },
    include: {
      attempts: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return {
    quizzes: quizzes.map(q => ({
      id: q.id,
      subject: q.subject,
      topic: q.topic,
      createdAt: q.createdAt,
      lastScore: q.attempts[0]?.score || null,
      attemptCount: q.attempts.length
    }))
  }
}

export async function recommendReviewTopics(args: {
  userId: string
  subject?: string
}) {
  const { userId, subject } = args

  // Get quiz attempts with low scores
  const quizzes = await prisma.quiz.findMany({
    where: {
      userId,
      subject: subject || undefined
    },
    include: {
      attempts: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  const needsReview = quizzes
    .filter(q => q.attempts[0] && q.attempts[0].score < 70)
    .map(q => ({
      topic: q.topic,
      subject: q.subject,
      lastScore: q.attempts[0].score,
      lastAttempt: q.attempts[0].completedAt
    }))
    .sort((a, b) => a.lastScore - b.lastScore)
    .slice(0, 5)

  return {
    recommendedTopics: needsReview,
    message: needsReview.length > 0
      ? `Found ${needsReview.length} topics that could use review`
      : 'Great job! No topics need immediate review'
  }
}

export async function searchLearningResources(args: {
  topic: string
  resourceType?: 'article' | 'video' | 'tutorial' | 'any'
}) {
  // This would integrate with an external API in production
  // For demo purposes, return mock data
  const mockResources = [
    {
      title: `Understanding ${args.topic}: A Comprehensive Guide`,
      type: 'article',
      url: `https://example.com/learn/${args.topic.toLowerCase().replace(/\s+/g, '-')}`,
      description: `In-depth article covering the fundamentals of ${args.topic}`
    },
    {
      title: `${args.topic} Video Tutorial`,
      type: 'video',
      url: `https://youtube.com/watch?v=${args.topic.slice(0, 11)}`,
      description: `Step-by-step video tutorial on ${args.topic}`
    }
  ]

  return {
    resources: mockResources.filter(r =>
      args.resourceType === 'any' || !args.resourceType || r.type === args.resourceType
    ),
    message: `Found learning resources for ${args.topic}`
  }
}

export async function generateFlashcards(args: {
  userId: string
  conversationId?: string
  topic: string
  content: string
  count?: number
}) {
  const { userId, conversationId, topic, content, count = 5 } = args

  // Use GPT-4 to extract Q&A pairs from the content
  const flashcards = await extractFlashcardsFromContent(content, topic, count)

  // Create flashcard set in database
  const flashcardSet = await prisma.flashcardSet.create({
    data: {
      userId,
      conversationId,
      topic,
      flashcards: {
        create: flashcards.map((card: any) => ({
          front: card.front,
          back: card.back,
          difficulty: card.difficulty
        }))
      }
    },
    include: {
      flashcards: true
    }
  })

  return {
    success: true,
    setId: flashcardSet.id,
    flashcardCount: flashcards.length,
    message: `Created ${flashcards.length} flashcards on ${topic}. You can review them in your Flashcards page.`
  }
}

async function extractFlashcardsFromContent(content: string, topic: string, count: number) {
  // Use OpenAI to intelligently extract Q&A pairs
  const openai = await import('openai')
  const client = new openai.default({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = `Extract ${count} flashcard question-answer pairs from the following content about ${topic}.

Content:
${content}

Return a JSON array of flashcards with this structure:
[
  {
    "front": "Question or term",
    "back": "Answer or definition",
    "difficulty": "easy" | "medium" | "hard"
  }
]

Make the questions clear and specific. Answers should be concise but complete.`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a study assistant that creates effective flashcards.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content || '{"flashcards":[]}')
  return result.flashcards || []
}

// Helper function to generate quiz questions using AI
async function generateQuizQuestions(topic: string, count: number, difficulty: string) {
  const openai = await import('openai')
  const client = new openai.default({ apiKey: process.env.OPENAI_API_KEY })

  const difficultyGuidelines = {
    easy: 'Basic recall and understanding questions. Simple, straightforward answers.',
    medium: 'Application and analysis questions. Requires understanding concepts and applying them.',
    hard: 'Complex synthesis and evaluation questions. Requires deep understanding and critical thinking.'
  }

  const prompt = `Generate ${count} multiple-choice quiz questions about ${topic} at ${difficulty} difficulty level.

Difficulty guidelines: ${difficultyGuidelines[difficulty as keyof typeof difficultyGuidelines]}

Return a JSON object with a "questions" array. Each question should have this structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Make sure:
- Questions are clear and specific to ${topic}
- All 4 options are plausible but only one is correct
- correctAnswer is the index (0-3) of the correct option
- Explanations are educational and help learning`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert educator creating high-quality quiz questions.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content || '{"questions":[]}')
  return result.questions || []
}

async function updateGoalProgress(userId: string, subject: string, hours: number) {
  const activeGoals = await prisma.studyGoal.findMany({
    where: {
      userId,
      subject,
      status: 'active',
      deadline: { gte: new Date() }
    }
  })

  for (const goal of activeGoals) {
    const newProgress = goal.progress + Math.round(hours)
    const status = newProgress >= goal.targetHours ? 'completed' : 'active'

    await prisma.studyGoal.update({
      where: { id: goal.id },
      data: { progress: newProgress, status }
    })
  }
}

// Export a handler to route function calls
export async function handleFunctionCall(name: string, args: any) {
  switch (name) {
    case 'create_quiz':
      return await createQuiz(args)
    case 'log_study_session':
      return await logStudySession(args)
    case 'get_study_progress':
      return await getStudyProgress(args)
    case 'set_study_goal':
      return await setStudyGoal(args)
    case 'get_quiz_history':
      return await getQuizHistory(args)
    case 'recommend_review_topics':
      return await recommendReviewTopics(args)
    case 'search_learning_resources':
      return await searchLearningResources(args)
    case 'generate_flashcards':
      return await generateFlashcards(args)
    default:
      throw new Error(`Unknown function: ${name}`)
  }
}
