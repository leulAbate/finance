CREATE TABLE custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  group_type TEXT NOT NULL DEFAULT 'wants',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS custom_category TEXT;

ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_categories_owner" ON custom_categories
  FOR ALL USING (auth.uid() = user_id);
