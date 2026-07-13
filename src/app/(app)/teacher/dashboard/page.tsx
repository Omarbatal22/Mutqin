import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { CircleSwitcher } from "@/components/circle-switcher"
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Percent, 
  Calendar,
  Layers,
  Eye,
  Plus
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
  searchParams: Promise<{ circleId?: string; filter?: string }>
}

export default async function TeacherDashboardPage({ searchParams }: TeacherDashboardProps) {
  const { circleId, filter = "all" } = await searchParams
  const supabase = await createClient()

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch teacher profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id || "")
    .single()

  // Fetch all circles owned by teacher to fill switcher
  const { data: circles } = await supabase
    .from("circles")
    .select("id, name")
    .eq("owner_id", user?.id || "")
    .order("created_at", { ascending: false })

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

  // Fetch today's reports for this circle
  const todayStr = new Date().toISOString().split("T")[0]
  const { data: todayReports } = activeCircleId
    ? await supabase
        .from("daily_reports")
        .select("*")
        .eq("circle_id", activeCircleId)
        .eq("report_date", todayStr)
    : { data: [] }

  // Map students to their report status
  const studentsWithStatus = students.map(student => {
    const report = todayReports?.find(r => r.student_id === student.id)
    return {
      ...student,
      submitted: !!report,
      reportDetails: report || null,
      submissionTime: report ? new Date(report.created_at).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' }) : null
    }
  })

  // Statistics
  const totalStudents = students.length
  const submittedToday = todayReports?.length || 0
  const notSubmittedToday = totalStudents - submittedToday
  const submissionRate = totalStudents > 0 ? Math.round((submittedToday / totalStudents) * 100) : 0

  // Apply filters
  const filteredStudents = studentsWithStatus.filter(s => {
    if (filter === "submitted") return s.submitted
    if (filter === "not_submitted") return !s.submitted
    return true
  })

  const todayName = new Date().toLocaleDateString("ar-EG", { weekday: "long" })
  const todayFormatted = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long" })

  return (
    <DashboardShell role="teacher" userName={profile?.full_name || "الأستاذ"}>
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
                  <CardDescription>عرض تفصيلي لحالة تسليم التقارير اليومية</CardDescription>
                </div>
                {/* Filters */}
                <div className="flex gap-1 bg-stone-50 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/50 dark:border-stone-850">
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
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {filteredStudents.length === 0 ? (
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
                        </div>

                        {/* Report preview or actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                          {student.submitted ? (
                            <div className="bg-stone-50 dark:bg-stone-900/50 px-4 py-3 rounded-xl border border-stone-200/50 dark:border-stone-850 text-stone-500 max-w-sm">
                              <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-0.5">تقرير اليوم:</span>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                <div><span className="font-medium text-stone-600">حفظ:</span> {student.reportDetails?.hifz_content}</div>
                                <div><span className="font-medium text-stone-600">مراجعة:</span> {student.reportDetails?.revision_content}</div>
                                <div><span className="font-medium text-stone-600 text-red-650">أخطاء:</span> {student.reportDetails?.mistakes_count}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">لا يوجد تقرير لليوم</span>
                          )}

                          <div className="flex items-center gap-2 justify-end">
                            <Link href={`/teacher/circles/${activeCircleId}/students/${student.id}`}>
                              <Button variant="outline" size="sm" className="flex items-center gap-1.5 whitespace-nowrap">
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
    </DashboardShell>
  )
}
