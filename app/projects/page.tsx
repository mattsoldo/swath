"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);

  // For demo purposes, using a hard-coded userId
  const userId = "demo-user-1";

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const response = await fetch(`/api/projects?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName, userId }),
      });

      if (response.ok) {
        const project = await response.json();
        setProjects([project, ...projects]);
        setNewProjectName("");
        setOpen(false);
        router.push(`/project/${project.id}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <UnifiedHeader view="projects" onNewProject={() => setOpen(true)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Design Project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createProject();
                  }
                }}
              />
            </div>
            <Button onClick={createProject} disabled={creating || !newProjectName.trim()}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-8">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => setOpen(true)}>Create Your First Project</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {project.status}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
