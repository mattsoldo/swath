"use client";

import { useCallback, useState, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { ContextElementDialog } from "./ContextElementDialog";
import { ContextElementNode } from "./ContextElementNode";
import type { Project, ContextElement } from "@/types";

const nodeTypes = {
  contextElement: ContextElementNode,
};

interface MasterContextCanvasProps {
  project: Project;
  onUpdate: () => void;
}

export function MasterContextCanvas({ project, onUpdate }: MasterContextCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Update nodes when project context elements change
  useEffect(() => {
    if (project.masterContext?.elements) {
      const updatedNodes: Node[] = project.masterContext.elements.map((element: ContextElement) => ({
        id: element.id,
        type: "contextElement",
        position: { x: element.positionX, y: element.positionY },
        data: { element, onUpdate },
      }));
      setNodes(updatedNodes);
    }
  }, [project.masterContext?.elements, setNodes, onUpdate]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  async function handleNodePositionChange(id: string, position: { x: number; y: number }) {
    try {
      await fetch(`/api/context-elements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionX: position.x,
          positionY: position.y,
        }),
      });
    } catch (error) {
      console.error("Failed to update element position:", error);
    }
  }

  async function handleElementCreated() {
    setDialogOpen(false);
    onUpdate();
  }

  async function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    // Check if files were dropped
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Filter for images only
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) return;

    // Get drop position relative to the canvas
    const canvasRect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - canvasRect.left;
    const dropY = e.clientY - canvasRect.top;

    setUploading(true);
    try {
      // Upload files
      const formData = new FormData();
      imageFiles.forEach((file) => {
        formData.append("files", file);
      });

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { urls } = await uploadResponse.json();

      // Create context elements for each uploaded image
      if (urls && urls.length > 0 && project.masterContext?.id) {
        for (let i = 0; i < urls.length; i++) {
          await fetch("/api/context-elements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              masterContextId: project.masterContext.id,
              type: "IMAGE",
              content: urls[i],
              label: imageFiles[i].name,
              purpose: "",
              priority: "IMPORTANT",
              positionX: dropX + i * 50,
              positionY: dropY + i * 50,
            }),
          });
        }

        // Refresh the canvas
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to handle dropped files:", error);
    } finally {
      setUploading(false);
    }
  }

  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleCanvasDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  return (
    <div
      className="flex-1 relative"
      onDrop={handleCanvasDrop}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-lg font-semibold">Drop images here</p>
            <p className="text-sm text-gray-600">to add them to your canvas</p>
          </div>
        </div>
      )}

      {/* Upload indicator */}
      {uploading && (
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4">
          <p className="text-sm">Uploading images...</p>
        </div>
      )}

      <div className="absolute top-4 left-4 z-10 space-x-2">
        <Button onClick={() => setDialogOpen(true)}>Add Element</Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeDragStop={(event, node) => {
          handleNodePositionChange(node.id, node.position);
        }}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>

      <ContextElementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        masterContextId={project.masterContext?.id || ""}
        onCreated={handleElementCreated}
      />
    </div>
  );
}
