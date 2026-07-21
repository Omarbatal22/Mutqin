// Shared types for the structured daily report, mirroring the daily_reports
// table shape after 20260722000000_quran_range_multisurah.sql.

/**
 * A Quran range that may span multiple surahs. This is the canonical app/UI
 * domain type. Start and end each carry their own surah, so Al-Fatihah 1 →
 * Al-Baqarah 5 is representable (unlike the legacy single-surah AyahRange).
 */
export interface QuranRange {
  startSurah: number
  startAyah: number
  endSurah: number
  endAyah: number
}

/**
 * LEGACY single-surah range. Retained only so the read-normalizer can upgrade
 * historical rows / JSONB written before the multi-surah refactor. New code
 * should use QuranRange everywhere.
 */
export interface AyahRange {
  surah: number
  fromAyah: number
  toAyah: number
}

export type ListenerType = "teacher" | "peer" | "other"

export interface StructuredReport {
  id?: string
  report_date: string
  week_reference?: string | null

  did_hifz: boolean
  // Global ayah indices (1..6236); null when no hifz. Multi-surah safe.
  hifz_start_global: number | null
  hifz_end_global: number | null
  hifz_page: number | null
  hifz_mistakes: number
  hifz_notes: string | null

  did_revision: boolean
  revision_ranges: QuranRange[]
  revision_mistakes: number
  revision_notes: string | null

  listener_type: ListenerType | null
  listener_user_id: string | null
  listener_name: string | null

  notes: string | null
  total_mistakes?: number
}
