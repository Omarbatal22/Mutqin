import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  globalIndex,
} from "../quran/structure"
import {
  pageOf,
  rubRange,
} from "../quran/structure-boundaries"
import {
  toGlobalRange,
  toAyahRange,
  rubSpanToGlobal,
} from "./adapter"
import {
  computeFrontier,
  advanceRevisionCursor,
  mergeRanges,
  cycleRubBounds,
  normalizeCursor,
  suggestHifz,
  suggestRevisionRubs,
  type HifzMode,
  type RevisionAmount,
  type GlobalRange,
} from "./engine"
import { type AyahRange, type StructuredReport } from "../reports/types"
import { type Json } from "@/lib/supabase/database.types"

export interface MemorizationSettings {
  user_id: string
  circle_id: string
  start_surah: number
  start_ayah: number
  start_page: number | null
  hifz_amount: string
  hifz_custom_note: string | null
  revision_amount: string
  revision_start: number
  revision_end: number | null
  revision_cursor: number | null
  created_at?: string
  updated_at?: string
}

export interface DailyAssignment {
  id: string
  circle_id: string
  student_id: string
  assignment_date: string
  hifz_surah: number | null
  hifz_from_ayah: number | null
  hifz_to_ayah: number | null
  revision_ranges: AyahRange[]
  source_frontier: number | null
  source_cursor: number | null
  status: "pending" | "submitted" | "skipped"
  created_at?: string
  updated_at?: string
}

export interface TodayView {
  setupRequired: boolean
  circle: {
    id: string
    name: string
    timezone: string
    current_week: number | null
  }
  settings: MemorizationSettings | null
  assignment: DailyAssignment | null
  report: StructuredReport | null
  frontier: number
  recomputedCursor: number
}

/**
 * Computes the circle-local date as a string (YYYY-MM-DD) based on target timezone.
 * Purely uses Intl.DateTimeFormat to avoid external timezone library dependencies.
 */
export function getCircleLocalDate(tz: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const month = parts.find((p) => p.type === "month")?.value
  const day = parts.find((p) => p.type === "day")?.value
  const year = parts.find((p) => p.type === "year")?.value
  return `${year}-${month}-${day}`
}

/**
 * Retrieves the progression state and daily assignment for the current student in a circle.
 * Recomputes the hifz frontier and generates/updates the daily assignment if out-of-date.
 */
export async function getToday(circleId: string): Promise<TodayView> {
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("User not authenticated")
  }

  // 2. Load circle information
  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .select("id, name, timezone, current_week")
    .eq("id", circleId)
    .single()

  if (circleError || !circle) {
    throw new Error("Circle not found")
  }

  // 3. Load student memorization settings
  const { data: settings } = await supabase
    .from("memorization_settings")
    .select("*")
    .eq("user_id", user.id)
    .eq("circle_id", circleId)
    .maybeSingle()

  if (!settings) {
    return {
      setupRequired: true,
      circle,
      settings: null,
      assignment: null,
      report: null,
      frontier: 0,
      recomputedCursor: 1,
    }
  }

  // 4. Determine circle-local today date
  const todayStr = getCircleLocalDate(circle.timezone)

  // 5. Fetch all student's successful hifz reports in this circle to recompute frontier
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("hifz_surah, hifz_from_ayah, hifz_to_ayah")
    .eq("student_id", user.id)
    .eq("circle_id", circleId)
    .eq("did_hifz", true)

  const startGlobal = globalIndex(settings.start_surah, settings.start_ayah) || 1
  const completed = (reports || [])
    .filter(
      (r): r is { hifz_surah: number; hifz_from_ayah: number; hifz_to_ayah: number } =>
        r.hifz_surah != null && r.hifz_from_ayah != null && r.hifz_to_ayah != null,
    )
    .map((r) => toGlobalRange({ surah: r.hifz_surah, fromAyah: r.hifz_from_ayah, toAyah: r.hifz_to_ayah }))
    .filter(Boolean) as GlobalRange[]

  const frontier = computeFrontier(startGlobal, completed)

  // 6. Determine cycle bounds and current revision cursor
  const bounds = cycleRubBounds(settings.revision_start ?? 1, settings.revision_end || 60)
  const cursor = normalizeCursor(settings.revision_cursor, bounds)

  // 7. Load today's assignment if it exists
  let { data: assignment } = await supabase
    .from("daily_assignments")
    .select("*")
    .eq("student_id", user.id)
    .eq("circle_id", circleId)
    .eq("assignment_date", todayStr)
    .maybeSingle()

  // 8. If assignment doesn't exist, or if it is pending and has stale inputs, regenerate it
  const needsGeneration = !assignment || (
    assignment.status === "pending" && (
      assignment.source_frontier !== frontier ||
      assignment.source_cursor !== cursor
    )
  )

  if (needsGeneration) {
    const hifzSuggestion = suggestHifz(settings.hifz_amount as HifzMode, frontier)
    const hifzRange = hifzSuggestion ? toAyahRange(hifzSuggestion) : null

    const revSuggestionRubs = suggestRevisionRubs(cursor, settings.revision_amount as RevisionAmount, bounds)
    const revSuggestionGlobal = rubSpanToGlobal(revSuggestionRubs.fromRub, revSuggestionRubs.toRub)
    const revRange = revSuggestionGlobal ? toAyahRange(revSuggestionGlobal) : null

    const assignmentPayload = {
      circle_id: circleId,
      student_id: user.id,
      assignment_date: todayStr,
      hifz_surah: hifzRange?.surah ?? null,
      hifz_from_ayah: hifzRange?.fromAyah ?? null,
      hifz_to_ayah: hifzRange?.toAyah ?? null,
      revision_ranges: (revRange ? [revRange] : []) as unknown as Json,
      source_frontier: frontier,
      source_cursor: cursor,
      status: "pending",
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("daily_assignments")
      .upsert(assignmentPayload, { onConflict: "circle_id,student_id,assignment_date" })
      .select("*")
      .single()

    if (upsertError) {
      throw new Error(`Failed to upsert today's assignment: ${upsertError.message}`)
    }
    assignment = upserted
  }

  // 9. Load today's submitted report
  const { data: report } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("student_id", user.id)
    .eq("circle_id", circleId)
    .eq("report_date", todayStr)
    .maybeSingle()

  return {
    setupRequired: false,
    circle,
    settings: settings as unknown as MemorizationSettings,
    assignment: assignment as unknown as DailyAssignment | null,
    report: report as unknown as StructuredReport | null,
    frontier,
    recomputedCursor: cursor,
  }
}

export interface SubmitReportInput {
  circleId: string
  assignmentId: string | null
  didHifz: boolean
  hifzRange: { surah: number; fromAyah: number; toAyah: number } | null
  hifzMistakes: number
  hifzNotes: string
  didRevision: boolean
  revisionRanges: Array<{ surah: number; fromAyah: number; toAyah: number }>
  revisionMistakes: number
  revisionNotes: string
  listenerType: "teacher" | "peer" | "other"
  listenerUserId: string | null
  listenerName: string | null
  notes: string
  weekReference: string
}

/**
 * Server action to submit a daily report.
 * Recomputes the advanced revision cursor based on the student's actual revision progress,
 * and calls the database RPC to atomically submit the report and update state.
 */
export async function submitReport(input: SubmitReportInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // 1. Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "المستخدم غير مسجل الدخول" }
    }

    // 2. Fetch student memorization settings to get bounds and current cursor
    const { data: settings, error: settingsError } = await supabase
      .from("memorization_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("circle_id", input.circleId)
      .single()

    if (settingsError || !settings) {
      return { success: false, error: "تعذر العثور على إعدادات الحفظ للحلقة" }
    }

    const bounds = cycleRubBounds(settings.revision_start ?? 1, settings.revision_end || 60)
    const cursor = normalizeCursor(settings.revision_cursor, bounds)

    // 3. Compute how many revision rubs were completed from the current cursor
    let completedRubs = 0
    if (input.didRevision && input.revisionRanges.length > 0) {
      const completedRanges = input.revisionRanges
        .map(toGlobalRange)
        .filter(Boolean) as GlobalRange[]

      const mergedCompleted = mergeRanges(completedRanges)
      let checkRub = cursor
      while (checkRub <= bounds.endRub) {
        const rRange = rubRange(checkRub)
        if (!rRange) break
        // Check if this rub is fully contained in any of the student's completed ranges
        const isContained = mergedCompleted.some(
          (m: GlobalRange) => m.start <= rRange.start && m.end >= rRange.end
        )
        if (isContained) {
          completedRubs++
          checkRub++
        } else {
          break
        }
      }
    }

    const newCursor = advanceRevisionCursor(cursor, completedRubs, bounds)

    // 4. Calculate hifz_page if hifz is submitted
    let hifzPage = null
    if (input.didHifz && input.hifzRange) {
      const globalRange = toGlobalRange(input.hifzRange)
      if (globalRange) {
        hifzPage = pageOf(globalRange.start)
      }
    }

    const reportPayload = {
      week_reference: input.weekReference || null,
      did_hifz: input.didHifz,
      hifz_surah: input.didHifz && input.hifzRange ? input.hifzRange.surah : null,
      hifz_from_ayah: input.didHifz && input.hifzRange ? input.hifzRange.fromAyah : null,
      hifz_to_ayah: input.didHifz && input.hifzRange ? input.hifzRange.toAyah : null,
      hifz_page: hifzPage,
      hifz_mistakes: input.didHifz ? input.hifzMistakes : 0,
      hifz_notes: input.didHifz ? input.hifzNotes || null : null,
      did_revision: input.didRevision,
      revision_ranges: input.didRevision ? input.revisionRanges : [],
      revision_mistakes: input.didRevision ? input.revisionMistakes : 0,
      revision_notes: input.didRevision ? input.revisionNotes || null : null,
      listener_type: input.listenerType,
      listener_user_id: input.listenerType === "peer" ? input.listenerUserId || null : null,
      listener_name: input.listenerName || null,
      notes: input.notes || null,
    }

    // 5. Call submit_daily_report RPC
    const { error: rpcError } = await supabase.rpc("submit_daily_report", {
      p_circle_id: input.circleId,
      p_assignment_id: input.assignmentId,
      p_report: reportPayload,
      p_new_cursor: newCursor,
    })

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    // 6. Refresh related paths
    revalidatePath("/student/report")
    revalidatePath("/student/dashboard")
    revalidatePath("/teacher/dashboard")

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إرسال التقرير",
    }
  }
}
