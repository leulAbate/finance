import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import PulseView from "@/components/pulse/PulseView"
import { calcPulse } from "@/lib/calculations/pulse"

export default async function PulsePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  const since = twoMonthsAgo.toISOString().split("T")[0]

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from("accounts")
      .select("type, current_balance, limit_balance")
      .eq("user_id", user!.id)
      .eq("is_hidden", false),
    supabase
      .from("transactions")
      .select("amount, date, custom_category, merchant_name, description, category")
      .eq("user_id", user!.id)
      .eq("reviewed", true)
      .gte("date", since),
  ])

  const pulse = calcPulse(accounts ?? [], transactions ?? [])

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Pulse" description="Your financial health at a glance" />
      <PulseView pulse={pulse} />
    </div>
  )
}
