import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { transaction_id, custom_category } = await request.json()
  if (!transaction_id) return NextResponse.json({ error: "Missing transaction_id" }, { status: 400 })

  // Assigning a category marks as reviewed; removing sends back to inbox
  const reviewed = custom_category != null

  const { error } = await supabase
    .from("transactions")
    .update({ custom_category: custom_category ?? null, reviewed })
    .eq("id", transaction_id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
