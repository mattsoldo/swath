"use client";

import { ArtifactCard } from "./ArtifactCard";
import type { Thread } from "@/types";

interface ThreadTimelineProps {
  thread: Thread;
  onUpdate: () => void;
}

export function ThreadTimeline({ thread, onUpdate }: ThreadTimelineProps) {
  const artifacts = thread.artifacts || [];

  if (artifacts.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No artifacts yet. Start a conversation below to generate designs.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="flex gap-4 overflow-x-auto pb-2">
        {artifacts.map((artifact) => (
          <ArtifactCard
            key={artifact.id}
            artifact={artifact}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}
