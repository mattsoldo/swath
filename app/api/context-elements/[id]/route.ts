import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// PATCH /api/context-elements/[id] - Update a context element
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const element = await prisma.contextElement.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(element);
  } catch (error) {
    console.error("Error updating context element:", error);
    return NextResponse.json(
      { error: "Failed to update context element" },
      { status: 500 }
    );
  }
}

// DELETE /api/context-elements/[id] - Delete a context element
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.contextElement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting context element:", error);
    return NextResponse.json(
      { error: "Failed to delete context element" },
      { status: 500 }
    );
  }
}
