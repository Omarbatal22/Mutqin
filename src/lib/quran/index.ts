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
