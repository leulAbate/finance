"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { Transaction } from "@/types/app"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n))

const categoryColors: Record<string, string> = {
  FOOD_AND_DRINK:       "bg-amber-100 text-amber-700",
  TRANSPORTATION:       "bg-blue-100 text-blue-700",
  ENTERTAINMENT:        "bg-pink-100 text-pink-700",
  GENERAL_MERCHANDISE:  "bg-violet-100 text-violet-700",
  GENERAL_SERVICES:     "bg-indigo-100 text-indigo-700",
  HOME_IMPROVEMENT:     "bg-orange-100 text-orange-700",
  MEDICAL:              "bg-red-100 text-red-700",
  PERSONAL_CARE:        "bg-fuchsia-100 text-fuchsia-700",
  TRAVEL:               "bg-teal-100 text-teal-700",
  INCOME:               "bg-emerald-100 text-emerald-700",
  TRANSFER_IN:          "bg-green-100 text-green-700",
  TRANSFER_OUT:         "bg-slate-100 text-slate-700",
  LOAN_PAYMENTS:        "bg-rose-100 text-rose-700",
  BANK_FEES:            "bg-gray-100 text-gray-700",
  ENTERTAINMENT_AND_RECREATION: "bg-pink-100 text-pink-700",
}

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function groupByDate(transactions: any[]) {
  const groups: Record<string, any[]> = {}
  for (const t of transactions) {
    const key = t.date
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

function formatDateHeader(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00")
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

export default function TransactionList({
  transactions,
  categories,
  accounts,
}: {
  transactions: any[]
  categories: string[]
  accounts: { id: string; name: string; mask: string | null }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [account, setAccount] = useState("all")

  function applyFilters(newSearch: string, newCategory: string, newAccount: string) {
    const params = new URLSearchParams()
    if (newSearch) params.set("search", newSearch)
    if (newCategory !== "all") params.set("category", newCategory)
    if (newAccount !== "all") params.set("account", newAccount)
    router.push(`${pathname}?${params.toString()}`)
  }

  const grouped = groupByDate(transactions)
  const totalIn = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalOut = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filters */}
      <div className="px-8 py-4 border-b border-border/60 flex items-center gap-3 bg-card/50">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              applyFilters(e.target.value, category, account)
            }}
          />
        </div>
        <Select
          value={category}
          onValueChange={(val) => {
            const v = val ?? "all"
            setCategory(v)
            applyFilters(search, v, account)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={account}
          onValueChange={(val) => {
            const v = val ?? "all"
            setAccount(v)
            applyFilters(search, category, v)
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

        {/* Quick totals */}
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-primary font-medium">
            <ArrowDownLeft className="w-3.5 h-3.5" /> {fmt(totalIn)}
          </span>
          <span className="flex items-center gap-1 text-destructive font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> {fmt(totalOut)}
          </span>
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            {grouped.map(([date, txns]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {formatDateHeader(date)}
                </p>
                <div className="space-y-1">
                  {txns.map((t) => {
                    const isIncome = t.amount < 0
                    const catColor = categoryColors[t.category] ?? "bg-muted text-muted-foreground"

                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${catColor}`}>
                          {t.logo_url ? (
                            <img src={t.logo_url} alt="" className="w-6 h-6 rounded object-contain" />
                          ) : (
                            <span>{isIncome ? "↓" : "↑"}</span>
                          )}
                        </div>

                        {/* Name + account */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.merchant_name ?? t.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground truncate">
                              {t.account?.name}
                            </span>
                            {t.category && (
                              <Badge className={`text-xs py-0 px-1.5 font-normal ${catColor}`}>
                                {formatCategory(t.category)}
                              </Badge>
                            )}
                            {t.pending && (
                              <Badge variant="secondary" className="text-xs py-0 px-1.5">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <p className={`text-sm font-semibold tabular-nums shrink-0 ${isIncome ? "text-primary" : "text-foreground"}`}>
                          {isIncome ? "+" : "-"}{fmt(t.amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
