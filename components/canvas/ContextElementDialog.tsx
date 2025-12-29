"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ElementType, Priority } from "@/types";
import { Upload, X } from "lucide-react";

interface ContextElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterContextId: string;
  onCreated: () => void;
}

export function ContextElementDialog({
  open,
  onOpenChange,
  masterContextId,
  onCreated,
}: ContextElementDialogProps) {
  const [type, setType] = useState<ElementType>("TEXT");
  const [content, setContent] = useState("");
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [priority, setPriority] = useState<Priority>("IMPORTANT");
  const [creating, setCreating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(files: FileList | null) {
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...imageFiles]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFiles(): Promise<string[]> {
    if (uploadedFiles.length === 0) return [];

    setUploading(true);
    try {
      const formData = new FormData();
      uploadedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.urls;
    } catch (error) {
      console.error("Upload error:", error);
      return [];
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    // For images, check if we have uploaded files or a URL
    if (type === "IMAGE") {
      if (uploadedFiles.length === 0 && !content.trim()) {
        return;
      }
    } else if (!content.trim()) {
      return;
    }

    setCreating(true);
    try {
      // Upload files if we have any
      let imageUrls: string[] = [];
      if (type === "IMAGE" && uploadedFiles.length > 0) {
        imageUrls = await uploadFiles();
        if (imageUrls.length === 0) {
          throw new Error("File upload failed");
        }
      } else if (type === "IMAGE" && content.trim()) {
        // User provided a URL
        imageUrls = [content];
      }

      // Create elements for each image URL
      const urls = imageUrls.length > 0 ? imageUrls : [content];
      for (let i = 0; i < urls.length; i++) {
        const response = await fetch("/api/context-elements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            masterContextId,
            type,
            content: urls[i],
            label: urls.length > 1 ? `${label} (${i + 1})` : label,
            purpose,
            priority,
            positionX: Math.random() * 500 + i * 50,
            positionY: Math.random() * 500 + i * 50,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create element");
        }
      }

      // Reset form
      setType("TEXT");
      setContent("");
      setLabel("");
      setPurpose("");
      setPriority("IMPORTANT");
      setUploadedFiles([]);
      onCreated();
    } catch (error) {
      console.error("Failed to create element:", error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Context Element</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as ElementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="IMAGE">Image</SelectItem>
                <SelectItem value="NOTE">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Label (Description)</Label>
            <Input
              id="label"
              placeholder="e.g., Kitchen we're remodeling"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              placeholder="e.g., Interior design style I want to incorporate"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              {type === "IMAGE" ? "Images" : "Content"}
            </Label>
            {type === "IMAGE" ? (
              <div className="space-y-3">
                {/* Drag and drop zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop images here, or click to select
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports multiple images
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Selected files ({uploadedFiles.length}):
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm"
                        >
                          <span className="truncate">{file.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* URL input alternative */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or enter URL
                    </span>
                  </div>
                </div>
                <Input
                  id="content"
                  placeholder="https://example.com/image.jpg"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={uploadedFiles.length > 0}
                />
              </div>
            ) : (
              <Textarea
                id="content"
                placeholder="Enter your content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority Tier</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MUST_HAVE">Must Have</SelectItem>
                <SelectItem value="IMPORTANT">Important</SelectItem>
                <SelectItem value="NICE_TO_HAVE">Nice to Have</SelectItem>
                <SelectItem value="INSPIRATION">Inspiration Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCreate}
            disabled={
              creating ||
              uploading ||
              (type === "IMAGE"
                ? uploadedFiles.length === 0 && !content.trim()
                : !content.trim())
            }
          >
            {uploading
              ? "Uploading..."
              : creating
              ? "Creating..."
              : uploadedFiles.length > 1
              ? `Add ${uploadedFiles.length} Elements`
              : "Add Element"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
