-- Optional free-text pronouns field on the profile, public on the
-- user's profile page. Free-form to accept any combination users want
-- (she/her, they/them, xe/xem, name-as-pronoun, multiple sets, etc).
ALTER TABLE `profile` ADD COLUMN `pronouns` text;
