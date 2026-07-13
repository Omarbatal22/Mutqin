import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { History, Calendar, FileText, ArrowRight } from "lucide-react"

interface ReportItem {
  id: string
  report_date: string
  week_reference: string | null
  hifz_content: string | null
  revision_content: string | null
  mistakes_count: number
  notes: string | null
  circles: { name: string } | { name: string }[] | null
}

export const dynamic = 'force-dynamic'

export default async function StudentReportsHistoryPage() {
  const supabase = await createClient()

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id || "")
    .single()

  // Fetch all reports for the user
  const { data: reports } = (await supabase
    .from("daily_reports")
    .select(`
      id,
      report_date,
      week_reference,
      hifz_content,
      revision_content,
      mistakes_count,
      notes,
      circles (name)
    `)
    .eq("student_id", user?.id || "")
    .order("report_date", { ascending: false })) as unknown as { data: ReportItem[] | null }

  return (
    <DashboardShell role="student" userName={profile?.full_name || "الطالب"}>
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <History className="w-6 h-6 text-primary-650" />
              سجل تقاريري اليومية
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">عرض الأرشيف الكامل لإنجازاتك اليومية في الحفظ والمراجعة</p>
          </div>
          <Link href="/student/dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4" />
              لوحة التحكم
            </Button>
          </Link>
        </div>

        {/* Reports History */}
        {!reports || reports.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl">
            <div className="w-16 h-16 bg-stone-50 dark:bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-150">
              <FileText className="w-8 h-8 text-stone-400" />
            </div>
            <h2 className="text-lg font-bold">سجل التقارير فارغ</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              لم تقم بإرسال أي تقرير إنجاز بعد. يمكنك إرسال تقرير اليوم للبدء في تدوين سجلاتك.
            </p>
            <Link href="/student/report" className="mt-5 inline-block">
              <Button size="sm">إرسال تقرير اليوم</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.map((report) => {
              const reportDate = new Date(report.report_date)
              const dayName = reportDate.toLocaleDateString("ar-EG", { weekday: "long" })
              const dateFormatted = reportDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })
              const circleName = Array.isArray(report.circles)
                ? report.circles[0]?.name
                : report.circles?.name

              return (
                <Card key={report.id} className="hover:shadow-xs transition-all">
                  <CardHeader className="pb-2 border-b border-stone-50 dark:border-stone-900/50 mb-3 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4.5 h-4.5 text-stone-400" />
                      <span className="font-semibold text-stone-700 dark:text-stone-300">{dayName}، {dateFormatted}</span>
                      {report.week_reference && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">
                          {report.week_reference}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-primary-650 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/20 px-2.5 py-0.5 rounded-full border border-primary-200/30">
                      {circleName || "حلقة غير معروفة"}
                    </span>
                  </CardHeader>
                  
                  <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Hifz Column */}
                      <div className="p-3 bg-stone-50/50 dark:bg-stone-900/20 rounded-xl border border-stone-200/40 dark:border-stone-850/50">
                        <span className="text-xs text-stone-450 dark:text-stone-500 font-bold block mb-1">الحفظ اليومي</span>
                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-250 leading-relaxed whitespace-pre-wrap">
                          {report.hifz_content || "لم يتم تحديد حفظ اليوم"}
                        </p>
                      </div>

                      {/* Revision Column */}
                      <div className="p-3 bg-stone-50/50 dark:bg-stone-900/20 rounded-xl border border-stone-200/40 dark:border-stone-850/50">
                        <span className="text-xs text-stone-450 dark:text-stone-500 font-bold block mb-1">المراجعة اليومية</span>
                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-250 leading-relaxed whitespace-pre-wrap">
                          {report.revision_content || "لم يتم تحديد مراجعة اليوم"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-900/50 pt-3 text-xs">
                      {report.notes ? (
                        <div className="text-stone-500 max-w-lg">
                          <span className="font-semibold text-stone-600 dark:text-stone-400">ملاحظات: </span>
                          <span>{report.notes}</span>
                        </div>
                      ) : (
                        <div className="text-stone-400 italic">لا توجد ملاحظات</div>
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
