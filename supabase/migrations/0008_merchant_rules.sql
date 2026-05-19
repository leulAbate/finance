-- User-specific learned merchant → category rules
CREATE TABLE IF NOT EXISTS user_merchant_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  merchant_pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, merchant_pattern)
);

ALTER TABLE user_merchant_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant_rules_own" ON user_merchant_rules FOR ALL USING (auth.uid() = user_id);

-- Auto-review existing obvious transfers and income
UPDATE transactions
SET reviewed = TRUE, custom_category = 'Transfer'
WHERE reviewed = FALSE
  AND amount > 0
  AND category IN ('TRANSFER_OUT', 'TRANSFER_IN', 'TRANSFER_ACCOUNT_TRANSFER',
                   'TRANSFER_OUT_ACCOUNT_TRANSFER', 'TRANSFER_IN_ACCOUNT_TRANSFER',
                   'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT', 'TRANSFER_OUT_PAYMENT_PROCESSOR',
                   'TRANSFER_IN_PAYMENT_PROCESSOR');

-- Auto-review income (negative amounts = money coming in)
UPDATE transactions
SET reviewed = TRUE
WHERE reviewed = FALSE AND amount < 0;
