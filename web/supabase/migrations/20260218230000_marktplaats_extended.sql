-- Marktplaats extended: category, price type, bid_from, delivery, multiple photos

-- Price type enum: vast (fixed), bieden (bidding), zie_omschrijving, gratis
DO $$ BEGIN
  CREATE TYPE marktplaats_price_type AS ENUM ('vast', 'bieden', 'zie_omschrijving', 'gratis');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE items ADD COLUMN IF NOT EXISTS marktplaats_category_id text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS marktplaats_category_name text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS price_type marktplaats_price_type DEFAULT 'vast';
ALTER TABLE items ADD COLUMN IF NOT EXISTS bid_from numeric(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS delivery_pickup boolean DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS delivery_shipping boolean DEFAULT false;

-- Multiple photos per item
CREATE TABLE IF NOT EXISTS item_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_item_photos_item ON item_photos(item_id);

-- Backfill: migrate existing items.photo_url into item_photos
INSERT INTO item_photos (item_id, photo_url, sort_order)
SELECT id, photo_url, 0
FROM items
WHERE photo_url IS NOT NULL AND photo_url != ''
  AND NOT EXISTS (SELECT 1 FROM item_photos ip WHERE ip.item_id = items.id);
