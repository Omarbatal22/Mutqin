import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { globalIndex } from "../quran/structure"
import { pageOf, rubRange } from "../quran/structure-boundaries"
import { quranToGlobal, globalToQuran, rubSpanToGlobal } from "./adapter"
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
import type { QuranRange, StructuredReport } from "../reports/types"
import { normalizeHifzGlobals, normalizeRevisionRanges } from "../reports/normalize"
import type { Json } from "@/lib/supabase/database.types"

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
  hifz_start_global: number | null
  hifz_end_global: number | null
  hifz_surah?: number | null
  hifz_from_ayah?: number | null
  hifz_to_ayah?: number | null
  revision_ranges: QuranRange[]
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
    .select("hifz_start_global, hifz_end_global, hifz_surah, hifz_from_ayah, hifz_to_ayah")
    .eq("student_id", user.id)
    .eq("circle_id", circleId)
    .eq("did_hifz", true)

  const startGlobal = globalIndex(settings.start_surah, settings.start_ayah) || 1
  const completed: GlobalRange[] = (reports || [])
    .map((r) => {
      const norm = normalizeHifzGlobals(r)
      if (norm.hifzStartGlobal != null && norm.hifzEndGlobal != null) {
        return { start: norm.hifzStartGlobal, end: norm.hifzEndGlobal }
      }
      return null
    })
    .filter(Boolean) as GlobalRange[]

  const frontier = computeFrontier(startGlobal, completed)

  // 6. Determine cycle bounds and current revision cursor
  const bounds = cycleRubBounds(settings.revision_start ?? 1, settings.revision_end || 60)
  const cursor = normalizeCursor(settings.revision_cursor, bounds)

  // 7. Load today's assignment if it exists
  let { data: rawAssignment } = await supabase
    .from("daily_assignments")
    .select("*")
    .eq("student_id", user.id)
    .eq("circle_id", circleId)
    .eq("assignment_date", todayStr)
    .maybeSingle()

  // 8. If assignment doesn't exist, or if it is pending and has stale inputs, regenerate it
  const needsGeneration =
    !rawAssignment ||
    (rawAssignment.status === "pending" &&
      (rawAssignment.source_frontier !== frontier || rawAssignment.source_cursor !== cursor))

  if (needsGeneration) {
    const hifzSuggestion = suggestHifz(settings.hifz_amount as HifzMode, frontier)

    const revSuggestionRubs = suggestRevisionRubs(cursor, settings.revision_amount as RevisionAmount, bounds)
    const revSuggestionGlobal = rubSpanToGlobal(revSuggestionRubs.fromRub, revSuggestionRubs.toRub)
    const revRange = revSuggestionGlobal ? globalToQuran(revSuggestionGlobal) : null

    const assignmentPayload = {
      circle_id: circleId,
      student_id: user.id,
      assignment_date: todayStr,
      hifz_start_global: hifzSuggestion?.start ?? null,
      hifz_end_global: hifzSuggestion?.end ?? null,
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
    rawAssignment = upserted
  }

  const assignment: DailyAssignment | null = rawAssignment
    ? {
        id: rawAssignment.id,
        circle_id: rawAssignment.circle_id,
        student_id: rawAssignment.student_id,
        assignment_date: rawAssignment.assignment_date,
        hifz_start_global: rawAssignment.hifz_start_global ?? null,
        hifz_end_global: rawAssignment.hifz_end_global ?? null,
        hifz_surah: rawAssignment.hifz_surah,
        hifz_from_ayah: rawAssignment.hifz_from_ayah,
        hifz_to_ayah: rawAssignment.hifz_to_ayah,
        revision_ranges: normalizeRevisionRanges(rawAssignment.revision_ranges),
        source_frontier: rawAssignment.source_frontier,
        source_cursor: rawAssignment.source_cursor,
        status: rawAssignment.status as "pending" | "submitted" | "skipped",
        created_at: rawAssignment.created_at,
        updated_at: rawAssignment.updated_at,
      }
    : null

  // 9. Load today's submitted report
  const { data: rawReport } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("student_id", user.id)
    .eq("circle_id", circleId)
    .eq("report_date", todayStr)
    .maybeSingle()

  const report: StructuredReport | null = rawReport
    ? {
        id: rawReport.id,
        report_date: rawReport.report_date,
        week_reference: rawReport.week_reference,
        did_hifz: rawReport.did_hifz,
        hifz_start_global: rawReport.hifz_start_global ?? null,
        hifz_end_global: rawReport.hifz_end_global ?? null,
        hifz_page: rawReport.hifz_page,
        hifz_mistakes: rawReport.hifz_mistakes,
        hifz_notes: rawReport.hifz_notes,
        did_revision: rawReport.did_revision,
        revision_ranges: normalizeRevisionRanges(rawReport.revision_ranges),
        revision_mistakes: rawReport.revision_mistakes,
        revision_notes: rawReport.revision_notes,
        listener_type: rawReport.listener_type as StructuredReport["listener_type"],
        listener_user_id: rawReport.listener_user_id,
        listener_name: rawReport.listener_name,
        notes: rawReport.notes,
        total_mistakes: rawReport.total_mistakes,
      }
    : null

  return {
    setupRequired: false,
    circle,
    settings: settings as unknown as MemorizationSettings,
    assignment,
    report,
    frontier,
    recomputedCursor: cursor,
  }
}

export interface SubmitReportInput {
  circleId: string
  assignmentId: string | null
  didHifz: boolean
  hifzRange: QuranRange | null
  hifzMistakes: number
  hifzNotes: string
  didRevision: boolean
  revisionRanges: QuranRange[]
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
      const completedRanges = input.revisionRanges.map(quranToGlobal).filter(Boolean) as GlobalRange[]

      const mergedCompleted = mergeRanges(completedRanges)
      let checkRub = cursor
      while (checkRub <= bounds.endRub) {
        const rRange = rubRange(checkRub)
        if (!rRange) break
        // Check if this rub is fully contained in any of the student's completed ranges
        const isContained = mergedCompleted.some(
          (m: GlobalRange) => m.start <= rRange.start && m.end >= rRange.end,
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

    // 4. Calculate hifz_page and global start/end if hifz is submitted
    let hifzPage = null
    const hifzGlobal = input.didHifz && input.hifzRange ? quranToGlobal(input.hifzRange) : null
    if (hifzGlobal) {
      hifzPage = pageOf(hifzGlobal.start)
    }

    const reportPayload = {
      week_reference: input.weekReference || null,
      did_hifz: input.didHifz,
      hifz_start_global: hifzGlobal?.start ?? null,
      hifz_end_global: hifzGlobal?.end ?? null,
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
      p_report: reportPayload as unknown as Json,
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
