"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { resolveCategory } from "@/lib/categories/rules"
import CategoryPicker from "./CategoryPicker"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n))

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() - d.getDay()) // back to Sunday
  return d.toISOString().split("T")[0]
}

function groupByWeek(transactions: any[]) {
  const groups: Record<string, any[]> = {}
  for (const t of transactions) {
    const week = getWeekStart(t.date)
    if (!groups[week]) groups[week] = []
    groups[week].push(t)
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtWeek(weekStart: string) {
  return new Date(weekStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const COLS = "grid-cols-[150px_1fr_110px_170px_150px_80px]"
const COL_HEADERS = ["DATE", "INFO", "AMOUNT", "SOURCE", "CATEGORY", "TYPE"]

export default function TransactionList({
  transactions,
  accounts,
}: {
  transactions: any[]
  accounts: { id: string; name: string; mask: string | null }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState("")
  const [account, setAccount] = useState("all")
  const [txns, setTxns] = useState<any[]>(transactions)

  function applyFilters(newSearch: string, newAccount: string) {
    const params = new URLSearchParams()
    if (newSearch) params.set("search", newSearch)
    if (newAccount !== "all") params.set("account", newAccount)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleCategoryChanged(txnId: string, newCategory: string | null) {
    setTxns((prev) => prev.map((t) => t.id === txnId ? { ...t, custom_category: newCategory } : t))
  }

  const weeks = groupByWeek(txns)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filters */}
      <div className="px-8 py-3 border-b border-border/60 flex items-center gap-3 bg-card/50">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              applyFilters(e.target.value, account)
            }}
          />
        </div>
        <Select
          value={account}
          onValueChange={(val) => {
            const v = val ?? "all"
            setAccount(v)
            applyFilters(search, v)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}{a.mask ? ` ••${a.mask}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto">
        {txns.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
            No transactions found
          </div>
        ) : (
          <div>
            {weeks.map(([weekStart, weekTxns]) => {
              const income = weekTxns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
              const out = weekTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
              const net = income - out

              return (
                <div key={weekStart} className="mb-2">
                  {/* Week header */}
                  <div className="flex items-start justify-between px-8 pt-6 pb-3">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Week</p>
                      <p className="text-sm font-semibold mt-0.5">Week of {fmtWeek(weekStart)}</p>
                    </div>
                    <div className="flex items-center gap-5 text-xs tabular-nums pt-0.5">
                      <span>
                        <span className="text-muted-foreground">{fmt(income)} in</span>
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{fmt(out)} out</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={`font-semibold ${net >= 0 ? "text-primary" : "text-red-500"}`}>
                        net {net >= 0 ? "+" : "-"}{fmt(Math.abs(net))}
                      </span>
                    </div>
                  </div>

                  {/* Column headers */}
                  <div className={`grid ${COLS} gap-x-4 px-8 py-2 border-y border-border/40 bg-muted/20`}>
                    {COL_HEADERS.map((h) => (
                      <p key={h} className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                        {h}
                      </p>
                    ))}
                  </div>

                  {/* Rows */}
                  {weekTxns.map((t, i) => {
                    const isIncome = t.amount < 0
                    const resolved = resolveCategory(t)
                    const acct = Array.isArray(t.account) ? t.account[0] : t.account

                    return (
                      <div
                        key={t.id}
                        className={`grid ${COLS} gap-x-4 items-center px-8 py-3 hover:bg-muted/30 transition-colors ${i < weekTxns.length - 1 ? "border-b border-border/30" : ""}`}
                      >
                        {/* Date */}
                        <p className="text-sm text-muted-foreground tabular-nums">{fmtDate(t.date)}</p>

                        {/* Info */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.merchant_name ?? t.description}</p>
                          {t.pending && (
                            <span className="text-xs text-amber-500 font-medium">Pending</span>
                          )}
                        </div>

                        {/* Amount */}
                        <p className={`text-sm font-semibold tabular-nums ${isIncome ? "text-primary" : "text-foreground"}`}>
                          {isIncome ? "+" : ""}{fmt(t.amount)}
                        </p>

                        {/* Source */}
                        <p className="text-sm text-muted-foreground truncate">{acct?.name ?? "—"}</p>

                        {/* Category */}
                        <CategoryPicker
                          transactionId={t.id}
                          current={resolved}
                          showRemove
                          onChanged={(cat) => handleCategoryChanged(t.id, cat)}
                        />

                        {/* Type */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit whitespace-nowrap ${
                          isIncome
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {isIncome ? "income" : "expense"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
