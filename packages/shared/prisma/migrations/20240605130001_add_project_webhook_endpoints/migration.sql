-- CreateTable
CREATE TABLE "project_webhook_endpoints" (
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL,
    "url" TEXT NOT NULL,
    "max_api_version" TEXT,
    "event_types" TEXT[],
    "auth" JSONB,
    "analytics" JSONB,

    CONSTRAINT "project_webhook_endpoints_pkey" PRIMARY KEY ("project_id")
);

-- CreateIndex
CREATE INDEX "project_webhook_endpoints_project_id_idx" ON "project_webhook_endpoints"("project_id");

-- AddForeignKey
ALTER TABLE "project_webhook_endpoints" ADD CONSTRAINT "project_webhook_endpoints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
