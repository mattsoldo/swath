// Re-export base Prisma types
export type {
  ProjectStatus,
  ElementType,
  Priority,
  ArtifactType,
  Thumbs,
} from "@prisma/client";

import type {
  Project as PrismaProject,
  MasterContext as PrismaMasterContext,
  ContextElement as PrismaContextElement,
  Thread as PrismaThread,
  Artifact as PrismaArtifact,
  Feedback as PrismaFeedback,
} from "@prisma/client";

// Extended types with relations
export type Project = PrismaProject & {
  masterContext?: MasterContext | null;
  threads?: Thread[];
};

export type MasterContext = PrismaMasterContext & {
  elements: ContextElement[];
};

export type ContextElement = PrismaContextElement;

export type Thread = PrismaThread & {
  artifacts?: Artifact[];
};

export type Artifact = PrismaArtifact & {
  feedback?: Feedback | null;
};

export type Feedback = PrismaFeedback;

// Agent types
export interface AgentStatus {
  type: "thinking" | "researching" | "generating" | "artifact" | "divergence" | "complete" | "error";
  message?: string;
  artifact?: any;
  suggestion?: DivergenceSuggestion;
  summary?: string;
  error?: string;
}

export interface DivergenceSuggestion {
  isDivergent: boolean;
  confidence: number;
  suggestedNewPrompt?: string;
}

export interface AgentResponse {
  status: AgentStatus[];
  artifacts?: any[];
}

// Context building types
export interface ContextItem {
  content: string;
  priority: number; // Lower = higher priority
  tokens: number;
  source:
    | "thread_prompt"
    | "saved_artifact"
    | "must_have"
    | "feedback"
    | "recent"
    | "important"
    | "nice_to_have"
    | "inspiration";
}

export const PRIORITY = {
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
