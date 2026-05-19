"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp
} from "lucide-react"
import { resolveCategory, DEFAULT_CATEGORIES } from "@/lib/categories/rules"
import CategoryPicker from "@/components/transactions/CategoryPicker"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n))

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function isCurrentMonth(month: string) {
  const now = new Date()
  return month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

type Group = "needs" | "wants" | "savings" | "exclude"

const GROUP_LABELS: Record<Group, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
  exclude: "Exclude",
}

const GROUP_COLORS: Record<Group, string> = {
  needs: "bg-blue-100 text-blue-700",
  wants: "bg-amber-100 text-amber-700",
  savings: "bg-emerald-100 text-emerald-700",
  exclude: "bg-muted text-muted-foreground",
}

interface CustomCategory {
  name: string
  color: string
  group_type: string
}

interface Transaction {
  id: string
  amount: number
  category: string | null
  custom_category?: string | null
  description: string
  merchant_name: string | null
  date: string
  pending?: boolean
  account: { id: string; name: string; type: string }[] | null
}

interface Props {
  transactions: Transaction[]
  previousTransactions: { amount: number; category: string | null }[]
  month: string
}

function calcSummary(txns: Transaction[]) {
  const income = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const spending = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const byCategory: Record<string, number> = {}
  const byAccount: Record<string, { name: string; type: string; income: number; spending: number }> = {}

  for (const t of txns) {
    if (t.amount > 0 && t.category) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
    }
    const acct = Array.isArray(t.account) ? t.account[0] : t.account
    if (acct) {
      const key = acct.id
      if (!byAccount[key]) byAccount[key] = { name: acct.name, type: acct.type, income: 0, spending: 0 }
      if (t.amount < 0) byAccount[key].income += Math.abs(t.amount)
      else byAccount[key].spending += t.amount
    }
  }
  return { income, spending, byCategory, byAccount }
}

export default function MonthlyView({ transactions, previousTransactions, month }: Props) {
  const router = useRouter()
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(DEFAULT_CATEGORIES)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [txns, setTxns] = useState(transactions)

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((cats) => {
      if (cats?.length) setCustomCategories(cats)
    })
  }, [])

  function getGroup(catName: string): Group {
    const found = customCategories.find((c) => c.name === catName)
    return (found?.group_type ?? "wants") as Group
  }

  function handleCategoryChanged(txnId: string, newCategory: string | null) {
    setTxns((prev) => prev.map((t) => t.id === txnId ? { ...t, custom_category: newCategory } : t))
  }

  function toggleExpanded(cat: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const curr = calcSummary(txns)
  const prev = calcSummary(previousTransactions.map((t) => ({
    ...t, id: "", description: "", merchant_name: null, date: "", account: []
  })))

  // Build category totals using resolved custom categories
  const categoryTotals: Record<string, number> = {}
  for (const t of txns) {
    if (t.amount > 0) {
      const cat = resolveCategory(t)
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + t.amount
    }
  }
  const categories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)
  const maxSpend = categories[0]?.[1] ?? 1

  const groupTotals: Record<Group, number> = { needs: 0, wants: 0, savings: 0, exclude: 0 }
  for (const [cat, amt] of categories) {
    groupTotals[getGroup(cat)] += amt
  }

  const adjustedSpending = groupTotals.needs + groupTotals.wants
  const adjustedNet = curr.income - adjustedSpending - groupTotals.savings

  function pctChange(curr: number, prev: number) {
    if (prev === 0) return null
    return ((curr - prev) / prev) * 100
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl space-y-6">

        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/monthly?month=${prevMonth(month)}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={() => router.push(`/monthly?month=${nextMonth(month)}`)}
            disabled={isCurrentMonth(month)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Income</p>
              <p className="text-xl font-bold text-primary tabular-nums">{fmt(curr.income)}</p>
              <CompareTag curr={curr.income} prev={prev.income} positiveIsGood />
            </CardContent>
          </Card>
          <Card className="border-destructive/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Spending</p>
              <p className="text-xl font-bold tabular-nums">{fmt(adjustedSpending)}</p>
              <p className="text-xs text-muted-foreground mt-1">Transfers excluded</p>
            </CardContent>
          </Card>
          <Card className={adjustedNet >= 0 ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Net saved</p>
              <p className={`text-xl font-bold tabular-nums ${adjustedNet >= 0 ? "text-primary" : "text-destructive"}`}>
                {adjustedNet >= 0 ? "+" : ""}{fmt(adjustedNet)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{fmt(groupTotals.savings)} to savings</p>
            </CardContent>
          </Card>
        </div>

        {/* Needs / Wants / Savings breakdown */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold mb-1">Budget Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Excludes transfers. Use the group dropdown per category below to recategorize.
            </p>
            <div className="space-y-3">
              {(["needs", "wants", "savings"] as Group[]).map((group) => {
                const amt = groupTotals[group]
                const pct = curr.income > 0 ? (amt / curr.income) * 100 : 0
                return (
                  <div key={group}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs py-0 ${GROUP_COLORS[group]}`}>{GROUP_LABELS[group]}</Badge>
                        <span className="text-xs text-muted-foreground">{pct.toFixed(1)}% of income</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{fmt(amt)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          group === "needs" ? "bg-blue-500" :
                          group === "wants" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {groupTotals.exclude > 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  {fmt(groupTotals.exclude)} excluded (transfers / uncategorized)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category breakdown with expandable rows */}
        <Card>
          <CardContent className="pt-5 pb-2">
            <h3 className="text-sm font-semibold mb-4">Spending by Category</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No spending data for this month.</p>
            ) : (
              <div className="space-y-1">
                {categories.map(([cat, amount]) => {
                  const prevAmt = prev.byCategory[cat] ?? 0
                  const change = pctChange(amount, prevAmt)
                  const barPct = (amount / maxSpend) * 100
                  const isOpen = expanded.has(cat)
                  const catTxns = txns.filter((t) => resolveCategory(t) === cat && t.amount > 0)
                    .sort((a, b) => b.amount - a.amount)

                  return (
                    <div key={cat} className="rounded-xl border border-transparent hover:border-border/60 transition-colors">
                      {/* Category row */}
                      <button
                        onClick={() => toggleExpanded(cat)}
                        className="w-full text-left px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{formatCategory(cat)}</span>
                            {change !== null && (
                              <span className={`text-xs font-medium flex items-center gap-0.5 ${change > 0 ? "text-destructive" : "text-primary"}`}>
                                {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(change).toFixed(0)}%
                              </span>
                            )}
                            {prevAmt === 0 && <Badge variant="secondary" className="text-xs py-0">New</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold tabular-nums">{fmtFull(amount)}</span>
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${barPct}%` }} />
                        </div>
                      </button>

                      {/* Expanded transactions */}
                      {isOpen && (
                        <div className="px-3 pb-3 space-y-2">
                          <div className="flex items-center justify-between pt-1 pb-2 border-b border-border/40">
                            <Badge className={`text-xs py-0 ${GROUP_COLORS[getGroup(cat)]}`}>{GROUP_LABELS[getGroup(cat)]}</Badge>
                            <span className="text-xs text-muted-foreground">{catTxns.length} transaction{catTxns.length !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="space-y-0.5">
                            {catTxns.map((t, i) => (
                              <div key={i} className="flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-muted/50">
                                <div>
                                  <p className="text-sm leading-tight">{t.merchant_name ?? t.description}</p>
                                  <p className="text-xs text-muted-foreground">{t.date}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CategoryPicker
                                    transactionId={t.id}
                                    current={resolveCategory(t)}
                                    onChanged={(cat) => handleCategoryChanged(t.id, cat)}
                                  />
                                  <span className="text-sm font-medium tabular-nums">{fmtFull(t.amount)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By account */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold mb-1">By Account</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Transfers between your own accounts inflate totals — use this to spot them.
            </p>
            <div className="space-y-2">
              {Object.entries(curr.byAccount)
                .sort(([, a], [, b]) => b.spending - a.spending)
                .map(([id, acc]) => (
                  <div key={id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{acc.name}</p>
                      <Badge variant="secondary" className="text-xs py-0 mt-0.5 capitalize">{acc.type}</Badge>
                    </div>
                    <div className="text-right space-y-0.5">
                      {acc.income > 0 && <p className="text-xs text-primary font-medium">+{fmtFull(acc.income)} in</p>}
                      {acc.spending > 0 && <p className="text-xs text-destructive font-medium">{fmtFull(acc.spending)} out</p>}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* All transactions */}
        <Card>
          <CardContent className="pt-5 pb-2">
            <h3 className="text-sm font-semibold mb-4">All Transactions</h3>
            {txns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions this month.</p>
            ) : (
              <div className="space-y-0.5">
                {txns.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium leading-tight">{t.merchant_name ?? t.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{t.date}</span>
                        {t.pending && <Badge variant="outline" className="text-xs py-0">Pending</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CategoryPicker
                        transactionId={t.id}
                        current={resolveCategory(t)}
                        onChanged={(cat) => handleCategoryChanged(t.id, cat)}
                      />
                      <span className={`text-sm font-semibold tabular-nums ${t.amount < 0 ? "text-primary" : ""}`}>
                        {t.amount < 0 ? "+" : ""}{fmtFull(t.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function CompareTag({ curr, prev, positiveIsGood }: { curr: number; prev: number; positiveIsGood: boolean }) {
  if (prev === 0) return null
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  const up = pct > 0
  const good = positiveIsGood ? up : !up

  return (
    <p className={`text-xs mt-1 flex items-center gap-0.5 font-medium ${good ? "text-primary" : "text-destructive"}`}>
      {Math.abs(pct) < 0.5
        ? <><Minus className="w-3 h-3" /> Same as last month</>
        : up
          ? <><TrendingUp className="w-3 h-3" /> {pct.toFixed(0)}% vs last month</>
          : <><TrendingDown className="w-3 h-3" /> {Math.abs(pct).toFixed(0)}% vs last month</>
      }
    </p>
  )
}
