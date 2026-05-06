CREATE VIRTUAL TABLE listings_fts_trgm USING fts5(
  listing_id UNINDEXED,
  type       UNINDEXED,
  status     UNINDEXED,
  title,
  description,
  tags,
  categories,
  tokenize = "trigram"
);
--> statement-breakpoint

CREATE TRIGGER listings_fts_trgm_ai AFTER INSERT ON listing BEGIN
  INSERT INTO listings_fts_trgm(
    rowid, listing_id, type, status, title, description, tags, categories
  )
  SELECT
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts_trgm) + 1,
    NEW.id, NEW.type, NEW.status, NEW.title, NEW.description,
    COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)), ''),
    COALESCE(
      (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
      COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
    )
  FROM (SELECT 1) x
  LEFT JOIN romhack_meta rm ON rm.listing_id = NEW.id
  LEFT JOIN script_meta sm ON sm.listing_id = NEW.id;
END;
--> statement-breakpoint

CREATE TRIGGER listings_fts_trgm_au AFTER UPDATE ON listing BEGIN
  DELETE FROM listings_fts_trgm WHERE listing_id = OLD.id;
  INSERT INTO listings_fts_trgm(
    rowid, listing_id, type, status, title, description, tags, categories
  )
  SELECT
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts_trgm) + 1,
    NEW.id, NEW.type, NEW.status, NEW.title, NEW.description,
    COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)), ''),
    COALESCE(
      (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
      COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
    )
  FROM (SELECT 1) x
  LEFT JOIN romhack_meta rm ON rm.listing_id = NEW.id
  LEFT JOIN script_meta sm ON sm.listing_id = NEW.id;
END;
--> statement-breakpoint

CREATE TRIGGER listings_fts_trgm_ad AFTER DELETE ON listing BEGIN
  DELETE FROM listings_fts_trgm WHERE listing_id = OLD.id;
END;
--> statement-breakpoint

INSERT INTO listings_fts_trgm(
  rowid, listing_id, type, status, title, description, tags, categories
)
SELECT
  ROW_NUMBER() OVER (ORDER BY l.created_at),
  l.id, l.type, l.status, l.title, l.description,
  COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)), ''),
  COALESCE(
    (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
    COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
  )
FROM listing l
LEFT JOIN romhack_meta rm ON rm.listing_id = l.id
LEFT JOIN script_meta sm ON sm.listing_id = l.id;
