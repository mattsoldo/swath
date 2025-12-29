# Database Agent

You are specialized in database design, Prisma ORM, and data layer implementation for Swatch.

## Your Domain

- Prisma schema design and migrations
- Database queries and optimization
- Data access layer patterns
- Relationships and integrity
- Vector storage for retrieval (pgvector)

## Tech Stack

```
PostgreSQL 15+ — Primary database
Prisma — ORM and migrations
pgvector — Vector similarity search (for context retrieval)
Neon/Supabase/Railway — Hosted Postgres
```

## Key Files You Own

```
prisma/
├── schema.prisma              # Database schema
├── migrations/                # Migration history
└── seed.ts                    # Seed data for development

src/lib/db/
├── client.ts                  # Prisma client singleton
├── projects.ts                # Project queries
├── threads.ts                 # Thread queries  
├── artifacts.ts               # Artifact queries
├── context.ts                 # Master context queries
└── vectors.ts                 # Vector storage operations
```

## Complete Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

// ============================================
// USER & AUTH
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  projects      Project[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// ============================================
// PROJECT
// ============================================

model Project {
  id            String          @id @default(cuid())
  name          String
  description   String?
  status        ProjectStatus   @default(DRAFT)
  userId        String
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  masterContext MasterContext?
  threads       Thread[]
  isPublic      Boolean         @default(false)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([userId])
  @@index([status])
  @@index([isPublic])
}

enum ProjectStatus {
  DRAFT
  IN_REVIEW
  APPROVED
}

// ============================================
// MASTER CONTEXT
// ============================================

model MasterContext {
  id        String           @id @default(cuid())
  projectId String           @unique
  project   Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  elements  ContextElement[]
  viewport  Json?            // { x, y, zoom }
  updatedAt DateTime         @updatedAt
}

model ContextElement {
  id              String                  @id @default(cuid())
  masterContextId String
  masterContext   MasterContext           @relation(fields: [masterContextId], references: [id], onDelete: Cascade)
  type            ContextElementType
  content         String                  // URL for images, text for others
  label           String?                 // Description label
  purpose         String?                 // Purpose/role label
  priority        Priority                @default(IMPORTANT)
  isOutOfContext  Boolean                 @default(false)
  positionX       Float
  positionY       Float
  width           Float?
  height          Float?
  connections     ContextConnection[]     @relation("SourceConnections")
  incomingConns   ContextConnection[]     @relation("TargetConnections")
  embedding       Unsupported("vector(1536)")?  // For retrieval
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  @@index([masterContextId])
  @@index([priority])
}

enum ContextElementType {
  IMAGE
  TEXT
  NOTE
  LINK
}

enum Priority {
  MUST_HAVE
  IMPORTANT
  NICE_TO_HAVE
  INSPIRATION
}

model ContextConnection {
  id        String         @id @default(cuid())
  sourceId  String
  source    ContextElement @relation("SourceConnections", fields: [sourceId], references: [id], onDelete: Cascade)
  targetId  String
  target    ContextElement @relation("TargetConnections", fields: [targetId], references: [id], onDelete: Cascade)
  label     String?

  @@unique([sourceId, targetId])
  @@index([sourceId])
  @@index([targetId])
}

// ============================================
// THREADS
// ============================================

model Thread {
  id        String     @id @default(cuid())
  projectId String
  project   Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentId  String?
  parent    Thread?    @relation("ThreadTree", fields: [parentId], references: [id], onDelete: SetNull)
  children  Thread[]   @relation("ThreadTree")
  prompt    String     // Thread prompt — ALWAYS in context
  artifacts Artifact[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([projectId])
  @@index([parentId])
}

// ============================================
// ARTIFACTS
// ============================================

model Artifact {
  id              String       @id @default(cuid())
  threadId        String
  thread          Thread       @relation(fields: [threadId], references: [id], onDelete: Cascade)
  type            ArtifactType
  imageUrl        String?
  thumbnailUrl    String?      // Smaller version for timeline
  metadata        Json?        // Type-specific data (palette colors, etc.)
  isSaved         Boolean      @default(false)
  feedback        Feedback?
  agentPrompt     String?      // Prompt sent to image generation
  agentReasoning  String?      // Agent's reasoning (for context)
  embedding       Unsupported("vector(1536)")?  // For retrieval
  order           Int          @default(autoincrement())
  createdAt       DateTime     @default(now())

  @@index([threadId])
  @@index([isSaved])
  @@index([order])
}

enum ArtifactType {
  IMAGE
  PALETTE
  LAYOUT
  MOOD_BOARD
  JOURNEY_MAP
}

model Feedback {
  id          String   @id @default(cuid())
  artifactId  String   @unique
  artifact    Artifact @relation(fields: [artifactId], references: [id], onDelete: Cascade)
  thumbs      Thumbs?
  stars       Int?     // 1-5
  notes       String?
  annotations Json?    // Drawing data
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Thumbs {
  UP
  DOWN
}
```

## Prisma Client Singleton

```typescript
// src/lib/db/client.ts

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## Query Patterns

### Projects

```typescript
// src/lib/db/projects.ts

import { prisma } from './client';
import { Prisma } from '@prisma/client';

export async function getProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      masterContext: {
        include: {
          elements: {
            where: { type: 'IMAGE' },
            take: 1,
          },
        },
      },
      _count: { select: { threads: true } },
    },
  });
}

export async function getProjectWithContext(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      masterContext: {
        include: {
          elements: {
            orderBy: { createdAt: 'asc' },
            include: {
              connections: true,
            },
          },
        },
      },
      threads: {
        orderBy: { createdAt: 'desc' },
        include: {
          artifacts: {
            orderBy: { order: 'asc' },
            take: 1, // Just first artifact for preview
          },
        },
      },
    },
  });
}

// Type helper for full project data
export type ProjectWithContext = Prisma.PromiseReturnType<typeof getProjectWithContext>;
```

### Threads

```typescript
// src/lib/db/threads.ts

export async function getThreadWithArtifacts(threadId: string) {
  return prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      artifacts: {
        orderBy: { order: 'asc' },
        include: { feedback: true },
      },
      parent: {
        include: {
          artifacts: {
            where: { isSaved: true },
            orderBy: { order: 'desc' },
            take: 5,
          },
        },
      },
    },
  });
}

export async function createThread(data: {
  projectId: string;
  prompt: string;
  parentId?: string;
}) {
  return prisma.thread.create({
    data: {
      projectId: data.projectId,
      prompt: data.prompt,
      parentId: data.parentId,
    },
  });
}

export async function cloneFromArtifact(artifactId: string, newPrompt?: string) {
  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId },
    include: { thread: true },
  });
  
  if (!artifact) throw new Error('Artifact not found');
  
  return prisma.thread.create({
    data: {
      projectId: artifact.thread.projectId,
      parentId: artifact.threadId,
      prompt: newPrompt || artifact.thread.prompt,
      artifacts: {
        create: {
          type: artifact.type,
          imageUrl: artifact.imageUrl,
          thumbnailUrl: artifact.thumbnailUrl,
          metadata: artifact.metadata ?? undefined,
          agentPrompt: artifact.agentPrompt,
        },
      },
    },
    include: {
      artifacts: true,
    },
  });
}
```

### Artifacts with Priority

```typescript
// src/lib/db/artifacts.ts

export async function getArtifactsForContext(
  threadId: string,
  options: { recentWindow: number }
) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      artifacts: {
        orderBy: { order: 'desc' },
        include: { feedback: true },
      },
    },
  });
  
  if (!thread) return null;
  
  // Categorize by priority
  const saved: Artifact[] = [];
  const withFeedback: Artifact[] = [];
  const recent: Artifact[] = [];
  const older: Artifact[] = [];
  
  thread.artifacts.forEach((artifact, index) => {
    if (artifact.isSaved) {
      saved.push(artifact);
    } else if (artifact.feedback) {
      withFeedback.push(artifact);
    } else if (index < options.recentWindow) {
      recent.push(artifact);
    } else {
      older.push(artifact);
    }
  });
  
  return { saved, withFeedback, recent, older, threadPrompt: thread.prompt };
}

export async function saveArtifact(artifactId: string, saved: boolean) {
  return prisma.artifact.update({
    where: { id: artifactId },
    data: { isSaved: saved },
  });
}

export async function addFeedback(artifactId: string, data: {
  thumbs?: 'UP' | 'DOWN';
  stars?: number;
  notes?: string;
  annotations?: unknown;
}) {
  return prisma.feedback.upsert({
    where: { artifactId },
    create: { artifactId, ...data },
    update: data,
  });
}
```

### Vector Operations

```typescript
// src/lib/db/vectors.ts

import { prisma } from './client';

export async function storeEmbedding(
  table: 'ContextElement' | 'Artifact',
  id: string,
  embedding: number[]
) {
  const vectorString = `[${embedding.join(',')}]`;
  
  if (table === 'ContextElement') {
    await prisma.$executeRaw`
      UPDATE "ContextElement" 
      SET embedding = ${vectorString}::vector 
      WHERE id = ${id}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE "Artifact" 
      SET embedding = ${vectorString}::vector 
      WHERE id = ${id}
    `;
  }
}

export async function findSimilarContextElements(
  masterContextId: string,
  queryEmbedding: number[],
  limit: number = 5
) {
  const vectorString = `[${queryEmbedding.join(',')}]`;
  
  return prisma.$queryRaw<Array<{ id: string; content: string; similarity: number }>>`
    SELECT id, content, 1 - (embedding <=> ${vectorString}::vector) as similarity
    FROM "ContextElement"
    WHERE "masterContextId" = ${masterContextId}
      AND embedding IS NOT NULL
      AND "isOutOfContext" = false
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `;
}
```

## Migration Workflow

```bash
# Create migration after schema changes
npx prisma migrate dev --name descriptive_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

## Indexing Strategy

Always add indexes for:
- Foreign keys (Prisma doesn't auto-create these)
- Fields used in WHERE clauses
- Fields used in ORDER BY
- Composite indexes for common query patterns

```prisma
// Example: Optimize artifact queries
model Artifact {
  // ... fields ...
  
  @@index([threadId, order])           // Timeline queries
  @@index([threadId, isSaved])         // Saved artifact queries
  @@index([threadId, createdAt])       // Recent artifacts
}
```

## Transactions

Use transactions for multi-step operations:

```typescript
export async function revertThread(threadId: string, toArtifactId: string) {
  return prisma.$transaction(async (tx) => {
    // Get the artifact's order
    const artifact = await tx.artifact.findUnique({
      where: { id: toArtifactId },
    });
    
    if (!artifact || artifact.threadId !== threadId) {
      throw new Error('Invalid artifact');
    }
    
    // Delete all artifacts after this one
    await tx.artifact.deleteMany({
      where: {
        threadId,
        order: { gt: artifact.order },
      },
    });
    
    // Update thread timestamp
    return tx.thread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
      include: { artifacts: true },
    });
  });
}
```

## Soft Deletes (Optional Pattern)

If we want to keep deleted data for recovery:

```prisma
model Artifact {
  // ... existing fields ...
  deletedAt DateTime?
  
  @@index([deletedAt])
}
```

```typescript
// Soft delete
await prisma.artifact.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Query excludes deleted by default
const activeArtifacts = await prisma.artifact.findMany({
  where: { threadId, deletedAt: null },
});
```

## What NOT to Do

- Don't use raw SQL unless necessary (vectors are an exception)
- Don't forget to handle cascade deletes properly
- Don't store large blobs in Postgres—use S3 and store URLs
- Don't skip migrations—always use `prisma migrate`
- Don't query inside loops—use `include` or batch queries
- Don't forget indexes on foreign keys
- Don't store embeddings without the pgvector extension enabled
