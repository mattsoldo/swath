# Testing Agent

You are specialized in testing Swatch—unit tests, integration tests, and end-to-end tests.

## Your Domain

- Unit tests for utilities and agent logic
- Integration tests for API routes
- Component tests for React components
- E2E tests for critical user flows
- Test fixtures and mocking

## Tech Stack

```
Vitest — Unit and integration tests
React Testing Library — Component tests
Playwright — E2E tests
MSW (Mock Service Worker) — API mocking
Faker.js — Test data generation
```

## Key Files You Own

```
src/
├── lib/
│   └── __tests__/               # Unit tests for lib functions
│       ├── agent/
│       │   ├── context-builder.test.ts
│       │   └── divergence-detector.test.ts
│       └── utils/
├── components/
│   └── __tests__/               # Component tests
│       ├── artifact/
│       │   └── ArtifactCard.test.tsx
│       └── thread/
└── app/
    └── api/
        └── __tests__/           # API integration tests
            ├── projects.test.ts
            └── agent.test.ts

tests/
├── e2e/                         # Playwright E2E tests
│   ├── projects.spec.ts
│   ├── threads.spec.ts
│   └── agent.spec.ts
├── fixtures/                    # Shared test data
│   ├── projects.ts
│   ├── threads.ts
│   └── artifacts.ts
├── mocks/                       # MSW handlers
│   ├── handlers.ts
│   └── server.ts
└── setup.ts                     # Test setup

vitest.config.ts
playwright.config.ts
```

## Configuration

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/types/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// tests/setup.ts

import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server';

// Start MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Test Fixtures

```typescript
// tests/fixtures/projects.ts

import { faker } from '@faker-js/faker';
import { Project, ProjectStatus } from '@prisma/client';

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: faker.string.cuid(),
    name: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    status: 'DRAFT' as ProjectStatus,
    userId: faker.string.cuid(),
    isPublic: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export const mockProjects = {
  empty: createMockProject({ name: 'Empty Project' }),
  withThreads: createMockProject({ name: 'Project With Threads' }),
  approved: createMockProject({ name: 'Approved Project', status: 'APPROVED' }),
};
```

```typescript
// tests/fixtures/threads.ts

import { faker } from '@faker-js/faker';
import { Thread, Artifact, ArtifactType } from '@prisma/client';

export function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: faker.string.cuid(),
    projectId: faker.string.cuid(),
    parentId: null,
    prompt: faker.lorem.sentence(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createMockArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: faker.string.cuid(),
    threadId: faker.string.cuid(),
    type: 'IMAGE' as ArtifactType,
    imageUrl: faker.image.url(),
    thumbnailUrl: faker.image.url(),
    metadata: null,
    isSaved: false,
    agentPrompt: faker.lorem.sentence(),
    agentReasoning: null,
    order: faker.number.int({ min: 1, max: 100 }),
    createdAt: faker.date.past(),
    ...overrides,
  };
}
```

## Unit Tests

### Context Builder

```typescript
// src/lib/agent/__tests__/context-builder.test.ts

import { describe, it, expect, vi } from 'vitest';
import { buildContext, PRIORITY_WEIGHTS } from '../context-builder';
import { createMockThread, createMockArtifact } from '@tests/fixtures/threads';

describe('buildContext', () => {
  describe('priority ordering', () => {
    it('always includes thread prompt regardless of token budget', async () => {
      const thread = createMockThread({ prompt: 'Design the kitchen' });
      thread.artifacts = [
        createMockArtifact({ isSaved: true }),
        createMockArtifact(),
        createMockArtifact(),
      ];
      
      const result = await buildContext({
        thread,
        masterContext: { elements: [] },
        maxTokens: 100, // Very small budget
        recentWindow: 5,
      });
      
      const threadPromptItem = result.contextItems.find(
        item => item.source === 'THREAD_PROMPT'
      );
      
      expect(threadPromptItem).toBeDefined();
      expect(threadPromptItem!.content).toBe('Design the kitchen');
    });
    
    it('prioritizes saved artifacts over recent iterations', async () => {
      const thread = createMockThread();
      const savedArtifact = createMockArtifact({ isSaved: true, order: 1 });
      const recentArtifact = createMockArtifact({ isSaved: false, order: 10 });
      
      thread.artifacts = [savedArtifact, recentArtifact];
      
      const result = await buildContext({
        thread,
        masterContext: { elements: [] },
        maxTokens: 10000,
        recentWindow: 5,
      });
      
      const savedIndex = result.contextItems.findIndex(
        item => item.id === savedArtifact.id
      );
      const recentIndex = result.contextItems.findIndex(
        item => item.id === recentArtifact.id
      );
      
      // Saved should come before recent (lower priority number = higher priority)
      expect(result.contextItems[savedIndex].priority)
        .toBeLessThan(result.contextItems[recentIndex].priority);
    });
    
    it('compresses low-priority items first when over budget', async () => {
      const thread = createMockThread();
      thread.artifacts = Array.from({ length: 20 }, (_, i) =>
        createMockArtifact({ order: i + 1 })
      );
      
      const result = await buildContext({
        thread,
        masterContext: {
          elements: [
            { priority: 'INSPIRATION', content: 'Low priority content' },
            { priority: 'MUST_HAVE', content: 'High priority content' },
          ],
        },
        maxTokens: 5000, // Limited budget
        recentWindow: 5,
      });
      
      // MUST_HAVE should not be compressed
      const mustHaveItem = result.contextItems.find(
        item => item.source === 'MUST_HAVE_CONTEXT'
      );
      expect(mustHaveItem?.canCompress).toBe(false);
    });
  });
  
  describe('token counting', () => {
    it('does not exceed maxTokens', async () => {
      const thread = createMockThread();
      thread.artifacts = Array.from({ length: 50 }, () => createMockArtifact());
      
      const result = await buildContext({
        thread,
        masterContext: { elements: [] },
        maxTokens: 10000,
        recentWindow: 5,
      });
      
      expect(result.tokensUsed).toBeLessThanOrEqual(10000);
    });
  });
});
```

### Divergence Detector

```typescript
// src/lib/agent/__tests__/divergence-detector.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectDivergence } from '../divergence-detector';

// Mock Anthropic client
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

describe('detectDivergence', () => {
  it('detects clear divergence from thread prompt', async () => {
    const threadPrompt = 'Design the kitchen layout';
    const userMessage = 'Now let\'s work on the bedroom furniture';
    
    const result = await detectDivergence(threadPrompt, userMessage, '');
    
    expect(result.isDivergent).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.suggestedNewPrompt).toContain('bedroom');
  });
  
  it('allows on-topic refinements', async () => {
    const threadPrompt = 'Design the kitchen layout';
    const userMessage = 'Make the countertops marble instead of granite';
    
    const result = await detectDivergence(threadPrompt, userMessage, '');
    
    expect(result.isDivergent).toBe(false);
  });
  
  it('suggests appropriate new thread prompt when divergent', async () => {
    const threadPrompt = 'Design the kitchen layout';
    const userMessage = 'I want to see options for the living room sectional';
    
    const result = await detectDivergence(threadPrompt, userMessage, '');
    
    expect(result.suggestedNewPrompt).toBeDefined();
    expect(result.suggestedNewPrompt).toMatch(/living room|sectional/i);
  });
});
```

## Component Tests

```typescript
// src/components/__tests__/artifact/ArtifactCard.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactCard } from '../../artifact/ArtifactCard';
import { createMockArtifact } from '@tests/fixtures/threads';

describe('ArtifactCard', () => {
  it('renders artifact image', () => {
    const artifact = createMockArtifact({ imageUrl: 'https://example.com/image.jpg' });
    
    render(<ArtifactCard artifact={artifact} />);
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', expect.stringContaining('example.com'));
  });
  
  it('shows saved indicator when artifact is saved', () => {
    const artifact = createMockArtifact({ isSaved: true });
    
    render(<ArtifactCard artifact={artifact} />);
    
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });
  
  it('shows save button on hover', async () => {
    const artifact = createMockArtifact({ isSaved: false });
    
    render(<ArtifactCard artifact={artifact} />);
    
    // Save button should be hidden initially
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toHaveClass('opacity-0');
    
    // Hover over card
    const card = screen.getByRole('img').closest('div');
    fireEvent.mouseEnter(card!);
    
    // Save button should be visible
    expect(saveButton).toHaveClass('opacity-100');
  });
  
  it('calls onSelect when clicked', () => {
    const artifact = createMockArtifact();
    const onSelect = vi.fn();
    
    render(<ArtifactCard artifact={artifact} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('img').closest('div')!);
    
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
  
  it('shows selection ring when selected', () => {
    const artifact = createMockArtifact();
    
    render(<ArtifactCard artifact={artifact} isSelected={true} />);
    
    const card = screen.getByRole('img').closest('div');
    expect(card).toHaveClass('ring-2', 'ring-primary');
  });
});
```

```typescript
// src/components/__tests__/thread/ThreadPromptDisplay.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreadPromptDisplay } from '../../thread/ThreadPromptDisplay';

describe('ThreadPromptDisplay', () => {
  it('displays the thread prompt', () => {
    render(<ThreadPromptDisplay prompt="Design the kitchen layout" />);
    
    expect(screen.getByText('Design the kitchen layout')).toBeInTheDocument();
  });
  
  it('shows Thread Goal label', () => {
    render(<ThreadPromptDisplay prompt="Any prompt" />);
    
    expect(screen.getByText('Thread Goal')).toBeInTheDocument();
  });
});
```

## API Integration Tests

```typescript
// src/app/api/__tests__/projects.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '../projects/route';
import { prisma } from '@/lib/db/client';
import { createMockProject } from '@tests/fixtures/projects';

// Mock auth
vi.mock('@/lib/api/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
}));

// Mock Prisma
vi.mock('@/lib/db/client', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('returns user projects', async () => {
    const mockProjects = [createMockProject(), createMockProject()];
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);
    
    const response = await GET(new Request('http://localhost/api/projects'));
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
  });
  
  it('returns empty array when no projects', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);
    
    const response = await GET(new Request('http://localhost/api/projects'));
    const data = await response.json();
    
    expect(data).toEqual([]);
  });
});

describe('POST /api/projects', () => {
  it('creates a new project', async () => {
    const newProject = createMockProject({ name: 'New Project' });
    vi.mocked(prisma.project.create).mockResolvedValue(newProject);
    
    const request = new Request('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project' }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.name).toBe('New Project');
  });
  
  it('validates required fields', async () => {
    const request = new Request('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({}), // Missing name
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(400);
  });
});
```

## E2E Tests

```typescript
// tests/e2e/projects.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    // Login (use test account or mock auth)
    await page.goto('/');
    // ... auth setup
  });
  
  test('can create a new project', async ({ page }) => {
    await page.goto('/projects');
    
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="name"]', 'My Test Project');
    await page.click('button:has-text("Create")');
    
    await expect(page).toHaveURL(/\/project\/[a-z0-9]+/);
    await expect(page.locator('h1')).toContainText('My Test Project');
  });
  
  test('can add elements to master context', async ({ page }) => {
    await page.goto('/project/test-project/context');
    
    // Upload image
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-image.jpg');
    
    // Wait for upload
    await expect(page.locator('[data-testid="context-element"]')).toHaveCount(1);
    
    // Add label
    await page.dblclick('[data-testid="context-element"]');
    await page.fill('input[name="label"]', 'Kitchen reference');
    await page.press('input[name="label"]', 'Enter');
    
    await expect(page.locator('text=Kitchen reference')).toBeVisible();
  });
});

// tests/e2e/agent.spec.ts

test.describe('Agent Interaction', () => {
  test('can generate designs from prompt', async ({ page }) => {
    await page.goto('/project/test-project/design/test-thread');
    
    await page.fill('textarea[name="message"]', 'Create a modern kitchen design');
    await page.click('button:has-text("Send")');
    
    // Should show loading state
    await expect(page.locator('text=Generating')).toBeVisible();
    
    // Should show artifact when complete (with longer timeout for API)
    await expect(page.locator('[data-testid="artifact-card"]')).toBeVisible({
      timeout: 30000,
    });
  });
  
  test('shows divergence dialog when topic changes', async ({ page }) => {
    await page.goto('/project/test-project/design/kitchen-thread');
    
    // Thread is about kitchen, ask about bedroom
    await page.fill('textarea[name="message"]', 'Design the bedroom instead');
    await page.click('button:has-text("Send")');
    
    await expect(page.locator('text=Start a new thread')).toBeVisible();
    
    // Can start new thread
    await page.click('button:has-text("Start new thread")');
    
    await expect(page).toHaveURL(/\/design\/[a-z0-9]+/);
  });
});
```

## MSW Handlers

```typescript
// tests/mocks/handlers.ts

import { http, HttpResponse } from 'msw';
import { createMockProject } from '../fixtures/projects';
import { createMockThread, createMockArtifact } from '../fixtures/threads';

export const handlers = [
  // Projects
  http.get('/api/projects', () => {
    return HttpResponse.json([
      createMockProject({ name: 'Project 1' }),
      createMockProject({ name: 'Project 2' }),
    ]);
  }),
  
  http.post('/api/projects', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(createMockProject(body));
  }),
  
  // Agent (SSE)
  http.post('/api/agent', () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const events = [
          { type: 'status', data: { message: 'Thinking...' } },
          { type: 'status', data: { message: 'Generating...' } },
          { type: 'artifact', data: createMockArtifact() },
          { type: 'complete', data: { message: 'Done!' } },
        ];
        
        events.forEach((event, i) => {
          setTimeout(() => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
            if (i === events.length - 1) controller.close();
          }, i * 100);
        });
      },
    });
    
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }),
];
```

## Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- src/lib/agent/__tests__/context-builder.test.ts

# Run in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e

# Run E2E with UI
npm run test:e2e -- --ui
```

## What NOT to Do

- Don't test implementation details—test behavior
- Don't mock everything—use real implementations where practical
- Don't write flaky tests—use proper async handling
- Don't skip error case tests
- Don't forget to clean up after tests (database, mocks)
- Don't use magic timeouts—use proper waitFor patterns
- Don't commit tests that depend on external services
