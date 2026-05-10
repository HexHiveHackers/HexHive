-- Tracks whether a listing_version row corresponds to a confirmed
-- build (has a hash / surviving artefact / authoritative source) or
-- is an unverified historical entry harvested from changelogs and
-- similar. Defaults true so author-uploaded versions are trusted.
ALTER TABLE `listing_version` ADD COLUMN `verified` integer NOT NULL DEFAULT 1;
