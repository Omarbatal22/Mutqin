// Boundary lookups over the generated Quran structural data (page / juz / hizb /
// rub-al-hizb / half-page segment). All positions are 1-based GLOBAL ayah indices
// (1..6236); use globalIndex()/fromGlobal() in ./structure to convert to/from
// (surah, ayah).
//
// The constant arrays are produced offline by scripts/generate-quran-data.ts from
// Tanzil metadata and committed under ./data. This module is pure — safe to unit
// test and to run server-side without a DB.

import { PAGE_STARTS } from "./data/page-starts"
import { QUARTER_STARTS } from "./data/quarter-starts"
import { JUZ_STARTS } from "./data/juz-starts"
import { HALF_PAGE_SEGMENTS } from "./data/segments"
import { TOTAL_AYAHS, clampGlobal } from "./structure"

export const PAGE_COUNT = 604
export const JUZ_COUNT = 30
export const HIZB_COUNT = 60
export const QUARTER_COUNT = 240 // rub-al-hizb

/**
 * Greatest i such that starts[i] <= target (0-based), or -1 if target precedes
 * the first start. starts must be ascending. Used to map a global index to the
 * 1-based number of the page/juz/hizb/quarter that contains it.
 */
function containingIndex(starts: number[], target: number): number {
  let lo = 0
  let hi = starts.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (starts[mid] <= target) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}

/** 1-based page number (1..604) containing the global ayah index. */
export function pageOf(global: number): number {
  return containingIndex(PAGE_STARTS, clampGlobal(global)) + 1
}

/** 1-based juz number (1..30) containing the global ayah index. */
export function juzOf(global: number): number {
  return containingIndex(JUZ_STARTS, clampGlobal(global)) + 1
}

/** 1-based rub-al-hizb / quarter number (1..240). */
export function rubOf(global: number): number {
  return containingIndex(QUARTER_STARTS, clampGlobal(global)) + 1
}

/** 1-based hizb number (1..60). 4 quarters per hizb. */
export function hizbOf(global: number): number {
  return Math.floor((rubOf(global) - 1) / 4) + 1
}

/** Inclusive [start, end] global range of a 1-based page number. */
export function pageRange(page: number): { start: number; end: number } | null {
  if (page < 1 || page > PAGE_COUNT) return null
  const start = PAGE_STARTS[page - 1]
  const end = page < PAGE_COUNT ? PAGE_STARTS[page] - 1 : TOTAL_AYAHS
  return { start, end }
}

/** Inclusive [start, end] global range of a 1-based juz number. */
export function juzRange(juz: number): { start: number; end: number } | null {
  if (juz < 1 || juz > JUZ_COUNT) return null
  const start = JUZ_STARTS[juz - 1]
  const end = juz < JUZ_COUNT ? JUZ_STARTS[juz] - 1 : TOTAL_AYAHS
  return { start, end }
}

/** Inclusive [start, end] global range of a 1-based rub-al-hizb (quarter). */
export function rubRange(quarter: number): { start: number; end: number } | null {
  if (quarter < 1 || quarter > QUARTER_COUNT) return null
  const start = QUARTER_STARTS[quarter - 1]
  const end = quarter < QUARTER_COUNT ? QUARTER_STARTS[quarter] - 1 : TOTAL_AYAHS
  return { start, end }
}

/** Inclusive [start, end] global range of a 1-based hizb number. */
export function hizbRange(hizb: number): { start: number; end: number } | null {
  if (hizb < 1 || hizb > HIZB_COUNT) return null
  const firstQuarter = (hizb - 1) * 4 + 1
  const start = rubRange(firstQuarter)!.start
  const end = hizb < HIZB_COUNT ? rubRange(firstQuarter + 4)!.start - 1 : TOTAL_AYAHS
  return { start, end }
}

/**
 * 0-based index into HALF_PAGE_SEGMENTS of the half-page segment containing the
 * global ayah index, or -1 if none. Segments are contiguous and cover 1..6236.
 */
export function segmentOf(global: number): number {
  const g = clampGlobal(global)
  let lo = 0
  let hi = HALF_PAGE_SEGMENTS.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const seg = HALF_PAGE_SEGMENTS[mid]
    if (g < seg.s) hi = mid - 1
    else if (g > seg.e) lo = mid + 1
    else return mid
  }
  return -1
}

/**
 * The half-page segment immediately after the one containing `global`, or null
 * at the end of the mushaf. Used by the engine to advance half-page hifz.
 */
export function nextSegment(global: number): { s: number; e: number } | null {
  const idx = segmentOf(global)
  if (idx < 0 || idx + 1 >= HALF_PAGE_SEGMENTS.length) return null
  return HALF_PAGE_SEGMENTS[idx + 1]
}

/** The half-page segment containing `global`, or null. */
export function segmentAt(global: number): { s: number; e: number } | null {
  const idx = segmentOf(global)
  return idx < 0 ? null : HALF_PAGE_SEGMENTS[idx]
}
