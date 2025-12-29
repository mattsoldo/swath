import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// GET /api/projects - List all projects for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        masterContext: {
          include: {
            elements: true,
          },
        },
        threads: {
          include: {
            artifacts: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, userId } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { error: "name and userId are required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        userId,
        masterContext: {
          create: {},
        },
      },
      include: {
        masterContext: {
          include: {
            elements: true,
          },
        },
        threads: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
