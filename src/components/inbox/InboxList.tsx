"use client"

import { useState } from "react"
import { CheckCircle2, SkipForward, Sparkles, RefreshCw } from "lucide-react"
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
  const [suggestions, setSuggestions] = useState<Record<string, { category: string; confidence: number }>>({})
  const [suggesting, setSuggesting] = useState(false)

  function handleCategorized(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id))
    setSuggestions((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleSkip(id: string) {
    setSkipped((prev) => new Set(prev).add(id))
  }

  async function handleAutoSuggest() {
    setSuggesting(true)
    try {
      const res = await fetch("/api/transactions/auto-suggest", { method: "POST" })
      if (!res.ok) return
      const { suggestions: raw } = await res.json()
      const map: Record<string, { category: string; confidence: number }> = {}
      for (const s of raw ?? []) map[s.id] = { category: s.category, confidence: s.confidence }
      setSuggestions(map)
      // Auto-apply high-confidence suggestions (≥ 0.9)
      for (const s of raw ?? []) {
        if (s.confidence >= 0.9) {
          await fetch("/api/transactions/categorize", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction_id: s.id, custom_category: s.category }),
          })
          setItems((prev) => prev.filter((t) => t.id !== s.id))
        }
      }
    } finally {
      setSuggesting(false)
    }
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
    <div className="flex flex-col gap-4 px-6 py-4 max-w-2xl mx-auto w-full">
      {/* Progress + auto-suggest */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((transactions.length - visible.length) / transactions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{visible.length} remaining</span>
        <button
          onClick={handleAutoSuggest}
          disabled={suggesting}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50 whitespace-nowrap"
        >
          {suggesting
            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Thinking…</>
            : <><Sparkles className="w-3.5 h-3.5" /> Auto-suggest all</>
          }
        </button>
      </div>

      {Object.keys(suggestions).length > 0 && (
        <p className="text-xs text-muted-foreground">
          High-confidence ones were auto-applied. Review the rest below — suggestions are pre-filled.
        </p>
      )}

      {/* Active items */}
      <div className="space-y-2">
        {visible.map((t) => {
          const account = Array.isArray(t.account) ? t.account[0] : t.account
          const displayName = t.merchant_name || t.description
          const suggestion = suggestions[t.id]

          return (
            <div
              key={t.id}
              className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3 shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(t.date)}{account ? ` · ${account.name}` : ""}
                </p>
                {suggestion && suggestion.confidence < 0.9 && (
                  <p className="text-xs text-primary mt-0.5">
                    Suggested: {suggestion.category} ({Math.round(suggestion.confidence * 100)}% confident)
                  </p>
                )}
              </div>

              <span className="text-sm font-semibold text-foreground shrink-0">{fmt(t.amount)}</span>

              <CategoryPicker
                transactionId={t.id}
                current={suggestion ? suggestion.category : t.custom_category}
                onChanged={() => handleCategorized(t.id)}
              />

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
              <div key={t.id} className="flex items-center gap-4 bg-card/50 border border-border/50 rounded-xl px-4 py-3 opacity-60">
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
