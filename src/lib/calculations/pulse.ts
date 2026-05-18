import { resolveCategory, MinimalTransaction } from "@/lib/categories/rules"

export interface MetricRating {
  score: number // 0-100
  status: "exceptional" | "good" | "fair" | "poor" | "na"
  label: string
}

export interface TopMover {
  category: string
  thisMonth: number
  lastMonth: number
  delta: number // positive = spending more this month
}

export interface PulseData {
  healthScore: number
  healthTier: "exceptional" | "good" | "fair" | "poor"
  savingsRate: number | null
  savingsRating: MetricRating
  creditUtilization: number | null
  creditRating: MetricRating
  cashRunwayMonths: number | null
  runwayRating: MetricRating
  thisMonthIncome: number
  thisMonthSpending: number
  cashBalance: number
  totalCreditUsed: number
  totalCreditLimit: number
  avgMonthlySpending: number
  topMovers: TopMover[]
}

interface Account {
  type: string
  current_balance: number | null
  limit_balance: number | null
}

type TxnInput = MinimalTransaction & { amount: number; date: string }

export function calcPulse(accounts: Account[], transactions: TxnInput[]): PulseData {
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`

  // Account balances
  let cashBalance = 0
  let totalCreditUsed = 0
  let totalCreditLimit = 0

  for (const a of accounts) {
    if (a.current_balance == null) continue
    if (a.type === "depository") {
      cashBalance += a.current_balance
    } else if (a.type === "credit") {
      totalCreditUsed += a.current_balance
      if (a.limit_balance) totalCreditLimit += a.limit_balance
    }
  }

  // Transaction buckets
  let thisIncome = 0
  let thisSpending = 0
  let lastSpending = 0
  const thisCategories: Record<string, number> = {}
  const lastCategories: Record<string, number> = {}

  for (const t of transactions) {
    const key = t.date.slice(0, 7)
    const cat = resolveCategory(t)

    if (key === thisMonthKey) {
      if (t.amount < 0) {
        thisIncome += Math.abs(t.amount)
      } else {
        thisSpending += t.amount
        thisCategories[cat] = (thisCategories[cat] ?? 0) + t.amount
      }
    } else if (key === lastMonthKey) {
      if (t.amount >= 0) {
        lastSpending += t.amount
        lastCategories[cat] = (lastCategories[cat] ?? 0) + t.amount
      }
    }
  }

  const avgMonthlySpending = (thisSpending + lastSpending) / 2

  // Metrics
  const savingsRate = thisIncome > 0 ? ((thisIncome - thisSpending) / thisIncome) * 100 : null
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : null
  const cashRunwayMonths = avgMonthlySpending > 0 ? cashBalance / avgMonthlySpending : null

  const savingsRating = rateSavings(savingsRate)
  const creditRating = rateCredit(creditUtilization)
  const runwayRating = rateRunway(cashRunwayMonths)

  // Average score across rated metrics (skip "na" neutrals from credit if no cards)
  const scores = [savingsRating.score, creditRating.score, runwayRating.score]
  const healthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const healthTier = getTier(healthScore)

  // Top movers: biggest absolute spending change vs last month
  const allCats = new Set([...Object.keys(thisCategories), ...Object.keys(lastCategories)])
  const topMovers: TopMover[] = []
  for (const cat of allCats) {
    const thisAmt = thisCategories[cat] ?? 0
    const lastAmt = lastCategories[cat] ?? 0
    topMovers.push({ category: cat, thisMonth: thisAmt, lastMonth: lastAmt, delta: thisAmt - lastAmt })
  }
  topMovers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return {
    healthScore,
    healthTier,
    savingsRate,
    savingsRating,
    creditUtilization,
    creditRating,
    cashRunwayMonths,
    runwayRating,
    thisMonthIncome: thisIncome,
    thisMonthSpending: thisSpending,
    cashBalance,
    totalCreditUsed,
    totalCreditLimit,
    avgMonthlySpending,
    topMovers: topMovers.slice(0, 6),
  }
}

function rateSavings(rate: number | null): MetricRating {
  if (rate === null) return { score: 50, status: "na", label: "No data" }
  if (rate >= 20) return { score: 100, status: "exceptional", label: "Excellent" }
  if (rate >= 10) return { score: 75, status: "good", label: "On track" }
  if (rate >= 0) return { score: 45, status: "fair", label: "Watch" }
  return { score: 15, status: "poor", label: "Overspending" }
}

function rateCredit(util: number | null): MetricRating {
  if (util === null) return { score: 100, status: "na", label: "No cards" }
  if (util <= 10) return { score: 100, status: "exceptional", label: "Excellent" }
  if (util <= 30) return { score: 75, status: "good", label: "On track" }
  if (util <= 50) return { score: 45, status: "fair", label: "Watch" }
  return { score: 15, status: "poor", label: "High" }
}

function rateRunway(months: number | null): MetricRating {
  if (months === null) return { score: 50, status: "na", label: "No data" }
  if (months >= 6) return { score: 100, status: "exceptional", label: "6+ months" }
  if (months >= 3) return { score: 75, status: "good", label: "3–6 months" }
  if (months >= 1) return { score: 45, status: "fair", label: "1–3 months" }
  return { score: 15, status: "poor", label: "< 1 month" }
}

function getTier(score: number): "exceptional" | "good" | "fair" | "poor" {
  if (score >= 80) return "exceptional"
  if (score >= 60) return "good"
  if (score >= 40) return "fair"
  return "poor"
}
