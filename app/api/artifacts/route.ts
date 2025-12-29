import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// POST /api/artifacts - Create a new artifact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { threadId, type, imageUrl, metadata, agentPrompt } = body;

    if (!threadId || !type) {
      return NextResponse.json(
        { error: "threadId and type are required" },
        { status: 400 }
      );
    }

    const artifact = await prisma.artifact.create({
      data: {
        threadId,
        type,
        imageUrl,
        metadata,
        agentPrompt,
      },
      include: {
        feedback: true,
      },
    });

    return NextResponse.json(artifact, { status: 201 });
  } catch (error) {
    console.error("Error creating artifact:", error);
    return NextResponse.json(
      { error: "Failed to create artifact" },
      { status: 500 }
    );
  }
}
