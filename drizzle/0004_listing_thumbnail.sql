-- Add an optional uploader-chosen cover thumbnail to listings.
-- When NULL, queries fall back to the first image file in the current version.
ALTER TABLE listing ADD COLUMN thumbnail_file_id TEXT;
