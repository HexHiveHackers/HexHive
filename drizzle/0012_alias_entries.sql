-- "Also known as" entries — additional aliases beyond profile.alias
-- (the primary display name). Deduped per user case-insensitively.
CREATE TABLE `alias_entry` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `value` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alias_entry_user_value_unique` ON `alias_entry` (`user_id`, lower(`value`));
--> statement-breakpoint
CREATE INDEX `alias_entry_user_idx` ON `alias_entry` (`user_id`);
