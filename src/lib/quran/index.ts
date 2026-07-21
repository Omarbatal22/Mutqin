import { SURAHS, type Surah } from "./surahs"

export { SURAHS }
export type { Surah }

/** Look up a surah by its 1-based number. Returns undefined for out-of-range. */
export function getSurah(number: number): Surah | undefined {
  return SURAHS.find((s) => s.number === number)
}

/** Ayah count for a surah, or 0 if the surah number is invalid. */
export function ayahCount(surahNumber: number): number {
  return getSurah(surahNumber)?.ayahCount ?? 0
}

/**
 * The ayah immediately after the given position, rolling into the next surah
 * when past the last ayah. Used to prefill "today's hifz" from yesterday's
 * last recited ayah. Returns null at the end of the mushaf (114:6).
 */
export function nextAyah(
  surahNumber: number,
  ayah: number,
): { surah: number; ayah: number } | null {
  const surah = getSurah(surahNumber)
  if (!surah) return null

  if (ayah < surah.ayahCount) {
    return { surah: surahNumber, ayah: ayah + 1 }
  }
  // past the last ayah of this surah -> first ayah of the next surah
  const next = getSurah(surahNumber + 1)
  if (!next) return null // end of mushaf
  return { surah: next.number, ayah: 1 }
}

/** Format a range as e.g. "البقرة: 135–141" (or "البقرة: 135" for a single ayah). */
export function formatRange(range: {
  surah: number
  fromAyah: number
  toAyah: number
}): string {
  const surah = getSurah(range.surah)
  const name = surah?.nameAr ?? `سورة ${range.surah}`
  if (range.fromAyah === range.toAyah) {
    return `${name}: ${range.fromAyah}`
  }
  return `${name}: ${range.fromAyah}–${range.toAyah}`
}

/** True when from/to are within bounds for the surah and from <= to. */
export function isValidRange(range: {
  surah: number
  fromAyah: number
  toAyah: number
}): boolean {
  const count = ayahCount(range.surah)
  if (count === 0) return false
  return (
    range.fromAyah >= 1 &&
    range.toAyah <= count &&
    range.fromAyah <= range.toAyah
  )
}

// ── Multi-surah QuranRange helpers ───────────────────────────────────────────

function surahName(n: number): string {
  return getSurah(n)?.nameAr ?? `سورة ${n}`
}

/**
 * Format a (possibly multi-surah) QuranRange as a single string.
 * Same surah  → "البقرة: 135–141" (or "البقرة: 135" for a single ayah).
 * Cross-surah → "الفاتحة 1 ← البقرة 5" (inline, for badges/compact contexts).
 */
export function formatQuranRange(range: {
  startSurah: number
  startAyah: number
  endSurah: number
  endAyah: number
}): string {
  if (range.startSurah === range.endSurah) {
    const name = surahName(range.startSurah)
    if (range.startAyah === range.endAyah) return `${name}: ${range.startAyah}`
    return `${name}: ${range.startAyah}–${range.endAyah}`
  }
  return `${surahName(range.startSurah)} ${range.startAyah} ← ${surahName(range.endSurah)} ${range.endAyah}`
}

/**
 * Validate a QuranRange. Both endpoints must be real ayahs (verse exists in its
 * surah) and start must not come after end in mushaf order. Cross-surah,
 * cross-juz and cross-hizb spans are all allowed — no single-surah restriction.
 */
export function isValidQuranRange(range: {
  startSurah: number
  startAyah: number
  endSurah: number
  endAyah: number
}): boolean {
  const startCount = ayahCount(range.startSurah)
  const endCount = ayahCount(range.endSurah)
  if (startCount === 0 || endCount === 0) return false
  if (range.startAyah < 1 || range.startAyah > startCount) return false
  if (range.endAyah < 1 || range.endAyah > endCount) return false
  // start must be at or before end in global order
  if (range.startSurah > range.endSurah) return false
  if (range.startSurah === range.endSurah && range.startAyah > range.endAyah) return false
  return true
}
