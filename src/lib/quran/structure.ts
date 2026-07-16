// Canonical Quran *structure* helpers: conversions between a (surah, ayah)
// pair and a 1-based global ayah sequence number (1..6236), plus lookups into
// the page / juz / hizb / rub-al-hizb / half-page-segment boundary tables.
//
// The surah<->global math in THIS file is self-contained: it derives entirely
// from the SURAHS ayah counts (Σ = 6236) and needs no external dataset.
//
// The boundary lookups (pageOf, juzOf, hizbOf, rubOf, segmentOf, nextSegment,
// *Range) live in ./structure-boundaries and read the generated constant arrays
// under ./data (produced by scripts/generate-quran-data.ts). They are kept in a
// separate module so this global-index core can be imported and tested before
// the generated data exists.

import { SURAHS, ayahCount } from "./index"

/** Total ayahs in the mushaf (Hafs/Madani). Σ of all surah ayah counts. */
export const TOTAL_AYAHS = SURAHS.reduce((sum, s) => sum + s.ayahCount, 0) // 6236

/**
 * Cumulative ayah offset BEFORE each surah, indexed by surah number.
 * SURAH_OFFSET[1] = 0, SURAH_OFFSET[2] = 7 (al-Fatiha has 7), etc.
 * Length 115 so SURAH_OFFSET[114] is valid; index 0 is unused padding.
 */
export const SURAH_OFFSET: number[] = (() => {
  const offsets = new Array<number>(SURAHS.length + 1)
  offsets[0] = 0
  let running = 0
  for (const s of SURAHS) {
    offsets[s.number] = running
    running += s.ayahCount
  }
  return offsets
})()

/**
 * 1-based global sequence number for (surah, ayah), or null when the pair is
 * out of range. globalIndex(1, 1) === 1; globalIndex(114, 6) === 6236.
 */
export function globalIndex(surah: number, ayah: number): number | null {
  const count = ayahCount(surah)
  if (count === 0) return null
  if (ayah < 1 || ayah > count) return null
  return SURAH_OFFSET[surah] + ayah
}

/**
 * Inverse of globalIndex: the (surah, ayah) at a 1-based global sequence number,
 * or null when out of [1, TOTAL_AYAHS]. Binary search over SURAH_OFFSET.
 */
export function fromGlobal(index: number): { surah: number; ayah: number } | null {
  if (!Number.isInteger(index) || index < 1 || index > TOTAL_AYAHS) return null
  // Find the greatest surah whose offset is < index.
  let lo = 1
  let hi = SURAHS.length // 114
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (SURAH_OFFSET[mid] < index) lo = mid
    else hi = mid - 1
  }
  return { surah: lo, ayah: index - SURAH_OFFSET[lo] }
}

/** Clamp a global index into the valid mushaf range [1, TOTAL_AYAHS]. */
export function clampGlobal(index: number): number {
  if (index < 1) return 1
  if (index > TOTAL_AYAHS) return TOTAL_AYAHS
  return Math.trunc(index)
}
