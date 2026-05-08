-- Profile-level user-set contact email. No verification flow; this is a
-- string the user types in for credit / public display. Distinct from
-- user.email which becomes a synthetic OAuth identity placeholder.
ALTER TABLE `profile` ADD COLUMN `contact_email` text;
