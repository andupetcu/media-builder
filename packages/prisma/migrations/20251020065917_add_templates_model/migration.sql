-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "doc" JSONB NOT NULL DEFAULT '{}',
    "thumbnail" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "templates_team_id_created_at_idx" ON "templates"("team_id", "created_at");

-- CreateIndex
CREATE INDEX "templates_tags_idx" ON "templates" USING GIN ("tags");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
