// Default categories seeded for new users
export const DEFAULT_CATEGORIES = [
  { name: "Rent & Utilities",      color: "#3B82F6", group_type: "needs",   sort_order: 1 },
  { name: "Loan Payments",         color: "#8B5CF6", group_type: "needs",   sort_order: 2 },
  { name: "Groceries",             color: "#10B981", group_type: "needs",   sort_order: 3 },
  { name: "Eating Out",            color: "#F59E0B", group_type: "wants",   sort_order: 4 },
  { name: "Ride Share",            color: "#6366F1", group_type: "wants",   sort_order: 5 },
  { name: "Misc",                  color: "#94A3B8", group_type: "wants",   sort_order: 6 },
  { name: "Savings & Investments", color: "#22C55E", group_type: "savings", sort_order: 7 },
  { name: "Transfer",              color: "#CBD5E1", group_type: "exclude", sort_order: 8 },
]

// Merchant name rules — checked in order, first match wins
// More specific patterns must come before general ones
const MERCHANT_RULES: { pattern: RegExp; category: string }[] = [
  // Eating out (before general uber/instacart rules)
  { pattern: /uber\s*eats/i,          category: "Eating Out" },
  { pattern: /doordash|door\s*dash/i, category: "Eating Out" },
  { pattern: /grubhub/i,              category: "Eating Out" },
  { pattern: /seamless/i,             category: "Eating Out" },

  // Ride share
  { pattern: /uber/i,                 category: "Ride Share" },
  { pattern: /lyft/i,                 category: "Ride Share" },

  // Groceries
  { pattern: /instacart/i,            category: "Groceries" },
  { pattern: /h[\s-]?e[\s-]?b/i,     category: "Groceries" },
  { pattern: /costco/i,               category: "Groceries" },
  { pattern: /whole\s*foods/i,        category: "Groceries" },
  { pattern: /kroger/i,               category: "Groceries" },
  { pattern: /trader\s*joe/i,         category: "Groceries" },
  { pattern: /walmart/i,              category: "Groceries" },
  { pattern: /target/i,               category: "Groceries" },
  { pattern: /aldi/i,                 category: "Groceries" },
  { pattern: /publix/i,               category: "Groceries" },

  // Savings & investments
  { pattern: /marcus/i,               category: "Savings & Investments" },
  { pattern: /goldman\s*sachs/i,      category: "Savings & Investments" },
  { pattern: /fidelity/i,             category: "Savings & Investments" },
  { pattern: /vanguard/i,             category: "Savings & Investments" },
  { pattern: /charles\s*schwab/i,     category: "Savings & Investments" },
  { pattern: /robinhood/i,            category: "Savings & Investments" },
  { pattern: /betterment/i,           category: "Savings & Investments" },
  { pattern: /wealthfront/i,          category: "Savings & Investments" },

  // Rent & utilities
  { pattern: /allstate/i,             category: "Rent & Utilities" },
  { pattern: /geico/i,                category: "Rent & Utilities" },
  { pattern: /state\s*farm/i,         category: "Rent & Utilities" },
  { pattern: /at&t|verizon|t-mobile|xfinity|spectrum/i, category: "Rent & Utilities" },

  // Misc / subscriptions
  { pattern: /spotify/i,              category: "Misc" },
  { pattern: /netflix/i,              category: "Misc" },
  { pattern: /hbo|max/i,              category: "Misc" },
  { pattern: /hulu/i,                 category: "Misc" },
  { pattern: /disney\+?/i,            category: "Misc" },
  { pattern: /amazon/i,               category: "Misc" },
  { pattern: /apple\.com\/bill/i,     category: "Misc" },

  // Transfers (exclude)
  { pattern: /transfer|zelle|venmo|paypal|cash\s*app/i, category: "Transfer" },
]

// Plaid category fallbacks
const PLAID_FALLBACKS: Record<string, string> = {
  RENT_AND_UTILITIES: "Rent & Utilities",
  LOAN_PAYMENTS:      "Loan Payments",
  FOOD_AND_DRINK:     "Groceries",
  TRANSPORTATION:     "Ride Share",
  ENTERTAINMENT:      "Misc",
  ENTERTAINMENT_AND_RECREATION: "Misc",
  GENERAL_MERCHANDISE: "Misc",
  GENERAL_SERVICES:   "Misc",
  PERSONAL_CARE:      "Misc",
  TRAVEL:             "Misc",
  MEDICAL:            "Misc",
  TRANSFER_OUT:       "Transfer",
  TRANSFER_IN:        "Transfer",
  INCOME:             "Transfer",
  BANK_FEES:          "Misc",
}

export interface MinimalTransaction {
  custom_category?: string | null
  merchant_name?: string | null
  description?: string
  category?: string | null
}

export function resolveCategory(txn: MinimalTransaction): string {
  // 1. User's manual override
  if (txn.custom_category) return txn.custom_category

  // 2. Merchant name rules
  const name = txn.merchant_name ?? txn.description ?? ""
  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(name)) return rule.category
  }

  // 3. Plaid category fallback
  if (txn.category && PLAID_FALLBACKS[txn.category]) {
    return PLAID_FALLBACKS[txn.category]
  }

  return "Misc"
}
