"use client"

import * as React from "react"
import { Check, Shield } from "lucide-react"
import type { WeekProgress } from "@/lib/consistency/engine"

interface WeeklyProgressWidgetProps {
  week: WeekProgress
  className?: string
}

export function WeeklyProgressWidget({ week, className = "" }: WeeklyProgressWidgetProps) {
  return (
    <div className={`bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 p-5 rounded-2xl shadow-xs flex flex-col gap-3.5 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 font-display">
          إنجاز هذا الأسبوع (السبت ← الجمعة)
        </h3>
        <span className="text-xs font-semibold text-primary-650 dark:text-primary-400 font-mono">
          {week.submittedDays} من {week.requiredDays} أيام ({week.completionPct}%)
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {week.days.map((day) => {
          const isHoliday = day.status === "holiday"
          const isSubmitted = day.status === "submitted"
          const isGrace = day.status === "grace"
          const isMissed = day.status === "missed"
          const isFuture = day.status === "future"

          return (
            <div
              key={day.date}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                day.isToday
                  ? "bg-primary-50/80 dark:bg-primary-950/20 border-2 border-primary-500/50 shadow-xs scale-105"
                  : "bg-stone-50/50 dark:bg-stone-900/30 border border-stone-150 dark:border-stone-850"
              }`}
            >
              <span className={`text-[11px] font-bold ${
                day.isToday ? "text-primary-700 dark:text-primary-400" : "text-stone-500 dark:text-stone-400"
              }`}>
                {day.dayNameAr}
              </span>

              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-transform">
                {isSubmitted && (
                  <div className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                {isGrace && (
                  <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                )}

                {isHoliday && (
                  <span className="text-base" title="عطلة أسبوعية">
                    🕌
                  </span>
                )}

                {isMissed && (
                  <div className="w-6 h-6 rounded-full border-2 border-stone-300 dark:border-stone-700 bg-stone-100/50 dark:bg-stone-800/50" title="لم يسلم" />
                )}

                {isFuture && (
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-250 dark:bg-stone-800" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
