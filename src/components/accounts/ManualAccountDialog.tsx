"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ACCOUNT_TYPES = [
  { value: "depository", label: "Checking / Savings" },
  { value: "investment", label: "Investment / Retirement" },
  { value: "credit", label: "Credit Card" },
  { value: "loan", label: "Loan / Mortgage" },
  { value: "other", label: "Other" },
]

const SUBTYPES: Record<string, { value: string; label: string }[]> = {
  depository: [
    { value: "checking", label: "Checking" },
    { value: "savings", label: "Savings" },
    { value: "hsa", label: "HSA" },
    { value: "cd", label: "CD" },
  ],
  investment: [
    { value: "401k", label: "401k" },
    { value: "403b", label: "403b" },
    { value: "ira", label: "IRA" },
    { value: "roth", label: "Roth IRA" },
    { value: "brokerage", label: "Brokerage" },
    { value: "pension", label: "Pension" },
  ],
  credit: [
    { value: "credit card", label: "Credit Card" },
  ],
  loan: [
    { value: "mortgage", label: "Mortgage" },
    { value: "student", label: "Student Loan" },
    { value: "auto", label: "Auto Loan" },
    { value: "personal", label: "Personal Loan" },
  ],
  other: [],
}

interface Props {
  open: boolean
  onClose: () => void
  initial?: { id: string; name: string; type: string; subtype: string | null; current_balance: number }
}

export default function ManualAccountDialog({ open, onClose, initial }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? "")
  const [type, setType] = useState(initial?.type ?? "")
  const [subtype, setSubtype] = useState(initial?.subtype ?? "")
  const [balance, setBalance] = useState(initial?.current_balance?.toString() ?? "")
  const [saving, setSaving] = useState(false)

  const subtypeOptions = SUBTYPES[type] ?? []

  async function handleSave() {
    if (!name || !type || balance === "") return
    setSaving(true)

    const payload = {
      id: initial?.id,
      name,
      type,
      subtype: subtype || null,
      current_balance: parseFloat(balance),
    }

    await fetch("/api/accounts", {
      method: initial?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    onClose()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Account" : "Add Manual Account"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Account name</label>
            <Input
              placeholder="e.g. Home Depot 401k"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Account type</label>
            <Select value={type} onValueChange={(val) => { setType(val ?? ""); setSubtype("") }}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subtypeOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subtype</label>
              <Select value={subtype} onValueChange={(val) => setSubtype(val ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select subtype" /></SelectTrigger>
                <SelectContent>
                  {subtypeOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current balance</label>
            <Input
              type="number"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
            {(type === "credit" || type === "loan") && (
              <p className="text-xs text-muted-foreground">Enter the amount you owe as a positive number.</p>
            )}
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving || !name || !type || balance === ""}>
            {saving ? "Saving…" : initial?.id ? "Save changes" : "Add account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
