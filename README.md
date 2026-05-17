# Birr'e — Personal Finance Dashboard

Track your net worth, spending, budgets, and savings goals — with secure, read-only connections to your bank accounts via Plaid.

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Net worth snapshot, income vs. spending chart, recent transactions |
| **Transactions** | Full searchable list with category and account filters |
| **Budgets** | Per-category monthly limits with live progress bars |
| **Accounts** | All connected bank, credit, and investment accounts in one view |
| **Goals** | Savings goals with progress tracking, target dates, and AI advisor |
| **Connections** | Connect and manage bank accounts via Plaid |

---

## Tech Stack

- **Frontend:** Next.js (App Router) + Tailwind CSS + shadcn/ui
- **Charts:** recharts
- **Auth + Database:** Supabase (PostgreSQL + Row Level Security)
- **Financial data:** Plaid API (read-only)
- **AI Advisor:** Claude Sonnet (Anthropic)
- **Deployment:** Vercel

---

## Security Model

Bank connections are **read-only** by design:

- Only Plaid read products enabled: `transactions`, `balance`, `investments`, `liabilities`
- Money-movement products (`payment_initiation`, `transfer`) are never requested
- Plaid access tokens stored server-side only — the browser never sees them
- Column-level database permissions block the client from reading tokens even if RLS is bypassed
- All financial API calls happen in server-only routes
- Every table has Row Level Security: users can only access their own data
- Plaid webhooks are signature-verified before processing

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # login + signup
│   ├── (app)/            # authenticated pages
│   └── api/plaid/        # server-only API routes
├── lib/
│   ├── supabase/         # browser + server clients
│   ├── plaid/            # Plaid client + sync logic
│   └── calculations/     # pure business logic (net worth, cash flow, budgets)
└── components/           # UI components organized by feature
supabase/
└── migrations/           # SQL schema + RLS policies
```

---

## Setup

You will need:
- A [Supabase](https://supabase.com) project
- A [Plaid](https://plaid.com) developer account (sandbox is free)
- An [Anthropic](https://console.anthropic.com) API key
- A [Vercel](https://vercel.com) account for deployment

Copy `.env.example` to `.env.local` and fill in your keys before running locally.
