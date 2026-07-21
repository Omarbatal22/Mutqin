// Read-time normalizer: turns a raw daily_reports / daily_assignments row into
// the canonical multi-surah shapes, upgrading legacy single-surah data on the
// fly. This is what lets the multi-surah migration stay additive (no SQL
// backfill): rows written before the refactor only have the legacy
// hifz_surah/from/to columns and {surah,fromAyah,toAyah} JSONB, and we derive
// the global indices / QuranRange objects here.

import { globalIndex } from "../quran/structure"
import type { QuranRange } from "./types"

/** Shape of the range-bearing columns as they come back from Supabase. */
export interface RawRangeRow {
  hifz_start_global?: number | null
  hifz_end_global?: number | null
  // legacy single-surah columns
  hifz_surah?: number | null
  hifz_from_ayah?: number | null
  hifz_to_ayah?: number | null
  revision_ranges?: unknown
}

export interface NormalizedRanges {
  hifzStartGlobal: number | null
  hifzEndGlobal: number | null
  revisionRanges: QuranRange[]
}

/** Derive the global-index hifz span from whichever columns are populated. */
export function normalizeHifzGlobals(row: RawRangeRow): {
  hifzStartGlobal: number | null
  hifzEndGlobal: number | null
} {
  if (row.hifz_start_global != null && row.hifz_end_global != null) {
    return { hifzStartGlobal: row.hifz_start_global, hifzEndGlobal: row.hifz_end_global }
  }
  // Legacy fallback: single-surah columns.
  if (row.hifz_surah != null && row.hifz_from_ayah != null && row.hifz_to_ayah != null) {
    const start = globalIndex(row.hifz_surah, row.hifz_from_ayah)
    const end = globalIndex(row.hifz_surah, row.hifz_to_ayah)
    if (start != null && end != null) {
      return { hifzStartGlobal: Math.min(start, end), hifzEndGlobal: Math.max(start, end) }
    }
  }
  return { hifzStartGlobal: null, hifzEndGlobal: null }
}

/**
 * Upgrade a raw revision_ranges JSONB array to QuranRange[]. Accepts both the
 * new shape ({startSurah,startAyah,endSurah,endAyah}) and the legacy shape
 * ({surah,fromAyah,toAyah}); anything unrecognized is dropped.
 */
export function normalizeRevisionRanges(raw: unknown): QuranRange[] {
  if (!Array.isArray(raw)) return []
  const out: QuranRange[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    if (
      typeof o.startSurah === "number" &&
      typeof o.startAyah === "number" &&
      typeof o.endSurah === "number" &&
      typeof o.endAyah === "number"
    ) {
      out.push({
        startSurah: o.startSurah,
        startAyah: o.startAyah,
        endSurah: o.endSurah,
        endAyah: o.endAyah,
      })
    } else if (
      typeof o.surah === "number" &&
      typeof o.fromAyah === "number" &&
      typeof o.toAyah === "number"
    ) {
      // legacy single-surah item
      out.push({
        startSurah: o.surah,
        startAyah: o.fromAyah,
        endSurah: o.surah,
        endAyah: o.toAyah,
      })
    }
  }
  return out
}

/** Normalize both hifz + revision ranges from a raw row. */
export function normalizeReportRanges(row: RawRangeRow): NormalizedRanges {
  const { hifzStartGlobal, hifzEndGlobal } = normalizeHifzGlobals(row)
  return {
    hifzStartGlobal,
    hifzEndGlobal,
    revisionRanges: normalizeRevisionRanges(row.revision_ranges),
  }
}
