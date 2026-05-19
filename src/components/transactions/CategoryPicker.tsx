"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronDown, Plus, X, RotateCcw } from "lucide-react"

interface Category {
  id: string
  name: string
  color: string
  group_type: string
}

interface Props {
  transactionId: string
  current: string | null   // null = unreviewed (inbox)
  showRemove?: boolean     // show "Remove → back to inbox" option
  onChanged?: (newCategory: string | null) => void
}

const GROUP_LABELS: Record<string, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
  exclude: "Exclude",
}

async function saveCategory(transactionId: string, category: string | null) {
  await fetch("/api/transactions/categorize", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction_id: transactionId, custom_category: category }),
  })
}

export default function CategoryPicker({ transactionId, current, showRemove = false, onChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState(current)
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newGroup, setNewGroup] = useState("wants")
  const [newColor, setNewColor] = useState("#6366F1")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowNew(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleSelect(name: string | null) {
    if (name === selected) { setOpen(false); return }
    setSaving(true)
    setSelected(name)
    setOpen(false)
    await saveCategory(transactionId, name)
    setSaving(false)
    onChanged?.(name)
  }

  async function handleAddCategory() {
    if (!newName.trim()) return
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor, group_type: newGroup }),
    })
    const cat = await res.json()
    setCategories((prev) => [...prev, cat])
    setShowNew(false)
    setNewName("")
    handleSelect(cat.name)
  }

  const grouped = (["needs", "wants", "savings", "exclude"] as const).map((g) => ({
    group: g,
    label: GROUP_LABELS[g],
    items: categories.filter((c) => c.group_type === g),
  })).filter((g) => g.items.length > 0)

  const selectedCat = categories.find((c) => c.name === selected)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap"
        style={{
          background: selectedCat ? `${selectedCat.color}20` : "#f1f5f920",
          color: selectedCat?.color ?? "#94a3b8",
        }}
      >
        {saving ? "…" : (selected ?? "Uncategorized")}
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto py-1">
            {/* Remove option — sends back to inbox */}
            {showRemove && selected && (
              <div className="border-b border-border/60 pb-1 mb-1">
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-sm text-muted-foreground text-left"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Remove → back to inbox
                </button>
              </div>
            )}

            {grouped.map(({ group, label, items }) => (
              <div key={group}>
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                {items.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat.name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-sm text-left"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                    <span className="flex-1">{cat.name}</span>
                    {cat.name === selected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="border-t border-border">
            {showNew ? (
              <div className="p-2 space-y-2">
                <input
                  autoFocus
                  placeholder="Category name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                  className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
                />
                <div className="flex items-center gap-1.5">
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="flex-1 text-xs border border-border rounded-lg px-1.5 py-1 bg-background"
                  >
                    <option value="needs">Needs</option>
                    <option value="wants">Wants</option>
                    <option value="savings">Savings</option>
                    <option value="exclude">Exclude</option>
                  </select>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-border"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleAddCategory}
                    className="flex-1 text-xs bg-primary text-white rounded-lg py-1.5 font-medium"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowNew(false)}
                    className="px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                <Plus className="w-3.5 h-3.5" />
                New category
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
