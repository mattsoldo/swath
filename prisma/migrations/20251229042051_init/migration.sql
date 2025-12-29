-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "ElementType" AS ENUM ('IMAGE', 'TEXT', 'NOTE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('MUST_HAVE', 'IMPORTANT', 'NICE_TO_HAVE', 'INSPIRATION');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('IMAGE', 'PALETTE', 'LAYOUT', 'MOOD_BOARD', 'TEXT');

-- CreateEnum
CREATE TYPE "Thumbs" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterContext" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextElement" (
    "id" TEXT NOT NULL,
    "masterContextId" TEXT NOT NULL,
    "type" "ElementType" NOT NULL,
    "content" TEXT NOT NULL,
    "label" TEXT,
    "purpose" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'IMPORTANT',
    "isOutOfContext" BOOLEAN NOT NULL DEFAULT false,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "agentPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "thumbs" "Thumbs",
    "stars" SMALLINT,
    "notes" TEXT,
    "annotations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterContext_projectId_key" ON "MasterContext"("projectId");

-- CreateIndex
CREATE INDEX "ContextElement_masterContextId_idx" ON "ContextElement"("masterContextId");

-- CreateIndex
CREATE INDEX "Thread_projectId_idx" ON "Thread"("projectId");

-- CreateIndex
CREATE INDEX "Thread_parentId_idx" ON "Thread"("parentId");

-- CreateIndex
CREATE INDEX "Artifact_threadId_idx" ON "Artifact"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_artifactId_key" ON "Feedback"("artifactId");

-- CreateIndex
CREATE INDEX "Feedback_artifactId_idx" ON "Feedback"("artifactId");

-- AddForeignKey
ALTER TABLE "MasterContext" ADD CONSTRAINT "MasterContext_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextElement" ADD CONSTRAINT "ContextElement_masterContextId_fkey" FOREIGN KEY ("masterContextId") REFERENCES "MasterContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
