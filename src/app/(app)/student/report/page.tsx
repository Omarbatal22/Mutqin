import * as React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getToday, getCircleLocalDate } from "@/lib/progression/today"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { AlertCircle, ArrowRight, Settings2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import SubmitReportForm from "./submit-form"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ circleId?: string }>
}

export default async function SubmitReportPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: memberships } = await supabase
    .from("circle_memberships")
    .select("circle_id, circles ( id, name, current_week )")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("role", "student")

  const circles = (memberships || [])
    .map((m) => {
      const c = Array.isArray(m.circles) ? m.circles[0] : m.circles
      return c as { id: string; name: string; current_week: number | null } | null
    })
    .filter((c): c is { id: string; name: string; current_week: number | null } => !!c)

  if (circles.length === 0) {
    return (
      <DashboardShell role="student">
        <div className="max-w-md mx-auto w-full py-8">
          <Card className="shadow-md">
            <CardContent className="text-center p-8 flex flex-col items-center gap-3">
              <AlertCircle className="w-12 h-12 text-amber-500" />
              <h3 className="text-lg font-bold">لست منضماً لأي حلقة</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                اطلب رمز الانضمام من معلمك للبدء.
              </p>
              <Link href="/student/join" className="mt-2">
                <Button size="sm">انضم لحلقة أولاً</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  let selectedCircleId = params.circleId || ""
  if (!selectedCircleId && circles.length > 0) selectedCircleId = circles[0].id

  const todayView = await getToday(selectedCircleId)

  if (todayView.setupRequired) {
    return (
      <DashboardShell role="student">
        <div className="max-w-md mx-auto w-full py-8">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للوحة الطالب
          </Link>
          <Card className="text-center shadow-lg border-amber-200/50">
            <CardHeader>
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-200/50">
                <Settings2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-amber-800 dark:text-amber-400">
                مطلوب إعداد نظام الحفظ
              </CardTitle>
              <CardDescription>
                حدد موضعك الحالي ونظام الحفظ والمراجعة حتى يجهّز النظام تقاريرك تلقائياً.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-2">
              <Link href={`/student/setup?circleId=${selectedCircleId}`} className="w-full">
                <Button variant="primary" className="w-full">
                  إعداد نظام الحفظ والمراجعة
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  const { data: peerRows } = await supabase
    .from("circle_memberships")
    .select("user_id, profiles:user_id ( id, full_name )")
    .eq("circle_id", selectedCircleId)
    .eq("status", "active")

  const peers = (peerRows || [])
    .map((p) => {
      const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
      return prof as { id: string; full_name: string } | null
    })
    .filter((p): p is { id: string; full_name: string } => !!p && p.id !== user.id)

  const todayStr = getCircleLocalDate(todayView.circle.timezone)
  const reportDateObj = new Date(todayStr + "T00:00:00")
  const todayFormatted = reportDateObj.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <DashboardShell role="student">
      <div className="max-w-2xl mx-auto w-full">
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للوحة الطالب
        </Link>

        <SubmitReportForm
          circleId={selectedCircleId}
          circles={circles}
          peers={peers}
          todayView={todayView}
          todayFormatted={todayFormatted}
        />
      </div>
    </DashboardShell>
  )
}
