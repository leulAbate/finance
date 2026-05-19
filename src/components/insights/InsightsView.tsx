"use client"

import { useState } from "react"
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"

interface Insight {
  id: string
  headline: string
  body: string
  created_at: string
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function InsightBody({ body }: { body: string }) {
  return (
    <div className="space-y-3">
      {body.split(/\n\n+/).map((para, i) => (
        <p key={i} className="text-sm text-foreground/80 leading-relaxed">{para.trim()}</p>
      ))}
    </div>
  )
}

function PastInsight({ insight }: { insight: Insight }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-sm font-medium leading-snug">{insight.headline}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(insight.created_at)}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <InsightBody body={insight.body} />
        </div>
      )}
    </div>
  )
}

export default function InsightsView({ initialInsights }: { initialInsights: Insight[] }) {
  const [insights, setInsights] = useState(initialInsights)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/insights/generate", { method: "POST" })
      if (!res.ok) throw new Error("Failed")
      const { insight } = await res.json()
      setInsights((prev) => [insight, ...prev])
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const latest = insights[0]
  const past = insights.slice(1)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 max-w-2xl mx-auto w-full space-y-6">
      {/* Latest insight */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {latest ? "Latest insight" : "Ready when you are"}
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Thinking…
              </>
            ) : latest ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Get a fresh take
              </>
            ) : null}
          </button>
        </div>

        {latest ? (
          <>
            <h2 className="text-lg font-semibold leading-snug">{latest.headline}</h2>
            <InsightBody body={latest.body} />
            <p className="text-xs text-muted-foreground">{fmtDate(latest.created_at)}</p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Get your first insight</p>
              <p className="text-sm text-muted-foreground mt-1">
                Claude will analyze your spending, savings, and cash flow and give you a personalized read.
              </p>
            </div>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Thinking…" : "Get my first insight"}
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Past reads */}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Past reads
          </p>
          {past.map((i) => (
            <PastInsight key={i.id} insight={i} />
          ))}
        </div>
      )}
    </div>
  )
}
