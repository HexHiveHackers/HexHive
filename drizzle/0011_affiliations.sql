-- Affiliations: groups / projects / communities a user belongs to.
-- Names are unique case-insensitively so multiple users in the same
-- group share one row; each user attaches their own role on the join.
CREATE TABLE `affiliation` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `url` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE UNIQUE INDEX `affiliation_name_unique` ON `affiliation` (lower(`name`));

CREATE TABLE `profile_affiliation` (
  `user_id` text NOT NULL,
  `affiliation_id` text NOT NULL,
  `role` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  PRIMARY KEY (`user_id`, `affiliation_id`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`affiliation_id`) REFERENCES `affiliation`(`id`) ON DELETE CASCADE
);
CREATE INDEX `profile_affiliation_user_idx` ON `profile_affiliation` (`user_id`);
