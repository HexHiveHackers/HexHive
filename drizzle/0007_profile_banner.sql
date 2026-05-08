-- Optional banner image on the profile, animated formats accepted.
-- Same R2-key convention as avatar_key, just larger size cap on the
-- presign side.
ALTER TABLE `profile` ADD COLUMN `banner_key` text;
