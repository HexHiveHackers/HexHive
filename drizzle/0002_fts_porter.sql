DROP TRIGGER IF EXISTS listings_fts_ai;
--> statement-breakpoint
DROP TRIGGER IF EXISTS listings_fts_au;
--> statement-breakpoint
DROP TRIGGER IF EXISTS listings_fts_ad;
--> statement-breakpoint
DROP TABLE IF EXISTS listings_fts;
--> statement-breakpoint

CREATE VIRTUAL TABLE listings_fts USING fts5(
  listing_id UNINDEXED,
  type       UNINDEXED,
  status     UNINDEXED,
  author_id  UNINDEXED,
  author_username,
  title,
  description,
  tags,
  categories,
  tokenize = "porter unicode61"
);
--> statement-breakpoint

CREATE TRIGGER listings_fts_ai AFTER INSERT ON listing BEGIN
  INSERT INTO listings_fts(
    rowid, listing_id, type, status, author_id, author_username,
    title, description, tags, categories
  )
  SELECT
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts) + 1,
    NEW.id, NEW.type, NEW.status, NEW.author_id,
    COALESCE((SELECT username FROM profile WHERE user_id = NEW.author_id), ''),
    NEW.title, NEW.description,
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

CREATE TRIGGER listings_fts_au AFTER UPDATE ON listing BEGIN
  DELETE FROM listings_fts WHERE listing_id = OLD.id;
  INSERT INTO listings_fts(
    rowid, listing_id, type, status, author_id, author_username,
    title, description, tags, categories
  )
  SELECT
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts) + 1,
    NEW.id, NEW.type, NEW.status, NEW.author_id,
    COALESCE((SELECT username FROM profile WHERE user_id = NEW.author_id), ''),
    NEW.title, NEW.description,
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

CREATE TRIGGER listings_fts_ad AFTER DELETE ON listing BEGIN
  DELETE FROM listings_fts WHERE listing_id = OLD.id;
END;
--> statement-breakpoint

CREATE TRIGGER profile_fts_username_au AFTER UPDATE OF username ON profile BEGIN
  UPDATE listings_fts
     SET author_username = NEW.username
   WHERE author_id = NEW.user_id;
END;
--> statement-breakpoint

CREATE TRIGGER romhack_meta_fts_au AFTER UPDATE ON romhack_meta BEGIN
  UPDATE listings_fts
     SET tags = COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(NEW.tags)), ''),
         categories = COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(NEW.categories)), '')
   WHERE listing_id = NEW.listing_id;
END;
--> statement-breakpoint

CREATE TRIGGER script_meta_fts_au AFTER UPDATE ON script_meta BEGIN
  UPDATE listings_fts
     SET categories = COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(NEW.categories)), '')
   WHERE listing_id = NEW.listing_id;
END;
--> statement-breakpoint

INSERT INTO listings_fts(
  rowid, listing_id, type, status, author_id, author_username,
  title, description, tags, categories
)
SELECT
  ROW_NUMBER() OVER (ORDER BY l.created_at),
  l.id, l.type, l.status, l.author_id,
  COALESCE(p.username, ''),
  l.title, l.description,
  COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.tags)), ''),
  COALESCE(
    (SELECT GROUP_CONCAT(value, ' ') FROM json_each(rm.categories)),
    COALESCE((SELECT GROUP_CONCAT(value, ' ') FROM json_each(sm.categories)), '')
  )
FROM listing l
LEFT JOIN profile p ON p.user_id = l.author_id
LEFT JOIN romhack_meta rm ON rm.listing_id = l.id
LEFT JOIN script_meta sm ON sm.listing_id = l.id;
