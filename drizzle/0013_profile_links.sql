-- Free-form list of external profile links (PokéCommunity threads,
-- Patreon, Twitch, Linktree, etc). No verification. Deduped per user
-- case-insensitively on URL.
CREATE TABLE `profile_link` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `url` text NOT NULL,
  `label` text,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_link_user_url_unique` ON `profile_link` (`user_id`, lower(`url`));
--> statement-breakpoint
CREATE INDEX `profile_link_user_idx` ON `profile_link` (`user_id`);
