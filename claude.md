# CLAUDE.md — Swatch Development Guide

## Project Overview

**Swatch** is a visual design application that gives designers AI superpowers. It's like having a top-tier design team to develop ideas and bring them to life. Unlike traditional chatbots, Swatch uses visual layouts and non-linear generation—think Figma meets agentic AI.

Key differentiators:
- **Master Context Canvas** — Visual bulletin board for reference materials (not a chat window)
- **Design Threads** — Non-linear exploration with clone/revert (not a linear conversation)
- **Thread Prompts** — Each thread has a focused purpose that stays in context
- **Feedback-Driven Priority** — User signals (save, thumbs, stars) determine what stays in context

## Tech Stack

### Frontend
- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State Management:** Zustand (simple) or Jotai (atomic)
- **Canvas:** React Flow or Konva.js for the Master Context canvas
- **UI Components:** shadcn/ui as base, custom components on top

### Backend
- **Runtime:** Node.js with Next.js API routes (initially), extractable to separate service later
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Clerk
- **File Storage:** S3-compatible (AWS S3, Cloudflare R2, or similar)
- **Vector Store:** pgvector extension (for retrieval augmentation)

### AI Integration
- **Orchestration:** Anthropic Claude API (claude-opus-4-5-20251101 or claude-sonnet-4-5-20250929) - abstracted for future model swapping
- **Image Generation:** OpenAI API (GPT Image 1.5) — abstracted for future model swapping
- **Embeddings:** OpenAI text-embedding-3-small (for retrieval)

### Infrastructure
- **Hosting:** Vercel (frontend + API routes) or Railway/Render for more control
- **Database Hosting:** Neon, Supabase, or Railway Postgres

## Project Structure

```
swatch/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Auth routes (login, signup)
│   │   ├── (dashboard)/        # Main app routes
│   │   │   ├── projects/       # Project list and CRUD
│   │   │   ├── project/[id]/   # Single project view
│   │   │   │   ├── context/    # Master Context canvas
│   │   │   │   ├── design/     # Design Mode (threads)
│   │   │   │   └── present/    # Presentation view
│   │   │   └── settings/       # User settings
│   │   └── api/                # API routes
│   │       ├── projects/
│   │       ├── threads/
│   │       ├── artifacts/
│   │       └── agent/          # Agent orchestration endpoints
│   ├── components/
│   │   ├── ui/                 # Base UI components (shadcn)
│   │   ├── canvas/             # Master Context canvas components
│   │   ├── thread/             # Thread timeline components
│   │   ├── artifact/           # Artifact display and feedback
│   │   └── agent/              # Agent status indicators
│   ├── lib/
│   │   ├── agent/              # Agent orchestration logic
│   │   │   ├── creative-director.ts
│   │   │   ├── context-builder.ts
│   │   │   ├── image-generator.ts
│   │   │   └── divergence-detector.ts
│   │   ├── db/                 # Database utilities
│   │   ├── storage/            # File storage utilities
│   │   └── utils/              # General utilities
│   ├── hooks/                  # React hooks
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── public/
└── config/
    └── swatch.config.ts        # App configuration (context window params, etc.)
```

## Core Concepts & Terminology

Use these terms consistently in code, comments, and UI:

| Term | Definition | Code Convention |
|------|------------|-----------------|
| **Project** | Top-level container for all design work | `Project` model, `project` variable |
| **Master Context** | Visual canvas of reference materials | `MasterContext`, `masterContext` |
| **Context Element** | Single item on the Master Context (image, text, note) | `ContextElement`, `element` |
| **Thread** | Linear sequence of design iterations with a focused prompt | `Thread`, `thread` |
| **Thread Prompt** | Brief text defining a thread's purpose | `threadPrompt` (string field on Thread) |
| **Artifact** | Single design output (image, palette, etc.) | `Artifact`, `artifact` |
| **Saved** | User-bookmarked artifact (highest priority) | `isSaved` boolean |
| **Feedback** | User signal on artifact (thumbs, stars, notes) | `Feedback` model |
| **Creative Director** | The main AI agent | `CreativeDirector` class |

## Database Schema (Key Models)

```prisma
model Project {
  id            String          @id @default(cuid())
  name          String
  status        ProjectStatus   @default(DRAFT)
  userId        String
  masterContext MasterContext?
  threads       Thread[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

enum ProjectStatus {
  DRAFT
  IN_REVIEW
  APPROVED
}

model MasterContext {
  id        String           @id @default(cuid())
  projectId String           @unique
  project   Project          @relation(fields: [projectId], references: [id])
  elements  ContextElement[]
}

model ContextElement {
  id              String        @id @default(cuid())
  masterContextId String
  masterContext   MasterContext @relation(fields: [masterContextId], references: [id])
  type            ElementType   // IMAGE, TEXT, NOTE
  content         String        // URL for images, text content for others
  label           String?       // Description label
  purpose         String?       // Purpose label
  priority        Priority      @default(IMPORTANT)
  isOutOfContext  Boolean       @default(false)
  positionX       Float
  positionY       Float
  width           Float?
  height          Float?
}

enum Priority {
  MUST_HAVE
  IMPORTANT
  NICE_TO_HAVE
  INSPIRATION
}

model Thread {
  id        String     @id @default(cuid())
  projectId String
  project   Project    @relation(fields: [projectId], references: [id])
  parentId  String?    // For thread tree structure
  parent    Thread?    @relation("ThreadTree", fields: [parentId], references: [id])
  children  Thread[]   @relation("ThreadTree")
  prompt    String     // Thread prompt — always in context
  artifacts Artifact[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model Artifact {
  id          String     @id @default(cuid())
  threadId    String
  thread      Thread     @relation(fields: [threadId], references: [id])
  type        ArtifactType
  imageUrl    String?
  metadata    Json?      // Palette data, etc.
  isSaved     Boolean    @default(false)
  feedback    Feedback?
  agentPrompt String?    // The prompt sent to image generation
  createdAt   DateTime   @default(now())
}

model Feedback {
  id         String    @id @default(cuid())
  artifactId String    @unique
  artifact   Artifact  @relation(fields: [artifactId], references: [id])
  thumbs     Thumbs?   // UP, DOWN, null
  stars      Int?      // 1-5
  notes      String?
  annotations Json?    // Drawn annotations data
}

enum Thumbs {
  UP
  DOWN
}
```

## Configuration

All tunable parameters live in `config/swatch.config.ts`:

```typescript
export const swatchConfig = {
  // Context management
  recentIterationsWindow: parseInt(process.env.RECENT_ITERATIONS_WINDOW || '5'),
  maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '100000'),
  compressionThreshold: parseFloat(process.env.COMPRESSION_THRESHOLD || '0.8'),
  
  // Agent settings
  defaultModel: process.env.DEFAULT_LLM_MODEL || 'claude-sonnet-4-20250514',
  defaultImageModel: process.env.DEFAULT_IMAGE_MODEL || 'gpt-4o',
  
  // Divergence detection
  divergenceThreshold: parseFloat(process.env.DIVERGENCE_THRESHOLD || '0.7'),
} as const;
```

## Agent Architecture

### Context Builder

The context builder assembles the prompt for the Creative Director. It follows the priority hierarchy:

```typescript
// lib/agent/context-builder.ts

interface ContextItem {
  content: string;
  priority: number; // Lower = higher priority
  tokens: number;
  source: 'thread_prompt' | 'saved_artifact' | 'must_have' | 'feedback' | 'recent' | 'important' | 'nice_to_have' | 'inspiration';
}

// Priority order (Tier 0 = 0-99, Tier 1 = 100-199, etc.)
const PRIORITY = {
  THREAD_PROMPT: 0,
  SAVED_ARTIFACT: 10,
  MUST_HAVE_CONTEXT: 20,
  ARTIFACT_WITH_FEEDBACK: 100,
  RECENT_ITERATION: 110,
  IMPORTANT_CONTEXT: 120,
  NICE_TO_HAVE: 200,
  OLDER_ARTIFACT: 210,
  INSPIRATION: 300,
  OTHER_THREAD: 310,
} as const;
```

### Creative Director

The main agent orchestrates all design work:

```typescript
// lib/agent/creative-director.ts

class CreativeDirector {
  async processRequest(input: {
    projectId: string;
    threadId: string;
    userMessage: string;
    masterContext: MasterContext;
    threadHistory: Artifact[];
  }): Promise<AgentResponse> {
    // 1. Build context with priority hierarchy
    // 2. Check for divergence from thread prompt
    // 3. If divergent, suggest new thread
    // 4. Otherwise, process request (research, generate, etc.)
    // 5. Return response with any generated artifacts
  }
}
```

### Divergence Detection

Compares user request against thread prompt to detect topic drift:

```typescript
// lib/agent/divergence-detector.ts

async function detectDivergence(
  threadPrompt: string,
  userMessage: string,
  recentContext: string
): Promise<{
  isDivergent: boolean;
  confidence: number;
  suggestedNewPrompt?: string;
}> {
  // Use Claude to assess semantic similarity
  // Return divergence assessment
}
```

## API Patterns

### Agent Endpoint

```typescript
// app/api/agent/route.ts

export async function POST(req: Request) {
  const { projectId, threadId, message } = await req.json();
  
  // Stream response for real-time updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Process in background, write status updates
  processAgentRequest({ projectId, threadId, message, writer });
  
  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### Status Updates

Use Server-Sent Events for agent status:

```typescript
// Status event types
type AgentStatus = 
  | { type: 'thinking'; message: string }
  | { type: 'researching'; message: string }
  | { type: 'generating'; message: string }
  | { type: 'artifact'; artifact: Artifact }
  | { type: 'divergence'; suggestion: DivergenceSuggestion }
  | { type: 'complete'; summary: string }
  | { type: 'error'; error: string };
```

## Coding Conventions

### TypeScript
- Strict mode enabled, no `any` types
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `const` assertions for literal types
- Export types from `src/types/` index file

### React
- Functional components only
- Use `use client` directive only when necessary
- Colocate component-specific hooks in component files
- Extract shared hooks to `src/hooks/`

### Naming
- Components: PascalCase (`ArtifactCard.tsx`)
- Hooks: camelCase with `use` prefix (`useThread.ts`)
- Utilities: camelCase (`buildContext.ts`)
- Constants: SCREAMING_SNAKE_CASE
- Database fields: camelCase (Prisma convention)

### File Organization
- One component per file (except tiny related components)
- Index files for clean exports from directories
- Keep files under 300 lines; split if larger

### Comments
- Explain "why", not "what"
- Use JSDoc for public functions and complex types
- TODO format: `// TODO(username): description`

## Testing Strategy

### Unit Tests
- Agent logic (context building, divergence detection)
- Utility functions
- Use Vitest

### Integration Tests
- API routes
- Database operations
- Use Vitest with test database

### E2E Tests (later phases)
- Critical user flows
- Use Playwright

## Common Tasks

### Adding a New Context Element Type

1. Add to `ElementType` enum in Prisma schema
2. Update `ContextElement` component to render new type
3. Update context builder to serialize new type
4. Add upload/creation UI if needed

### Adding a New Feedback Type

1. Add field to `Feedback` model in Prisma
2. Update feedback UI component
3. Update context priority calculation if it affects priority

### Adding a New Image Generation Model

1. Create adapter in `lib/agent/image-generators/`
2. Implement `ImageGenerator` interface
3. Register in image generator factory
4. Add to config options

## What to Avoid

- **Don't** store API keys in code — use environment variables
- **Don't** make the Creative Director "chat" — it should feel like a design tool, not a chatbot
- **Don't** compress or drop thread prompts — they're always Tier 0
- **Don't** delete artifacts — only hide or archive
- **Don't** build sub-agents yet — Phase 1 is single Creative Director only
- **Don't** add collaboration features yet — single user per project for now
- **Don't** over-engineer — we're iterating toward product-market fit

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# AI APIs
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Storage
S3_BUCKET=...
S3_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Config (optional, has defaults)
RECENT_ITERATIONS_WINDOW=5
MAX_CONTEXT_TOKENS=100000
COMPRESSION_THRESHOLD=0.8
DEFAULT_LLM_MODEL=claude-sonnet-4-20250514
DEFAULT_IMAGE_MODEL=gpt-4o
DIVERGENCE_THRESHOLD=0.7
```

## Reference Documents

- **Product Design Doc:** `docs/swatch-product-design.md`
- **Anthropic Agent Patterns:** https://www.anthropic.com/engineering/multi-agent-research-system
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **shadcn/ui:** https://ui.shadcn.com

## Current Phase

**Phase 0: Foundation**

Focus areas:
- Basic web app shell with authentication
- Project CRUD
- File upload infrastructure
- Single Creative Director agent (no sub-agents)
- Basic prompt → image generation flow
- Simple linear UI (temporary, will be replaced)

Exit criteria: End-to-end flow works for single-turn image generation.