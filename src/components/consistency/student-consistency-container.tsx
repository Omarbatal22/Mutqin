"use client"

import * as React from "react"
import type { ConsistencyStats } from "@/lib/consistency/engine"
import { computeConsistency } from "@/lib/consistency/engine"
import { StreakBadge } from "./streak-badge"
import { WeeklyProgressWidget } from "./weekly-progress"
import { MonthlyHeatmap } from "./monthly-heatmap"
import { ConsistencyTree } from "./consistency-tree"
import { AchievementGallery } from "./achievement-toast"
import { GraceDialog } from "./grace-dialog"

interface StudentConsistencyContainerProps {
  initialStats: ConsistencyStats
  submittedDates: string[]
  todayStr: string
  circleId?: string
  viewMode?: "dashboard" | "full"
}

const LOCAL_GRACE_KEY = "mutqin_grace_used_dates"
const LOCAL_GRACE_DECLINED_KEY = "mutqin_grace_declined_dates"

export function StudentConsistencyContainer({
  initialStats,
  submittedDates,
  todayStr,
  circleId,
  viewMode = "dashboard",
}: StudentConsistencyContainerProps) {
  const [graceUsedDates, setGraceUsedDates] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(LOCAL_GRACE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [declinedGraceDates, setDeclinedGraceDates] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(LOCAL_GRACE_DECLINED_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Re-compute stats taking local grace used dates into account
  const stats = React.useMemo(() => {
    if (graceUsedDates.length === 0) return initialStats
    return computeConsistency(submittedDates, todayStr, graceUsedDates)
  }, [graceUsedDates, submittedDates, todayStr, initialStats])

  const pendingGraceDate = React.useMemo(() => {
    if (!stats.pendingGraceDate) return null
    if (declinedGraceDates.includes(stats.pendingGraceDate)) return null
    return stats.pendingGraceDate
  }, [stats.pendingGraceDate, declinedGraceDates])

  const handleUseGrace = (dateStr: string) => {
    const updated = Array.from(new Set([...graceUsedDates, dateStr]))
    setGraceUsedDates(updated)
    try {
      localStorage.setItem(LOCAL_GRACE_KEY, JSON.stringify(updated))
    } catch {
      // Ignore storage write error
    }
  }

  const handleDeclineGrace = (dateStr: string) => {
    const updated = Array.from(new Set([...declinedGraceDates, dateStr]))
    setDeclinedGraceDates(updated)
    try {
      localStorage.setItem(LOCAL_GRACE_DECLINED_KEY, JSON.stringify(updated))
    } catch {
      // Ignore storage write error
    }
  }

  if (viewMode === "dashboard") {
    return (
      <div className="flex flex-col gap-5 w-full">
        <StreakBadge
          currentStreak={stats.currentStreak}
          monthlyConsistencyPct={stats.monthlyConsistencyPct}
          graceAvailable={stats.graceAvailable}
        />
        <WeeklyProgressWidget week={stats.currentWeek} />
        <GraceDialog
          pendingDate={pendingGraceDate}
          circleId={circleId}
          onUseGrace={handleUseGrace}
          onDeclineGrace={handleDeclineGrace}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <StreakBadge
        currentStreak={stats.currentStreak}
        monthlyConsistencyPct={stats.monthlyConsistencyPct}
        graceAvailable={stats.graceAvailable}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <WeeklyProgressWidget week={stats.currentWeek} />
        </div>
        <div>
          <ConsistencyTree stage={stats.treeStage} totalReports={stats.totalReports} />
        </div>
      </div>

      <MonthlyHeatmap days={stats.monthHeatmap} />

      <AchievementGallery achievements={stats.achievements} />

      <GraceDialog
        pendingDate={pendingGraceDate}
        circleId={circleId}
        onUseGrace={handleUseGrace}
        onDeclineGrace={handleDeclineGrace}
      />
    </div>
  )
}
