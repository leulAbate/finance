import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [{ data: unreviewed }, { data: customCats }, { data: rules }, { data: history }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, merchant_name, description, amount, category")
      .eq("user_id", user.id)
      .eq("reviewed", false)
      .gt("amount", 0)
      .order("date", { ascending: false })
      .limit(50),
    supabase.from("custom_categories").select("name, group_type").eq("user_id", user.id),
    supabase.from("user_merchant_rules").select("merchant_pattern, category").eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("merchant_name, description, custom_category")
      .eq("user_id", user.id)
      .eq("reviewed", true)
      .not("custom_category", "is", null)
      .order("date", { ascending: false })
      .limit(30),
  ])

  if (!unreviewed?.length) return NextResponse.json({ suggestions: [] })

  const categoryNames = (customCats ?? []).map((c) => c.name).join(", ")
  const historyLines = (history ?? [])
    .map((t) => `"${t.merchant_name ?? t.description}" → ${t.custom_category}`)
    .join("\n")
  const ruleLines = (rules ?? [])
    .map((r) => `"${r.merchant_pattern}" → ${r.category}`)
    .join("\n")

  const txnLines = (unreviewed ?? [])
    .map((t, i) => `${i}. id=${t.id} | merchant="${t.merchant_name ?? t.description}" | $${t.amount}`)
    .join("\n")

  const prompt = `You are categorizing personal finance transactions. Return JSON only.

Available categories: ${categoryNames || "Groceries, Eating Out, Rent & Utilities, Ride Share, Loan Payments, Savings & Investments, Misc, Transfer"}

Learned rules (always follow these):
${ruleLines || "(none yet)"}

Recent categorization history (learn patterns):
${historyLines || "(none yet)"}

Transactions to categorize:
${txnLines}

For each transaction, pick the best category from the available list. Be decisive — always pick one.
Respond with JSON array only: [{"id": "...", "category": "...", "confidence": 0.0-1.0}, ...]`

  let suggestions: { id: string; category: string; confidence: number }[] = []

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "[]"
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim()
    suggestions = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }

  return NextResponse.json({ suggestions })
}
