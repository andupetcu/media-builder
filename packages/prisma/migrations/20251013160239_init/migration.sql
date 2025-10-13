-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'DESIGNER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FONT', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BulkJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orgs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_members" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "org_member_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_kits" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colors" JSONB NOT NULL DEFAULT '[]',
    "fonts" JSONB NOT NULL DEFAULT '[]',
    "logos" JSONB NOT NULL DEFAULT '[]',
    "rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "hash" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "public_url" TEXT,
    "thumbnail_url" TEXT,
    "proxy_url" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designs" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "DesignStatus" NOT NULL DEFAULT 'DRAFT',
    "doc" JSONB NOT NULL DEFAULT '{}',
    "thumbnail" TEXT,
    "width" INTEGER NOT NULL DEFAULT 1920,
    "height" INTEGER NOT NULL DEFAULT 1080,
    "unit" TEXT NOT NULL DEFAULT 'px',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versions" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "label" TEXT,
    "doc" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pin" JSONB,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_jobs" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "formatters" JSONB NOT NULL DEFAULT '{}',
    "total" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" "BulkJobStatus" NOT NULL DEFAULT 'PENDING',
    "manifest_url" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_plans" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "approvers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "published_url" TEXT,
    "webhook_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "orgs_slug_key" ON "orgs"("slug");

-- CreateIndex
CREATE INDEX "org_members_user_id_idx" ON "org_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_members_org_id_user_id_key" ON "org_members"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "teams_org_id_idx" ON "teams"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_org_id_slug_key" ON "teams"("org_id", "slug");

-- CreateIndex
CREATE INDEX "team_members_org_member_id_idx" ON "team_members"("org_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_org_member_id_key" ON "team_members"("team_id", "org_member_id");

-- CreateIndex
CREATE INDEX "brand_kits_team_id_idx" ON "brand_kits"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_path_key" ON "assets"("path");

-- CreateIndex
CREATE INDEX "assets_team_id_created_at_idx" ON "assets"("team_id", "created_at");

-- CreateIndex
CREATE INDEX "assets_hash_idx" ON "assets"("hash");

-- CreateIndex
CREATE INDEX "assets_tags_idx" ON "assets" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "assets_meta_idx" ON "assets" USING GIN ("meta");

-- CreateIndex
CREATE INDEX "designs_team_id_created_at_idx" ON "designs"("team_id", "created_at");

-- CreateIndex
CREATE INDEX "designs_doc_idx" ON "designs" USING GIN ("doc");

-- CreateIndex
CREATE UNIQUE INDEX "designs_team_id_slug_key" ON "designs"("team_id", "slug");

-- CreateIndex
CREATE INDEX "versions_design_id_created_at_idx" ON "versions"("design_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_design_id_created_at_idx" ON "comments"("design_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- CreateIndex
CREATE INDEX "bulk_jobs_design_id_created_at_idx" ON "bulk_jobs"("design_id", "created_at");

-- CreateIndex
CREATE INDEX "publish_plans_design_id_idx" ON "publish_plans"("design_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_jobs" ADD CONSTRAINT "bulk_jobs_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_plans" ADD CONSTRAINT "publish_plans_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
