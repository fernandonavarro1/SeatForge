-- Case-insensitive text for section names and seat rows (hand-written:
-- Prisma does not manage extensions without a preview feature).
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "name" CITEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "row" CITEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sections_venue_id_name_key" ON "sections"("venue_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "seats_section_id_row_number_key" ON "seats"("section_id", "row", "number");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written CHECK constraints: Prisma's schema language cannot express
-- them. They are the database-level backstop for the domain validation in
-- src/venues/domain. Text must be stored already trimmed so the unique
-- indexes compare exactly what the domain compares.
ALTER TABLE "venues" ADD CONSTRAINT "venues_name_check"
    CHECK ("name" <> '' AND "name" = btrim("name"));

ALTER TABLE "sections" ADD CONSTRAINT "sections_name_check"
    CHECK ("name" <> '' AND "name" = btrim("name"));

ALTER TABLE "seats" ADD CONSTRAINT "seats_row_check"
    CHECK ("row" <> '' AND "row" = btrim("row"));

ALTER TABLE "seats" ADD CONSTRAINT "seats_number_check"
    CHECK ("number" > 0);
