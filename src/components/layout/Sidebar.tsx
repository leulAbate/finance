"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Landmark,
  Target,
  Settings,
  LogOut,
  CalendarDays,
  Inbox,
} from "lucide-react"

const navItems = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/monthly",      label: "Monthly",      icon: CalendarDays },
  { href: "/inbox",        label: "Inbox",        icon: Inbox },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets",      label: "Budgets",      icon: PieChart },
  { href: "/accounts",     label: "Accounts",     icon: Landmark },
  { href: "/goals",        label: "Goals",        icon: Target },
]

export default function Sidebar({ userEmail, inboxCount = 0 }: { userEmail: string; inboxCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo — glossy header strip */}
      <div className="sidebar-header-gloss flex items-center gap-3 px-6 h-16">
        <div className="btn-gloss w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
          <span className="text-white text-sm font-bold">B</span>
        </div>
        <span className="text-sidebar-foreground font-semibold text-lg tracking-tight">Birr&apos;e</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          const showBadge = href === "/inbox" && inboxCount > 0
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "nav-active-gloss text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
              }`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="ml-auto text-xs font-semibold bg-primary text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
                  {inboxCount > 99 ? "99+" : inboxCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5 shrink-0" />
          Settings
        </Link>
        <div className="px-3 py-2">
          <p className="text-xs text-sidebar-foreground/50 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
