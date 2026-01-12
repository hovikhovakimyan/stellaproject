# TutorFlow

> Built for the Stella Foster Engineering Demo

An AI study companion that helps students learn through voice conversations, automatically generates quizzes and flashcards, and tracks study progress.

**Live Demo:** https://stellaproject.vercel.app/

## Features

### Core Requirements
- **Voice Conversations**: Real-time speech-to-speech using OpenAI Realtime API
- **Conversation History**: View and manage past study sessions
- **Context Awareness**: AI remembers previous conversations and references past topics
- **Function Calling**: 8 specialized functions for studying:
  - Create custom quizzes with AI-generated questions
  - Generate flashcards from study material
  - Track study sessions by subject and duration
  - View progress analytics and breakdowns
  - Set and monitor learning goals
  - Get personalized review recommendations
  - Search learning resources
  - View quiz history and scores

### Additional Features
- Text and voice chat with seamless switching
- Interactive quiz taking with score tracking
- Flashcard practice mode
- Progress dashboard
- Delete quizzes and flashcard sets

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4o with Realtime API
- **Voice**: Native speech-to-speech (24kHz audio)

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key with Realtime API access

### Installation

```bash
# Clone and install
git clone <repository-url>
cd stellaproject
npm install

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Set up database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Create an account or login
2. Start a new conversation
3. Click "Connect Voice" to enable voice chat
4. Ask the AI to help you study:
   - "Create a quiz on photosynthesis"
   - "Generate flashcards about World War 2"
   - "Log a 30 minute study session on calculus"
   - "Show my progress for the last week"
   - "Set a goal to study 5 hours of chemistry this week"

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Vercel deployment instructions.

## Project Structure

```
stellaproject/
├── app/
│   ├── api/              # API endpoints
│   ├── chat/[id]/        # Chat interface
│   ├── conversations/    # History view
│   ├── quizzes/          # Quiz pages
│   └── flashcards/       # Flashcard pages
├── lib/
│   ├── db.ts             # Prisma client
│   ├── functions.ts      # Function definitions
│   └── cache.ts          # Client-side caching
├── hooks/
│   └── useRealtime.ts    # Realtime API client
└── prisma/
    └── schema.prisma     # Database schema
```

## License

MIT
