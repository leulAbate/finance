import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import CashFlowChart from "@/components/dashboard/CashFlowChart"
import SpendingBreakdown from "@/components/dashboard/SpendingBreakdown"
import RecentTransactions from "@/components/dashboard/RecentTransactions"
import AutoSync from "@/components/dashboard/AutoSync"
import { calcNetWorth } from "@/lib/calculations/net-worth"
import { calcMonthlyCashFlow, calcSpendingByCategory } from "@/lib/calculations/cash-flow"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from("accounts")
      .select("type, current_balance")
      .eq("user_id", user!.id),
    supabase
      .from("transactions")
      .select("id, date, amount, category, custom_category, description, merchant_name, pending, account:accounts(name)")
      .eq("user_id", user!.id)
      .eq("reviewed", true)
      .gte("date", new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split("T")[0])
      .order("date", { ascending: false }),
  ])

  const { netWorth, assets, liabilities } = calcNetWorth(accounts ?? [])
  const cashFlow = calcMonthlyCashFlow(transactions ?? [])
  const spendingByCategory = calcSpendingByCategory(transactions ?? [])

  const thisMonth = cashFlow[cashFlow.length - 1]
  const lastMonth = cashFlow[cashFlow.length - 2]
  const netChange = thisMonth
    ? thisMonth.income - thisMonth.spending
    : 0

  const recentTransactions = (transactions ?? []).slice(0, 8)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Dashboard"
        description={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      />

      <AutoSync />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl space-y-6">

          {/* Top stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Worth</p>
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary tabular-nums">{fmt(netWorth)}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmt(assets)} assets · {fmt(liabilities)} liabilities</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Income this month</p>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums">{fmt(thisMonth?.income ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  vs {fmt(lastMonth?.income ?? 0)} last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Spending this month</p>
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums">{fmt(thisMonth?.spending ?? 0)}</p>
                <p className={`text-xs mt-1 font-medium ${netChange >= 0 ? "text-primary" : "text-destructive"}`}>
                  {netChange >= 0 ? "+" : ""}{fmt(netChange)} net
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart + breakdown row */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3">
              <CashFlowChart data={cashFlow} spendingByCategory={spendingByCategory} />
            </div>
            <div className="col-span-2">
              <SpendingBreakdown data={spendingByCategory} />
            </div>
          </div>

          {/* Recent transactions */}
          <RecentTransactions transactions={recentTransactions} />
        </div>
      </div>
    </div>
  )
}
