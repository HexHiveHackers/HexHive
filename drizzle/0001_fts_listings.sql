CREATE VIRTUAL TABLE listings_fts USING fts5(
  listing_id UNINDEXED,
  type UNINDEXED,
  status UNINDEXED,
  title,
  description
);
--> statement-breakpoint
CREATE TRIGGER listings_fts_ai AFTER INSERT ON listing BEGIN
  INSERT INTO listings_fts(rowid, listing_id, type, status, title, description)
  VALUES (
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts) + 1,
    NEW.id, NEW.type, NEW.status, NEW.title, NEW.description
  );
END;
--> statement-breakpoint
CREATE TRIGGER listings_fts_au AFTER UPDATE ON listing BEGIN
  DELETE FROM listings_fts WHERE listing_id = OLD.id;
  INSERT INTO listings_fts(rowid, listing_id, type, status, title, description)
  VALUES (
    (SELECT COALESCE(MAX(rowid), 0) FROM listings_fts) + 1,
    NEW.id, NEW.type, NEW.status, NEW.title, NEW.description
  );
END;
--> statement-breakpoint
CREATE TRIGGER listings_fts_ad AFTER DELETE ON listing BEGIN
  DELETE FROM listings_fts WHERE listing_id = OLD.id;
END;
