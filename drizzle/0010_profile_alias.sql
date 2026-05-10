-- Friendly display name shown alongside the @handle. Free-form,
-- non-unique, optional. e.g. profile @soul_8691 with alias "Yak Attack".
ALTER TABLE `profile` ADD COLUMN `alias` text;
