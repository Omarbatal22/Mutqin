import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getTeacherCircleIds } from "@/lib/circles/teacher-access"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CircleSwitcher } from "@/components/circle-switcher"
import { WeeklyReportGrid } from "@/components/teacher/weekly-report-grid"
import { ReportSummary } from "@/components/reports/report-summary"
import { formatQuranRange } from "@/lib/quran"
import { globalToQuran } from "@/lib/progression/adapter"
import { normalizeHifzGlobals } from "@/lib/reports/normalize"
import { getCircleStudentsConsistency } from "@/lib/consistency/server"
import { StreakBadge } from "@/components/consistency/streak-badge"
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Percent,
  Calendar,
  Layers,
  Eye,
  Plus,
  Sparkles,
  Settings2,
  List,
  CalendarDays,
} from "lucide-react"

interface DashboardProfile {
  id: string
  full_name: string
}

interface DashboardMembership {
  user_id: string
  joined_at: string
  profiles: DashboardProfile | DashboardProfile[] | null
}

export const dynamic = 'force-dynamic'

interface TeacherDashboardProps {
  searchParams: Promise<{ circleId?: string; filter?: string; view?: string }>
}

export default async function TeacherDashboardPage({ searchParams }: TeacherDashboardProps) {
  const { circleId, filter = "all", view = "daily" } = await searchParams
  const supabase = await createClient()

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch teacher profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id || "")
    .single()

  // Circles I own OR co-teach (multi-teacher).
  const teacherCircleIds = await getTeacherCircleIds(supabase)

  // Fetch all circles I teach to fill switcher
  const { data: circles } = teacherCircleIds.length
    ? await supabase
        .from("circles")
        .select("id, name")
        .in("id", teacherCircleIds)
        .order("created_at", { ascending: false })
    : { data: [] }

  const activeCircleId = circleId || circles?.[0]?.id

  // Active circle details
  const activeCircle = circles?.find(c => c.id === activeCircleId)

  // Fetch student memberships in this circle
  const { data: memberships } = activeCircleId 
    ? await supabase
        .from("circle_memberships")
        .select(`
          user_id,
          joined_at,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq("circle_id", activeCircleId)
        .eq("role", "student")
        .eq("status", "active")
        .order("joined_at", { ascending: true })
    : { data: [] }

  const students = (memberships as unknown as DashboardMembership[] || [])
    .map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return profile
    })
    .filter((p): p is DashboardProfile => !!p)

  // Fetch batch consistency for all students in active circle
  const studentIds = students.map((s) => s.id)
  const consistencyMap = activeCircleId && studentIds.length > 0
    ? await getCircleStudentsConsistency(activeCircleId, studentIds)
    : {}

  // Fetch today's reports for this circle
  const { data: circle } = activeCircleId
    ? await supabase
        .from("circles")
        .select("timezone")
        .eq("id", activeCircleId)
        .single()
    : { data: null }

  const circleTimezone = circle?.timezone ?? "Africa/Cairo"
  const todayStr = (() => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: circleTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const parts = fmt.formatToParts(new Date())
    const m = parts.find((p) => p.type === "month")?.value
    const d = parts.find((p) => p.type === "day")?.value
    const y = parts.find((p) => p.type === "year")?.value
    return `${y}-${m}-${d}`
  })()

  // Compute the current week (Saturday → Friday) in the circle's local timezone.
  // Build a stable UTC anchor from the local date parts so DST shifts can't move it.
  const [ty, tm, td] = todayStr.split("-").map(Number)
  const todayAnchor = new Date(Date.UTC(ty, tm - 1, td))
  // JS getUTCDay(): Sun=0…Sat=6. Days since the most recent Saturday:
  const daysSinceSaturday = (todayAnchor.getUTCDay() + 1) % 7
  const weekDayNameFmt = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "UTC",
    weekday: "long",
  })
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayAnchor)
    d.setUTCDate(todayAnchor.getUTCDate() - daysSinceSaturday + i)
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    return {
      date: iso,
      dayName: weekDayNameFmt.format(d),
      dayNum: String(d.getUTCDate()),
    }
  })
  const weekStart = weekDays[0].date
  const weekEnd = weekDays[6].date

  // Fetch this week's reports (only when the weekly view is active)
  const { data: weekReports } = activeCircleId && view === "week"
    ? await supabase
        .from("daily_reports")
        .select("student_id, report_date, total_mistakes")
        .eq("circle_id", activeCircleId)
        .gte("report_date", weekStart)
        .lte("report_date", weekEnd)
    : { data: [] }

  // student_id -> report_date -> { mistakes }
  const weekCellMap: Record<string, Record<string, { mistakes: number }>> = {}
  for (const r of weekReports || []) {
    const byDate = (weekCellMap[r.student_id] ??= {})
    byDate[r.report_date] = { mistakes: r.total_mistakes ?? 0 }
  }

  const { data: todayReports } = activeCircleId
    ? await supabase
        .from("daily_reports")
        .select("*")
        .eq("circle_id", activeCircleId)
        .eq("report_date", todayStr)
    : { data: [] }

  // Fetch today's assignments (planned)
  const { data: todayAssignments } = activeCircleId
    ? await supabase
        .from("daily_assignments")
        .select("student_id, hifz_start_global, hifz_end_global, hifz_surah, hifz_from_ayah, hifz_to_ayah, revision_ranges, status")
        .eq("circle_id", activeCircleId)
        .eq("assignment_date", todayStr)
    : { data: [] }

  // Check which students have memorization settings configured
  const { data: settingsRows } = activeCircleId
    ? await supabase
        .from("memorization_settings")
        .select("user_id")
        .eq("circle_id", activeCircleId)
    : { data: [] }
  const studentsWithSettings = new Set((settingsRows || []).map((s) => s.user_id))

  // Map students to their report status
  const studentsWithStatus = students.map((student) => {
    const report = todayReports?.find((r) => r.student_id === student.id)
    const assignment = todayAssignments?.find((a) => a.student_id === student.id) ?? null
    const setupRequired = !studentsWithSettings.has(student.id)
    return {
      ...student,
      submitted: !!report,
      reportDetails: report || null,
      assignment,
      setupRequired,
      submissionTime: report
        ? new Date(report.created_at).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
    }
  })

  // Statistics
  const totalStudents = students.length
  const submittedToday = todayReports?.length || 0
  const notSubmittedToday = totalStudents - submittedToday
  const setupRequiredCount = studentsWithStatus.filter((s) => s.setupRequired).length
  const submissionRate =
    totalStudents > 0 ? Math.round((submittedToday / totalStudents) * 100) : 0

  // Apply filters
  const filteredStudents = studentsWithStatus.filter((s) => {
    if (filter === "submitted") return s.submitted
    if (filter === "not_submitted") return !s.submitted
    if (filter === "setup_required") return s.setupRequired
    return true
  })

  const todayName = new Date().toLocaleDateString("ar-EG", { weekday: "long" })
  const todayFormatted = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long" })

  return (
    <>
      <div className="flex flex-col gap-8 w-full">
        {/* Top Header greeting */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 p-6 rounded-2xl shadow-xs">
          <div>
            <h1 className="text-xl font-bold font-display">مرحباً بك، أستاذ {profile?.full_name || "المعلم"} 👋</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">تيسر لك لوحة التحكم متابعة حفظ طلابك وإنجازاتهم لليوم.</p>
          </div>
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 text-sm font-semibold">
            <Calendar className="w-5 h-5 text-primary-650" />
            <span>{todayName}، {todayFormatted}</span>
          </div>
        </div>

        {/* Switcher & Create Circle Link */}
        {circles && circles.length > 0 ? (
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {/* Circle switcher */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-500 dark:text-stone-400 font-semibold whitespace-nowrap">الحلقة النشطة:</span>
              <CircleSwitcher circles={circles || []} activeCircleId={activeCircleId || ""} />
            </div>
            
            <div className="flex gap-2">
              <Link href={`/teacher/circles/${activeCircleId}/members`}>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <Users className="w-4.5 h-4.5" />
                  إدارة طلاب الحلقة
                </Button>
              </Link>
              <Link href="/teacher/circles/create">
                <Button size="sm" className="flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5" />
                  حلقة جديدة
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl text-center shadow-xs">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-4 border border-primary-200/50">
              <Layers className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold">لم تقم بإنشاء أي حلقة تحفيظ بعد</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm">
              قم بإنشاء حلقة تحفيظ أولاً لتستطيع إضافة طلابك ومتابعة تقاريرهم.
            </p>
            <Link href="/teacher/circles/create" className="mt-5">
              <Button size="sm">إنشاء حلقة جديدة</Button>
            </Link>
          </div>
        )}

        {activeCircleId && (
          <>
            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block mb-1">الطلاب المسجلين</span>
                    <span className="text-2xl font-extrabold font-mono text-stone-900 dark:text-stone-100">{totalStudents}</span>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block mb-1">أرسلوا اليوم</span>
                    <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{submittedToday}</span>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block mb-1">لم يرسلوا</span>
                    <span className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">{notSubmittedToday}</span>
                  </div>
                  <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block mb-1">نسبة التسليم اليومية</span>
                    <span className="text-2xl font-extrabold font-mono text-primary-650 dark:text-primary-400">{submissionRate}%</span>
                  </div>
                  <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center">
                    <Percent className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Students List Card */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-stone-100 dark:border-stone-900/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-bold">طلاب حلقة {activeCircle?.name}</CardTitle>
                  <CardDescription>
                    {view === "week"
                      ? "متابعة أسبوعية لتسليم التقارير (السبت → الجمعة)"
                      : "عرض تفصيلي لحالة تسليم التقارير اليومية"}
                  </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  {/* View toggle: daily vs weekly */}
                  <div className="flex gap-1 bg-stone-50 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/50 dark:border-stone-850">
                    <Link href={`/teacher/dashboard?circleId=${activeCircleId}&view=daily&filter=${filter}`}>
                      <Button
                        variant={view !== "week" ? "primary" : "ghost"}
                        size="sm"
                        className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 ${view === "week" ? "hover:bg-stone-100" : ""}`}
                      >
                        <List className="w-3.5 h-3.5" />
                        يومي
                      </Button>
                    </Link>
                    <Link href={`/teacher/dashboard?circleId=${activeCircleId}&view=week`}>
                      <Button
                        variant={view === "week" ? "primary" : "ghost"}
                        size="sm"
                        className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 ${view !== "week" ? "hover:bg-stone-100" : ""}`}
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        أسبوعي
                      </Button>
                    </Link>
                  </div>

                  {/* Filters (daily view only) */}
                  {view !== "week" && (
                    <div className="flex gap-1 bg-stone-50 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/50 dark:border-stone-850 flex-wrap">
                      <Link href={`/teacher/dashboard?circleId=${activeCircleId}&filter=all`}>
                        <Button
                          variant={filter === "all" ? "primary" : "ghost"}
                          size="sm"
                          className={`px-3 py-1 text-xs font-semibold ${filter !== "all" ? "hover:bg-stone-100" : ""}`}
                        >
                          الكل ({totalStudents})
                        </Button>
                      </Link>
                      <Link href={`/teacher/dashboard?circleId=${activeCircleId}&filter=submitted`}>
                        <Button
                          variant={filter === "submitted" ? "primary" : "ghost"}
                          size="sm"
                          className={`px-3 py-1 text-xs font-semibold ${filter !== "submitted" ? "hover:bg-stone-100" : ""}`}
                        >
                          أرسلوا ({submittedToday})
                        </Button>
                      </Link>
                      <Link href={`/teacher/dashboard?circleId=${activeCircleId}&filter=not_submitted`}>
                        <Button
                          variant={filter === "not_submitted" ? "primary" : "ghost"}
                          size="sm"
                          className={`px-3 py-1 text-xs font-semibold ${filter !== "not_submitted" ? "hover:bg-stone-100" : ""}`}
                        >
                          لم يرسلوا ({notSubmittedToday})
                        </Button>
                      </Link>
                      {setupRequiredCount > 0 && (
                        <Link href={`/teacher/dashboard?circleId=${activeCircleId}&filter=setup_required`}>
                          <Button
                            variant={filter === "setup_required" ? "primary" : "ghost"}
                            size="sm"
                            className={`px-3 py-1 text-xs font-semibold ${filter !== "setup_required" ? "hover:bg-stone-100" : ""}`}
                          >
                            يحتاج إعداداً ({setupRequiredCount})
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {view === "week" ? (
                  <WeeklyReportGrid
                    students={students}
                    weekDays={weekDays}
                    cellMap={weekCellMap}
                    todayStr={todayStr}
                  />
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 text-sm">
                    لا يوجد طلاب يطابقون خيار الفلتر المختار.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-900">
                    {filteredStudents.map((student) => (
                      <div 
                        key={student.id} 
                        className="flex flex-col sm:flex-row justify-between sm:items-center p-5 gap-4 hover:bg-stone-50/50 dark:hover:bg-stone-900/10 transition-colors"
                      >
                        {/* Student Main Details */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-stone-100 dark:bg-stone-850 rounded-full flex items-center justify-center font-bold text-sm text-stone-700 dark:text-stone-300">
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{student.full_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={student.submitted ? "success" : "warning"}>
                                {student.submitted ? "أرسل التقرير" : "لم يرسل بعد"}
                              </Badge>
                              {student.submitted && (
                                <span className="text-[10px] text-stone-400 font-mono">أرسل الساعة {student.submissionTime}</span>
                              )}
                            </div>
                          </div>

                          {/* Consistency Stats Badge for Teacher */}
                          {consistencyMap[student.id] && (
                            <StreakBadge
                              currentStreak={consistencyMap[student.id].currentStreak}
                              monthlyConsistencyPct={consistencyMap[student.id].monthlyConsistencyPct}
                              graceAvailable={consistencyMap[student.id].graceAvailable}
                              variant="compact"
                              className="mr-2"
                            />
                          )}
                        </div>

                        {/* Report preview or actions */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4 text-xs">
                          <div className="flex flex-col gap-2">
                            {student.assignment && (() => {
                               const norm = normalizeHifzGlobals(student.assignment)
                               const qr = norm.hifzStartGlobal != null && norm.hifzEndGlobal != null
                                 ? globalToQuran({ start: norm.hifzStartGlobal, end: norm.hifzEndGlobal })
                                 : null
                               return (
                                 <div className="flex items-start gap-1.5 text-[11px]">
                                   <Sparkles className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />
                                   <div className="text-stone-500 dark:text-stone-400">
                                     <span className="font-semibold text-stone-600 dark:text-stone-300">مقترح: </span>
                                     {qr ? formatQuranRange(qr) : "—"}
                                   </div>
                                 </div>
                               )
                             })()}

                            {student.setupRequired && (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                                <Settings2 className="w-3.5 h-3.5 shrink-0" />
                                <span>يحتاج إعداد النظام</span>
                              </div>
                            )}

                            {student.submitted && student.reportDetails ? (
                              <div className="bg-stone-50 dark:bg-stone-900/50 px-4 py-3 rounded-xl border border-stone-200/50 dark:border-stone-850 text-stone-500 max-w-sm">
                                <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-0.5">تقرير اليوم:</span>
                                 <ReportSummary
                                   report={student.reportDetails as Record<string, unknown> & { report_date: string }}
                                   variant="compact"
                                 />
                              </div>
                            ) : (
                              !student.setupRequired && (
                                <span className="text-stone-400 italic">لا يوجد تقرير لليوم</span>
                              )
                            )}
                          </div>

                          <div className="flex items-center gap-2 justify-end shrink-0">
                            <Link href={`/teacher/circles/${activeCircleId}/students/${student.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Eye className="w-4 h-4" />
                                عرض السجل
                              </Button>
                            </Link>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
