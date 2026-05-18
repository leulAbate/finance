import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import TransactionList from "@/components/transactions/TransactionList"

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; account?: string; month?: string }>
}) {
  const { search, category, account, month } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from("transactions")
    .select("id, amount, date, description, merchant_name, category, custom_category, pending, logo_url, account:accounts(id, name, type, institution:institutions(institution_name, logo_url))")
    .eq("user_id", user!.id)
    .eq("reviewed", true)
    .order("date", { ascending: false })
    .limit(200)

  if (search) {
    query = query.or(`description.ilike.%${search}%,merchant_name.ilike.%${search}%`)
  }
  if (category && category !== "all") {
    query = query.eq("category", category)
  }
  if (account && account !== "all") {
    query = query.eq("account_id", account)
  }
  if (month) {
    const [year, m] = month.split("-")
    const start = `${year}-${m}-01`
    const end = new Date(Number(year), Number(m), 0).toISOString().split("T")[0]
    query = query.gte("date", start).lte("date", end)
  }

  const { data: transactions } = await query

  // Get distinct categories for filter dropdown
  const { data: categoryRows } = await supabase
    .from("transactions")
    .select("category")
    .eq("user_id", user!.id)
    .not("category", "is", null)

  const categories = [...new Set(categoryRows?.map((r: any) => r.category))].sort() as string[]

  // Get accounts for filter dropdown
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, mask")
    .eq("user_id", user!.id)
    .order("name", { ascending: true })

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Transactions" description={`${transactions?.length ?? 0} transactions`} />
      <TransactionList
        transactions={transactions ?? []}
        accounts={accounts ?? []}
      />
    </div>
  )
}
