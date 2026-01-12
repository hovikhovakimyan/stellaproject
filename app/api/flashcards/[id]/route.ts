import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// DELETE /api/flashcards/[id] - Delete a flashcard set
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // First verify the flashcard set belongs to this user
    const flashcardSet = await prisma.flashcardSet.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!flashcardSet) {
      return NextResponse.json(
        { error: 'Flashcard set not found' },
        { status: 404 }
      )
    }

    if (flashcardSet.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete the flashcard set (this will cascade delete flashcards due to schema)
    await prisma.flashcardSet.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting flashcard set:', error)
    return NextResponse.json(
      { error: 'Failed to delete flashcard set' },
      { status: 500 }
    )
  }
}
