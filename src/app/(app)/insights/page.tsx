import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import InsightsView from "@/components/insights/InsightsView"

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: insights } = await supabase
    .from("insights")
    .select("id, headline, body, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Insights" description="AI-powered reads on your finances" />
      <InsightsView initialInsights={insights ?? []} />
    </div>
  )
}
