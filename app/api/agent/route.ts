import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { creativeDirector } from "@/lib/agent/creative-director";

// POST /api/agent - Process user request through Creative Director
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { projectId, threadId, message } = body;

    if (!projectId || !threadId || !message) {
      return new Response(
        JSON.stringify({ error: "projectId, threadId, and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch project with master context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        masterContext: {
          include: {
            elements: true,
          },
        },
      },
    });

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch thread with artifacts
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        artifacts: {
          include: {
            feedback: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!thread) {
      return new Response(
        JSON.stringify({ error: "Thread not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "thinking", message: "Processing your request..." })}\n\n`
            )
          );

          // Process request
          const response = await creativeDirector.processRequest({
            projectId,
            threadId,
            userMessage: message,
            masterContext: project.masterContext || undefined,
            thread,
          });

          // Send status updates
          for (const status of response.status) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(status)}\n\n`)
            );
          }

          // Save artifacts to database
          if (response.artifacts && response.artifacts.length > 0) {
            for (const artifactData of response.artifacts) {
              const savedArtifact = await prisma.artifact.create({
                data: {
                  threadId,
                  type: artifactData.type,
                  imageUrl: artifactData.imageUrl,
                  metadata: artifactData.metadata,
                  agentPrompt: artifactData.agentPrompt,
                },
                include: {
                  feedback: true,
                },
              });

              // Send artifact created event
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "artifact_saved", artifact: savedArtifact })}\n\n`
                )
              );
            }
          }

          // Send completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Agent API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
