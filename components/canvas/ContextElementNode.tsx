"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import type { ContextElement } from "@/types";

interface ContextElementNodeData {
  element: ContextElement;
  onUpdate?: () => void;
}

export const ContextElementNode = memo(({ data }: NodeProps<ContextElementNodeData>) => {
  const { element, onUpdate } = data;
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(element.label || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingLabel]);

  async function handleSaveLabel() {
    if (labelValue === element.label) {
      setIsEditingLabel(false);
      return;
    }

    try {
      await fetch(`/api/context-elements/${element.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: labelValue }),
      });
      setIsEditingLabel(false);

      // Trigger parent refresh to update the element data
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to update label:", error);
      setLabelValue(element.label || "");
      setIsEditingLabel(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveLabel();
    } else if (e.key === "Escape") {
      setLabelValue(element.label || "");
      setIsEditingLabel(false);
    }
  }

  // Render images with magazine-style captions
  if (element.type === "IMAGE") {
    return (
      <div className="group">
        <Handle type="target" position={Position.Top} className="opacity-0" />

        <div className="space-y-1">
          {/* Image */}
          <img
            src={element.content}
            alt={element.label || "Context image"}
            className="w-[300px] h-auto object-contain shadow-sm"
          />

          {/* Editable Caption */}
          {isEditingLabel ? (
            <input
              ref={inputRef}
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleSaveLabel}
              onKeyDown={handleKeyDown}
              className="text-xs text-gray-600 italic max-w-[300px] bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-600 nodrag"
              placeholder="Add caption..."
            />
          ) : (
            <div
              onClick={() => setIsEditingLabel(true)}
              className="text-xs text-gray-600 italic max-w-[300px] cursor-text hover:text-gray-800 transition-colors"
            >
              {element.label || "Click to add caption..."}
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  // Render text/note elements with minimal styling
  return (
    <div className="group">
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div className="bg-yellow-50 shadow-sm p-3 min-w-[200px] max-w-[300px]">
        {/* Editable Label */}
        {isEditingLabel ? (
          <input
            ref={inputRef}
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={handleSaveLabel}
            onKeyDown={handleKeyDown}
            className="font-medium text-sm mb-2 w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-600 nodrag"
            placeholder="Add title..."
          />
        ) : (
          <div
            onClick={() => setIsEditingLabel(true)}
            className="font-medium text-sm mb-2 cursor-text hover:text-gray-800 transition-colors"
          >
            {element.label || "Click to add title..."}
          </div>
        )}

        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {element.content.substring(0, 200)}
          {element.content.length > 200 && "..."}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});

ContextElementNode.displayName = "ContextElementNode";
