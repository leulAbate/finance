import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { text } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: "Missing text" }, { status: 400 })

  const { data: customCats } = await supabase
    .from("custom_categories")
    .select("name, group_type")
    .eq("user_id", user.id)

  const categoryList = (customCats ?? []).map((c) => `${c.name} (${c.group_type})`).join(", ")

  const prompt = `Parse this budget request and return JSON only.

Available categories: ${categoryList || "Groceries, Eating Out, Rent & Utilities, Ride Share, Loan Payments, Savings & Investments, Misc"}

User said: "${text}"

Extract the category and monthly dollar amount. Match to the closest available category name exactly.
Respond with JSON only: {"category": "...", "amount": 000}`

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "{}"
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim()
    const parsed = JSON.parse(cleaned)

    if (!parsed.category || !parsed.amount) {
      return NextResponse.json({ error: "Could not parse budget from text" }, { status: 400 })
    }

    return NextResponse.json({ category: parsed.category, amount: Number(parsed.amount) })
  } catch {
    return NextResponse.json({ error: "Failed to parse budget" }, { status: 500 })
  }
}
