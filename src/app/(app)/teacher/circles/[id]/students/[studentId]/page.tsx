import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Calendar, FileText } from "lucide-react"

export const revalidate = 0 // Disable cache for student reports data

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
    .select("*")
    .eq("circle_id", circleId)
    .eq("student_id", studentId)
    .order("report_date", { ascending: false })

  // Calculate stats for this student
  const totalReports = reports?.length || 0
  const totalMistakes = reports?.reduce((acc, curr) => acc + (curr.mistakes_count || 0), 0) || 0
  const averageMistakes = totalReports > 0 ? (totalMistakes / totalReports).toFixed(1) : 0

  const joinDateFormatted = membership?.joined_at 
    ? new Date(membership.joined_at).toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' })
    : "غير معروف"

  return (
    <DashboardShell role="teacher">
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
            </div>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-w-[280px]">
            <Card className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-xs text-stone-400 font-medium block">التقارير</span>
              <span className="text-2xl font-extrabold font-mono text-stone-900 dark:text-stone-100 mt-1">{totalReports}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-xs text-stone-400 font-medium block">مجموع الأخطاء</span>
              <span className="text-2xl font-extrabold font-mono text-amber-600 mt-1">{totalMistakes}</span>
            </Card>
            <Card className="p-4 col-span-2 md:col-span-1 flex flex-col justify-center items-center text-center">
              <span className="text-xs text-stone-400 font-medium block">معدل الأخطاء/اليوم</span>
              <span className="text-2xl font-extrabold font-mono text-primary-650 mt-1">{averageMistakes}</span>
            </Card>
          </div>
        </div>

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
                      <span className="font-semibold text-stone-700 dark:text-stone-300">{dayName}، {dateFormatted}</span>
                      {report.week_reference && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">
                          {report.week_reference}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Hifz Column */}
                      <div className="p-3 bg-stone-50/50 dark:bg-stone-900/20 rounded-xl border border-stone-200/40 dark:border-stone-850/50">
                        <span className="text-xs text-stone-450 dark:text-stone-500 font-bold block mb-1">الحفظ اليومي</span>
                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-250 leading-relaxed whitespace-pre-wrap">
                          {report.hifz_content || "لم يكتب حفظ اليوم"}
                        </p>
                      </div>

                      {/* Revision Column */}
                      <div className="p-3 bg-stone-50/50 dark:bg-stone-900/20 rounded-xl border border-stone-200/40 dark:border-stone-850/50">
                        <span className="text-xs text-stone-450 dark:text-stone-500 font-bold block mb-1">المراجعة اليومية</span>
                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-250 leading-relaxed whitespace-pre-wrap">
                          {report.revision_content || "لم يكتب مراجعة اليوم"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-900/50 pt-3 text-xs">
                      {report.notes ? (
                        <div className="text-stone-500 max-w-lg">
                          <span className="font-semibold text-stone-600 dark:text-stone-450">ملاحظات الطالب: </span>
                          <span>{report.notes}</span>
                        </div>
                      ) : (
                        <div className="text-stone-400 italic">لا توجد ملاحظات من الطالب</div>
                      )}

                      <div className="flex justify-end">
                        <Badge variant={report.mistakes_count > 0 ? "warning" : "success"}>
                          عدد الأخطاء: {report.mistakes_count}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
