import { NextRequest, NextResponse } from 'next/server'
import { handleFunctionCall } from '@/lib/functions'
import { getCurrentUser } from '@/lib/auth'

// POST /api/functions - Execute a function call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, arguments: args, conversationId } = body

    // Get user from session
    const user = await getCurrentUser()
    const userId = user?.userId || args.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Inject userId and conversationId into arguments if not present
    const enrichedArgs = {
      ...args,
      userId,
      conversationId: conversationId || args.conversationId
    }

    const result = await handleFunctionCall(name, enrichedArgs)

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error executing function:', error)
    return NextResponse.json(
      { error: 'Failed to execute function', details: (error as Error).message },
      { status: 500 }
    )
  }
}
