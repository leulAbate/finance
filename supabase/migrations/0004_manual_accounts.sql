-- Allow accounts to exist without a Plaid institution (manual accounts)
ALTER TABLE accounts ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE accounts ALTER COLUMN plaid_account_id DROP NOT NULL;

-- Drop the unique constraint on plaid_account_id so NULL is allowed multiple times
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_plaid_account_id_key;

-- Re-add unique constraint only for non-null plaid_account_id values
CREATE UNIQUE INDEX accounts_plaid_account_id_unique ON accounts (plaid_account_id) WHERE plaid_account_id IS NOT NULL;

-- Flag to distinguish manual accounts from Plaid-synced ones
ALTER TABLE accounts ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT FALSE;
