"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Check, Plus, Minus, AlertCircle, Sparkles } from "lucide-react"

interface CircleInfo {
  id: string
  name: string
  current_week: number | null
}

function SubmitReportPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const initialCircleId = searchParams.get("circleId") || ""

  const [circles, setCircles] = React.useState<CircleInfo[]>([])
  const [selectedCircleId, setSelectedCircleId] = React.useState(initialCircleId)
  const [week, setWeek] = React.useState("")
  const [hifz, setHifz] = React.useState("")
  const [revision, setRevision] = React.useState("")
  const [mistakes, setMistakes] = React.useState(0)
  const [notes, setNotes] = React.useState("")
  
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)

  // Fetch student's active circles
  React.useEffect(() => {
    async function loadCirclesAndReport() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        // Fetch memberships
        const { data: memberships } = await supabase
          .from("circle_memberships")
          .select(`
            circle_id,
            circles (
              id,
              name,
              current_week
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "active")
          .eq("role", "student")

        const fetchedCircles = (memberships || [])
          .map(m => {
            const c = Array.isArray(m.circles) ? m.circles[0] : m.circles
            return c as CircleInfo | null
          })
          .filter((c): c is CircleInfo => !!c)

        setCircles(fetchedCircles)

        // Select circle if one is available or query param matches
        let circleId = selectedCircleId
        if (!circleId && fetchedCircles.length > 0) {
          circleId = fetchedCircles[0].id
          setSelectedCircleId(circleId)
        }

        if (circleId) {
          const selected = fetchedCircles.find(c => c.id === circleId)
          if (selected) {
            setWeek(selected.current_week ? `الأسبوع ${selected.current_week}` : "")
          }

          // Check if today's report already exists for this circle
          const todayStr = new Date().toISOString().split("T")[0]
          const { data: existingReport } = await supabase
            .from("daily_reports")
            .select("*")
            .eq("student_id", user.id)
            .eq("circle_id", circleId)
            .eq("report_date", todayStr)
            .single()

          if (existingReport) {
            setWeek(existingReport.week_reference || "")
            setHifz(existingReport.hifz_content || "")
            setRevision(existingReport.revision_content || "")
            setMistakes(existingReport.mistakes_count || 0)
            setNotes(existingReport.notes || "")
            setIsEditing(true)
          } else {
            // Reset fields for new submission
            setHifz("")
            setRevision("")
            setMistakes(0)
            setNotes("")
            setIsEditing(false)
          }
        }
      } catch {
        setError("حدث خطأ أثناء تحميل البيانات")
      } finally {
        setLoading(false)
      }
    }

    loadCirclesAndReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCircleId, initialCircleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCircleId) {
      setError("يرجى اختيار الحلقة أولاً")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const todayStr = new Date().toISOString().split("T")[0]

      const reportData = {
        circle_id: selectedCircleId,
        student_id: user.id,
        report_date: todayStr,
        week_reference: week,
        hifz_content: hifz,
        revision_content: revision,
        mistakes_count: mistakes,
        notes: notes,
      }

      // Upsert report (since student can edit same day report)
      const { error: submitError } = await supabase
        .from("daily_reports")
        .upsert(reportData, { onConflict: "circle_id,student_id,report_date" })

      if (submitError) throw submitError

      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء إرسال التقرير"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const todayFormatted = new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })

  if (loading) {
    return (
      <DashboardShell role="student">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center gap-2 text-stone-500">
            <Sparkles className="w-8 h-8 text-primary-650 animate-spin" />
            <span>جاري تحميل نموذج التقرير...</span>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="student">
      <div className="max-w-2xl mx-auto w-full">
        {/* Back Link */}
        <Link href="/student/dashboard" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold">
          <ArrowRight className="w-4 h-4" />
          العودة للوحة الطالب
        </Link>

        {success ? (
          <Card className="border-emerald-250 text-center shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200/50">
                <Check className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
                {isEditing ? "تم تحديث التقرير بنجاح!" : "تم تسجيل تقرير اليوم!"}
              </CardTitle>
              <CardDescription>
                تم تسجيل إنجازك لليوم بنجاح، وسيظهر مباشرة لمعلم حلقتك في لوحة المتابعة.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-2">
              <div className="flex gap-3">
                <Link href="/student/dashboard" className="flex-grow">
                  <Button variant="secondary" className="w-full">
                    لوحة التحكم
                  </Button>
                </Link>
                <Link href="/student/reports" className="flex-grow">
                  <Button variant="primary" className="w-full">
                    سجل تقاريري
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b border-stone-100 dark:border-stone-900 mb-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <CardTitle className="text-xl font-bold">{isEditing ? "تعديل تقرير اليوم" : "إرسال تقرير اليوم"}</CardTitle>
                  <CardDescription className="text-xs">{todayFormatted}</CardDescription>
                </div>
                {isEditing && (
                  <Badge variant="success">تقرير مسجل مسبقاً</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {circles.length === 0 ? (
                <div className="text-center p-6 flex flex-col items-center gap-3">
                  <AlertCircle className="w-10 h-10 text-amber-500" />
                  <p className="text-sm font-semibold">أنت لست منضماً لأي حلقة حالياً.</p>
                  <Link href="/student/join">
                    <Button size="sm">انضم لحلقة أولاً</Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {error && (
                    <div className="p-3.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/30">
                      {error}
                    </div>
                  )}

                  {/* Circle Selection */}
                  {circles.length > 1 ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-stone-700 dark:text-stone-300">الحلقة المستهدفة</label>
                      <select
                        value={selectedCircleId}
                        onChange={(e) => setSelectedCircleId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                      >
                        {circles.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-200/50 dark:border-stone-850 text-xs">
                      <span>إرسال التقرير لحلقة: </span>
                      <span className="font-bold text-stone-800 dark:text-stone-200">{circles[0]?.name}</span>
                    </div>
                  )}

                  {/* Week Reference */}
                  <Input
                    label="رقم الأسبوع أو المرجع"
                    placeholder="مثال: الأسبوع الأول، جزء عم"
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    required
                  />

                  {/* Hifz Input */}
                  <Textarea
                    label="الحفظ اليومي"
                    placeholder="مثال: سورة البقرة من آية 1 إلى آية 15"
                    value={hifz}
                    onChange={(e) => setHifz(e.target.value)}
                    required
                    rows={3}
                  />

                  {/* Revision Input */}
                  <Textarea
                    label="المراجعة اليومية"
                    placeholder="مثال: مراجعة جزء عم كاملاً، أو سورة آل عمران"
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    required
                    rows={3}
                  />

                  {/* Mistakes Counter (Premium touch) */}
                  <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-900/30 border border-stone-250/60 dark:border-stone-850 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">عدد الأخطاء اليومية</span>
                      <span className="text-xs text-stone-450 dark:text-stone-500">الأخطاء المسجلة أثناء التسميع</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setMistakes(prev => Math.max(0, prev - 1))}
                        className="w-10 h-10 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold active:scale-90 transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-extrabold text-lg text-stone-900 dark:text-stone-100 font-mono">
                        {mistakes}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMistakes(prev => prev + 1)}
                        className="w-10 h-10 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold active:scale-90 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <Textarea
                    label="ملاحظات إضافية (اختياري)"
                    placeholder="تنبيهات للمعلم، أو أسباب للتقصير..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />

                  <Button type="submit" className="w-full mt-2" disabled={submitting}>
                    {submitting 
                      ? (isEditing ? "جاري التحديث..." : "جاري الإرسال...") 
                      : (isEditing ? "تحديث التقرير اليومي" : "إرسال التقرير اليومي")
                    }
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}

export default function SubmitReportPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-stone-500 animate-pulse">جاري التحميل...</span>
      </div>
    }>
      <SubmitReportPageContent />
    </React.Suspense>
  )
}
