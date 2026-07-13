// Shared types for the structured daily report, mirroring the daily_reports
// table shape after 20260713020000_memorization_and_structured_reports.sql.

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
  hifz_surah: number | null
  hifz_from_ayah: number | null
  hifz_to_ayah: number | null
  hifz_page: number | null
  hifz_mistakes: number
  hifz_notes: string | null

  did_revision: boolean
  revision_ranges: AyahRange[]
  revision_mistakes: number
  revision_notes: string | null

  listener_type: ListenerType | null
  listener_user_id: string | null
  listener_name: string | null

  notes: string | null
  total_mistakes?: number
}
