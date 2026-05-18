"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { PulseData, MetricRating } from "@/lib/calculations/pulse"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const TIER_COLOR: Record<string, string> = {
  exceptional: "#22c55e",
  good: "#3b82f6",
  fair: "#f59e0b",
  poor: "#ef4444",
}

const TIER_LABEL: Record<string, string> = {
  exceptional: "Exceptional",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
}

const STATUS_STYLE: Record<string, string> = {
  exceptional: "bg-emerald-500/10 text-emerald-600",
  good: "bg-blue-500/10 text-blue-600",
  fair: "bg-amber-500/10 text-amber-600",
  poor: "bg-red-500/10 text-red-600",
  na: "bg-muted text-muted-foreground",
}

// SVG arc gauge — 240° sweep, gap at bottom
function Gauge({ score, tier }: { score: number; tier: string }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDisplayed(score), 120)
    return () => clearTimeout(t)
  }, [score])

  const r = 52
  const cx = 64
  const cy = 68
  const circumference = 2 * Math.PI * r
  const sweepDeg = 240
  const trackLen = (sweepDeg / 360) * circumference
  const gapLen = circumference - trackLen
  const progressLen = (displayed / 100) * trackLen
  const color = TIER_COLOR[tier] ?? "#6366f1"
  // Rotate so the 240° arc starts at bottom-left (150°) and ends at bottom-right (30°)
  const rotation = 150

  return (
    <svg viewBox="0 0 128 110" className="w-44 h-36">
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth={11}
        strokeLinecap="round"
        strokeDasharray={`${trackLen} ${gapLen}`}
        transform={`rotate(${rotation} ${cx} ${cy})`}
      />
      {/* Progress */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={11}
        strokeLinecap="round"
        strokeDasharray={`${progressLen} ${circumference - progressLen}`}
        transform={`rotate(${rotation} ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }}
      />
      {/* Score */}
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        fontSize={26}
        fontWeight={700}
        fill="currentColor"
        className="fill-foreground"
      >
        {score}
      </text>
      <text
        x={cx} y={cy + 14}
        textAnchor="middle"
        fontSize={10}
        fill={color}
        fontWeight={600}
      >
        {TIER_LABEL[tier]}
      </text>
    </svg>
  )
}

function MetricCard({
  label,
  value,
  sub,
  rating,
}: {
  label: string
  value: string
  sub?: string
  rating: MetricRating
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[rating.status]}`}>
        {rating.label}
      </span>
    </div>
  )
}

export default function PulseView({ pulse }: { pulse: PulseData }) {
  const {
    healthScore, healthTier,
    savingsRate, savingsRating,
    creditUtilization, creditRating,
    cashRunwayMonths, runwayRating,
    thisMonthIncome, thisMonthSpending,
    totalCreditUsed, totalCreditLimit,
    avgMonthlySpending, topMovers,
  } = pulse

  const increasing = topMovers.filter((m) => m.delta > 0)
  const decreasing = topMovers.filter((m) => m.delta < 0)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 max-w-3xl mx-auto w-full">
      {/* Health score */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Financial Health Score
        </p>
        <Gauge score={healthScore} tier={healthTier} />
        <p className="text-sm text-muted-foreground mt-1">
          Based on your savings rate, credit usage, and cash runway
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Savings Rate"
          value={savingsRate !== null ? `${savingsRate.toFixed(1)}%` : "—"}
          sub={thisMonthIncome > 0
            ? `${fmt(thisMonthIncome - thisMonthSpending)} saved of ${fmt(thisMonthIncome)}`
            : "No income recorded this month"}
          rating={savingsRating}
        />
        <MetricCard
          label="Credit Utilization"
          value={creditUtilization !== null ? `${creditUtilization.toFixed(0)}%` : "—"}
          sub={totalCreditLimit > 0
            ? `${fmt(totalCreditUsed)} of ${fmt(totalCreditLimit)} limit`
            : "No credit accounts"}
          rating={creditRating}
        />
        <MetricCard
          label="Cash Runway"
          value={cashRunwayMonths !== null ? `${cashRunwayMonths.toFixed(1)} mo` : "—"}
          sub={avgMonthlySpending > 0
            ? `At ${fmt(avgMonthlySpending)}/mo avg spend`
            : "No spending data"}
          rating={runwayRating}
        />
      </div>

      {/* Top movers */}
      {topMovers.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Top Movers This Month
          </p>
          <div className="grid grid-cols-2 gap-6">
            {/* Spending more */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Spending more on
              </p>
              {increasing.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing up this month</p>
              ) : (
                increasing.map((m) => (
                  <div key={m.category} className="flex items-center justify-between">
                    <span className="text-sm truncate">{m.category}</span>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-sm font-semibold text-red-500">+{fmt(m.delta)}</span>
                      <p className="text-xs text-muted-foreground">{fmt(m.thisMonth)} this mo</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Spending less */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Spending less on
              </p>
              {decreasing.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing down this month</p>
              ) : (
                decreasing.map((m) => (
                  <div key={m.category} className="flex items-center justify-between">
                    <span className="text-sm truncate">{m.category}</span>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-sm font-semibold text-emerald-500">{fmt(m.delta)}</span>
                      <p className="text-xs text-muted-foreground">{fmt(m.thisMonth)} this mo</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
