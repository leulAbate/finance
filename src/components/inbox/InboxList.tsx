"use client"

import { useState } from "react"
import { CheckCircle2, SkipForward } from "lucide-react"
import CategoryPicker from "@/components/transactions/CategoryPicker"

interface Account {
  id: string
  name: string
  type: string
}

interface Transaction {
  id: string
  amount: number
  date: string
  description: string
  merchant_name: string | null
  category: string | null
  custom_category: string | null
  account: Account | Account[] | null
}

interface Props {
  transactions: Transaction[]
}

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function InboxList({ transactions }: Props) {
  const [items, setItems] = useState(transactions)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  function handleCategorized(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }

  function handleSkip(id: string) {
    setSkipped((prev) => new Set(prev).add(id))
  }

  const visible = items.filter((t) => !skipped.has(t.id))
  const skippedItems = items.filter((t) => skipped.has(t.id))

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-24">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <p className="text-lg font-semibold">All caught up</p>
        <p className="text-sm text-muted-foreground">No transactions waiting to be categorized.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-4 max-w-2xl mx-auto w-full">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((transactions.length - visible.length) / transactions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {visible.length} remaining
        </span>
      </div>

      {/* Active items */}
      <div className="space-y-2">
        {visible.map((t) => {
          const account = Array.isArray(t.account) ? t.account[0] : t.account
          const displayName = t.merchant_name || t.description
          return (
            <div
              key={t.id}
              className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3 shadow-sm"
            >
              {/* Icon / initial */}
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(t.date)}{account ? ` · ${account.name}` : ""}
                </p>
              </div>

              {/* Amount */}
              <span className="text-sm font-semibold text-foreground shrink-0">
                {fmt(t.amount)}
              </span>

              {/* Category picker */}
              <CategoryPicker
                transactionId={t.id}
                current={t.custom_category}
                onChanged={() => handleCategorized(t.id)}
              />

              {/* Skip */}
              <button
                onClick={() => handleSkip(t.id)}
                title="Skip for now"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Skipped section */}
      {skippedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Skipped ({skippedItems.length})
          </p>
          {skippedItems.map((t) => {
            const account = Array.isArray(t.account) ? t.account[0] : t.account
            const displayName = t.merchant_name || t.description
            return (
              <div
                key={t.id}
                className="flex items-center gap-4 bg-card/50 border border-border/50 rounded-xl px-4 py-3 opacity-60"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(t.date)}{account ? ` · ${account.name}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0">{fmt(t.amount)}</span>
                <CategoryPicker
                  transactionId={t.id}
                  current={t.custom_category}
                  onChanged={() => handleCategorized(t.id)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
