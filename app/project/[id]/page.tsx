"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MasterContextCanvas } from "@/components/canvas/MasterContextCanvas";
import { DesignMode } from "@/components/thread/DesignMode";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";
import type { Project, Thread } from "@/types";

type ViewMode = "context" | "design";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("context");
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [threadDialogOpen, setThreadDialogOpen] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function fetchProject() {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        // Set initial selected thread if not already selected
        if (!selectedThread && data.threads && data.threads.length > 0) {
          setSelectedThread(data.threads[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  }

  // Update selected thread when project threads change (e.g., after creating new thread)
  function handleProjectUpdate() {
    fetchProject().then(() => {
      // After fetching, if we're in design mode and a new thread was created, select it
      if (project?.threads && project.threads.length > 0) {
        const latestThread = project.threads[project.threads.length - 1];
        if (latestThread && (!selectedThread || !project.threads.find((t: Thread) => t.id === selectedThread.id))) {
          setSelectedThread(latestThread);
        }
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => router.push("/projects")}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <UnifiedHeader
        view="project"
        project={project}
        mode={mode}
        onModeChange={setMode}
        selectedThread={selectedThread}
        onThreadChange={setSelectedThread}
        onNewThread={() => setThreadDialogOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "context" ? (
          <MasterContextCanvas project={project} onUpdate={fetchProject} />
        ) : (
          <DesignMode
            project={project}
            onUpdate={handleProjectUpdate}
            selectedThread={selectedThread}
            onThreadChange={setSelectedThread}
            threadDialogOpen={threadDialogOpen}
            onThreadDialogOpenChange={setThreadDialogOpen}
          />
        )}
      </div>
    </div>
  );
}
