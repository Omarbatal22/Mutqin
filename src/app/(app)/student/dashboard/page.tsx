import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Plus, 
  Calendar 
} from "lucide-react"

interface DBMembershipCircle {
  circle_id: string
  circles: {
    id: string
    name: string
    description: string | null
    invite_code: string
  } | {
    id: string
    name: string
    description: string | null
    invite_code: string
  }[] | null
}

interface RecentReport {
  id: string
  report_date: string
  hifz_content: string | null
  revision_content: string | null
  mistakes_count: number
  circles: { name: string } | { name: string }[] | null
}

export const dynamic = 'force-dynamic'

export default async function StudentDashboardPage() {
  const supabase = await createClient()

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id || "")
    .single()

  // Fetch circles the student belongs to
  const { data: memberships } = await supabase
    .from("circle_memberships")
    .select(`
      circle_id,
      circles (
        id,
        name,
        description,
        invite_code
      )
    `)
    .eq("user_id", user?.id || "")
    .eq("status", "active")
    .eq("role", "student")

  const studentCircles = (memberships as unknown as DBMembershipCircle[] || []).map((m) => {
    const circle = Array.isArray(m.circles) ? m.circles[0] : m.circles
    return circle
  }).filter((c): c is NonNullable<typeof c> => !!c)

  // Fetch today's reports for this student across all their circles
  const todayStr = new Date().toISOString().split("T")[0]
  
  const { data: todayReports } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("student_id", user?.id || "")
    .eq("report_date", todayStr)

  // Map circles to today's report status
  const circlesWithReportStatus = studentCircles.map(circle => {
    const report = todayReports?.find(r => r.circle_id === circle.id)
    return {
      ...circle,
      submittedToday: !!report,
      reportDetails: report || null
    }
  })

  // Fetch recent reports for history
  const { data: recentReports } = (await supabase
    .from("daily_reports")
    .select(`
      id,
      report_date,
      hifz_content,
      revision_content,
      mistakes_count,
      circles (name)
    `)
    .eq("student_id", user?.id || "")
    .order("report_date", { ascending: false })
    .limit(5)) as unknown as { data: RecentReport[] | null }

  // Get formatted Hijri or Gregorian date
  const todayName = new Date().toLocaleDateString("ar-EG", { weekday: "long" })
  const todayFormatted = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })

  return (
    <DashboardShell role="student" userName={profile?.full_name || "الطالب"}>
      <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 p-6 rounded-2xl shadow-xs">
          <div>
            <h1 className="text-xl font-bold font-display">مرحباً بك، {profile?.full_name || "يا طالب القرآن"} 👋</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">نسأل الله أن ييسر لك حفظ كتابه الكريم وتلاوته.</p>
          </div>
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 text-sm font-semibold">
            <Calendar className="w-5 h-5 text-primary-600" />
            <span>{todayName}، {todayFormatted}</span>
          </div>
        </div>

        {/* Action Call: Submit Report */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold font-display">حالة تقارير اليوم</h2>
          {circlesWithReportStatus.length === 0 ? (
            <Card className="text-center p-8 bg-stone-50/50">
              <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-bold">أنت غير منضم لأي حلقة حالياً</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm">
                  اطلب رمز الانضمام للحلقة من معلمك، ثم اضغط على الزر أدناه للانضمام والبدء.
                </p>
                <Link href="/student/join" className="mt-2">
                  <Button size="sm">الانضمام إلى حلقة</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {circlesWithReportStatus.map((circle) => (
                <Card key={circle.id} className={`border-2 transition-all ${
                  circle.submittedToday 
                    ? "border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/5" 
                    : "border-amber-500/20 bg-amber-50/5 dark:bg-amber-950/5"
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold">{circle.name}</CardTitle>
                        <CardDescription className="text-xs">المعلم: {circle.description || "معلم الحلقة"}</CardDescription>
                      </div>
                      <Badge variant={circle.submittedToday ? "success" : "warning"}>
                        {circle.submittedToday ? "تم التسليم" : "لم يُسلم بعد"}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2 flex flex-col gap-4">
                    {circle.submittedToday ? (
                      <div className="flex flex-col gap-3 bg-white dark:bg-[#252523] p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-xs">
                        <div className="grid grid-cols-3 gap-2 text-center text-stone-500 dark:text-stone-400">
                          <div>
                            <span className="block font-bold text-stone-800 dark:text-stone-200">{circle.reportDetails?.hifz_content || "—"}</span>
                            <span>الحفظ</span>
                          </div>
                          <div className="border-x border-stone-100 dark:border-stone-800">
                            <span className="block font-bold text-stone-800 dark:text-stone-200">{circle.reportDetails?.revision_content || "—"}</span>
                            <span>المراجعة</span>
                          </div>
                          <div>
                            <span className="block font-bold text-red-650 dark:text-red-400">{circle.reportDetails?.mistakes_count ?? 0}</span>
                            <span>الأخطاء</span>
                          </div>
                        </div>
                        {circle.reportDetails?.notes && (
                          <div className="border-t border-stone-50 dark:border-stone-800 pt-2 text-stone-500">
                            <span className="font-semibold">ملاحظات:</span> {circle.reportDetails.notes}
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-2">
                          <Link href={`/student/report?circleId=${circle.id}`} className="w-full">
                            <Button size="sm" variant="outline" className="w-full">تعديل التقرير</Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-stone-500">
                          لم ترسل تقرير الإنجاز اليومي لهذه الحلقة بعد. يرجى ملء التقرير لتسجيل حضورك ومتابعة الأستاذ.
                        </p>
                        <Link href={`/student/report?circleId=${circle.id}`}>
                          <Button size="sm" className="w-full flex items-center justify-center gap-1.5">
                            <Plus className="w-4 h-4" />
                            إرسال تقرير اليوم
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports History */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold font-display">آخر التقارير المرسلة</h2>
            <Link href="/student/reports">
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                عرض السجل الكامل
              </Button>
            </Link>
          </div>

          {recentReports && recentReports.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentReports.map((report) => {
                const circleName = Array.isArray(report.circles)
                  ? report.circles[0]?.name
                  : report.circles?.name

                return (
                  <div 
                    key={report.id} 
                    className="bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs hover:shadow-xs transition-all"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 dark:text-stone-150">
                          {circleName || "حلقة غير معروفة"}
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                          {new Date(report.report_date).toLocaleDateString("ar-EG", { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-stone-500">
                      <div>
                        <span className="font-medium text-stone-700 dark:text-stone-300">الحفظ: </span>
                        <span>{report.hifz_content || "لا يوجد"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-stone-700 dark:text-stone-300">المراجعة: </span>
                        <span>{report.revision_content || "لا يوجد"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-stone-50 dark:border-stone-900 pt-2.5 sm:pt-0">
                    <Badge variant={report.mistakes_count > 0 ? "warning" : "success"}>
                      عدد الأخطاء: {report.mistakes_count}
                    </Badge>
                  </div>
                </div>
              )
            })}
            </div>
          ) : (
            <div className="text-center py-6 text-stone-400 text-xs">
              لا توجد تقارير سابقة مسجلة.
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  )
}
