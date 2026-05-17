import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { syncInstitution } from "@/lib/plaid/sync"

// Called by Vercel Cron every 6 hours — syncs all users
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const { data: institutions } = await adminSupabase
    .from("institutions")
    .select("id")
    .eq("status", "active")

  await Promise.all((institutions ?? []).map((i) => syncInstitution(i.id)))

  return NextResponse.json({ success: true, synced: institutions?.length ?? 0, synced_at: new Date().toISOString() })
}

// Called by the app (user-initiated sync)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { institution_id } = body

  if (institution_id) {
    const { data: institution } = await supabase
      .from("institutions")
      .select("id")
      .eq("id", institution_id)
      .eq("user_id", user.id)
      .single()

    if (!institution) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await syncInstitution(institution_id)
  } else {
    const { data: institutions } = await supabase
      .from("institutions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")

    await Promise.all((institutions ?? []).map((i) => syncInstitution(i.id)))
  }

  return NextResponse.json({ success: true, synced_at: new Date().toISOString() })
}
