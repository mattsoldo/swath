import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// PATCH /api/artifacts/[id] - Update artifact (e.g., save/unsave)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isSaved } = body;

    const artifact = await prisma.artifact.update({
      where: { id },
      data: {
        ...(isSaved !== undefined && { isSaved }),
      },
      include: {
        feedback: true,
      },
    });

    return NextResponse.json(artifact);
  } catch (error) {
    console.error("Error updating artifact:", error);
    return NextResponse.json(
      { error: "Failed to update artifact" },
      { status: 500 }
    );
  }
}
