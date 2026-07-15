-- DESIGN REVIEW ONLY. NOT APPROVED. NOT EXECUTED.
-- NOT PART OF THE PRISMA MIGRATION CHAIN.
-- After an isolated test-database rehearsal and explicit user approval, generate a new formal migration.
-- This SQL draft is additive and does not activate the E23 V2 route.

CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_members" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "route_packages" (
    "id" TEXT NOT NULL,
    "route_key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "distance_policy" TEXT NOT NULL,
    "declared_distance_meters" INTEGER NOT NULL,
    "start_place" JSONB NOT NULL,
    "end_place" JSONB NOT NULL,
    "package_data" JSONB,
    "content_hash" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "route_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "relay_events" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "route_package_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "manual_entry_policy" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "relay_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_contributions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "accepted_distance_meters" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decision_reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "activity_contributions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "accepted_distance_non_negative" CHECK ("accepted_distance_meters" >= 0)
);

CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");
CREATE UNIQUE INDEX "community_members_community_id_user_id_key" ON "community_members"("community_id", "user_id");
CREATE INDEX "community_members_community_id_status_idx" ON "community_members"("community_id", "status");
CREATE UNIQUE INDEX "route_packages_content_hash_key" ON "route_packages"("content_hash");
CREATE UNIQUE INDEX "route_packages_route_key_version_key" ON "route_packages"("route_key", "version");
CREATE INDEX "route_packages_status_idx" ON "route_packages"("status");
CREATE INDEX "relay_events_community_id_status_idx" ON "relay_events"("community_id", "status");
CREATE UNIQUE INDEX "activity_contributions_event_id_activity_id_key" ON "activity_contributions"("event_id", "activity_id");
CREATE INDEX "activity_contributions_event_id_status_idx" ON "activity_contributions"("event_id", "status");
CREATE INDEX "activity_contributions_event_id_user_id_status_idx" ON "activity_contributions"("event_id", "user_id", "status");
CREATE UNIQUE INDEX "activities_user_id_source_source_activity_id_key" ON "activities"("user_id", "source", "source_activity_id");

ALTER TABLE "community_members"
ADD CONSTRAINT "community_members_community_id_fkey"
FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "community_members"
ADD CONSTRAINT "community_members_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relay_events"
ADD CONSTRAINT "relay_events_community_id_fkey"
FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relay_events"
ADD CONSTRAINT "relay_events_route_package_id_fkey"
FOREIGN KEY ("route_package_id") REFERENCES "route_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activity_contributions"
ADD CONSTRAINT "activity_contributions_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "relay_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activity_contributions"
ADD CONSTRAINT "activity_contributions_activity_id_fkey"
FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activity_contributions"
ADD CONSTRAINT "activity_contributions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
