import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// POST /api/context-elements - Create a new context element
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      masterContextId,
      type,
      content,
      label,
      purpose,
      priority,
      isOutOfContext,
      positionX,
      positionY,
      width,
      height,
    } = body;

    if (!masterContextId || !type || !content) {
      return NextResponse.json(
        { error: "masterContextId, type, and content are required" },
        { status: 400 }
      );
    }

    const element = await prisma.contextElement.create({
      data: {
        masterContextId,
        type,
        content,
        label,
        purpose,
        priority: priority || "IMPORTANT",
        isOutOfContext: isOutOfContext || false,
        positionX: positionX || 0,
        positionY: positionY || 0,
        width,
        height,
      },
    });

    return NextResponse.json(element, { status: 201 });
  } catch (error) {
    console.error("Error creating context element:", error);
    return NextResponse.json(
      { error: "Failed to create context element" },
      { status: 500 }
    );
  }
}
