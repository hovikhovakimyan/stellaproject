# TutorFlow - AI Learning Companion

> Built for the Stella Foster Engineering Demo

TutorFlow is a voice-first AI learning companion that helps students study smarter through real-time conversations, interactive quizzes, and personalized progress tracking.

## Product Overview

**Concept**: A specialized learning tutor, not a generic chatbot. TutorFlow focuses on helping students achieve their learning goals through:

- **Voice-First Interaction**: Natural conversations using OpenAI's Realtime API for speech-to-speech interaction
- **Contextual Memory**: AI remembers previous conversations and can reference past study sessions
- **Intelligent Function Calling**: 7 specialized functions that go beyond chat to actually help students learn:
  - Create custom quizzes on any topic
  - Track study sessions with duration and subject
  - Monitor progress with detailed analytics
  - Set and track learning goals
  - Get smart recommendations for topics to review
  - Search for learning resources
  - Calculate retention metrics with spaced repetition

**Why it's interesting**: Most AI tutors are just chatbots. TutorFlow is a learning platform that uses voice as the interface. The function calling system transforms the AI from a passive Q&A bot into an active learning partner.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI Realtime API (GPT-4o with native function calling)
- **Voice**: OpenAI's built-in speech-to-speech (24kHz audio)

## Key Features

### 1. Voice Conversations (Core Requirement)
- Real-time bidirectional voice communication
- Press-to-talk or continuous conversation mode
- Transcript display alongside voice interaction
- Low-latency responses using WebSocket connection

### 2. Conversation History (Core Requirement)
- View all past study sessions
- Search through conversation history
- Delete old conversations
- Auto-generated titles based on content

### 3. Context Awareness (Core Requirement)
- AI references information from previous conversations
- Maintains context about study progress and goals
- Remembers quiz scores and topics studied
- Provides continuity across sessions

### 4. Function Calling (Core Requirement)
TutorFlow implements 7 functions that demonstrate thoughtful product design:

**Learning Tools:**
- `create_quiz`: Generate custom quizzes with difficulty levels
- `search_learning_resources`: Find articles, videos, and tutorials

**Progress Tracking:**
- `log_study_session`: Record study time by subject and topic
- `get_study_progress`: View analytics and breakdowns by subject
- `get_quiz_history`: Review past quiz attempts and scores

**Goal Management:**
- `set_study_goal`: Create goals with target hours and deadlines
- `recommend_review_topics`: Get AI suggestions based on performance

Each function is designed to solve a real student need, not just showcase technical capability.

## Architecture Decisions

### Why OpenAI Realtime API?
- Native speech-to-speech (no separate STT/TTS needed)
- Built-in function calling support
- Lower latency than chaining multiple services
- Simpler authentication and state management

### Why PostgreSQL + Prisma?
- Robust relational data for conversations and study tracking
- Type-safe database access with Prisma
- Easy migrations and schema changes
- Production-ready with good performance

### Why Next.js App Router?
- Server components for better performance
- API routes co-located with frontend
- Built-in TypeScript support
- Easy deployment to Vercel

## Project Structure

```
stellaproject/
├── app/
│   ├── api/
│   │   ├── conversations/      # Conversation CRUD endpoints
│   │   ├── functions/          # Function call execution
│   │   └── realtime/           # OpenAI session token endpoint
│   ├── chat/[id]/              # Voice conversation interface
│   ├── conversations/          # History view
│   └── page.tsx                # Landing page
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   └── functions.ts            # Function definitions & implementations
├── hooks/
│   └── useRealtime.ts          # OpenAI Realtime API client hook
├── prisma/
│   └── schema.prisma           # Database schema
└── .env                        # Environment variables
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (or use Prisma's local Postgres)
- OpenAI API key with Realtime API access

### 1. Clone and Install

```bash
git clone <repository-url>
cd stellaproject
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY="sk-..."
```

### 3. Set Up Database

Option A: Use Prisma's local Postgres (easiest):
```bash
npx prisma dev
```

Option B: Use your own PostgreSQL:
```bash
# Update DATABASE_URL in .env to point to your database
npx prisma migrate dev
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage Guide

1. **Start a Session**: Click "Start Learning" on the home page
2. **Connect Voice**: Click "Connect Voice" in the chat interface
3. **Talk or Type**: Use the microphone button to speak, or type messages
4. **Try Functions**: Ask the AI to:
   - "Create a quiz on photosynthesis with 5 medium difficulty questions"
   - "Log a 45-minute study session on calculus"
   - "Show me my study progress for the last 30 days"
   - "Set a goal to study 10 hours of chemistry by next Friday"
   - "What topics should I review based on my quiz scores?"
5. **View History**: Click "History" to see past conversations

## Product Decisions & Trade-offs

### What I Prioritized
- **Voice quality over features**: Focused on making the voice interaction smooth before adding bells and whistles
- **Useful functions over quantity**: 7 well-designed functions that solve real problems, not 20 generic ones
- **Student-centered design**: Every feature answers "how does this help someone learn better?"

### What I Simplified
- **Single user mode**: No authentication system (would add in production)
- **Mock resource search**: Real integration would use external APIs
- **Basic quiz generation**: Production version would use GPT to generate contextual questions

### What I'd Add With More Time
- **Authentication**: User accounts with social login
- **Spaced repetition algorithm**: Proper SRS implementation for review scheduling
- **Real quiz engine**: Multiple question types (multiple choice, short answer, essay)
- **Study analytics dashboard**: Charts and visualizations of progress
- **Mobile app**: React Native version for on-the-go studying
- **Study groups**: Collaborative learning sessions
- **Integration with calendars**: Automatic study session scheduling

## Technical Challenges Solved

1. **Real-time audio streaming**: Handled WebSocket connection management and audio chunking
2. **Context preservation**: Designed database schema to maintain conversation context across sessions
3. **Function call orchestration**: Created clean separation between function definitions and implementations
4. **Error handling**: Graceful degradation when voice API is unavailable (text fallback)

## Testing

### Manual Testing Checklist
- [ ] Create new conversation from home page
- [ ] Connect to voice API successfully
- [ ] Send text messages and receive responses
- [ ] Use voice input and receive audio responses
- [ ] Call each function through natural language
- [ ] View conversation history
- [ ] Delete a conversation
- [ ] Navigate between pages without errors

### API Key Note
This project requires an OpenAI API key with Realtime API access. Usage costs approximately:
- $5/hour for typical usage with voice
- $0.50/hour for text-only usage

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `DATABASE_URL`: Your production Postgres URL
   - `OPENAI_API_KEY`: Your OpenAI API key
4. Deploy

### Database Migration
```bash
npx prisma migrate deploy
```

## Code Quality Highlights

- **TypeScript**: Full type safety across frontend and backend
- **Clean architecture**: Clear separation of concerns (API, business logic, UI)
- **Error handling**: Try-catch blocks with user-friendly error messages
- **Responsive design**: Works on desktop, tablet, and mobile
- **Accessibility**: Semantic HTML and ARIA labels
- **Performance**: React Server Components for faster initial load

## Future Plans & Potential Upgrades

This section outlines potential enhancements that could be added to TutorFlow to make it an even more powerful learning platform.

### Content Organization & Grouping

**Study Sessions / Topics Grouping**
- Group flashcards, quizzes, and conversations by topic or study session
- Create "Learning Paths" that bundle related content together
- Example: A "Photosynthesis" topic could contain:
  - The original conversation where it was explained
  - 10 flashcards for memorizing key terms
  - A 15-question quiz to test understanding
  - Study session logs showing time spent
- Benefits: Easier to review related material, see progress per topic, organize study flow

**Smart Collections**
- Auto-generate collections based on subjects (e.g., "Biology", "Calculus")
- Date-based grouping (e.g., "Week of Jan 8-14", "Midterm Prep")
- Performance-based grouping (e.g., "Needs Review" for topics with low quiz scores)
- Tag system for custom organization

### Enhanced Flashcard Features

**Spaced Repetition System (SRS)**
- Implement proper spaced repetition algorithm (e.g., SuperMemo SM-2)
- Track when flashcards were last reviewed and schedule optimal review times
- Show "due for review" notifications and counts
- Difficulty ratings that adjust review intervals (Easy = longer interval, Hard = shorter)

**Flashcard Practice Modes**
- Study mode (flip through at your own pace)
- Quiz mode (self-grade as Easy/Medium/Hard)
- Match game (match terms to definitions)
- Fill-in-the-blank mode

**Image Support**
- Add images to flashcards (especially useful for anatomy, geography, diagrams)
- AI-generated images for visual concepts
- OCR to create flashcards from uploaded study materials

### Advanced Quiz Features

**Multiple Question Types**
- Short answer questions (text input, AI grading)
- True/False questions
- Fill-in-the-blank
- Essay questions with AI feedback
- Matching questions
- Ordering/sequencing questions

**Quiz Analytics**
- Performance trends over time (line charts showing improvement)
- Weak areas identification (which concepts need more work)
- Time spent per question analytics
- Comparison to previous attempts

**Practice Tests**
- Timed test mode with countdown
- Randomize question order
- Mix questions from multiple topics
- Simulate real exam conditions

### Voice & Interaction Improvements

**Voice Activity Detection (VAD) Options**
- User preference: automatic (VAD) vs manual (push-to-talk)
- Interrupt capability (stop AI while it's speaking)
- Multiple voice options for AI tutor personality
- Adjustable speech speed

**Multimodal Input**
- Draw diagrams while explaining (whiteboard integration)
- Upload PDFs/documents for AI to help study from
- Screenshot analysis (take a photo of homework, get help)
- LaTeX equation rendering improvements

### Collaboration & Social Features

**Study Groups**
- Create shared study sessions with classmates
- Collaborative flashcard decks (everyone contributes)
- Group quizzes and leaderboards
- Shared notes and resources per topic

**Teacher Mode**
- Teachers can create classrooms
- Assign specific quizzes and flashcard sets
- Monitor student progress and identify struggling students
- Create custom learning paths for curriculum

### Progress & Motivation

**Gamification**
- XP points for completing study sessions
- Streak tracking (study X days in a row)
- Achievement badges (e.g., "Quiz Master", "Flashcard Champion")
- Level system with unlockable features

**Study Insights Dashboard**
- Heatmap of study activity (similar to GitHub contributions)
- Subject distribution pie charts
- Goal progress visualization
- Weekly/monthly study reports

**Reminders & Scheduling**
- Push notifications for study reminders
- Calendar integration (Google Calendar, iCal)
- Optimal study time suggestions based on performance patterns
- Deadline tracking for exams and assignments

### AI Enhancements

**Adaptive Learning**
- AI adjusts difficulty based on performance
- Personalized study plans generated automatically
- Identifies learning patterns (e.g., "you learn best in the morning")
- Suggests optimal study session length

**Multi-Subject Context**
- AI remembers concepts across different subjects
- Makes connections between related topics (e.g., math in physics)
- Comprehensive knowledge graph of everything learned

**Custom Tutor Personalities**
- Choose AI personality (encouraging, strict, humorous)
- Subject-specialized tutors (math tutor vs language tutor)
- Adjustable formality level

### Technical Infrastructure

**Offline Mode**
- Download flashcards and quizzes for offline study
- Sync progress when back online
- PWA (Progressive Web App) support

**Mobile Apps**
- Native iOS and Android apps
- Better performance and native features
- Push notifications
- Camera integration for document scanning

**Export & Import**
- Export flashcards to Anki, Quizlet formats
- PDF export of quizzes and study guides
- Import from other platforms
- CSV/JSON data export for backup

**API & Integrations**
- Public API for third-party integrations
- LMS integration (Canvas, Blackboard)
- Note-taking app sync (Notion, Obsidian)
- Browser extension for quick flashcard creation

### Accessibility & Localization

**Accessibility**
- Screen reader optimization
- Keyboard-only navigation
- High contrast mode
- Dyslexia-friendly fonts

**Internationalization**
- Multi-language support
- Translation of AI responses
- Regional date/time formats
- Currency localization for potential premium features

### Monetization (For Production)

**Free Tier**
- Basic features: conversations, flashcards, quizzes
- Limited AI usage per month

**Premium Features**
- Unlimited AI conversations
- Advanced analytics and insights
- Custom tutor personalities
- Offline mode
- Ad-free experience
- Priority support

**Educational Institutional Licensing**
- School/university-wide licenses
- Teacher admin panels
- Bulk student accounts
- Custom integrations

---

**Priority Ranking** (if implementing):
1. **High Priority**: Study session grouping, SRS for flashcards, quiz analytics
2. **Medium Priority**: Multiple question types, voice improvements, study dashboard
3. **Nice to Have**: Gamification, social features, mobile apps
4. **Long Term**: Teacher mode, API, institutional licensing

These features represent natural extensions of TutorFlow's core mission: making studying more effective through intelligent, personalized AI assistance.

## License

MIT

## Contact

Built by [Your Name] for Stella Foster Engineering Demo
[GitHub](https://github.com/yourusername) | [Email](mailto:your@email.com)
