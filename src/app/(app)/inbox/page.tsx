import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import InboxList from "@/components/inbox/InboxList"

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, date, description, merchant_name, category, custom_category, account:accounts(id, name, type)")
    .eq("user_id", user!.id)
    .eq("reviewed", false)
    .gt("amount", 0)
    .order("date", { ascending: false })

  const count = transactions?.length ?? 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Inbox"
        description={count === 0 ? "All caught up" : `${count} transaction${count === 1 ? "" : "s"} to review`}
      />
      <InboxList transactions={transactions ?? []} />
    </div>
  )
}
