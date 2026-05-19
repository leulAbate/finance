import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import MonthlyView from "@/components/monthly/MonthlyView"

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams

  // Default to current month
  const now = new Date()
  const target = month ? new Date(month + "-02") : now
  const year = target.getFullYear()
  const mon = target.getMonth()

  const firstOfMonth = new Date(year, mon, 1).toISOString().split("T")[0]
  const lastOfMonth = new Date(year, mon + 1, 0).toISOString().split("T")[0]
  const firstOfPrev = new Date(year, mon - 1, 1).toISOString().split("T")[0]
  const lastOfPrev = new Date(year, mon, 0).toISOString().split("T")[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: current }, { data: previous }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, category, custom_category, description, merchant_name, date, pending, account:accounts(id, name, type)")
      .eq("user_id", user!.id)
      .eq("reviewed", true)
      .gte("date", firstOfMonth)
      .lte("date", lastOfMonth)
      .order("date", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount, category")
      .eq("user_id", user!.id)
      .eq("reviewed", true)
      .gte("date", firstOfPrev)
      .lte("date", lastOfPrev),
  ])

  const monthLabel = target.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Monthly Review" description={monthLabel} />
      <MonthlyView
        key={month}
        transactions={current ?? []}
        previousTransactions={previous ?? []}
        month={month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`}
      />
    </div>
  )
}
