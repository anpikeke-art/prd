-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('human', 'agent');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "overview" TEXT,
    "tech_stack" JSONB,
    "architecture_text" TEXT,
    "clarification_log" JSONB,
    "owner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "acceptance_criteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'todo',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubFeature" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "sub_feature_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "assigned_to" "ActorType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPConnection" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMP(3),

    CONSTRAINT "MCPConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskEventLog" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor" "ActorType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" JSONB,

    CONSTRAINT "TaskEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_created_at_idx" ON "Project"("created_at");

-- CreateIndex
CREATE INDEX "Feature_project_id_order_idx" ON "Feature"("project_id", "order");

-- CreateIndex
CREATE INDEX "SubFeature_feature_id_order_idx" ON "SubFeature"("feature_id", "order");

-- CreateIndex
CREATE INDEX "Task_sub_feature_id_status_idx" ON "Task"("sub_feature_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MCPConnection_token_hash_key" ON "MCPConnection"("token_hash");

-- CreateIndex
CREATE INDEX "MCPConnection_project_id_idx" ON "MCPConnection"("project_id");

-- CreateIndex
CREATE INDEX "TaskEventLog_task_id_timestamp_idx" ON "TaskEventLog"("task_id", "timestamp");

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubFeature" ADD CONSTRAINT "SubFeature_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sub_feature_id_fkey" FOREIGN KEY ("sub_feature_id") REFERENCES "SubFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPConnection" ADD CONSTRAINT "MCPConnection_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEventLog" ADD CONSTRAINT "TaskEventLog_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
