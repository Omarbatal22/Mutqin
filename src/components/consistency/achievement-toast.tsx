"use client"

import * as React from "react"
import type { Achievement } from "@/lib/consistency/engine"
import { Lock } from "lucide-react"

interface AchievementGalleryProps {
  achievements: Achievement[]
  className?: string
}

export function AchievementGallery({ achievements, className = "" }: AchievementGalleryProps) {
  const earnedCount = achievements.filter((a) => a.earned).length

  return (
    <div className={`bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 p-6 rounded-2xl shadow-xs flex flex-col gap-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100">
          أوسمة المثابرة والإنجاز
        </h3>
        <span className="text-xs font-semibold text-primary-650 dark:text-primary-400 font-mono">
          {earnedCount} من {achievements.length} أوسمة
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {achievements.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
              item.earned
                ? "bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/60 dark:border-amber-900/30 shadow-xs"
                : "bg-stone-50/50 dark:bg-stone-900/20 border-stone-150 dark:border-stone-850 opacity-60"
            }`}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl relative">
              {item.emoji}
              {!item.earned && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-stone-400 text-white rounded-full flex items-center justify-center text-[9px]">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}
            </div>

            <div>
              <h4 className={`text-xs font-bold ${item.earned ? "text-stone-900 dark:text-stone-100" : "text-stone-500"}`}>
                {item.titleAr}
              </h4>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 leading-tight">
                {item.descriptionAr}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
