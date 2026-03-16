-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'GENERATING', 'DEPLOYING', 'DONE', 'ERROR');

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "files" JSONB,
    "deployUrl" TEXT,
    "vercelId" TEXT,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);
