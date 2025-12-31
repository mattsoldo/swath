"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Plus } from "lucide-react";
import type { Project, Thread } from "@/types";

type ViewMode = "context" | "design";

interface UnifiedHeaderProps {
  // Current view context
  view: "projects" | "project";

  // Project-specific props (when view === "project")
  project?: Project;
  mode?: ViewMode;
  onModeChange?: (mode: ViewMode) => void;

  // Thread-specific props (when mode === "design")
  selectedThread?: Thread | null;
  onThreadChange?: (thread: Thread) => void;
  onNewThread?: () => void;

  // Projects page props
  onNewProject?: () => void;
}

export function UnifiedHeader({
  view,
  project,
  mode,
  onModeChange,
  selectedThread,
  onThreadChange,
  onNewThread,
  onNewProject,
}: UnifiedHeaderProps) {
  const router = useRouter();

  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-2">
      {/* Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => router.push("/projects")}
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">S</span>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Projects view */}
      {view === "projects" && (
        <>
          <span className="font-semibold text-lg">Projects</span>
          <div className="flex-1" />
          {onNewProject && (
            <Button size="sm" onClick={onNewProject}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </>
      )}

      {/* Project view */}
      {view === "project" && project && (
        <>
          {/* Back to Projects */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/projects")}
          >
            <ChevronLeft className="h-4 w-4" />
            Projects
          </Button>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Project Name */}
          <span className="font-semibold truncate max-w-[200px]" title={project.name}>
            {project.name}
          </span>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Mode Tabs */}
          {onModeChange && (
            <div className="flex items-center bg-muted rounded-md p-1">
              <button
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  mode === "context"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onModeChange("context")}
              >
                Context
              </button>
              <button
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  mode === "design"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onModeChange("design")}
              >
                Design
              </button>
            </div>
          )}

          {/* Thread Picker - only in design mode */}
          {mode === "design" && project.threads && project.threads.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6 mx-2" />

              <Select
                value={selectedThread?.id || ""}
                onValueChange={(threadId) => {
                  const thread = project.threads?.find((t: Thread) => t.id === threadId);
                  if (thread && onThreadChange) {
                    onThreadChange(thread);
                  }
                }}
              >
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Select thread" />
                </SelectTrigger>
                <SelectContent>
                  {project.threads.map((thread: Thread) => (
                    <SelectItem key={thread.id} value={thread.id}>
                      <span className="truncate">
                        {thread.prompt.substring(0, 35)}
                        {thread.prompt.length > 35 && "..."}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <div className="flex-1" />

          {/* New Thread button - only in design mode */}
          {mode === "design" && onNewThread && (
            <Button size="sm" onClick={onNewThread}>
              <Plus className="h-4 w-4 mr-2" />
              New Thread
            </Button>
          )}
        </>
      )}
    </header>
  );
}
