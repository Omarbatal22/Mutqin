import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Calendar,
  FileText,
  Sparkles,
  Settings2,
  BookOpen,
  BookMarked,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  Flame,
} from "lucide-react"
import { ReportSummary } from "@/components/reports/report-summary"
import { MemorizationSettingsSummary, type MemorizationSettings } from "@/components/memorization/settings-summary"
import { formatQuranRange } from "@/lib/quran"
import { globalToQuran } from "@/lib/progression/adapter"
import { normalizeHifzGlobals } from "@/lib/reports/normalize"
import { getStudentConsistency } from "@/lib/consistency/server"
import { WeeklyProgressWidget } from "@/components/consistency/weekly-progress"

export const dynamic = "force-dynamic"

interface StudentDetailsPageProps {
  params: Promise<{ id: string; studentId: string }>
}

export default async function StudentDetailsPage({ params }: StudentDetailsPageProps) {
  const { id: circleId, studentId } = await params
  const supabase = await createClient()

  const { data: circle } = await supabase
    .from("circles")
    .select("name")
    .eq("id", circleId)
    .single()

  const { data: student } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", studentId)
    .single()

  const { data: membership } = await supabase
    .from("circle_memberships")
    .select("joined_at")
    .eq("circle_id", circleId)
    .eq("user_id", studentId)
    .single()

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

  const { data: assignments } = await supabase
    .from("daily_assignments")
    .select("assignment_date, hifz_start_global, hifz_end_global, hifz_surah, hifz_from_ayah, hifz_to_ayah, revision_ranges, status")
    .eq("circle_id", circleId)
    .eq("student_id", studentId)
    .order("assignment_date", { ascending: false })
    .limit(30)

  const { data: settingsRow } = await supabase
    .from("memorization_settings")
    .select("start_surah, start_page, start_ayah, hifz_amount, hifz_custom_note, revision_amount, revision_start, revision_end, revision_cursor")
    .eq("circle_id", circleId)
    .eq("user_id", studentId)
    .maybeSingle()

  const setupRequired = !settingsRow

  const assignmentByDate = Object.fromEntries(
    (assignments || []).map((a) => [a.assignment_date, a]),
  )

  const totalReports = reports?.length || 0
  const totalMistakes = reports?.reduce((acc, curr) => acc + (curr.total_mistakes || 0), 0) || 0
  const averageMistakes = totalReports > 0 ? (totalMistakes / totalReports).toFixed(1) : "0"
  const completedHifzReports = reports?.filter((r) => r.did_hifz).length || 0
  const hifzRate = totalReports > 0 ? Math.round((completedHifzReports / totalReports) * 100) : 0

  const consistencyStats = await getStudentConsistency(studentId, circleId)

  const joinDateFormatted = membership?.joined_at
    ? new Date(membership.joined_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
    : "غير معروف"

  const initials = student?.full_name
    ? student.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")
    : "ط"

  return (
    <>
      <div className="max-w-4xl mx-auto w-full pb-16">

        {/* Back Link */}
        <Link
          href={`/teacher/dashboard?circleId=${circleId}`}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 mb-8 font-semibold transition-colors group"
        >
          <ArrowRight className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          العودة للوحة المتابعة
        </Link>

        {/* ━━━━━━━━━━━━━━━━━━ Hero Profile ━━━━━━━━━━━━━━━━━━ */}
        <div className="relative mb-8 bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-3xl overflow-hidden shadow-sm">
          {/* Subtle top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary-500 via-primary-400 to-emerald-300" />

          <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-700 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-md shadow-primary-500/20 select-none">
                {initials}
              </div>
              {consistencyStats.currentStreak > 0 && (
                <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-extrabold rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-sm border border-white dark:border-[#1c1c1a]">
                  <Flame className="w-3 h-3" />
                  {consistencyStats.currentStreak}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">
                طالب في حلقة {circle?.name}
              </p>
              <h1 className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100 leading-tight truncate">
                {student?.full_name || "—"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500">
                  <Calendar className="w-3.5 h-3.5" />
                  انضم {joinDateFormatted}
                </span>
                {setupRequired ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200/50">
                    <AlertTriangle className="w-3 h-3" />
                    لم يعدّ نظام الحفظ بعد
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    <CheckCircle2 className="w-3 h-3" />
                    نظام الحفظ مُعدّ
                  </span>
                )}
              </div>
            </div>

            {/* Streak pill */}
            {consistencyStats.currentStreak > 0 && (
              <div className="shrink-0 hidden sm:flex flex-col items-center gap-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl px-5 py-3">
                <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono leading-none">
                  {consistencyStats.currentStreak}
                </span>
                <span className="text-[10px] font-bold text-amber-500 dark:text-amber-500 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  يوم متتالي
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━ Stats Row ━━━━━━━━━━━━━━━━━━ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "التقارير المُرسَلة",
              value: totalReports,
              icon: FileText,
              color: "text-primary-650 dark:text-primary-400",
              bg: "bg-primary-50 dark:bg-primary-950/20",
            },
            {
              label: "معدل الالتزام",
              value: `${consistencyStats.monthlyConsistencyPct}%`,
              icon: BarChart3,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-950/20",
            },
            {
              label: "نسبة اكتمال الحفظ",
              value: `${hifzRate}%`,
              icon: TrendingUp,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-950/20",
            },
            {
              label: "متوسط الأخطاء/يوم",
              value: averageMistakes,
              icon: AlertTriangle,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 dark:bg-amber-950/20",
            },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl p-4 flex flex-col gap-2 shadow-xs"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 leading-tight">{stat.label}</p>
                <p className={`text-2xl font-extrabold font-mono leading-none ${stat.color}`}>{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━ Weekly Progress ━━━━━━━━━━━━━━━━━━ */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            أداء هذا الأسبوع
          </h2>
          <WeeklyProgressWidget week={consistencyStats.currentWeek} />
        </div>

        {/* ━━━━━━━━━━━━━━━━━━ Memorization System ━━━━━━━━━━━━━━━━━━ */}
        {settingsRow && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              نظام الحفظ والمراجعة
            </h2>
            <div className="bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl p-5 shadow-xs">
              <MemorizationSettingsSummary settings={settingsRow as MemorizationSettings} />
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━ Reports History ━━━━━━━━━━━━━━━━━━ */}
        <h2 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          سجل التقارير ({totalReports})
        </h2>

        {!reports || reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl text-center">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-850 rounded-full flex items-center justify-center mb-3">
              <BookMarked className="w-5 h-5 text-stone-400" />
            </div>
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">لا توجد تقارير بعد</p>
            <p className="text-xs text-stone-400 mt-1">لم يُرسل هذا الطالب أي تقرير في هذه الحلقة حتى الآن.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report, idx) => {
              const reportDate = new Date(report.report_date)
              const dayName = reportDate.toLocaleDateString("ar-EG", { weekday: "long" })
              const dateFormatted = reportDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })

              const assignment = assignmentByDate[report.report_date]
              let plannedText: string | null = null
              let matchStatus: "matched" | "different" | "no-hifz" | "no-assignment" = "no-assignment"

              if (assignment) {
                const normAssign = normalizeHifzGlobals(assignment)
                const assignQr =
                  normAssign.hifzStartGlobal != null && normAssign.hifzEndGlobal != null
                    ? globalToQuran({ start: normAssign.hifzStartGlobal, end: normAssign.hifzEndGlobal })
                    : null
                if (assignQr) plannedText = formatQuranRange(assignQr)

                const normReport = normalizeHifzGlobals(report)
                const reportQr =
                  report.did_hifz && normReport.hifzStartGlobal != null && normReport.hifzEndGlobal != null
                    ? globalToQuran({ start: normReport.hifzStartGlobal, end: normReport.hifzEndGlobal })
                    : null
                const actualText = reportQr ? formatQuranRange(reportQr) : null

                if (!report.did_hifz) matchStatus = "no-hifz"
                else if (plannedText && actualText && plannedText === actualText) matchStatus = "matched"
                else matchStatus = "different"
              }

              const statusConfig = {
                matched: { label: "أكمل المقترح", variant: "success" as const },
                different: { label: "حفظ غير المقترح", variant: "warning" as const },
                "no-hifz": { label: "لم يحفظ اليوم", variant: "secondary" as const },
                "no-assignment": { label: null, variant: "secondary" as const },
              }

              const isFirst = idx === 0

              return (
                <div
                  key={report.id}
                  className={`bg-white dark:bg-[#1c1c1a] border rounded-2xl shadow-xs overflow-hidden transition-all ${
                    isFirst
                      ? "border-primary-200 dark:border-primary-900/50 ring-1 ring-primary-100 dark:ring-primary-900/30"
                      : "border-stone-200 dark:border-stone-850"
                  }`}
                >
                  {/* Date header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-stone-900/50">
                    <div className="flex items-center gap-2">
                      {isFirst && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {dayName}، {dateFormatted}
                      </span>
                      {report.week_reference && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">
                          {report.week_reference}
                        </span>
                      )}
                      {isFirst && (
                        <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-2 py-0.5 rounded-full border border-primary-200/50">
                          الأحدث
                        </span>
                      )}
                    </div>

                    {statusConfig[matchStatus].label && (
                      <Badge variant={statusConfig[matchStatus].variant}>
                        {statusConfig[matchStatus].label}
                      </Badge>
                    )}
                  </div>

                  {/* Planned suggestion */}
                  {plannedText && (
                    <div className="flex items-center gap-1.5 px-5 pt-3 text-[11px] text-primary-600 dark:text-primary-400">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold">المقترح:</span>
                      <span>{plannedText}</span>
                    </div>
                  )}

                  {/* Report body */}
                  <div className="px-5 pb-5 pt-3">
                    <ReportSummary report={report as Record<string, unknown> & { report_date: string }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
