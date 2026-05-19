import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_CATEGORIES } from "@/lib/categories/rules"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: existing } = await supabase
    .from("custom_categories")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })

  // Seed defaults if user has none
  if (!existing || existing.length === 0) {
    const { data: seeded } = await supabase
      .from("custom_categories")
      .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id })))
      .select()
    return NextResponse.json(seeded ?? [])
  }

  return NextResponse.json(existing)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, color, group_type } = await request.json()
  if (!name || !group_type) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const { data: existing } = await supabase
    .from("custom_categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from("custom_categories")
    .insert({ user_id: user.id, name, color: color ?? "#6366F1", group_type, sort_order: (existing?.sort_order ?? 0) + 1 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  await supabase.from("custom_categories").delete().eq("id", id).eq("user_id", user.id)
  return NextResponse.json({ success: true })
}
