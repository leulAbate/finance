"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Plus, Pencil, Trash2, Sparkles, Send } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const GROUP_ORDER = ["needs", "wants", "savings"] as const
const GROUP_LABEL: Record<string, string> = { needs: "Needs", wants: "Wants", savings: "Savings" }
const GROUP_COLOR: Record<string, string> = {
  needs: "text-blue-500",
  wants: "text-amber-500",
  savings: "text-emerald-500",
}
const GROUP_BG: Record<string, string> = {
  needs: "bg-blue-500/10",
  wants: "bg-amber-500/10",
  savings: "bg-emerald-500/10",
}

interface Budget {
  id: string
  category: string
  amount: number
  spent: number
  group: string
  color: string
}

interface ChartEntry {
  category: string
  amount: number
  color: string
}

function BudgetRow({
  budget,
  onEdit,
  onDelete,
}: {
  budget: Budget
  onEdit: (b: Budget) => void
  onDelete: (id: string) => void
}) {
  const pct = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0
  const isOver = budget.spent > budget.amount
  const remaining = budget.amount - budget.spent
  const barColor = isOver ? "#ef4444" : pct >= 75 ? "#f59e0b" : budget.color

  return (
    <div className="grid grid-cols-[1fr_90px_90px_110px_24px_24px] items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded-xl transition-colors">
      {/* Category + bar */}
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium">{budget.category}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
          />
        </div>
      </div>
      {/* Goal */}
      <p className="text-sm tabular-nums text-right text-muted-foreground">{fmt(budget.amount)}</p>
      {/* Spent */}
      <p className="text-sm tabular-nums text-right font-medium">{fmt(budget.spent)}</p>
      {/* Remaining */}
      <p className={`text-sm tabular-nums text-right font-semibold ${isOver ? "text-red-500" : "text-emerald-600"}`}>
        {isOver ? `-${fmt(Math.abs(remaining))}` : fmt(remaining)}
      </p>
      <button onClick={() => onEdit(budget)} className="text-muted-foreground hover:text-foreground transition-colors">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onDelete(budget.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function AddBudgetForm({
  allCategories,
  budgetedCats,
  onSave,
}: {
  allCategories: string[]
  budgetedCats: Set<string>
  onSave: (category: string, amount: number) => Promise<void>
}) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualCat, setManualCat] = useState("")
  const [manualAmt, setManualAmt] = useState("")
  const available = allCategories.filter((c) => !budgetedCats.has(c))

  async function handleAI() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/budgets/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const { category, amount } = await res.json()
      await onSave(category, amount)
      setText("")
    } finally {
      setLoading(false)
    }
  }

  async function handleManual() {
    if (!manualCat || !manualAmt || isNaN(Number(manualAmt))) return
    setLoading(true)
    try {
      await onSave(manualCat, Number(manualAmt))
      setManualCat("")
      setManualAmt("")
      setManual(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-border/50 pt-4 mt-2 space-y-3">
      {/* AI input */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAI()}
          placeholder='e.g. "I want to spend $300 on eating out"'
          className="flex-1 text-sm bg-muted/50 border border-border rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleAI}
          disabled={loading || !text.trim()}
          className="p-2 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Manual fallback */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setManual(!manual)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add manually
        </button>
      </div>

      {manual && (
        <div className="flex items-center gap-2">
          <select
            value={manualCat}
            onChange={(e) => setManualCat(e.target.value)}
            className="flex-1 text-sm bg-background border border-border rounded-xl px-3 py-2"
          >
            <option value="">Category…</option>
            {available.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              value={manualAmt}
              onChange={(e) => setManualAmt(e.target.value)}
              placeholder="500"
              className="w-28 text-sm bg-background border border-border rounded-xl pl-7 pr-3 py-2"
            />
          </div>
          <button
            onClick={handleManual}
            disabled={loading || !manualCat || !manualAmt}
            className="px-3 py-2 bg-primary text-white text-sm rounded-xl hover:opacity-90 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

export default function BudgetView({
  budgets,
  allCategories,
  chartData,
  spentMap,
}: {
  budgets: Budget[]
  allCategories: string[]
  chartData: ChartEntry[]
  spentMap: Record<string, number>
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState(budgets)

  async function handleSave(category: string, amount: number) {
    setSaving(true)
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amount }),
    })
    setSaving(false)
    startTransition(() => router.refresh())
  }

  async function handleEdit(id: string, amount: number) {
    setSaving(true)
    await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, amount }),
    })
    setSaving(false)
    setEditingId(null)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    await fetch("/api/budgets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setDeleteId(null)
    startTransition(() => router.refresh())
  }

  const budgetedCats = new Set(items.map((b) => b.category))

  // Group summaries
  const groupSummary = GROUP_ORDER.map((g) => {
    const group = items.filter((b) => b.group === g)
    return {
      group: g,
      goal: group.reduce((s, b) => s + b.amount, 0),
      spent: group.reduce((s, b) => s + b.spent, 0),
    }
  })

  const totalGoal = items.reduce((s, b) => s + b.amount, 0)
  const totalSpent = items.reduce((s, b) => s + b.spent, 0)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top summary + donut */}
        {items.length > 0 && (
          <div className="flex items-center gap-6 bg-card border border-border rounded-2xl p-5">
            {/* Donut chart */}
            {chartData.length > 0 && (
              <div className="shrink-0 w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="amount" paddingAngle={2}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => fmt(Number(val))}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.category ?? ""}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Group summaries */}
            <div className="flex-1 grid grid-cols-3 gap-4">
              {groupSummary.map(({ group, goal, spent }) => (
                <div key={group}>
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${GROUP_BG[group]} ${GROUP_COLOR[group]}`}>
                    {GROUP_LABEL[group]}
                  </span>
                  <p className="text-xl font-bold tabular-nums mt-2">{fmt(spent)}</p>
                  <p className="text-xs text-muted-foreground">of {fmt(goal)} goal</p>
                  {goal > 0 && (
                    <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((spent / goal) * 100, 100)}%`,
                          background: spent > goal ? "#ef4444" : group === "needs" ? "#3b82f6" : group === "wants" ? "#f59e0b" : "#22c55e",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="shrink-0 text-right border-l border-border pl-6">
              <p className="text-xs text-muted-foreground">Total spent</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(totalSpent)}</p>
              <p className="text-xs text-muted-foreground mt-1">of {fmt(totalGoal)}</p>
            </div>
          </div>
        )}

        {/* Budget rows grouped by Needs / Wants / Savings */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center gap-3">
              <p className="font-medium">No budgets yet</p>
              <p className="text-sm text-muted-foreground">Use the input below to set your first budget.</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_90px_90px_110px_24px_24px] gap-4 px-4 py-2.5 border-b border-border/50 bg-muted/20">
                {["Category", "Goal", "Spent", "Remaining", "", ""].map((h, i) => (
                  <p key={i} className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest text-right first:text-left">
                    {h}
                  </p>
                ))}
              </div>

              {GROUP_ORDER.map((g) => {
                const groupBudgets = items.filter((b) => b.group === g)
                if (groupBudgets.length === 0) return null
                return (
                  <div key={g}>
                    <div className={`px-4 py-1.5 ${GROUP_BG[g]}`}>
                      <span className={`text-xs font-bold uppercase tracking-widest ${GROUP_COLOR[g]}`}>
                        {GROUP_LABEL[g]}
                      </span>
                    </div>
                    {groupBudgets.map((b) =>
                      editingId === b.id ? (
                        <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="flex-1 text-sm font-medium">{b.category}</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <input
                              autoFocus
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleEdit(b.id, Number(editAmount))}
                              className="w-32 text-sm bg-background border border-border rounded-xl pl-7 pr-3 py-1.5"
                            />
                          </div>
                          <button onClick={() => handleEdit(b.id, Number(editAmount))} disabled={saving} className="text-xs text-primary font-medium">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">Cancel</button>
                        </div>
                      ) : (
                        <BudgetRow
                          key={b.id}
                          budget={b}
                          onEdit={(b) => { setEditingId(b.id); setEditAmount(b.amount.toString()) }}
                          onDelete={(id) => setDeleteId(id)}
                        />
                      )
                    )}
                  </div>
                )
              })}

              {/* Uncategorized budgets (group not in needs/wants/savings) */}
              {items.filter((b) => !GROUP_ORDER.includes(b.group as any)).map((b) => (
                <BudgetRow
                  key={b.id}
                  budget={b}
                  onEdit={(b) => { setEditingId(b.id); setEditAmount(b.amount.toString()) }}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </>
          )}

          {/* Add budget */}
          <div className="px-4 pb-4">
            <AddBudgetForm
              allCategories={allCategories}
              budgetedCats={budgetedCats}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This won't affect your transactions, just the spending limit for this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
