import { NextRequest, NextResponse } from 'next/server'
import { handleFunctionCall } from '@/lib/functions'

// POST /api/functions - Execute a function call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, arguments: args } = body

    const result = await handleFunctionCall(name, args)

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error executing function:', error)
    return NextResponse.json(
      { error: 'Failed to execute function', details: (error as Error).message },
      { status: 500 }
    )
  }
}
