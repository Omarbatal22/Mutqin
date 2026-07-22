import { createClient } from "@/lib/supabase/server"
import { computeConsistency, type ConsistencyStats } from "./engine"

/**
 * Computes the circle-local date string YYYY-MM-DD.
 */
export function getCircleLocalDate(tz: string = "Africa/Cairo"): string {
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
 * Server-side helper to fetch student report dates and compute consistency stats.
 */
export async function getStudentConsistency(
  studentId: string,
  circleId?: string,
  graceUsedDates: string[] = []
): Promise<ConsistencyStats> {
  const supabase = await createClient()

  let timezone = "Africa/Cairo"
  if (circleId) {
    const { data: circle } = await supabase
      .from("circles")
      .select("timezone")
      .eq("id", circleId)
      .single()
    if (circle?.timezone) timezone = circle.timezone
  }

  const todayStr = getCircleLocalDate(timezone)

  let query = supabase
    .from("daily_reports")
    .select("report_date")
    .eq("student_id", studentId)

  if (circleId) {
    query = query.eq("circle_id", circleId)
  }

  const { data: rows } = await query

  const submittedDates = Array.from(
    new Set((rows || []).map((r) => r.report_date))
  ).sort()

  return computeConsistency(submittedDates, todayStr, graceUsedDates)
}

/**
 * Batch-fetches report dates for multiple students in a circle and returns map of studentId -> ConsistencyStats.
 */
export async function getCircleStudentsConsistency(
  circleId: string,
  studentIds: string[]
): Promise<Record<string, ConsistencyStats>> {
  if (studentIds.length === 0) return {}

  const supabase = await createClient()

  const { data: circle } = await supabase
    .from("circles")
    .select("timezone")
    .eq("id", circleId)
    .single()

  const timezone = circle?.timezone ?? "Africa/Cairo"
  const todayStr = getCircleLocalDate(timezone)

  const { data: rows } = await supabase
    .from("daily_reports")
    .select("student_id, report_date")
    .eq("circle_id", circleId)
    .in("student_id", studentIds)

  const studentDatesMap: Record<string, string[]> = {}
  for (const id of studentIds) {
    studentDatesMap[id] = []
  }

  for (const row of rows || []) {
    if (studentDatesMap[row.student_id]) {
      studentDatesMap[row.student_id].push(row.report_date)
    }
  }

  const result: Record<string, ConsistencyStats> = {}
  for (const id of studentIds) {
    const dates = Array.from(new Set(studentDatesMap[id])).sort()
    result[id] = computeConsistency(dates, todayStr)
  }

  return result
}
