"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ThreadCreationDialog } from "./ThreadCreationDialog";
import { ThreadTimeline } from "./ThreadTimeline";
import { ChatInterface } from "./ChatInterface";
import type { Project, Thread } from "@/types";

interface DesignModeProps {
  project: Project;
  onUpdate: () => void;
}

export function DesignMode({ project, onUpdate }: DesignModeProps) {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(
    project.threads && project.threads.length > 0 ? project.threads[0] : null
  );
  const [creationDialogOpen, setCreationDialogOpen] = useState(false);

  async function handleThreadCreated() {
    setCreationDialogOpen(false);
    await onUpdate();

    // Select the newly created thread
    const response = await fetch(`/api/projects/${project.id}`);
    if (response.ok) {
      const updatedProject = await response.json();
      if (updatedProject.threads && updatedProject.threads.length > 0) {
        setSelectedThread(updatedProject.threads[updatedProject.threads.length - 1]);
      }
    }
  }

  // Show empty state if no threads exist
  if (!project.threads || project.threads.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">No design threads yet</h3>
            <p className="text-muted-foreground max-w-md">
              Design threads let you explore different ideas and iterations.
              Each thread has a focused purpose defined by a prompt.
            </p>
            <Button onClick={() => setCreationDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Thread
            </Button>
          </div>
        </div>

        <ThreadCreationDialog
          open={creationDialogOpen}
          onOpenChange={setCreationDialogOpen}
          projectId={project.id}
          onCreated={handleThreadCreated}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Thread Navigation */}
      <div className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {project.threads.map((thread) => (
            <Button
              key={thread.id}
              variant={selectedThread?.id === thread.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedThread(thread)}
              className="whitespace-nowrap"
            >
              {thread.prompt.substring(0, 30)}
              {thread.prompt.length > 30 && "..."}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreationDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </Button>
      </div>

      {/* Main Content: Timeline + Chat */}
      {selectedThread && (
        <div className="flex-1 flex flex-col">
          {/* Thread Prompt Display */}
          <div className="px-6 py-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">Thread Focus:</p>
            <p className="font-medium">{selectedThread.prompt}</p>
          </div>

          {/* Timeline */}
          <div className="border-b">
            <ThreadTimeline thread={selectedThread} onUpdate={onUpdate} />
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              project={project}
              thread={selectedThread}
              onUpdate={onUpdate}
            />
          </div>
        </div>
      )}

      <ThreadCreationDialog
        open={creationDialogOpen}
        onOpenChange={setCreationDialogOpen}
        projectId={project.id}
        onCreated={handleThreadCreated}
      />
    </div>
  );
}
