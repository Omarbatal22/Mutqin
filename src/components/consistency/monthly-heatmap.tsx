"use client"

import * as React from "react"
import type { DayStatus } from "@/lib/consistency/engine"
import { Check, Shield } from "lucide-react"

interface MonthlyHeatmapProps {
  days: DayStatus[]
  monthNameAr?: string
  className?: string
}

const ARABIC_DAYS_HEADER = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]

export function MonthlyHeatmap({ days, monthNameAr = "الشهر الحالي", className = "" }: MonthlyHeatmapProps) {
  if (!days || days.length === 0) return null

  // Align days by day of week (Saturday-first grid)
  const firstDate = new Date(days[0].date + "T00:00:00Z")
  const firstDayOfWeek = firstDate.getUTCDay()
  const offset = (firstDayOfWeek + 1) % 7 // Saturday = offset 0

  const gridCells: (DayStatus | null)[] = Array(offset).fill(null).concat(days)

  return (
    <div className={`bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 p-6 rounded-2xl shadow-xs flex flex-col gap-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <span>سجل التسليم الشهري</span>
          <span className="text-xs text-stone-400 font-normal">({monthNameAr})</span>
        </h3>

        <div className="flex items-center gap-3 text-[11px] text-stone-500 font-medium">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
            <span>مكتمل</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded-sm" />
            <span>حماية</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-850 rounded-sm" />
            <span>لم يُسلم</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🕌</span>
            <span>عطلة</span>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 text-center border-b border-stone-100 dark:border-stone-900 pb-2">
        {ARABIC_DAYS_HEADER.map((d) => (
          <span key={d} className="text-xs font-bold text-stone-400 dark:text-stone-500">
            {d}
          </span>
        ))}
      </div>

      {/* Calendar days grid */}
      <div className="grid grid-cols-7 gap-2">
        {gridCells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-10 rounded-xl bg-transparent" />
          }

          const dayNum = parseInt(cell.date.split("-")[2], 10)
          const isSubmitted = cell.status === "submitted"
          const isGrace = cell.status === "grace"
          const isHoliday = cell.status === "holiday"
          const isMissed = cell.status === "missed"

          return (
            <div
              key={cell.date}
              title={`${cell.date}: ${cell.status}`}
              className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-bold ${
                cell.isToday ? "ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-stone-900 z-10" : ""
              } ${
                isSubmitted
                  ? "bg-emerald-500 text-white shadow-xs"
                  : isGrace
                  ? "bg-amber-500 text-white shadow-xs"
                  : isHoliday
                  ? "bg-teal-50/70 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border border-teal-200/50"
                  : isMissed
                  ? "bg-stone-100 dark:bg-stone-850 text-stone-400 border border-stone-200/40 dark:border-stone-800"
                  : "bg-stone-50/50 dark:bg-stone-900/30 text-stone-300 dark:text-stone-700"
              }`}
            >
              <span className="text-[11px] leading-none">{dayNum}</span>

              {isSubmitted && <Check className="w-3 h-3 mt-0.5 stroke-[3]" />}
              {isGrace && <Shield className="w-3 h-3 mt-0.5" />}
              {isHoliday && <span className="text-[10px] leading-none mt-0.5">🕌</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
