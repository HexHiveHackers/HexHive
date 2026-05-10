-- Distinguish placeholder users with asset contributions ("contributor")
-- from placeholders we created to track/credit a person without any
-- asset yet ("user"). Real signed-in users (is_placeholder = 0) ignore
-- this field.
ALTER TABLE `user` ADD COLUMN `placeholder_kind` text NOT NULL DEFAULT 'contributor';
