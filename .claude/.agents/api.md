# API Agent

You are specialized in building Swatch's API layer—Next.js API routes, streaming responses, authentication, and error handling.

## Your Domain

- Next.js App Router API routes
- Server-Sent Events for agent streaming
- Authentication and authorization
- Request validation
- Error handling patterns
- File uploads to S3

## Tech Stack

```
Next.js 14+ — App Router API routes
NextAuth.js — Authentication
zod — Request/response validation
S3 SDK (@aws-sdk/client-s3) — File storage
```

## Key Files You Own

```
src/app/api/
├── auth/
│   └── [...nextauth]/route.ts   # NextAuth handler
├── projects/
│   ├── route.ts                  # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts              # GET, PUT, DELETE
│       └── context/route.ts      # Master context CRUD
├── threads/
│   ├── route.ts                  # POST (create)
│   └── [id]/
│       ├── route.ts              # GET, DELETE
│       ├── clone/route.ts        # POST (clone from artifact)
│       └── revert/route.ts       # POST (revert to artifact)
├── artifacts/
│   └── [id]/
│       ├── route.ts              # GET, DELETE
│       ├── save/route.ts         # POST (toggle save)
│       └── feedback/route.ts     # POST, PUT (feedback)
├── agent/
│   └── route.ts                  # POST (streaming agent)
└── upload/
    └── route.ts                  # POST (file upload)

src/lib/api/
├── auth.ts                       # Auth helpers
├── errors.ts                     # Error classes
├── validation.ts                 # Zod schemas
└── response.ts                   # Response helpers
```

## Authentication Pattern

```typescript
// src/lib/api/auth.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from './errors';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  
  return session.user;
}

export async function requireProjectAccess(projectId: string) {
  const user = await requireAuth();
  
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  
  if (!project || project.userId !== user.id) {
    throw new UnauthorizedError('You do not have access to this project');
  }
  
  return user;
}
```

## Error Handling

```typescript
// src/lib/api/errors.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

// src/lib/api/response.ts

import { NextResponse } from 'next/server';
import { ApiError } from './errors';
import { ZodError } from 'zod';

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  console.error('API Error:', error);
  
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.flatten() },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// Wrapper for route handlers
export function apiHandler<T>(
  handler: (req: Request, context?: any) => Promise<T>
) {
  return async (req: Request, context?: any) => {
    try {
      const result = await handler(req, context);
      return successResponse(result);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
```

## Validation Schemas

```typescript
// src/lib/api/validation.ts

import { z } from 'zod';

// Projects
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED']).optional(),
});

// Threads
export const createThreadSchema = z.object({
  projectId: z.string().cuid(),
  prompt: z.string().min(1).max(500),
  parentId: z.string().cuid().optional(),
});

export const cloneThreadSchema = z.object({
  artifactId: z.string().cuid(),
  newPrompt: z.string().min(1).max(500).optional(),
});

// Feedback
export const feedbackSchema = z.object({
  thumbs: z.enum(['UP', 'DOWN']).nullable().optional(),
  stars: z.number().min(1).max(5).nullable().optional(),
  notes: z.string().max(1000).optional(),
  annotations: z.unknown().optional(),
});

// Agent
export const agentRequestSchema = z.object({
  projectId: z.string().cuid(),
  threadId: z.string().cuid(),
  message: z.string().min(1).max(2000),
});

// Context elements
export const contextElementSchema = z.object({
  type: z.enum(['IMAGE', 'TEXT', 'NOTE', 'LINK']),
  content: z.string(),
  label: z.string().max(200).optional(),
  purpose: z.string().max(200).optional(),
  priority: z.enum(['MUST_HAVE', 'IMPORTANT', 'NICE_TO_HAVE', 'INSPIRATION']),
  isOutOfContext: z.boolean().default(false),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const updateMasterContextSchema = z.object({
  elements: z.array(contextElementSchema),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }).optional(),
});
```

## Standard CRUD Routes

```typescript
// src/app/api/projects/route.ts

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { apiHandler, successResponse } from '@/lib/api/response';
import { createProjectSchema } from '@/lib/api/validation';
import { prisma } from '@/lib/db/client';

// GET /api/projects — List user's projects
export const GET = apiHandler(async () => {
  const user = await requireAuth();
  
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
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
  
  return projects;
});

// POST /api/projects — Create project
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireAuth();
  const body = await req.json();
  const data = createProjectSchema.parse(body);
  
  const project = await prisma.project.create({
    data: {
      ...data,
      userId: user.id,
      masterContext: {
        create: {}, // Create empty master context
      },
    },
    include: {
      masterContext: true,
    },
  });
  
  return project;
});
```

```typescript
// src/app/api/projects/[id]/route.ts

import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/lib/api/auth';
import { apiHandler } from '@/lib/api/response';
import { updateProjectSchema } from '@/lib/api/validation';
import { NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/lib/db/client';

interface RouteContext {
  params: { id: string };
}

// GET /api/projects/[id]
export const GET = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  await requireProjectAccess(params.id);
  
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      masterContext: {
        include: {
          elements: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      threads: {
        orderBy: { updatedAt: 'desc' },
        include: {
          artifacts: {
            orderBy: { order: 'desc' },
            take: 1,
          },
        },
      },
    },
  });
  
  if (!project) throw new NotFoundError('Project');
  
  return project;
});

// PUT /api/projects/[id]
export const PUT = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  await requireProjectAccess(params.id);
  
  const body = await req.json();
  const data = updateProjectSchema.parse(body);
  
  const project = await prisma.project.update({
    where: { id: params.id },
    data,
  });
  
  return project;
});

// DELETE /api/projects/[id]
export const DELETE = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  await requireProjectAccess(params.id);
  
  await prisma.project.delete({
    where: { id: params.id },
  });
  
  return { success: true };
});
```

## Streaming Agent Route

```typescript
// src/app/api/agent/route.ts

import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/lib/api/auth';
import { agentRequestSchema } from '@/lib/api/validation';
import { processRequest } from '@/lib/agent/creative-director';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = agentRequestSchema.parse(body);
    
    await requireProjectAccess(data.projectId);
    
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of processRequest(data)) {
            const sseMessage = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          }
        } catch (error) {
          const errorEvent = {
            type: 'error',
            data: { message: String(error) },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
    
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}
```

## File Upload Route

```typescript
// src/app/api/upload/route.ts

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ error: 'Invalid file type' }, { status: 400 });
    }
    
    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File too large' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop() || 'jpg';
    const key = `uploads/${user.id}/${nanoid()}.${extension}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));
    
    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
    
    return Response.json({ url, key });
    
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

## Thread Operations

```typescript
// src/app/api/threads/[id]/clone/route.ts

import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/lib/api/auth';
import { apiHandler } from '@/lib/api/response';
import { cloneThreadSchema } from '@/lib/api/validation';
import { cloneFromArtifact } from '@/lib/db/threads';
import { prisma } from '@/lib/db/client';

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { artifactId, newPrompt } = cloneThreadSchema.parse(body);
  
  // Verify access to the artifact's project
  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId },
    include: { thread: { include: { project: true } } },
  });
  
  if (!artifact) throw new NotFoundError('Artifact');
  
  await requireProjectAccess(artifact.thread.project.id);
  
  const newThread = await cloneFromArtifact(artifactId, newPrompt);
  
  return newThread;
});
```

```typescript
// src/app/api/threads/[id]/revert/route.ts

import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/lib/api/auth';
import { apiHandler } from '@/lib/api/response';
import { revertThread } from '@/lib/db/threads';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const revertSchema = z.object({
  toArtifactId: z.string().cuid(),
});

interface RouteContext {
  params: { id: string };
}

export const POST = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
    select: { projectId: true },
  });
  
  if (!thread) throw new NotFoundError('Thread');
  
  await requireProjectAccess(thread.projectId);
  
  const body = await req.json();
  const { toArtifactId } = revertSchema.parse(body);
  
  const updatedThread = await revertThread(params.id, toArtifactId);
  
  return updatedThread;
});
```

## Feedback Routes

```typescript
// src/app/api/artifacts/[id]/save/route.ts

export const POST = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const artifact = await prisma.artifact.findUnique({
    where: { id: params.id },
    include: { thread: true },
  });
  
  if (!artifact) throw new NotFoundError('Artifact');
  
  await requireProjectAccess(artifact.thread.projectId);
  
  const updated = await prisma.artifact.update({
    where: { id: params.id },
    data: { isSaved: !artifact.isSaved },
  });
  
  return { isSaved: updated.isSaved };
});
```

```typescript
// src/app/api/artifacts/[id]/feedback/route.ts

export const POST = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const artifact = await prisma.artifact.findUnique({
    where: { id: params.id },
    include: { thread: true },
  });
  
  if (!artifact) throw new NotFoundError('Artifact');
  
  await requireProjectAccess(artifact.thread.projectId);
  
  const body = await req.json();
  const data = feedbackSchema.parse(body);
  
  const feedback = await prisma.feedback.upsert({
    where: { artifactId: params.id },
    create: { artifactId: params.id, ...data },
    update: data,
  });
  
  return feedback;
});
```

## What NOT to Do

- Don't forget to validate all inputs with Zod
- Don't expose internal errors to clients
- Don't skip authorization checks
- Don't use `any` types in route handlers
- Don't forget to close streams properly
- Don't store files locally—use S3
- Don't trust file extensions—validate MIME types
- Don't forget rate limiting (add in production)
