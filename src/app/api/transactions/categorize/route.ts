import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { transaction_id, custom_category } = await request.json()
  if (!transaction_id) return NextResponse.json({ error: "Missing transaction_id" }, { status: 400 })

  const reviewed = custom_category != null

  const { data: txn, error } = await supabase
    .from("transactions")
    .update({ custom_category: custom_category ?? null, reviewed })
    .eq("id", transaction_id)
    .eq("user_id", user.id)
    .select("merchant_name, description")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Save learned merchant rule when assigning a category
  if (custom_category && txn) {
    const merchantKey = (txn.merchant_name ?? txn.description ?? "").trim()
    if (merchantKey) {
      await supabase
        .from("user_merchant_rules")
        .upsert(
          { user_id: user.id, merchant_pattern: merchantKey, category: custom_category, updated_at: new Date().toISOString() },
          { onConflict: "user_id,merchant_pattern" }
        )
    }
  }

  return NextResponse.json({ success: true })
}
