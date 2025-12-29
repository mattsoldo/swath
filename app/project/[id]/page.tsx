"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MasterContextCanvas } from "@/components/canvas/MasterContextCanvas";
import { DesignMode } from "@/components/thread/DesignMode";
import type { Project } from "@/types";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function fetchProject() {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
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
      {/* Header */}
      <div className="border-b px-6 py-4 flex justify-between items-center">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold inline-block ml-4">{project.name}</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Status: {project.status}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="context" className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="context">Master Context</TabsTrigger>
              <TabsTrigger value="design">Design Mode</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="context" className="flex-1 mt-0 data-[state=active]:flex">
            <MasterContextCanvas project={project} onUpdate={fetchProject} />
          </TabsContent>

          <TabsContent value="design" className="flex-1 mt-0 data-[state=active]:flex">
            <DesignMode project={project} onUpdate={fetchProject} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
