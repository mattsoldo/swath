import { ContextItem, PRIORITY } from "@/types";
import type {
  MasterContext,
  ContextElement,
  Artifact,
  Thread,
  Priority,
} from "@/types";
import { swatchConfig } from "@/config/swatch.config";

/**
 * Estimates token count for text (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Priority mapping from database enum to numeric priority
 */
const PRIORITY_MAP: Record<Priority, number> = {
  MUST_HAVE: PRIORITY.MUST_HAVE_CONTEXT,
  IMPORTANT: PRIORITY.IMPORTANT_CONTEXT,
  NICE_TO_HAVE: PRIORITY.NICE_TO_HAVE,
  INSPIRATION: PRIORITY.INSPIRATION,
};

export interface BuildContextInput {
  thread: Thread & {
    artifacts: (Artifact & { feedback?: any })[];
  };
  masterContext?: MasterContext & {
    elements: ContextElement[];
  };
  maxTokens?: number;
}

export interface BuildContextOutput {
  contextItems: ContextItem[];
  totalTokens: number;
  compressionApplied: boolean;
}

export class ContextBuilder {
  /**
   * Builds prioritized context for agent operations
   */
  buildContext(input: BuildContextInput): BuildContextOutput {
    const { thread, masterContext, maxTokens = swatchConfig.maxContextTokens } = input;
    const items: ContextItem[] = [];

    // 1. Thread prompt (Tier 0 - always present, never compressed)
    items.push({
      content: `Current Thread Purpose: ${thread.prompt}`,
      priority: PRIORITY.THREAD_PROMPT,
      tokens: estimateTokens(thread.prompt),
      source: "thread_prompt",
    });

    // 2. Saved artifacts (Tier 0)
    const savedArtifacts = thread.artifacts.filter((a) => a.isSaved);
    savedArtifacts.forEach((artifact) => {
      items.push({
        content: this.serializeArtifact(artifact, true),
        priority: PRIORITY.SAVED_ARTIFACT,
        tokens: estimateTokens(this.serializeArtifact(artifact, true)),
        source: "saved_artifact",
      });
    });

    // 3. Master Context elements by priority
    if (masterContext) {
      const activeElements = masterContext.elements.filter((e) => !e.isOutOfContext);

      activeElements.forEach((element) => {
        const serialized = this.serializeContextElement(element);
        items.push({
          content: serialized,
          priority: PRIORITY_MAP[element.priority],
          tokens: estimateTokens(serialized),
          source: this.priorityToSource(element.priority),
        });
      });
    }

    // 4. Artifacts with feedback (Tier 1)
    const artifactsWithFeedback = thread.artifacts.filter(
      (a) => !a.isSaved && a.feedback
    );
    artifactsWithFeedback.forEach((artifact) => {
      items.push({
        content: this.serializeArtifact(artifact, true),
        priority: PRIORITY.ARTIFACT_WITH_FEEDBACK,
        tokens: estimateTokens(this.serializeArtifact(artifact, true)),
        source: "feedback",
      });
    });

    // 5. Recent iterations (Tier 1)
    const recentWindow = swatchConfig.recentIterationsWindow;
    const recentArtifacts = thread.artifacts
      .filter((a) => !a.isSaved && !a.feedback)
      .slice(-recentWindow);

    recentArtifacts.forEach((artifact) => {
      items.push({
        content: this.serializeArtifact(artifact, false),
        priority: PRIORITY.RECENT_ITERATION,
        tokens: estimateTokens(this.serializeArtifact(artifact, false)),
        source: "recent",
      });
    });

    // 6. Older artifacts (Tier 2) - summarized if needed
    const olderArtifacts = thread.artifacts
      .filter((a) => !a.isSaved && !a.feedback)
      .slice(0, -recentWindow);

    olderArtifacts.forEach((artifact) => {
      const summarized = this.summarizeArtifact(artifact);
      items.push({
        content: summarized,
        priority: PRIORITY.OLDER_ARTIFACT,
        tokens: estimateTokens(summarized),
        source: "recent",
      });
    });

    // Sort by priority (ascending - lower number = higher priority)
    items.sort((a, b) => a.priority - b.priority);

    // Check if compression needed
    let totalTokens = items.reduce((sum, item) => sum + item.tokens, 0);
    const compressionThreshold = maxTokens * swatchConfig.compressionThreshold;
    let compressionApplied = false;

    if (totalTokens > compressionThreshold) {
      compressionApplied = true;
      // Trim from lowest priority items first
      const trimmedItems: ContextItem[] = [];
      let runningTotal = 0;

      for (const item of items) {
        if (runningTotal + item.tokens <= maxTokens) {
          trimmedItems.push(item);
          runningTotal += item.tokens;
        } else if (item.priority < PRIORITY.NICE_TO_HAVE) {
          // Never drop Tier 0 or Tier 1 items
          trimmedItems.push(item);
          runningTotal += item.tokens;
        }
      }

      totalTokens = runningTotal;
      return {
        contextItems: trimmedItems,
        totalTokens,
        compressionApplied,
      };
    }

    return {
      contextItems: items,
      totalTokens,
      compressionApplied,
    };
  }

  /**
   * Serializes an artifact for context
   */
  private serializeArtifact(artifact: Artifact, includeFeedback: boolean): string {
    let result = `[Artifact ${artifact.id}]\n`;
    result += `Type: ${artifact.type}\n`;

    if (artifact.imageUrl) {
      result += `Image: ${artifact.imageUrl}\n`;
    }

    if (artifact.agentPrompt) {
      result += `Generated from: ${artifact.agentPrompt}\n`;
    }

    if (artifact.metadata) {
      result += `Metadata: ${JSON.stringify(artifact.metadata)}\n`;
    }

    if (includeFeedback && artifact.feedback) {
      const feedback = artifact.feedback as any;
      if (feedback.thumbs) {
        result += `User feedback: ${feedback.thumbs}\n`;
      }
      if (feedback.stars) {
        result += `Rating: ${feedback.stars}/5\n`;
      }
      if (feedback.notes) {
        result += `Notes: ${feedback.notes}\n`;
      }
    }

    return result;
  }

  /**
   * Summarizes an artifact (for older iterations)
   */
  private summarizeArtifact(artifact: Artifact): string {
    return `[${artifact.type} - ${artifact.id}]: ${artifact.agentPrompt || "No prompt"}`;
  }

  /**
   * Serializes a context element
   */
  private serializeContextElement(element: ContextElement): string {
    let result = `[Context Element - ${element.type}]\n`;

    if (element.label) {
      result += `Label: ${element.label}\n`;
    }

    if (element.purpose) {
      result += `Purpose: ${element.purpose}\n`;
    }

    result += `Priority: ${element.priority}\n`;

    if (element.type === "IMAGE") {
      result += `Image URL: ${element.content}\n`;
    } else {
      result += `Content: ${element.content}\n`;
    }

    return result;
  }

  /**
   * Maps priority enum to context source
   */
  private priorityToSource(priority: Priority): ContextItem["source"] {
    switch (priority) {
      case "MUST_HAVE":
        return "must_have";
      case "IMPORTANT":
        return "important";
      case "NICE_TO_HAVE":
        return "nice_to_have";
      case "INSPIRATION":
        return "inspiration";
    }
  }
}

export const contextBuilder = new ContextBuilder();
