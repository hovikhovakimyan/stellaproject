import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params
    const body = await request.json()
    const { score, answers } = body

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        score,
        answers: answers as any,
        completedAt: new Date()
      }
    })

    return NextResponse.json({ attempt })
  } catch (error) {
    console.error('Error saving quiz attempt:', error)
    return NextResponse.json(
      { error: 'Failed to save quiz attempt' },
      { status: 500 }
    )
  }
}
