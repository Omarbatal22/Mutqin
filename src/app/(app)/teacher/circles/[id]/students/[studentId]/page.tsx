import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Calendar, FileText, Sparkles, Settings2 } from "lucide-react"
import { ReportSummary } from "@/components/reports/report-summary"
import { MemorizationSettingsSummary, type MemorizationSettings } from "@/components/memorization/settings-summary"
import { formatQuranRange } from "@/lib/quran"
import { globalToQuran } from "@/lib/progression/adapter"
import { normalizeHifzGlobals } from "@/lib/reports/normalize"
import { getStudentConsistency } from "@/lib/consistency/server"
import { StreakBadge } from "@/components/consistency/streak-badge"
import { WeeklyProgressWidget } from "@/components/consistency/weekly-progress"

export const dynamic = "force-dynamic"

interface StudentDetailsPageProps {
  params: Promise<{ id: string; studentId: string }>
}

export default async function StudentDetailsPage({ params }: StudentDetailsPageProps) {
  const { id: circleId, studentId } = await params
  const supabase = await createClient()

  // Fetch circle details
  const { data: circle } = await supabase
    .from("circles")
    .select("name")
    .eq("id", circleId)
    .single()

  // Fetch student profile details
  const { data: student } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", studentId)
    .single()

  // Fetch membership details
  const { data: membership } = await supabase
    .from("circle_memberships")
    .select("joined_at")
    .eq("circle_id", circleId)
    .eq("user_id", studentId)
    .single()

  // Fetch all reports submitted by this student in this circle
  const { data: reports } = await supabase
    .from("daily_reports")
    .select(`
      id,
      report_date,
      week_reference,
      did_hifz,
      hifz_start_global,
      hifz_end_global,
      hifz_surah,
      hifz_from_ayah,
      hifz_to_ayah,
      hifz_page,
      hifz_mistakes,
      hifz_notes,
      did_revision,
      revision_ranges,
      revision_mistakes,
      revision_notes,
      listener_type,
      listener_user_id,
      listener_name,
      notes,
      total_mistakes
    `)
    .eq("circle_id", circleId)
    .eq("student_id", studentId)
    .order("report_date", { ascending: false })

  // Fetch assignments for this student in this circle (for planned vs actual)
  const { data: assignments } = await supabase
    .from("daily_assignments")
    .select("assignment_date, hifz_start_global, hifz_end_global, hifz_surah, hifz_from_ayah, hifz_to_ayah, revision_ranges, status")
    .eq("circle_id", circleId)
    .eq("student_id", studentId)
    .order("assignment_date", { ascending: false })
    .limit(30)

  // Fetch the student's memorization system (hifz + revision) for this circle
  const { data: settingsRow } = await supabase
    .from("memorization_settings")
    .select(
      "start_surah, start_page, start_ayah, hifz_amount, hifz_custom_note, revision_amount, revision_start, revision_end, revision_cursor",
    )
    .eq("circle_id", circleId)
    .eq("user_id", studentId)
    .maybeSingle()

  const setupRequired = !settingsRow

  // Index assignments by date for easy lookup
  const assignmentByDate = Object.fromEntries(
    (assignments || []).map((a) => [a.assignment_date, a]),
  )

  // Calculate stats for this student
  const totalReports = reports?.length || 0
  const totalMistakes = reports?.reduce((acc, curr) => acc + (curr.total_mistakes || 0), 0) || 0
  const averageMistakes = totalReports > 0 ? (totalMistakes / totalReports).toFixed(1) : 0

  const consistencyStats = await getStudentConsistency(studentId, circleId)

  const joinDateFormatted = membership?.joined_at 
    ? new Date(membership.joined_at).toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' })
    : "غير معروف"

  return (
    <>
      <div className="max-w-4xl mx-auto w-full">
        {/* Back Link */}
        <Link href={`/teacher/dashboard?circleId=${circleId}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold">
          <ArrowRight className="w-4 h-4" />
          العودة للوحة المتابعة
        </Link>

        {/* Student Profile Card */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-stretch">
          <Card className="flex-grow p-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/20 text-primary-650 rounded-full flex items-center justify-center font-bold text-2xl border border-primary-250/30">
              {student?.full_name?.charAt(0) || "ط"}
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase">طالب في حلقة {circle?.name}</span>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">{student?.full_name}</h1>
              <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                تاريخ الانضمام: {joinDateFormatted}
              </p>
              {setupRequired && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>الطالب لم يعدّ نظام الحفظ بعد</span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-w-[280px]">
            <Card className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-xs text-stone-450 font-medium block">التقارير</span>
              <span className="text-2xl font-extrabold font-mono text-stone-900 dark:text-stone-100 mt-1">{totalReports}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-xs text-stone-450 font-medium block">مجموع الأخطاء</span>
              <span className="text-2xl font-extrabold font-mono text-amber-600 mt-1">{totalMistakes}</span>
            </Card>
            <Card className="p-4 col-span-2 md:col-span-1 flex flex-col justify-center items-center text-center">
              <span className="text-xs text-stone-450 font-medium block">معدل الأخطاء/اليوم</span>
              <span className="text-2xl font-extrabold font-mono text-primary-650 mt-1">{averageMistakes}</span>
            </Card>

          {/* Consistency Badge */}
          <div className="w-full md:w-auto shrink-0">
            <StreakBadge
              currentStreak={consistencyStats.currentStreak}
              monthlyConsistencyPct={consistencyStats.monthlyConsistencyPct}
              graceAvailable={consistencyStats.graceAvailable}
              variant="compact"
              className="h-full justify-center"
            />
          </div>
        </div>

        {/* Weekly Progress Widget for Student */}
        <div className="mb-8">
          <WeeklyProgressWidget week={consistencyStats.currentWeek} />
        </div>
        </div>

        {/* Memorization system (hifz + revision) */}
        {settingsRow && (
          <div className="mb-8">
            <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary-650" />
              نظام الطالب في الحفظ والمراجعة
            </h2>
            <MemorizationSettingsSummary
              settings={settingsRow as MemorizationSettings}
            />
          </div>
        )}

        {/* Reports History Title */}
        <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-650" />
          سجل التقارير التاريخي للطالب
        </h2>

        {/* Reports History */}
        {!reports || reports.length === 0 ? (
          <div className="text-center p-8 bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl">
            <p className="text-sm text-stone-500">لم يقم الطالب بإرسال أي تقرير إنجاز بعد.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.map((report) => {
              const reportDate = new Date(report.report_date)
              const dayName = reportDate.toLocaleDateString("ar-EG", { weekday: "long" })
              const dateFormatted = reportDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })

              return (
                <Card key={report.id}>
                  <CardHeader className="pb-2 border-b border-stone-50 dark:border-stone-900/50 mb-3 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        {dayName}، {dateFormatted}
                      </span>
                      {report.week_reference && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">
                          {report.week_reference}
                        </span>
                      )}
                    </div>
                    {/* Planned vs Actual badge */}
                    {(() => {
                      const assignment = assignmentByDate[report.report_date]
                      if (!assignment) return null
                      const normAssign = normalizeHifzGlobals(assignment)
                      const assignQr = normAssign.hifzStartGlobal != null && normAssign.hifzEndGlobal != null
                        ? globalToQuran({ start: normAssign.hifzStartGlobal, end: normAssign.hifzEndGlobal })
                        : null
                      const normReport = normalizeHifzGlobals(report)
                      const reportQr = report.did_hifz && normReport.hifzStartGlobal != null && normReport.hifzEndGlobal != null
                        ? globalToQuran({ start: normReport.hifzStartGlobal, end: normReport.hifzEndGlobal })
                        : null
                      const plannedText = assignQr ? formatQuranRange(assignQr) : null
                      const actualText = reportQr ? formatQuranRange(reportQr) : null
                      const matched = plannedText && actualText ? plannedText === actualText : false
                      return (
                        <Badge variant={matched ? "success" : report.did_hifz ? "warning" : "secondary"}>
                          {matched ? "أكمل المقترح" : report.did_hifz ? "حفظ غير المقترح" : "لم يحفظ"}
                        </Badge>
                      )
                    })()}
                  </CardHeader>

                  {/* Planned suggestion */}
                  {(() => {
                    const assignment = assignmentByDate[report.report_date]
                    if (!assignment) return null
                    const normAssign = normalizeHifzGlobals(assignment)
                    const assignQr = normAssign.hifzStartGlobal != null && normAssign.hifzEndGlobal != null
                      ? globalToQuran({ start: normAssign.hifzStartGlobal, end: normAssign.hifzEndGlobal })
                      : null
                    if (!assignQr) return null
                    return (
                      <div className="flex items-center gap-1.5 px-4 pb-2 text-[11px] text-primary-600 dark:text-primary-400">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold">المقترح:</span>
                        <span>{formatQuranRange(assignQr)}</span>
                      </div>
                    )
                  })()}

                  <CardContent className="pt-2">
                    <ReportSummary report={report as Record<string, unknown> & { report_date: string }} />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
