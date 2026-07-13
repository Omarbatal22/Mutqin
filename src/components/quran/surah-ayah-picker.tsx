"use client"

import * as React from "react"
import { SURAHS, getSurah } from "@/lib/quran"
import type { AyahRange } from "@/lib/reports/types"

interface SurahAyahPickerProps {
  value: AyahRange
  onChange: (range: AyahRange) => void
  /** Optional remove handler — renders a remove button when provided. */
  onRemove?: () => void
}

/**
 * Surah <select> + from/to ayah inputs. Clamps ayah numbers to the selected
 * surah's ayah count (validated against the canonical SURAHS list).
 */
export function SurahAyahPicker({ value, onChange, onRemove }: SurahAyahPickerProps) {
  const surah = getSurah(value.surah)
  const maxAyah = surah?.ayahCount ?? 1

  const setSurah = (surahNumber: number) => {
    const s = getSurah(surahNumber)
    const cap = s?.ayahCount ?? 1
    onChange({
      surah: surahNumber,
      fromAyah: Math.min(value.fromAyah, cap),
      toAyah: Math.min(value.toAyah, cap),
    })
  }

  const setFrom = (n: number) => {
    const from = Math.min(Math.max(1, n), maxAyah)
    onChange({ ...value, fromAyah: from, toAyah: Math.max(from, value.toAyah) })
  }

  const setTo = (n: number) => {
    const to = Math.min(Math.max(value.fromAyah, n), maxAyah)
    onChange({ ...value, toAyah: to })
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-850 bg-white dark:bg-stone-900/40">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">السورة</label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-600 font-medium"
          >
            إزالة
          </button>
        )}
      </div>
      <select
        value={value.surah}
        onChange={(e) => setSurah(Number(e.target.value))}
        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
      >
        {SURAHS.map((s) => (
          <option key={s.number} value={s.number}>
            {s.number}. {s.nameAr}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">من آية</label>
          <input
            type="number"
            min={1}
            max={maxAyah}
            value={value.fromAyah}
            onChange={(e) => setFrom(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">إلى آية</label>
          <input
            type="number"
            min={value.fromAyah}
            max={maxAyah}
            value={value.toAyah}
            onChange={(e) => setTo(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            dir="ltr"
          />
        </div>
      </div>
      <span className="text-[10px] text-stone-400">عدد آيات السورة: {maxAyah}</span>
    </div>
  )
}
