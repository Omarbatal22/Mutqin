"use client"

import type { AyahRange, QuranRange } from "@/lib/reports/types"
import { QuranRangePicker } from "./quran-range-picker"

export { QuranRangePicker }

interface SurahAyahPickerProps {
  value: AyahRange
  onChange: (range: AyahRange) => void
  onRemove?: () => void
}

/**
 * Adapter for legacy AyahRange props using the new multi-surah QuranRangePicker.
 */
export function SurahAyahPicker({ value, onChange, onRemove }: SurahAyahPickerProps) {
  const qr: QuranRange = {
    startSurah: value.surah,
    startAyah: value.fromAyah,
    endSurah: value.surah,
    endAyah: value.toAyah,
  }

  return (
    <QuranRangePicker
      value={qr}
      onChange={(newQr) => {
        onChange({
          surah: newQr.startSurah,
          fromAyah: newQr.startAyah,
          toAyah: newQr.endAyah,
        })
      }}
      onRemove={onRemove}
    />
  )
}
