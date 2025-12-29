# Swatch

AI-Powered Visual Design Application

## Overview

Swatch is a visual design application that gives designers AI superpowers. It's like having a top-tier design team to develop ideas and bring them to life. Unlike traditional chatbots, Swatch uses visual layouts and non-linear generation.

### Key Features

- **Master Context Canvas** — Visual bulletin board for reference materials (not a chat window)
- **Design Threads** — Non-linear exploration with clone/revert (not a linear conversation)
- **Thread Prompts** — Each thread has a focused purpose that stays in context
- **Feedback-Driven Priority** — User signals (save, thumbs, stars) determine what stays in context

## Current Phase: Phase 1 - Master Context

### Completed Features

✅ **Phase 0: Foundation**
- Next.js 16 application with TypeScript
- Prisma ORM with PostgreSQL database
- Project CRUD operations
- Creative Director AI agent
- Context builder with priority hierarchy
- Image generation integration (OpenAI)
- Basic authentication setup (Clerk ready)

✅ **Phase 1: Master Context**
- React Flow canvas for Master Context
- Drag-and-drop element positioning
- Context element types (IMAGE, TEXT, NOTE)
- Element labeling (description + purpose)
- Priority tier assignment (MUST_HAVE, IMPORTANT, NICE_TO_HAVE, INSPIRATION)
- "Outside of Context" toggle
- Visual element components
- Master Context → Agent integration

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Canvas:** React Flow for Master Context canvas
- **UI Components:** shadcn/ui

### Backend
- **Runtime:** Node.js with Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Clerk (configured, keys needed)
- **File Storage:** S3-compatible (configured, keys needed)

### AI Integration
- **Orchestration:** Anthropic Claude API (Sonnet 4.5)
- **Image Generation:** OpenAI API (GPT-4o)
- **Embeddings:** OpenAI text-embedding-3-small

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use `npx prisma dev` for local)
- API keys for Anthropic and OpenAI

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd swatch
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in your API keys:

```bash
# Database (automatically configured if using `npx prisma dev`)
DATABASE_URL="your-database-url"

# AI APIs
ANTHROPIC_API_KEY="your-anthropic-key"
OPENAI_API_KEY="your-openai-key"

# Auth (Clerk - optional for testing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"

# Storage (S3 - optional for testing)
S3_BUCKET="your-bucket-name"
S3_REGION="your-region"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
```

4. Start the local database (if using Prisma dev)
```bash
npx prisma dev
```

5. Run the initial migration
```bash
npx prisma migrate dev --name init
```

6. Start the development server
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Testing

Run tests with:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Project Structure

```
swatch/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   ├── projects/       # Project CRUD
│   │   ├── threads/        # Thread management
│   │   ├── artifacts/      # Artifact management
│   │   ├── agent/          # AI agent endpoint
│   │   └── context-elements/ # Master Context elements
│   ├── projects/           # Projects list page
│   └── project/[id]/       # Single project view
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── canvas/             # Master Context canvas components
│   ├── thread/             # Thread timeline components (Phase 2)
│   └── artifact/           # Artifact display (Phase 2)
├── lib/
│   ├── agent/              # AI agent logic
│   │   ├── creative-director.ts
│   │   ├── context-builder.ts
│   │   ├── image-generator.ts
│   │   └── divergence-detector.ts
│   ├── db/                 # Database utilities
│   └── utils/              # General utilities
├── types/                  # TypeScript types
├── config/                 # App configuration
└── prisma/                 # Database schema and migrations
```

## Usage

### Creating a Project

1. Navigate to the projects page
2. Click "New Project"
3. Enter a project name
4. Click "Create Project"

### Master Context Canvas

1. Open a project
2. Click "Master Context" tab
3. Click "Add Element" to create context elements
4. Drag elements to position them on the canvas
5. Set priority tiers to control context hierarchy
6. Use "Outside of Context" toggle to exclude elements from AI processing

### Context Element Types

- **IMAGE**: Reference images with URL
- **TEXT**: Text content for guidelines, requirements, etc.
- **NOTE**: Quick notes and annotations

### Priority Tiers

- **Must Have**: Never compressed, always verbatim in context
- **Important**: Light summarization when space is tight
- **Nice to Have**: Aggressive summarization permitted
- **Inspiration Only**: Can be embedded/retrieved rather than kept in active context

## Development Roadmap

### ✅ Phase 0: Foundation (Complete)
- Basic web app infrastructure
- Database models
- AI agent core logic
- API routes

### ✅ Phase 1: Master Context (Complete)
- Visual canvas with React Flow
- Element creation and management
- Priority tier system
- Drag-and-drop positioning

### 🚧 Phase 2: Design Threads (In Progress)
- Thread prompt system
- Thread timeline UI
- Clone and revert operations
- Divergence detection

### 📋 Phase 3: Sub-Agent System
- Strategist agent
- Researcher agent
- Creator agent variants
- Presentation Designer

### 📋 Phase 4: Feedback & Iteration
- Save functionality
- Thumbs up/down
- Star ratings
- Annotations

### 📋 Phase 5: Context Compression & Scaling
- Configurable parameters
- Hierarchical summarization
- Retrieval augmentation

## Contributing

This is a private project. Please see the development team for contribution guidelines.

## License

Proprietary - All rights reserved
