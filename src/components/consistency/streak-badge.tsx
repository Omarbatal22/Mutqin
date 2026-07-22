"use client"

import * as React from "react"
import { Shield, Sparkles } from "lucide-react"

interface StreakBadgeProps {
  currentStreak: number
  monthlyConsistencyPct: number
  graceAvailable: boolean
  variant?: "full" | "compact" | "minimal"
  className?: string
}

export function StreakBadge({
  currentStreak,
  monthlyConsistencyPct,
  graceAvailable,
  variant = "full",
  className = "",
}: StreakBadgeProps) {
  if (variant === "minimal") {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 ${className}`}>
        <span>🔥</span>
        <span>{currentStreak} {currentStreak === 1 ? "يوم" : "أيام"}</span>
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 text-xs font-semibold ${className}`}>
        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-xl border border-amber-200/50">
          <span className="text-sm">🔥</span>
          <span className="font-bold">{currentStreak}</span>
          <span className="text-[10px] text-amber-600 dark:text-amber-500">يوم استمرار</span>
        </div>

        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-xl border border-emerald-200/50">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-bold">{monthlyConsistencyPct}%</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-500">التزام شهري</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/60 dark:border-amber-900/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${className}`}>
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md shadow-amber-500/20 shrink-0">
          🔥
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
              {currentStreak > 0 ? (
                <>سلسلة الاستمرار: <span className="text-amber-600 dark:text-amber-400 font-mono text-xl">{currentStreak}</span> يوماً</>
              ) : (
                <span className="text-stone-700 dark:text-stone-300">ابدأ سلسلة مثابرتك اليوم 💪</span>
              )}
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {currentStreak > 0
              ? "واصل التسليم اليومي لتنمية سلسلتك وزيادة إتقانك."
              : "تسليم التقرير اليومي يبني عادة الحفظ المتين والمستمر."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        {/* Monthly consistency pill */}
        <div className="flex-1 md:flex-initial bg-white dark:bg-[#1c1c1a] px-4 py-2.5 rounded-xl border border-stone-200/70 dark:border-stone-850 flex flex-col items-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500">نسبة الالتزام الشهري</span>
          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{monthlyConsistencyPct}%</span>
        </div>

        {/* Grace day status pill */}
        <div className="flex-1 md:flex-initial bg-white dark:bg-[#1c1c1a] px-4 py-2.5 rounded-xl border border-stone-200/70 dark:border-stone-850 flex flex-col items-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-500" />
            حماية المثابرة
          </span>
          <span className={`text-xs font-bold mt-0.5 ${graceAvailable ? "text-amber-600 dark:text-amber-400" : "text-stone-400"}`}>
            {graceAvailable ? "متاحة 🛡" : "مستخدمة"}
          </span>
        </div>
      </div>
    </div>
  )
}
