-- External community / source links for a romhack listing. Rendered
-- as their own panel on the listing page; HostIcon picks the glyph.
ALTER TABLE `romhack_meta` ADD COLUMN `discord_url` text;--> statement-breakpoint
ALTER TABLE `romhack_meta` ADD COLUMN `source_url` text;
