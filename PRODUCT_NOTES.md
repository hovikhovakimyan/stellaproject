# TutorFlow - Product Design Notes

## Product Vision & Philosophy

### The Core Problem
Students struggle to stay motivated and organized when studying. They need more than just answers to questions—they need a learning partner that helps them:
- Stay accountable with progress tracking
- Identify weak areas through testing
- Build consistent study habits
- Get personalized recommendations

### Why Voice-First?
Voice interaction makes learning feel more natural and accessible:
- **Lower friction**: Talking is faster than typing for complex questions
- **Multitasking**: Students can study while doing other tasks
- **Natural conversation**: More engaging than text-only interfaces
- **Accessibility**: Easier for students with dyslexia or typing difficulties

### Product Differentiation

**Not another ChatGPT wrapper**. TutorFlow is a purpose-built learning platform that happens to use voice as the primary interface.

Key differentiators:
1. **Specialized for learning**: Every feature is designed around student needs
2. **Action-oriented**: Functions that do things (track progress, create quizzes) not just answer questions
3. **Context-aware**: Remembers your learning journey across sessions
4. **Data-driven insights**: Provides recommendations based on your actual performance

## Function Calling Strategy

### Why These 7 Functions?

Each function solves a specific student pain point:

#### 1. `create_quiz` - Active Recall
- **Problem**: Passive reading doesn't lead to retention
- **Solution**: Generate custom quizzes for active recall practice
- **Innovation**: AI-generated questions tailored to specific topics and difficulty

#### 2. `log_study_session` - Habit Building
- **Problem**: Students underestimate or overestimate study time
- **Solution**: Accurate tracking of study sessions by subject
- **Innovation**: Automatic goal progress updates when logging sessions

#### 3. `get_study_progress` - Motivation
- **Problem**: Hard to see progress when studying alone
- **Solution**: Clear metrics showing time invested by subject
- **Innovation**: Visual breakdown helps identify neglected subjects

#### 4. `set_study_goal` - Accountability
- **Problem**: Vague goals ("study more") lead to procrastination
- **Solution**: Concrete goals with deadlines and hour targets
- **Innovation**: Automatic progress tracking against goals

#### 5. `get_quiz_history` - Self-Assessment
- **Problem**: Students don't know what they don't know
- **Solution**: Historical view of quiz performance over time
- **Innovation**: Pattern recognition across multiple attempts

#### 6. `recommend_review_topics` - Spaced Repetition
- **Problem**: Forgetting curve causes knowledge decay
- **Solution**: Smart recommendations for review based on scores
- **Innovation**: Prioritizes topics with low scores for efficient review

#### 7. `search_learning_resources` - Supplemental Learning
- **Problem**: Finding good learning materials takes time
- **Solution**: Curated resource recommendations by topic
- **Innovation**: Context-aware suggestions based on current conversation

### Function Call Design Principles

1. **Natural language first**: Users shouldn't need to know function names
2. **Automatic execution**: AI decides when to call functions
3. **Transparent results**: Show users what functions were called
4. **Graceful fallback**: Continue conversation even if functions fail

## User Experience Design

### Conversation Flow

```
User enters → Landing page → Start session → Voice chat
                                              ↓
                            Function calls ← AI processes
                                              ↓
                            Results shown → Continue chat
                                              ↓
                            Save to history → Return later
```

### Key UX Decisions

#### 1. No Authentication (Demo Scope)
- **Trade-off**: Simpler setup vs. multi-user support
- **Rationale**: For demo, focus on core functionality
- **Production path**: Add social login or email auth

#### 2. Persistent Conversations
- **Trade-off**: Database complexity vs. context preservation
- **Rationale**: Context awareness is a core requirement
- **Implementation**: PostgreSQL with conversation history

#### 3. Voice + Text Hybrid
- **Trade-off**: Complex UI vs. flexibility
- **Rationale**: Users should choose their input method
- **Implementation**: Both inputs send to same AI endpoint

#### 4. Function Call Visibility
- **Trade-off**: UI clutter vs. transparency
- **Rationale**: Users want to know what the AI is doing
- **Implementation**: Small badges showing function calls in chat

## Technical Architecture Choices

### Why OpenAI Realtime API?

**Alternatives considered**:
1. Deepgram STT + GPT-4 + ElevenLabs TTS
2. Whisper + GPT-4 Turbo + Play.ht
3. Assembly AI + Claude + Azure TTS

**Why Realtime API won**:
- ✅ Lowest latency (speech-to-speech in one hop)
- ✅ Native function calling support
- ✅ Simpler implementation (one connection vs. three services)
- ✅ Better conversation flow (server-side VAD)
- ❌ Higher cost per minute (acceptable for demo)
- ❌ Newer API (less documentation, but sufficient)

### Why PostgreSQL + Prisma?

**Alternatives considered**:
1. SQLite (simpler setup)
2. MongoDB (flexible schema)
3. Supabase (hosted Postgres)

**Why PostgreSQL + Prisma won**:
- ✅ Relational data fits learning domain well
- ✅ Type-safe queries with Prisma Client
- ✅ Easy migrations for schema changes
- ✅ Production-ready with good performance
- ✅ Local development with `npx prisma dev`
- ❌ More setup than SQLite (acceptable trade-off)

### Why Next.js App Router?

**Alternatives considered**:
1. Next.js Pages Router (older pattern)
2. Remix (newer framework)
3. Create React App + Express (separate services)

**Why App Router won**:
- ✅ Server components for better performance
- ✅ API routes co-located with frontend
- ✅ Built-in TypeScript support
- ✅ Best Vercel deployment experience
- ✅ Future of Next.js
- ❌ Steeper learning curve (acceptable for demo)

## Data Model Design

### Core Entities

```
User (1) ←→ (N) Conversation ←→ (N) Message
  ↓ (N)           ↓ (N)
StudySession    Quiz ←→ QuizAttempt
  ↓ (N)
StudyGoal
```

### Key Design Decisions

#### 1. Message Storage
- **Store both user and AI messages**: Enables full conversation replay
- **Include function call metadata**: Shows what actions were taken
- **Timestamp everything**: Enables time-based analysis

#### 2. Study Sessions
- **Separate from conversations**: Study tracking is distinct from chat
- **Duration in minutes**: Easy to aggregate and display
- **Subject + Topic hierarchy**: Flexible categorization

#### 3. Quizzes
- **JSON storage for questions**: Flexible question formats
- **Separate attempts**: Track improvement over time
- **Score as percentage**: Universal metric across topics

## Success Metrics (If Deployed)

### User Engagement
- **Daily active users**: Are students coming back?
- **Average session length**: Are conversations meaningful?
- **Function calls per session**: Is the AI being used beyond chat?

### Learning Outcomes
- **Quiz score improvement**: Are students getting better?
- **Study goal completion rate**: Are goals being achieved?
- **Weekly study hours**: Is usage consistent?

### Technical Performance
- **Voice latency (P95)**: Under 2 seconds
- **Message delivery rate**: Above 99%
- **Function call success rate**: Above 95%

## Future Enhancements

### Phase 2: Enhanced Learning
- **Real quiz engine**: Multiple question types, timed quizzes
- **Flashcards**: Spaced repetition system for memorization
- **Study groups**: Collaborative learning sessions
- **Achievements**: Gamification for motivation

### Phase 3: Content Integration
- **Document upload**: Chat about PDFs, notes, textbooks
- **YouTube integration**: Summarize educational videos
- **Calendar sync**: Automatic study scheduling
- **Notion/Obsidian**: Sync with note-taking apps

### Phase 4: Advanced Analytics
- **Learning style analysis**: Personalized recommendations
- **Retention curves**: Predict when to review topics
- **Subject difficulty rating**: Help prioritize study time
- **Peer comparison**: Anonymous benchmarking

## Design Principles Applied

### 1. Progressive Disclosure
- Start simple (just talk)
- Reveal features as needed (functions appear in conversation)
- Advanced features in settings (future: analytics dashboard)

### 2. Immediate Feedback
- Visual confirmation of voice recording
- Real-time transcript display
- Instant function call results

### 3. Forgiving UX
- Can use voice OR text
- Can edit/delete conversations
- Can retry failed operations

### 4. Performance First
- Server components for faster page loads
- Optimistic UI updates
- Streaming responses (future enhancement)

## Lessons Learned

### What Worked Well
1. **Voice integration was smoother than expected**: Realtime API is well-designed
2. **Function calling is powerful**: Transforms AI from chatbot to platform
3. **Next.js made iteration fast**: Hot reload with TypeScript saved time

### What Was Challenging
1. **Audio playback complexity**: WebSocket binary data handling needs more polish
2. **Error handling at boundaries**: Network failures, API timeouts need better UX
3. **Database seeding**: Would have helped with demo/testing

### What I'd Do Differently
1. **Start with simpler audio**: Get text working perfectly before adding voice
2. **Mock function results earlier**: Could have tested UX before implementing DB
3. **Design system upfront**: Reusable components would have saved time

## Conclusion

TutorFlow demonstrates how AI can be more than a chatbot when you:
1. Choose a specific domain (learning)
2. Design thoughtful functions (7 learning-focused actions)
3. Maintain context (conversation history)
4. Use the right interface (voice for natural interaction)

The result is a product that feels like a learning companion, not just a Q&A tool.
