"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Target, CheckCircle2, Calendar, Sparkles } from "lucide-react"
import GoalAdvisor from "./GoalAdvisor"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const GOAL_ICONS = ["🏠", "🚗", "✈️", "🎓", "💍", "🛟", "📱", "💻", "🏋️", "🌴", "💰", "🎯"]
const GOAL_COLORS = [
  { label: "Green",  value: "#10B981" },
  { label: "Blue",   value: "#3B82F6" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Amber",  value: "#F59E0B" },
  { label: "Pink",   value: "#EC4899" },
  { label: "Teal",   value: "#14B8A6" },
]

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onAddFunds,
}: {
  goal: any
  onEdit: (g: any) => void
  onDelete: (id: string) => void
  onAddFunds: (g: any) => void
}) {
  const pct = goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0
  const remaining = goal.target_amount - goal.current_amount
  const days = daysUntil(goal.target_date)
  const color = goal.color ?? "#10B981"

  return (
    <Card className={goal.is_complete ? "opacity-75" : ""}>
      <CardContent className="pt-5 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{ background: `${color}20` }}
            >
              {goal.icon ?? "🎯"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm">{goal.name}</p>
                {goal.is_complete && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
              </div>
              {goal.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(goal)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>
              {fmt(goal.current_amount)}
            </p>
            <p className="text-xs text-muted-foreground">of {fmt(goal.target_amount)} goal</p>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">{fmt(remaining)} to go</p>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {days !== null && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {days < 0
                  ? "Past due"
                  : days === 0
                  ? "Due today"
                  : `${days}d left`}
              </span>
            )}
            {goal.pct !== undefined && (
              <span className="font-medium" style={{ color }}>{pct.toFixed(0)}%</span>
            )}
          </div>
          {!goal.is_complete && (
            <button
              onClick={() => onAddFunds(goal)}
              className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
              style={{ background: `${color}15`, color }}
            >
              + Add funds
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function GoalForm({
  open,
  onClose,
  initial,
  accounts,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  initial: any
  accounts: any[]
  onSave: (data: any) => void
  saving: boolean
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [targetAmount, setTargetAmount] = useState(initial?.target_amount?.toString() ?? "")
  const [currentAmount, setCurrentAmount] = useState(initial?.current_amount?.toString() ?? "0")
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? "")
  const [monthlyContrib, setMonthlyContrib] = useState("")
  const [accountId, setAccountId] = useState(initial?.account_id ?? "none")
  const [icon, setIcon] = useState(initial?.icon ?? "🎯")
  const [color, setColor] = useState(initial?.color ?? "#10B981")

  // Live savings calculator
  const target = Number(targetAmount) || 0
  const current = Number(currentAmount) || 0
  const monthly = Number(monthlyContrib) || 0
  const needed = target - current
  const monthsNeeded = monthly > 0 ? Math.ceil(needed / monthly) : null
  const calcDate = monthsNeeded
    ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsNeeded, 1)
        .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null

  function handleSave() {
    if (!name || !targetAmount) return
    onSave({
      id: initial?.id,
      name,
      description: description || null,
      target_amount: Number(targetAmount),
      current_amount: Number(currentAmount),
      target_date: targetDate || null,
      account_id: accountId === "none" ? null : accountId,
      icon,
      color,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Goal" : "New Goal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                    icon === i ? "ring-2 ring-offset-1 ring-primary scale-110" : "hover:bg-muted"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c.value ? "ring-2 ring-offset-2 scale-110" : "hover:scale-105"
                  }`}
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Goal name</label>
            <Input placeholder="Emergency fund" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
            <Input placeholder="3 months of expenses" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input type="number" min="1" placeholder="10,000" className="pl-7" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Saved so far</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input type="number" min="0" placeholder="0" className="pl-7" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target date <span className="text-muted-foreground">(optional)</span></label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>

          {/* Savings calculator */}
          {target > 0 && (
            <div className="rounded-xl bg-muted/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Savings calculator</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Monthly savings"
                    className="pl-7 h-8 text-sm bg-background"
                    value={monthlyContrib}
                    onChange={(e) => setMonthlyContrib(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">per month</span>
              </div>
              {monthsNeeded !== null && needed > 0 ? (
                <p className="text-xs text-primary font-medium">
                  {fmt(monthly)}/mo → you'll reach {fmt(target)} in{" "}
                  <span className="font-bold">{monthsNeeded} months</span> ({calcDate})
                </p>
              ) : monthly > 0 && needed <= 0 ? (
                <p className="text-xs text-primary font-medium">You've already hit this goal!</p>
              ) : (
                <p className="text-xs text-muted-foreground">Enter a monthly amount to see your timeline</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Linked account <span className="text-muted-foreground">(optional)</span></label>
            <Select value={accountId} onValueChange={(val) => setAccountId(val ?? "none")}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}{a.mask ? ` ••${a.mask}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !name || !targetAmount}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AddFundsDialog({
  goal,
  onClose,
  onSave,
  saving,
}: {
  goal: any
  onClose: () => void
  onSave: (id: string, amount: number) => void
  saving: boolean
}) {
  const [amount, setAmount] = useState("")
  const remaining = goal ? goal.target_amount - goal.current_amount : 0

  return (
    <Dialog open={!!goal} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Add funds — {goal?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            {fmt(goal?.current_amount ?? 0)} saved · {fmt(remaining)} to go
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount to add</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="1"
                placeholder="500"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={saving || !amount} onClick={() => goal && onSave(goal.id, Number(amount))}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function GoalGrid({
  goals,
  accounts,
}: {
  goals: any[]
  accounts: any[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [addFundsGoal, setAddFundsGoal] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const active = goals.filter((g) => !g.is_complete)
  const completed = goals.filter((g) => g.is_complete)
  const totalSaved = active.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget = active.reduce((s, g) => s + g.target_amount, 0)

  async function handleSave(data: any) {
    setSaving(true)
    await fetch("/api/goals", {
      method: data.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setSaving(false)
    setFormOpen(false)
    setEditing(null)
    startTransition(() => router.refresh())
  }

  async function handleAddFunds(id: string, amount: number) {
    setSaving(true)
    const goal = goals.find((g) => g.id === id)
    const newAmount = (goal?.current_amount ?? 0) + amount
    const isComplete = newAmount >= (goal?.target_amount ?? 0)
    await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, current_amount: newAmount, is_complete: isComplete }),
    })
    setSaving(false)
    setAddFundsGoal(null)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setDeleteId(null)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl space-y-6">

          {/* Summary + add button */}
          <div className="flex items-center gap-6 px-1">
            {goals.length > 0 && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Total saved</p>
                  <p className="text-lg font-bold tabular-nums text-primary">{fmt(totalSaved)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total target</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(totalTarget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overall progress</p>
                  <p className="text-lg font-bold tabular-nums">
                    {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setAdvisorOpen(true)}>
                <Sparkles className="w-4 h-4 text-primary" /> AI Advisor
              </Button>
              <Button className="gap-2" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="w-4 h-4" /> New goal
              </Button>
            </div>
          </div>

          {/* Active goals */}
          {active.length === 0 && completed.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-16 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Target className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No goals yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set a savings target — emergency fund, vacation, new car, anything
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => setAdvisorOpen(true)}>
                    <Sparkles className="w-4 h-4 text-primary" /> Ask AI Advisor
                  </Button>
                  <Button className="gap-2" onClick={() => { setEditing(null); setFormOpen(true) }}>
                    <Plus className="w-4 h-4" /> Create manually
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {active.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onEdit={(g) => { setEditing(g); setFormOpen(true) }}
                  onDelete={(id) => setDeleteId(id)}
                  onAddFunds={(g) => setAddFundsGoal(g)}
                />
              ))}
            </div>
          )}

          {/* Completed goals */}
          {completed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Completed
              </p>
              <div className="grid grid-cols-2 gap-4">
                {completed.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onEdit={(g) => { setEditing(g); setFormOpen(true) }}
                    onDelete={(id) => setDeleteId(id)}
                    onAddFunds={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <GoalAdvisor open={advisorOpen} onClose={() => setAdvisorOpen(false)} />

      <GoalForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        initial={editing}
        accounts={accounts}
        onSave={handleSave}
        saving={saving}
      />

      <AddFundsDialog
        goal={addFundsGoal}
        onClose={() => setAddFundsGoal(null)}
        onSave={handleAddFunds}
        saving={saving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost. This cannot be undone.
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
    </>
  )
}
