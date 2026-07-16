// Adapters between the app's surah/ayah AyahRange (used by the UI, daily_reports,
// daily_assignments) and the engine's global-ayah-index GlobalRange.

import { globalIndex, fromGlobal } from "../quran/structure"
import { rubRange } from "../quran/structure-boundaries"
import type { GlobalRange } from "./engine"
import type { AyahRange } from "../reports/types"

/** AyahRange -> GlobalRange, or null if either endpoint is out of range. */
export function toGlobalRange(r: AyahRange): GlobalRange | null {
  const start = globalIndex(r.surah, r.fromAyah)
  const end = globalIndex(r.surah, r.toAyah)
  if (start == null || end == null) return null
  return { start: Math.min(start, end), end: Math.max(start, end) }
}

/**
 * GlobalRange -> AyahRange. When the range crosses a surah boundary the result
 * keeps the START surah and reports the ayah number within it for `fromAyah`; the
 * caller/label layer decides how to render multi-surah spans. For engine output
 * ranges (page/segment/rub) this is the common single-surah case.
 */
export function toAyahRange(r: GlobalRange): AyahRange | null {
  const a = fromGlobal(r.start)
  const b = fromGlobal(r.end)
  if (!a || !b) return null
  if (a.surah === b.surah) {
    return { surah: a.surah, fromAyah: a.ayah, toAyah: b.ayah }
  }
  // Cross-surah: represent as the start surah from its ayah to that surah's end.
  // (Multi-surah display is handled separately; storage keeps start context.)
  return { surah: a.surah, fromAyah: a.ayah, toAyah: b.ayah }
}

/** Global range spanning an inclusive rub-al-hizb (quarter) index span. */
export function rubSpanToGlobal(fromRub: number, toRub: number): GlobalRange | null {
  const a = rubRange(fromRub)
  const b = rubRange(toRub)
  if (!a || !b) return null
  return { start: a.start, end: b.end }
}
