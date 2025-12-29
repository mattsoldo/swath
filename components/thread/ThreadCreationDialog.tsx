"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ThreadCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

export function ThreadCreationDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: ThreadCreationDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!prompt.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: prompt.trim(),
        }),
      });

      if (response.ok) {
        setPrompt("");
        onCreated();
      }
    } catch (error) {
      console.error("Failed to create thread:", error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Design Thread</DialogTitle>
          <DialogDescription>
            Define the focus for this thread. Keep it brief and specific.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Thread Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., Design the kitchen layout, Create a logo for the brand, Design the mobile app home screen"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {prompt.length} characters {prompt.length > 100 && "• Keep it concise!"}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !prompt.trim()}>
              {creating ? "Creating..." : "Create Thread"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
