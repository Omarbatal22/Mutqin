"use client"

import * as React from "react"
import { SURAHS, getSurah, isValidQuranRange } from "@/lib/quran"
import type { QuranRange } from "@/lib/reports/types"

interface QuranRangePickerProps {
  value: QuranRange
  onChange: (range: QuranRange) => void
  /** Optional remove handler — renders a remove button when provided. */
  onRemove?: () => void
  label?: string
}

/**
 * Multi-surah QuranRange picker. Edits start (surah, ayah) and end (surah, ayah)
 * independently. Uses local string state for ayah inputs to avoid per-keystroke
 * clamping bugs while user is typing.
 */
export function QuranRangePicker({ value, onChange, onRemove, label }: QuranRangePickerProps) {
  const [prevStartAyah, setPrevStartAyah] = React.useState(value.startAyah)
  const [startAyahDraft, setStartAyahDraft] = React.useState<string>(String(value.startAyah))
  if (value.startAyah !== prevStartAyah) {
    setPrevStartAyah(value.startAyah)
    setStartAyahDraft(String(value.startAyah))
  }

  const [prevEndAyah, setPrevEndAyah] = React.useState(value.endAyah)
  const [endAyahDraft, setEndAyahDraft] = React.useState<string>(String(value.endAyah))
  if (value.endAyah !== prevEndAyah) {
    setPrevEndAyah(value.endAyah)
    setEndAyahDraft(String(value.endAyah))
  }

  const isValid = isValidQuranRange(value)

  const handleStartSurahChange = (surahNum: number) => {
    const isSingleSurah = value.startSurah === value.endSurah
    const newEndSurah = isSingleSurah ? surahNum : value.endSurah
    onChange({
      ...value,
      startSurah: surahNum,
      endSurah: newEndSurah,
    })
  }

  const handleEndSurahChange = (surahNum: number) => {
    onChange({
      ...value,
      endSurah: surahNum,
    })
  }

  const commitStartAyah = () => {
    const parsed = parseInt(startAyahDraft.trim(), 10)
    if (!isNaN(parsed) && parsed > 0) {
      onChange({ ...value, startAyah: parsed })
    } else {
      setStartAyahDraft(String(value.startAyah))
    }
  }

  const commitEndAyah = () => {
    const parsed = parseInt(endAyahDraft.trim(), 10)
    if (!isNaN(parsed) && parsed > 0) {
      onChange({ ...value, endAyah: parsed })
    } else {
      setEndAyahDraft(String(value.endAyah))
    }
  }

  const startSurahObj = getSurah(value.startSurah)
  const endSurahObj = getSurah(value.endSurah)

  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
          {label ?? "النطاق"}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            إزالة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Start (من) */}
        <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-stone-100 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-900/60">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">من</span>
          <select
            value={value.startSurah}
            onChange={(e) => handleStartSurahChange(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {SURAHS.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.nameAr}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-xs text-stone-500 shrink-0">آية:</label>
            <input
              type="text"
              inputMode="numeric"
              value={startAyahDraft}
              onChange={(e) => setStartAyahDraft(e.target.value)}
              onBlur={commitStartAyah}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-center text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="ltr"
            />
          </div>
          <span className="text-[10px] text-stone-400 self-end">
            (آياتها: {startSurahObj?.ayahCount ?? 0})
          </span>
        </div>

        {/* End (إلى) */}
        <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-stone-100 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-900/60">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">إلى</span>
          <select
            value={value.endSurah}
            onChange={(e) => handleEndSurahChange(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {SURAHS.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.nameAr}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-xs text-stone-500 shrink-0">آية:</label>
            <input
              type="text"
              inputMode="numeric"
              value={endAyahDraft}
              onChange={(e) => setEndAyahDraft(e.target.value)}
              onBlur={commitEndAyah}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-center text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="ltr"
            />
          </div>
          <span className="text-[10px] text-stone-400 self-end">
            (آياتها: {endSurahObj?.ayahCount ?? 0})
          </span>
        </div>
      </div>

      {!isValid && (
        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
          ⚠️ يرجى التأكد من رقم الآيات وأن بداية النطاق تسبق نهايته.
        </span>
      )}
    </div>
  )
}
