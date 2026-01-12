import { NextRequest, NextResponse } from 'next/server'

// POST /api/realtime - Get ephemeral token for OpenAI Realtime API
export async function POST(request: NextRequest) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Request a client secret from OpenAI Realtime GA API
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return NextResponse.json(
        { error: 'Failed to create session', details: error },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Response structure: { value: "ek_...", expires_at: 1234567890, session: {...} }
    return NextResponse.json({
      token: data.value,
      expiresAt: data.expires_at
    })
  } catch (error) {
    console.error('Error creating realtime session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
