# UI Agent

You are specialized in building Swatch's user interface—components, layouts, interactions, and styling.

## Your Domain

- React components (Next.js App Router)
- Tailwind CSS styling
- shadcn/ui base components
- Accessibility
- Responsive design
- Animation and micro-interactions

## Tech Stack

```
Next.js 14+ — App Router, Server Components
React 18+ — Client components where needed
Tailwind CSS — Utility-first styling
shadcn/ui — Base component library
Radix UI — Accessible primitives (via shadcn)
framer-motion — Animations
lucide-react — Icons
```

## Key Files You Own

```
src/components/
├── ui/                        # shadcn/ui base components
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   └── ...
├── layout/                    # Layout components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── PageContainer.tsx
├── project/                   # Project-related components
│   ├── ProjectCard.tsx
│   ├── ProjectGrid.tsx
│   └── ProjectStatusBadge.tsx
├── thread/                    # Thread timeline components
│   ├── ThreadTimeline.tsx
│   ├── ThreadPromptDisplay.tsx
│   └── ThreadSelector.tsx
├── artifact/                  # Artifact display components
│   ├── ArtifactCard.tsx
│   ├── ArtifactFeedback.tsx
│   ├── SaveButton.tsx
│   └── AnnotationOverlay.tsx
├── agent/                     # Agent status components
│   ├── AgentStatus.tsx
│   ├── DivergenceDialog.tsx
│   └── NextStepsPanel.tsx
└── shared/                    # Shared/generic components
    ├── LoadingSpinner.tsx
    ├── EmptyState.tsx
    └── ErrorBoundary.tsx

src/app/
├── globals.css                # Tailwind base + custom styles
└── (dashboard)/
    └── layout.tsx             # Dashboard shell
```

## Design System

### Colors

```css
/* globals.css — extend Tailwind with Swatch colors */
@layer base {
  :root {
    /* Swatch brand */
    --swatch-primary: 222 47% 51%;      /* Blue */
    --swatch-secondary: 215 20% 65%;    /* Slate */
    
    /* Priority colors (for context elements) */
    --priority-must-have: 221 83% 53%;  /* Blue */
    --priority-important: 142 71% 45%;  /* Green */
    --priority-nice: 43 96% 56%;        /* Yellow */
    --priority-inspiration: 215 14% 64%; /* Gray */
    
    /* Feedback colors */
    --feedback-positive: 142 71% 45%;
    --feedback-negative: 0 84% 60%;
    
    /* Canvas */
    --canvas-bg: 210 20% 98%;
    --canvas-grid: 214 32% 91%;
  }
  
  .dark {
    --canvas-bg: 222 47% 11%;
    --canvas-grid: 217 33% 17%;
  }
}
```

### Typography

```typescript
// Use Tailwind's default scale, with these conventions:
// - Headings: font-semibold
// - Body: font-normal
// - Labels: text-sm text-muted-foreground
// - Thread prompts: text-lg font-medium

// Font stack (in tailwind.config.js)
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

### Spacing

Follow Tailwind's spacing scale. Common patterns:
- Page padding: `p-6` or `p-8`
- Card padding: `p-4`
- Stack gap: `gap-4` (default), `gap-6` (loose)
- Inline gap: `gap-2`

## Component Patterns

### Server vs Client Components

```typescript
// Default to Server Components
// src/app/(dashboard)/projects/page.tsx
import { getProjectsForUser } from '@/lib/db/projects';

export default async function ProjectsPage() {
  const projects = await getProjectsForUser(userId);
  return <ProjectGrid projects={projects} />;
}

// Use 'use client' only when needed
// src/components/artifact/SaveButton.tsx
'use client';

import { useState } from 'react';

export function SaveButton({ artifactId, initialSaved }: Props) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  // ...
}
```

### Component Structure

```typescript
// src/components/artifact/ArtifactCard.tsx
'use client';

import { cn } from '@/lib/utils';
import { Artifact } from '@prisma/client';
import { SaveButton } from './SaveButton';
import { FeedbackControls } from './FeedbackControls';

interface ArtifactCardProps {
  artifact: Artifact;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function ArtifactCard({
  artifact,
  isSelected = false,
  onSelect,
  className,
}: ArtifactCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card overflow-hidden',
        'transition-all duration-200',
        isSelected && 'ring-2 ring-primary',
        className
      )}
      onClick={onSelect}
    >
      {/* Image */}
      <div className="aspect-square relative">
        <img
          src={artifact.thumbnailUrl || artifact.imageUrl}
          alt=""
          className="object-cover w-full h-full"
        />
        
        {/* Save button - top right */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <SaveButton artifactId={artifact.id} initialSaved={artifact.isSaved} />
        </div>
        
        {/* Saved indicator */}
        {artifact.isSaved && (
          <div className="absolute top-2 left-2">
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
              Saved
            </span>
          </div>
        )}
      </div>
      
      {/* Feedback controls */}
      <div className="p-3 border-t">
        <FeedbackControls artifactId={artifact.id} feedback={artifact.feedback} />
      </div>
    </div>
  );
}
```

### Compound Components

For complex UI with multiple related parts:

```typescript
// src/components/thread/ThreadTimeline.tsx

interface ThreadTimelineProps {
  children: React.ReactNode;
}

function ThreadTimeline({ children }: ThreadTimelineProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {children}
    </div>
  );
}

function ThreadTimelineItem({ artifact, ...props }: ItemProps) {
  return <ArtifactCard artifact={artifact} {...props} />;
}

function ThreadTimelineConnector() {
  return <div className="w-8 flex-shrink-0 flex items-center justify-center">
    <ArrowRight className="text-muted-foreground" />
  </div>;
}

// Compose
ThreadTimeline.Item = ThreadTimelineItem;
ThreadTimeline.Connector = ThreadTimelineConnector;

export { ThreadTimeline };

// Usage
<ThreadTimeline>
  {artifacts.map((artifact, i) => (
    <Fragment key={artifact.id}>
      <ThreadTimeline.Item artifact={artifact} />
      {i < artifacts.length - 1 && <ThreadTimeline.Connector />}
    </Fragment>
  ))}
</ThreadTimeline>
```

## Feedback Components

### Thumbs Up/Down

```typescript
// src/components/artifact/ThumbsFeedback.tsx
'use client';

import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThumbsFeedbackProps {
  value: 'UP' | 'DOWN' | null;
  onChange: (value: 'UP' | 'DOWN' | null) => void;
}

export function ThumbsFeedback({ value, onChange }: ThumbsFeedbackProps) {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onChange(value === 'UP' ? null : 'UP')}
        className={cn(
          'p-2 rounded-md transition-colors',
          value === 'UP'
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
            : 'hover:bg-muted text-muted-foreground'
        )}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange(value === 'DOWN' ? null : 'DOWN')}
        className={cn(
          'p-2 rounded-md transition-colors',
          value === 'DOWN'
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
            : 'hover:bg-muted text-muted-foreground'
        )}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
```

### Star Rating

```typescript
// src/components/artifact/StarRating.tsx
'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  max?: number;
}

export function StarRating({ value, onChange, max = 5 }: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={cn(
              'h-4 w-4 transition-colors',
              value && i < value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}
```

## Agent Status Display

```typescript
// src/components/agent/AgentStatus.tsx
'use client';

import { Loader2, Sparkles, Search, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentStatusProps {
  status: {
    type: 'idle' | 'thinking' | 'researching' | 'generating';
    message?: string;
  };
}

const icons = {
  idle: null,
  thinking: Sparkles,
  researching: Search,
  generating: Image,
};

export function AgentStatus({ status }: AgentStatusProps) {
  if (status.type === 'idle') return null;
  
  const Icon = icons[status.type];
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {Icon && <Icon className="h-4 w-4" />}
        <span>{status.message || 'Working...'}</span>
      </motion.div>
    </AnimatePresence>
  );
}
```

## Divergence Dialog

```typescript
// src/components/agent/DivergenceDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GitBranch } from 'lucide-react';

interface DivergenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: {
    message: string;
    suggestedPrompt: string;
  };
  onStartNewThread: (prompt: string) => void;
  onContinue: () => void;
}

export function DivergenceDialog({
  open,
  onOpenChange,
  suggestion,
  onStartNewThread,
  onContinue,
}: DivergenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Start a new thread?
          </DialogTitle>
          <DialogDescription>
            {suggestion.message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm font-medium mb-2">Suggested new thread:</p>
          <div className="p-3 bg-muted rounded-md text-sm">
            {suggestion.suggestedPrompt}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onContinue}>
            Continue here
          </Button>
          <Button onClick={() => onStartNewThread(suggestion.suggestedPrompt)}>
            Start new thread
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Thread Prompt Display

```typescript
// src/components/thread/ThreadPromptDisplay.tsx

interface ThreadPromptDisplayProps {
  prompt: string;
  className?: string;
}

export function ThreadPromptDisplay({ prompt, className }: ThreadPromptDisplayProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg',
      className
    )}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Thread Goal
      </span>
      <span className="text-sm font-medium">{prompt}</span>
    </div>
  );
}
```

## Accessibility Checklist

For every component:
- [ ] Keyboard navigable (Tab, Enter, Escape, Arrow keys where appropriate)
- [ ] Focus indicators visible
- [ ] ARIA labels on interactive elements without visible text
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Reduced motion preference respected
- [ ] Screen reader tested for meaningful announcements

```typescript
// Example: Accessible icon button
<button
  aria-label="Save to collection"
  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
>
  <Bookmark className="h-4 w-4" />
</button>
```

## Animation Patterns

Use `framer-motion` sparingly for meaningful transitions:

```typescript
// List item animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
  {/* content */}
</motion.div>

// Respect reduced motion
const prefersReducedMotion = usePrefersReducedMotion();

<motion.div
  animate={{ scale: prefersReducedMotion ? 1 : 1.05 }}
>
```

## Loading States

Always provide feedback during async operations:

```typescript
// src/components/shared/LoadingSpinner.tsx
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Usage with Suspense
<Suspense fallback={<LoadingSpinner className="h-64" />}>
  <ProjectGrid />
</Suspense>
```

## What NOT to Do

- Don't use `any` types—properly type all props
- Don't forget dark mode—always test both themes
- Don't use inline styles—use Tailwind utilities
- Don't ignore loading/error states
- Don't make interactive elements too small (min 44x44px touch target)
- Don't rely solely on color to convey information
- Don't animate everything—be intentional
- Don't forget to handle empty states
