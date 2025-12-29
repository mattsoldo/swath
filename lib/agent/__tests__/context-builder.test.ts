import { describe, it, expect } from "vitest";
import { ContextBuilder } from "../context-builder";
import type { Thread, Artifact, MasterContext, ContextElement } from "@/types";

describe("ContextBuilder", () => {
  const builder = new ContextBuilder();

  it("should prioritize thread prompt as highest priority", () => {
    const thread: Thread & { artifacts: Artifact[] } = {
      id: "thread-1",
      projectId: "project-1",
      parentId: null,
      prompt: "Design a modern kitchen",
      artifacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = builder.buildContext({ thread });

    expect(result.contextItems.length).toBeGreaterThan(0);
    expect(result.contextItems[0].source).toBe("thread_prompt");
    expect(result.contextItems[0].priority).toBe(0); // THREAD_PROMPT priority
  });

  it("should include saved artifacts at high priority", () => {
    const thread: Thread & { artifacts: (Artifact & { feedback?: any })[] } = {
      id: "thread-1",
      projectId: "project-1",
      parentId: null,
      prompt: "Design a modern kitchen",
      artifacts: [
        {
          id: "artifact-1",
          threadId: "thread-1",
          type: "IMAGE",
          imageUrl: "https://example.com/image.jpg",
          metadata: null,
          isSaved: true,
          agentPrompt: "Modern kitchen design",
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = builder.buildContext({ thread });

    const savedItems = result.contextItems.filter((item) => item.source === "saved_artifact");
    expect(savedItems.length).toBe(1);
    expect(savedItems[0].priority).toBe(10); // SAVED_ARTIFACT priority
  });

  it("should respect priority tiers from master context", () => {
    const thread: Thread & { artifacts: Artifact[] } = {
      id: "thread-1",
      projectId: "project-1",
      parentId: null,
      prompt: "Design a modern kitchen",
      artifacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const masterContext: MasterContext & { elements: ContextElement[] } = {
      id: "context-1",
      projectId: "project-1",
      elements: [
        {
          id: "element-1",
          masterContextId: "context-1",
          type: "TEXT",
          content: "Brand guidelines",
          label: "Brand Standards",
          purpose: "Ensure brand consistency",
          priority: "MUST_HAVE",
          isOutOfContext: false,
          positionX: 0,
          positionY: 0,
          width: null,
          height: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "element-2",
          masterContextId: "context-1",
          type: "TEXT",
          content: "Design inspiration",
          label: "Mood Board",
          purpose: "Visual inspiration",
          priority: "INSPIRATION",
          isOutOfContext: false,
          positionX: 100,
          positionY: 100,
          width: null,
          height: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = builder.buildContext({ thread, masterContext });

    const mustHave = result.contextItems.find((item) => item.source === "must_have");
    const inspiration = result.contextItems.find((item) => item.source === "inspiration");

    expect(mustHave).toBeDefined();
    expect(inspiration).toBeDefined();
    expect(mustHave!.priority).toBeLessThan(inspiration!.priority);
  });

  it("should exclude elements marked as out of context", () => {
    const thread: Thread & { artifacts: Artifact[] } = {
      id: "thread-1",
      projectId: "project-1",
      parentId: null,
      prompt: "Design a modern kitchen",
      artifacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const masterContext: MasterContext & { elements: ContextElement[] } = {
      id: "context-1",
      projectId: "project-1",
      elements: [
        {
          id: "element-1",
          masterContextId: "context-1",
          type: "TEXT",
          content: "Should be included",
          label: "Active Element",
          purpose: null,
          priority: "IMPORTANT",
          isOutOfContext: false,
          positionX: 0,
          positionY: 0,
          width: null,
          height: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "element-2",
          masterContextId: "context-1",
          type: "TEXT",
          content: "Should be excluded",
          label: "Inactive Element",
          purpose: null,
          priority: "IMPORTANT",
          isOutOfContext: true,
          positionX: 100,
          positionY: 100,
          width: null,
          height: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = builder.buildContext({ thread, masterContext });

    const contents = result.contextItems.map((item) => item.content).join(" ");
    expect(contents).toContain("Should be included");
    expect(contents).not.toContain("Should be excluded");
  });
});
