-- Marktplaats integration: for_sale flag and ad description
ALTER TABLE items ADD COLUMN IF NOT EXISTS for_sale boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ad_description text;
