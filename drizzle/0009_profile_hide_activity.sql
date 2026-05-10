-- Per-profile toggle: when true, the user's last-active timestamp is
-- hidden from the public users directory and their own profile page.
-- The underlying data (session.updatedAt) still exists; this only
-- gates display.
ALTER TABLE `profile` ADD COLUMN `hide_activity` integer NOT NULL DEFAULT 0;
