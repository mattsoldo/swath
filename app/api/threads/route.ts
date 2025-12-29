import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// POST /api/threads - Create a new thread
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, prompt, parentId } = body;

    if (!projectId || !prompt) {
      return NextResponse.json(
        { error: "projectId and prompt are required" },
        { status: 400 }
      );
    }

    const thread = await prisma.thread.create({
      data: {
        projectId,
        prompt,
        ...(parentId && { parentId }),
      },
      include: {
        artifacts: true,
      },
    });

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("Error creating thread:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}
