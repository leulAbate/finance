import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Landmark, TrendingUp, CreditCard, Building2 } from "lucide-react"
import Link from "next/link"
import DisconnectButton from "@/components/settings/DisconnectButton"
import ManualAccountsSection from "@/components/accounts/ManualAccountsSection"

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

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: institutions }, { data: manualAccounts }] = await Promise.all([
    supabase
      .from("institutions")
      .select("*, accounts(id, name, type, subtype, current_balance, available_balance, mask, is_hidden)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name, type, subtype, current_balance")
      .eq("user_id", user!.id)
      .eq("is_manual", true)
      .order("created_at", { ascending: true }),
  ])

  const plaidAccounts = institutions?.flatMap((i: any) => i.accounts ?? []) ?? []
  const allAccounts = [...plaidAccounts, ...(manualAccounts ?? [])]

  const totalAssets = allAccounts
    .filter((a: any) => a.type !== "credit" && a.type !== "loan" && a.current_balance != null)
    .reduce((sum: number, a: any) => sum + a.current_balance, 0)
  const totalLiabilities = allAccounts
    .filter((a: any) => (a.type === "credit" || a.type === "loan") && a.current_balance != null)
    .reduce((sum: number, a: any) => sum + a.current_balance, 0)
  const netWorth = totalAssets - totalLiabilities

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Accounts"
        description="All your connected accounts"
        action={
          <Link href="/settings/connections" className="text-sm text-primary font-medium hover:underline">
            + Add account
          </Link>
        }
      />

      <div className="p-8 space-y-6 max-w-3xl">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Net Worth", value: netWorth, highlight: true },
            { label: "Total Assets", value: totalAssets },
            { label: "Total Liabilities", value: totalLiabilities },
          ].map(({ label, value, highlight }) => (
            <Card key={label} className={highlight ? "border-primary/20 bg-primary/5" : ""}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-xl font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>
                  {fmt(value)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plaid-connected institutions */}
        {institutions && institutions.length > 0 && institutions.map((inst: any) => (
          <Card key={inst.id}>
            <CardContent className="pt-4 pb-2">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/60">
                {inst.logo_url ? (
                  <img src={inst.logo_url} alt={inst.institution_name} className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <p className="font-medium text-sm flex-1">{inst.institution_name}</p>
                <DisconnectButton institutionId={inst.id} name={inst.institution_name} />
              </div>

              <div className="space-y-1">
                {inst.accounts?.map((account: any) => (
                  <div key={account.id} className="flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accountColor(account.type)}`}>
                        {accountIcon(account.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{account.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {account.mask && (
                            <span className="text-xs text-muted-foreground">••{account.mask}</span>
                          )}
                          <Badge variant="secondary" className="text-xs capitalize py-0">
                            {account.subtype ?? account.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${account.type === "credit" ? "text-destructive" : ""}`}>
                        {fmt(account.current_balance)}
                      </p>
                      {account.available_balance != null && account.available_balance !== account.current_balance && (
                        <p className="text-xs text-muted-foreground">
                          {fmt(account.available_balance)} avail.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Manual accounts */}
        <ManualAccountsSection accounts={manualAccounts ?? []} />

        {/* Empty state */}
        {(!institutions || institutions.length === 0) && (!manualAccounts || manualAccounts.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center gap-3">
              <Landmark className="w-8 h-8 text-muted-foreground" />
              <p className="font-medium">No accounts connected</p>
              <Link href="/settings/connections" className="text-sm text-primary hover:underline">
                Connect a bank
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
