import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const auth = await getCurrentUser()

    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Return user info from JWT token (no database query needed!)
    return NextResponse.json({
      user: {
        id: auth.userId,
        email: auth.email,
        name: auth.name
      }
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Failed to check authentication' },
      { status: 500 }
    )
  }
}
