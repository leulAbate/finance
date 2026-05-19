"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { TrendingUp, CreditCard, Building2, Plus, Pencil, Trash2 } from "lucide-react"
import ManualAccountDialog from "./ManualAccountDialog"

const fmt = (n: number | null) =>
  n != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
    : "—"

function accountIcon(type: string) {
  if (type === "investment") return <TrendingUp className="w-4 h-4" />
  if (type === "credit") return <CreditCard className="w-4 h-4" />
  return <Building2 className="w-4 h-4" />
}

function accountColor(type: string) {
  if (type === "investment") return "bg-chart-5/10 text-chart-5"
  if (type === "credit") return "bg-destructive/10 text-destructive"
  return "bg-primary/10 text-primary"
}

interface Account {
  id: string
  name: string
  type: string
  subtype: string | null
  current_balance: number
}

export default function ManualAccountsSection({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [removing, setRemoving] = useState(false)

  async function handleDelete() {
    if (!deleting) return
    setRemoving(true)
    await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleting.id }),
    })
    setRemoving(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/60">
            <p className="font-medium text-sm">Manual Accounts</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => { setEditing(null); setDialogOpen(true) }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No manual accounts yet. Add a 401k, HSA, or any account not connected via Plaid.
            </p>
          ) : (
            <div className="space-y-1">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accountColor(account.type)}`}>
                      {accountIcon(account.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{account.name}</p>
                      <Badge variant="secondary" className="text-xs capitalize py-0 mt-0.5">
                        {account.subtype ?? account.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-semibold tabular-nums ${account.type === "credit" || account.type === "loan" ? "text-destructive" : ""}`}>
                      {fmt(account.current_balance)}
                    </p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditing(account); setDialogOpen(true) }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(account)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ManualAccountDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        initial={editing ?? undefined}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this account from Birr&apos;e. Your actual account is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={removing}
            >
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
