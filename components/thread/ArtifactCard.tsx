"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { Artifact } from "@/types";

interface ArtifactCardProps {
  artifact: Artifact;
  onUpdate: () => void;
}

export function ArtifactCard({ artifact, onUpdate }: ArtifactCardProps) {
  const [saving, setSaving] = useState(false);

  async function handleToggleSave() {
    setSaving(true);
    try {
      await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved: !artifact.isSaved }),
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to toggle save:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-shrink-0 w-64 group">
      <div className="relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        {artifact.type === "IMAGE" && artifact.imageUrl && (
          <img
            src={artifact.imageUrl}
            alt="Generated artifact"
            className="w-full h-48 object-cover"
          />
        )}

        {/* Save Button Overlay */}
        <div className="absolute top-2 right-2">
          <Button
            size="sm"
            variant={artifact.isSaved ? "default" : "secondary"}
            onClick={handleToggleSave}
            disabled={saving}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {artifact.isSaved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Saved Indicator */}
        {artifact.isSaved && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
            Saved
          </div>
        )}

        {/* Metadata */}
        {artifact.agentPrompt && (
          <div className="p-3 bg-white">
            <p className="text-xs text-gray-600 line-clamp-2">
              {artifact.agentPrompt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
