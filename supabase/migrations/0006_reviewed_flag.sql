ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reviewed BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE transactions SET reviewed = TRUE WHERE amount < 0;
UPDATE transactions SET reviewed = TRUE WHERE custom_category IS NOT NULL;
