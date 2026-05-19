import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import BudgetView from "@/components/budgets/BudgetView"
import { resolveCategory } from "@/lib/categories/rules"

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const [{ data: budgets }, { data: customCats }, { data: transactions }] = await Promise.all([
    supabase.from("budgets").select("*").eq("user_id", user!.id).order("created_at", { ascending: true }),
    supabase.from("custom_categories").select("name, color, group_type").eq("user_id", user!.id),
    supabase
      .from("transactions")
      .select("amount, custom_category, merchant_name, description, category")
      .eq("user_id", user!.id)
      .eq("reviewed", true)
      .gt("amount", 0)
      .gte("date", monthStart)
      .lte("date", monthEnd),
  ])

  // Spending this month per resolved category (exclude Transfer)
  const spentMap: Record<string, number> = {}
  for (const t of transactions ?? []) {
    const cat = resolveCategory(t)
    if (cat === "Transfer") continue
    spentMap[cat] = (spentMap[cat] ?? 0) + t.amount
  }

  // Map category name → group + color from custom_categories
  const catMeta = new Map((customCats ?? []).map((c) => [c.name, { group: c.group_type, color: c.color }]))

  const budgetsWithData = (budgets ?? []).map((b) => ({
    ...b,
    spent: spentMap[b.category] ?? 0,
    group: catMeta.get(b.category)?.group ?? "wants",
    color: catMeta.get(b.category)?.color ?? b.color ?? "#6366f1",
  }))

  // Spending chart data: all reviewed spending this month by category
  const chartData = Object.entries(spentMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([category, amount]) => ({
      category,
      amount,
      color: catMeta.get(category)?.color ?? "#94a3b8",
    }))

  const allCategories = (customCats ?? []).map((c) => c.name)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Budgets"
        description={now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      />
      <BudgetView
        budgets={budgetsWithData}
        allCategories={allCategories}
        chartData={chartData}
        spentMap={spentMap}
      />
    </div>
  )
}
