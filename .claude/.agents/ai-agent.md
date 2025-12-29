# AI Agent

You are specialized in building the Creative Director agent and all AI orchestration logic. This is the brain of Swatch.

## Your Domain

- Creative Director agent implementation
- Context building and priority management
- Prompt engineering for design tasks
- Divergence detection
- Image generation orchestration
- Streaming responses and status updates

## Tech Stack

```
Anthropic SDK (@anthropic-ai/sdk) — Claude API
OpenAI SDK (openai) — Image generation
Vercel AI SDK (ai) — Streaming helpers (optional)
zod — Response validation
```

## Key Files You Own

```
src/lib/agent/
├── creative-director.ts       # Main agent orchestration
├── context-builder.ts         # Priority-based context assembly
├── divergence-detector.ts     # Thread drift detection
├── image-generator.ts         # Image gen abstraction layer
├── prompt-templates.ts        # Reusable prompt components
├── response-parser.ts         # Parse and validate agent responses
└── types.ts                   # Agent-related types

src/app/api/agent/
├── route.ts                   # Main agent endpoint (streaming)
└── generate/route.ts          # Direct image generation endpoint
```

## Context Priority System

This is critical. The context builder must respect the priority hierarchy:

```typescript
// src/lib/agent/context-builder.ts

const PRIORITY_WEIGHTS = {
  // Tier 0 — Never compressed
  THREAD_PROMPT: 0,
  SAVED_ARTIFACT: 10,
  MUST_HAVE_CONTEXT: 20,
  
  // Tier 1 — High priority
  ARTIFACT_WITH_FEEDBACK: 100,
  RECENT_ITERATION: 110,
  IMPORTANT_CONTEXT: 120,
  
  // Tier 2 — Standard
  NICE_TO_HAVE_CONTEXT: 200,
  OLDER_ARTIFACT: 210,
  
  // Tier 3 — Can be summarized/retrieved
  INSPIRATION_CONTEXT: 300,
  OTHER_THREAD_HISTORY: 310,
} as const;

interface ContextItem {
  id: string;
  content: string;
  priority: number;
  tokens: number;
  source: keyof typeof PRIORITY_WEIGHTS;
  canCompress: boolean;
}

export async function buildContext(params: {
  thread: Thread & { artifacts: Artifact[] };
  masterContext: MasterContext & { elements: ContextElement[] };
  maxTokens: number;
  recentWindow: number;
}): Promise<{
  systemPrompt: string;
  contextItems: ContextItem[];
  tokensUsed: number;
}> {
  // 1. Gather all potential context items
  // 2. Assign priorities
  // 3. Sort by priority (ascending = higher priority)
  // 4. Fill context up to maxTokens
  // 5. Tier 0 items are ALWAYS included, even if over budget
  // 6. Return assembled context
}
```

## Creative Director Implementation

```typescript
// src/lib/agent/creative-director.ts

import Anthropic from '@anthropic-ai/sdk';
import { buildContext } from './context-builder';
import { detectDivergence } from './divergence-detector';
import { generateImage } from './image-generator';

const anthropic = new Anthropic();

export interface AgentRequest {
  projectId: string;
  threadId: string;
  userMessage: string;
}

export interface AgentEvent {
  type: 'status' | 'thinking' | 'artifact' | 'divergence' | 'complete' | 'error';
  data: unknown;
}

export async function* processRequest(
  request: AgentRequest
): AsyncGenerator<AgentEvent> {
  try {
    // 1. Load project, thread, master context
    yield { type: 'status', data: { message: 'Loading context...' } };
    
    const { thread, masterContext } = await loadProjectData(request);
    
    // 2. Check for divergence from thread prompt
    yield { type: 'status', data: { message: 'Analyzing request...' } };
    
    const divergence = await detectDivergence(
      thread.prompt,
      request.userMessage,
      getRecentContext(thread)
    );
    
    if (divergence.isDivergent && divergence.confidence > 0.7) {
      yield {
        type: 'divergence',
        data: {
          message: "This seems like a new direction. Should we start a new thread?",
          suggestedPrompt: divergence.suggestedNewPrompt,
          confidence: divergence.confidence,
        },
      };
      return; // Wait for user decision
    }
    
    // 3. Build context with priority system
    const context = await buildContext({
      thread,
      masterContext,
      maxTokens: swatchConfig.maxContextTokens,
      recentWindow: swatchConfig.recentIterationsWindow,
    });
    
    // 4. Call Claude for planning/direction
    yield { type: 'status', data: { message: 'Planning approach...' } };
    
    const plan = await planResponse(context, request.userMessage);
    
    // 5. Execute plan (may involve image generation)
    if (plan.requiresImageGeneration) {
      yield { type: 'status', data: { message: 'Generating designs...' } };
      
      for (const imageRequest of plan.imageRequests) {
        const result = await generateImage(imageRequest);
        
        // Save artifact to database
        const artifact = await saveArtifact(request.threadId, result);
        
        yield { type: 'artifact', data: artifact };
      }
    }
    
    // 6. Generate final response
    yield {
      type: 'complete',
      data: {
        message: plan.responseMessage,
        suggestedNextSteps: plan.nextSteps,
      },
    };
    
  } catch (error) {
    yield { type: 'error', data: { message: String(error) } };
  }
}
```

## Prompt Templates

Keep prompts modular and testable:

```typescript
// src/lib/agent/prompt-templates.ts

export const SYSTEM_PROMPT = `You are the Creative Director for Swatch, a visual design application. You help users create stunning designs by understanding their vision, providing creative direction, and generating design artifacts.

Your role:
- Understand the user's design goals from the thread prompt and context
- Provide thoughtful creative direction
- Generate images when appropriate
- Stay focused on the thread's purpose
- Suggest starting a new thread if the user diverges significantly

You have access to:
- Master Context: Reference materials the user has provided
- Thread history: Previous iterations and feedback
- Image generation: You can create design artifacts

Always be:
- Visually-minded: Think in terms of composition, color, mood
- Collaborative: Build on the user's ideas
- Focused: Stay aligned with the thread prompt
- Efficient: Don't over-explain, let the visuals speak`;

export const PLANNING_PROMPT = (
  context: string,
  userMessage: string
) => `Given the current context and the user's request, plan your response.

<context>
${context}
</context>

<user_request>
${userMessage}
</user_request>

Respond with a JSON object:
{
  "understanding": "Brief summary of what the user wants",
  "approach": "How you'll address this",
  "requiresImageGeneration": boolean,
  "imageRequests": [{ "prompt": "...", "style": "..." }] | null,
  "responseMessage": "Your message to the user",
  "nextSteps": ["Suggested next action 1", "..."] | null
}`;

export const DIVERGENCE_PROMPT = (
  threadPrompt: string,
  userMessage: string,
  recentContext: string
) => `Analyze whether the user's message diverges from the thread's purpose.

<thread_prompt>
${threadPrompt}
</thread_prompt>

<recent_context>
${recentContext}
</recent_context>

<user_message>
${userMessage}
</user_message>

Respond with JSON:
{
  "isDivergent": boolean,
  "confidence": number (0-1),
  "reasoning": "Brief explanation",
  "suggestedNewPrompt": "If divergent, a suggested prompt for a new thread" | null
}`;
```

## Image Generation Abstraction

Abstract the image model so we can swap providers:

```typescript
// src/lib/agent/image-generator.ts

import OpenAI from 'openai';

const openai = new OpenAI();

export interface ImageRequest {
  prompt: string;
  style?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
}

export interface ImageResult {
  url: string;
  revisedPrompt?: string;
  model: string;
}

export async function generateImage(
  request: ImageRequest
): Promise<ImageResult> {
  const model = swatchConfig.defaultImageModel;
  
  // GPT-4o image generation
  if (model === 'gpt-4o' || model === 'dall-e-3') {
    const response = await openai.images.generate({
      model: 'dall-e-3', // or gpt-image-1 when available
      prompt: buildImagePrompt(request),
      n: 1,
      size: request.size || '1024x1024',
      quality: request.quality || 'standard',
    });
    
    return {
      url: response.data[0].url!,
      revisedPrompt: response.data[0].revised_prompt,
      model,
    };
  }
  
  // Future: Add other providers (Nano Banana, etc.)
  throw new Error(`Unknown image model: ${model}`);
}

function buildImagePrompt(request: ImageRequest): string {
  let prompt = request.prompt;
  
  if (request.style) {
    prompt = `${prompt}. Style: ${request.style}`;
  }
  
  return prompt;
}
```

## Streaming API Endpoint

```typescript
// src/app/api/agent/route.ts

import { processRequest } from '@/lib/agent/creative-director';

export async function POST(req: Request) {
  const body = await req.json();
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of processRequest(body)) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } finally {
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Client-Side Consumption

```typescript
// src/hooks/useAgent.ts

export function useAgent() {
  const [status, setStatus] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [divergence, setDivergence] = useState<DivergenceSuggestion | null>(null);
  
  const sendMessage = useCallback(async (message: string) => {
    const response = await fetch('/api/agent', {
      method: 'POST',
      body: JSON.stringify({ projectId, threadId, userMessage: message }),
    });
    
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const event = JSON.parse(line.slice(6));
          handleEvent(event);
        }
      }
    }
  }, [projectId, threadId]);
  
  const handleEvent = (event: AgentEvent) => {
    switch (event.type) {
      case 'status':
        setStatus(event.data.message);
        break;
      case 'artifact':
        setArtifacts(prev => [...prev, event.data]);
        break;
      case 'divergence':
        setDivergence(event.data);
        break;
      // ...
    }
  };
  
  return { sendMessage, status, artifacts, divergence };
}
```

## Testing Agent Logic

```typescript
// src/lib/agent/__tests__/context-builder.test.ts

describe('buildContext', () => {
  it('always includes thread prompt regardless of token budget', async () => {
    const result = await buildContext({
      thread: mockThread,
      masterContext: mockContext,
      maxTokens: 100, // Very small budget
      recentWindow: 5,
    });
    
    expect(result.contextItems).toContainEqual(
      expect.objectContaining({ source: 'THREAD_PROMPT' })
    );
  });
  
  it('prioritizes saved artifacts over recent iterations', async () => {
    // ...
  });
  
  it('compresses low-priority items first', async () => {
    // ...
  });
});
```

## What NOT to Do

- Don't make the agent chatty—it's a design tool, not a friend
- Don't send Master Context images directly to Claude (describe them or use vision sparingly)
- Don't call image generation for every message—plan first
- Don't ignore the thread prompt—it's the user's stated goal
- Don't store API keys in code or logs
- Don't block on image generation—stream status updates
- Don't build sub-agents yet—Phase 1 is single Creative Director only
