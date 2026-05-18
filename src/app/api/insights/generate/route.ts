import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { calcPulse } from "@/lib/calculations/pulse"
import { calcNetWorth } from "@/lib/calculations/net-worth"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  const since = twoMonthsAgo.toISOString().split("T")[0]

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("type, current_balance, limit_balance").eq("user_id", user.id).eq("is_hidden", false),
    supabase.from("transactions").select("amount, date, custom_category, merchant_name, description, category").eq("user_id", user.id).eq("reviewed", true).gte("date", since),
  ])

  const pulse = calcPulse(accounts ?? [], transactions ?? [])
  const { netWorth } = calcNetWorth(accounts ?? [])

  // Build spending category summary with movers
  const categoryLines = pulse.topMovers
    .slice(0, 5)
    .map((m) => {
      const dir = m.delta > 0 ? `↑ +${fmt(m.delta)}` : `↓ ${fmt(m.delta)}`
      return `  - ${m.category}: ${fmt(m.thisMonth)} this month (${dir} vs last month)`
    })
    .join("\n")

  const prompt = `You are a sharp, friendly personal finance coach. Analyze this user's financial data and write a concise insight.

Financial snapshot:
- Net worth: ${fmt(netWorth)}
- Health score: ${pulse.healthScore}/100 (${pulse.healthTier})
- This month: income ${fmt(pulse.thisMonthIncome)} | spending ${fmt(pulse.thisMonthSpending)}
- Savings rate: ${pulse.savingsRate !== null ? `${pulse.savingsRate.toFixed(1)}%` : "no income data"}
- Credit utilization: ${pulse.creditUtilization !== null ? `${pulse.creditUtilization.toFixed(0)}%` : "no credit cards"}
- Cash runway: ${pulse.cashRunwayMonths !== null ? `${pulse.cashRunwayMonths.toFixed(1)} months` : "no data"}

Top spending categories this month (vs last month):
${categoryLines || "  No categorized spending data yet"}

Write a financial insight with:
1. A punchy headline (1 sentence, specific, use real numbers if meaningful)
2. A body (2-3 short paragraphs). Be direct and specific. Highlight what's going well, flag anything to watch, and end with exactly one concrete action the user can take this week.

Tone: friendly, direct, like a trusted advisor — not preachy or generic.

Respond with JSON only (no markdown wrapper):
{"headline": "...", "body": "..."}`

  let headline = ""
  let body = ""

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim()
    const parsed = JSON.parse(cleaned)
    headline = parsed.headline ?? "Your financial snapshot"
    body = parsed.body ?? ""
  } catch {
    return NextResponse.json({ error: "Failed to generate insight" }, { status: 500 })
  }

  const { data: insight, error } = await supabase
    .from("insights")
    .insert({ user_id: user.id, headline, body })
    .select("id, headline, body, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ insight })
}
