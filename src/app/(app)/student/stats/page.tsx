import * as React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getStudentConsistency, getCircleLocalDate } from "@/lib/consistency/server"
import { StudentConsistencyContainer } from "@/components/consistency/student-consistency-container"
import { BarChart3 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function StudentStatsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  // Fetch all report_dates for student across all circles
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("report_date")
    .eq("student_id", user.id)

  const submittedDates = Array.from(
    new Set((reports || []).map((r) => r.report_date))
  ).sort()

  const todayStr = getCircleLocalDate("Africa/Cairo")
  const stats = await getStudentConsistency(user.id)

  return (
    <>
      <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
        <div className="flex justify-between items-center bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 p-6 rounded-2xl shadow-xs">
          <div>
            <h1 className="text-xl font-bold font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-650" />
              إحصائيات المثابرة والإتقان
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              متابعة شاملة لنسبة الالتزام، سلاسل الاستمرار، وشجرة الغراس المباركة لـ {profile?.full_name || "الطالب"}.
            </p>
          </div>
        </div>

        <StudentConsistencyContainer
          initialStats={stats}
          submittedDates={submittedDates}
          todayStr={todayStr}
          viewMode="full"
        />
      </div>
    </>
  )
}
