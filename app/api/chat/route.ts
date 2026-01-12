import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { functions, handleFunctionCall } from '@/lib/functions'
import { getCurrentUser } from '@/lib/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { messages, conversationId } = await request.json()

    // Get user from session
    const user = await getCurrentUser()
    const userId = user?.userId

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
- Generating flashcards for memorization

Be encouraging, patient, and adaptive to each student's learning style. Use the available functions to help students track their progress and stay motivated.

FLASHCARD SUGGESTIONS: Offer to generate flashcards when:
- You've just explained a concept with multiple facts, definitions, or terms
- User completed a quiz with score < 75%
- User mentions needing to memorize something or studying for an exam
- ONLY suggest flashcards ONCE per topic - don't repeat if user declines

QUIZ CREATION: When a user wants to test their knowledge:
- ALWAYS use the create_quiz function to generate a quiz in the database
- NEVER ask quiz questions directly in the chat - this defeats the purpose of the quiz feature
- Tell them "I've created a quiz for you! Visit the Quizzes tab to take it."
- Suggest creating a quiz when:
  * You've finished teaching a complete topic or lesson
  * User explicitly asks for a quiz or practice questions
  * After reviewing material or providing explanations on a subject
  * User mentions preparing for a test or exam
- ONLY suggest quizzes ONCE per topic - don't repeat if user declines
- Don't offer both flashcards AND quiz in the same response - choose the most appropriate one

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

        // Inject userId and conversationId into arguments
        const enrichedArgs = {
          ...functionArgs,
          userId,
          conversationId
        }

        // Execute the function directly
        const result = await handleFunctionCall(functionName, enrichedArgs)

        functionResults.push({
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify(result)
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
