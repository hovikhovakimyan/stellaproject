import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { functions } from '@/lib/functions'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { messages, conversationId } = await request.json()

    // Create a chat completion with function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are TutorFlow, an AI learning companion. Help students study effectively by:
- Creating and managing quizzes
- Tracking study sessions and progress
- Setting and monitoring study goals
- Recommending topics for review
- Searching for learning resources

Be encouraging, patient, and adaptive to each student's learning style. Use the available functions to help students track their progress and stay motivated.

IMPORTANT: When writing mathematical expressions, use ONLY these markdown math delimiters:
- For inline math, use single dollar signs: $x^2$ or $f(x) = 3x^2$
- For display (block) math, use double dollar signs on their own lines:

$$f'(x) = 3x^{2}$$

DO NOT use \\[ \\] or \\( \\) - these will not render correctly.
Examples:
- CORRECT: The derivative of $f(x) = x^3$ is $f'(x) = 3x^2$
- CORRECT: Apply the power rule: $$f'(x) = 3 \\cdot x^{3-1} = 3x^2$$
- WRONG: Apply the power rule: \\[ f'(x) = 3x^2 \\]`
        },
        ...messages
      ],
      tools: functions.map(fn => ({
        type: 'function' as const,
        function: {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        }
      })),
      tool_choice: 'auto',
    })

    const message = response.choices[0].message

    // Handle function calls if present
    if (message.tool_calls && message.tool_calls.length > 0) {
      const functionResults = []

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        // Execute the function via our functions API
        const result = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/functions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: functionName,
            arguments: functionArgs,
            conversationId
          })
        }).then(r => r.json())

        functionResults.push({
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify(result.result)
        })
      }

      // Get the final response after function calls
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are TutorFlow, an AI learning companion. Help students study effectively.

IMPORTANT: When writing mathematical expressions, use ONLY these markdown math delimiters:
- For inline math, use single dollar signs: $x^2$ or $f(x) = 3x^2$
- For display (block) math, use double dollar signs on their own lines:

$$f'(x) = 3x^{2}$$

DO NOT use \\[ \\] or \\( \\) - these will not render correctly.
Examples:
- CORRECT: The derivative of $f(x) = x^3$ is $f'(x) = 3x^2$
- CORRECT: Apply the power rule: $$f'(x) = 3 \\cdot x^{3-1} = 3x^2$$
- WRONG: Apply the power rule: \\[ f'(x) = 3x^2 \\]`
          },
          ...messages,
          message,
          ...functionResults
        ],
      })

      return NextResponse.json({
        message: finalResponse.choices[0].message.content,
        functionCalls: message.tool_calls
          .filter(tc => tc.type === 'function')
          .map(tc => ({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments)
          }))
      })
    }

    return NextResponse.json({
      message: message.content,
      functionCalls: null
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
