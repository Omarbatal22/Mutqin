import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { History, Calendar, FileText, ArrowRight } from "lucide-react"
import { ReportSummary } from "@/components/reports/report-summary"
import type { StructuredReport } from "@/lib/reports/types"

interface ReportItem extends StructuredReport {
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
      did_hifz,
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
      total_mistakes,
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
                  
                  <CardContent className="pt-2">
                    <ReportSummary report={report} />
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
