"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  hint?: string
}

/**
 * Quick "− n +" numeric control used for error counts on the daily report.
 * Extracted from the original inline control in the report page.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  hint,
}: NumberStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  return (
    <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-900/30 border border-stone-250/60 dark:border-stone-850 rounded-2xl">
      {(label || hint) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              {label}
            </span>
          )}
          {hint && (
            <span className="text-xs text-stone-450 dark:text-stone-500">{hint}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          className="w-10 h-10 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold active:scale-90 transition-all disabled:opacity-40"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-8 text-center font-extrabold text-lg text-stone-900 dark:text-stone-100 font-mono">
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          className="w-10 h-10 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold active:scale-90 transition-all disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
