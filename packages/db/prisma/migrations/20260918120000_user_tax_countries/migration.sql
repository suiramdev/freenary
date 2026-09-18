-- Onboarding asked for one country; it now asks which tax jurisdictions the
-- user is subject to, and a person can be resident in several. The answer
-- already on file becomes the single member of the new list.
ALTER TABLE "user" ADD COLUMN "taxCountries" TEXT[];

UPDATE "user" SET "taxCountries" = ARRAY["country"] WHERE "country" IS NOT NULL;

ALTER TABLE "user" DROP COLUMN "country";
