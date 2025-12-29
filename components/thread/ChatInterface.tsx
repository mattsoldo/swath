"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import type { Project, Thread, AgentStatus } from "@/types";

interface ChatInterfaceProps {
  project: Project;
  thread: Thread;
  onUpdate: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  status?: AgentStatus[];
}

export function ChatInterface({ project, thread, onUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStatus]);

  async function handleSend() {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsProcessing(true);
    setCurrentStatus("Thinking...");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          threadId: thread.id,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Agent request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      const statuses: AgentStatus[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "thinking") {
                  setCurrentStatus(data.message || "Thinking...");
                  statuses.push(data);
                } else if (data.type === "researching") {
                  setCurrentStatus(data.message || "Researching...");
                  statuses.push(data);
                } else if (data.type === "generating") {
                  setCurrentStatus(data.message || "Generating...");
                  statuses.push(data);
                } else if (data.type === "artifact") {
                  setCurrentStatus("Creating artifact...");
                  statuses.push(data);
                } else if (data.type === "complete") {
                  assistantMessage = data.summary || "Done.";
                  setCurrentStatus("");
                } else if (data.type === "error") {
                  assistantMessage = `Error: ${data.error}`;
                  setCurrentStatus("");
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e);
              }
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMessage, status: statuses },
      ]);

      // Refresh to get new artifacts
      onUpdate();
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setIsProcessing(false);
      setCurrentStatus("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>Ask the Creative Director to generate designs, provide feedback, or explore ideas.</p>
            <p className="text-sm mt-2">Try: "Generate a modern kitchen layout" or "Create three color palette options"</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {currentStatus && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-muted-foreground">{currentStatus}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to create or explore..."
            className="resize-none"
            rows={2}
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            size="icon"
            className="flex-shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
