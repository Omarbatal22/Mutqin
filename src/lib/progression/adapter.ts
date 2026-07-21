// Adapters between the app's multi-surah QuranRange (used by the UI,
// daily_reports, daily_assignments) and the engine's global-ayah-index
// GlobalRange. Both endpoints of a QuranRange carry their own surah, so
// cross-surah spans convert losslessly in both directions.

import { globalIndex, fromGlobal } from "../quran/structure"
import { rubRange } from "../quran/structure-boundaries"
import type { GlobalRange } from "./engine"
import type { QuranRange } from "../reports/types"

/** QuranRange -> GlobalRange, or null if either endpoint is out of range. */
export function quranToGlobal(r: QuranRange): GlobalRange | null {
  const start = globalIndex(r.startSurah, r.startAyah)
  const end = globalIndex(r.endSurah, r.endAyah)
  if (start == null || end == null) return null
  return { start: Math.min(start, end), end: Math.max(start, end) }
}

/**
 * GlobalRange -> QuranRange. Each endpoint resolves to its own (surah, ayah),
 * so a span crossing a surah boundary keeps distinct start/end surahs.
 */
export function globalToQuran(r: GlobalRange): QuranRange | null {
  const a = fromGlobal(r.start)
  const b = fromGlobal(r.end)
  if (!a || !b) return null
  return {
    startSurah: a.surah,
    startAyah: a.ayah,
    endSurah: b.surah,
    endAyah: b.ayah,
  }
}

/** Global range spanning an inclusive rub-al-hizb (quarter) index span. */
export function rubSpanToGlobal(fromRub: number, toRub: number): GlobalRange | null {
  const a = rubRange(fromRub)
  const b = rubRange(toRub)
  if (!a || !b) return null
  return { start: a.start, end: b.end }
}
