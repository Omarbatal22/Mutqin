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
import { NumberStepper } from "@/components/ui/number-stepper"
import { SurahAyahPicker } from "@/components/quran/surah-ayah-picker"
import { ReportSummary } from "@/components/reports/report-summary"
import { nextAyah } from "@/lib/quran"
import type { AyahRange, ListenerType, StructuredReport } from "@/lib/reports/types"
import { ArrowRight, Check, Plus, AlertCircle, Sparkles, Settings2 } from "lucide-react"

interface CircleInfo {
  id: string
  name: string
  current_week: number | null
}

interface Peer {
  id: string
  full_name: string
}

const emptyRange: AyahRange = { surah: 1, fromAyah: 1, toAyah: 1 }

function SubmitReportPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const initialCircleId = searchParams.get("circleId") || ""

  const [circles, setCircles] = React.useState<CircleInfo[]>([])
  const [selectedCircleId, setSelectedCircleId] = React.useState(initialCircleId)
  const [peers, setPeers] = React.useState<Peer[]>([])
  const [hasSettings, setHasSettings] = React.useState(true)

  // Hifz
  const [didHifz, setDidHifz] = React.useState(true)
  const [hifzRange, setHifzRange] = React.useState<AyahRange>(emptyRange)
  const [hifzMistakes, setHifzMistakes] = React.useState(0)
  const [hifzNotes, setHifzNotes] = React.useState("")
  // Revision
  const [didRevision, setDidRevision] = React.useState(true)
  const [revisionRanges, setRevisionRanges] = React.useState<AyahRange[]>([emptyRange])
  const [revisionMistakes, setRevisionMistakes] = React.useState(0)
  const [revisionNotes, setRevisionNotes] = React.useState("")
  // Listener
  const [listenerType, setListenerType] = React.useState<ListenerType>("teacher")
  const [listenerUserId, setListenerUserId] = React.useState("")
  const [listenerName, setListenerName] = React.useState("")
  // General
  const [notes, setNotes] = React.useState("")
  const [week, setWeek] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        // Student's active circles
        const { data: memberships } = await supabase
          .from("circle_memberships")
          .select("circle_id, circles ( id, name, current_week )")
          .eq("user_id", user.id)
          .eq("status", "active")
          .eq("role", "student")

        const fetched = (memberships || [])
          .map((m) => {
            const c = Array.isArray(m.circles) ? m.circles[0] : m.circles
            return c as CircleInfo | null
          })
          .filter((c): c is CircleInfo => !!c)
        setCircles(fetched)

        let circleId = selectedCircleId
        if (!circleId && fetched.length > 0) {
          circleId = fetched[0].id
          setSelectedCircleId(circleId)
        }
        if (!circleId) {
          setLoading(false)
          return
        }

        const selected = fetched.find((c) => c.id === circleId)
        setWeek(selected?.current_week ? `الأسبوع ${selected.current_week}` : "")

        // Peers (other active students in this circle) for the listener picker
        const { data: peerRows } = await supabase
          .from("circle_memberships")
          .select("user_id, profiles:user_id ( id, full_name )")
          .eq("circle_id", circleId)
          .eq("status", "active")

        const peerList = (peerRows || [])
          .map((p) => {
            const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
            return prof as Peer | null
          })
          .filter((p): p is Peer => !!p && p.id !== user.id)
        setPeers(peerList)

        // Existing report for today?
        const todayStr = new Date().toISOString().split("T")[0]
        const { data: existing } = await supabase
          .from("daily_reports")
          .select("*")
          .eq("student_id", user.id)
          .eq("circle_id", circleId)
          .eq("report_date", todayStr)
          .single()

        if (existing) {
          setDidHifz(existing.did_hifz ?? true)
          if (existing.hifz_surah) {
            setHifzRange({
              surah: existing.hifz_surah,
              fromAyah: existing.hifz_from_ayah ?? 1,
              toAyah: existing.hifz_to_ayah ?? 1,
            })
          }
          setHifzMistakes(existing.hifz_mistakes ?? 0)
          setHifzNotes(existing.hifz_notes ?? "")
          setDidRevision(existing.did_revision ?? true)
          setRevisionRanges(
            Array.isArray(existing.revision_ranges) && existing.revision_ranges.length
              ? existing.revision_ranges
              : [emptyRange],
          )
          setRevisionMistakes(existing.revision_mistakes ?? 0)
          setRevisionNotes(existing.revision_notes ?? "")
          setListenerType(existing.listener_type ?? "teacher")
          setListenerUserId(existing.listener_user_id ?? "")
          setListenerName(existing.listener_name ?? "")
          setNotes(existing.notes ?? "")
          setWeek(existing.week_reference || week)
          setIsEditing(true)
          setLoading(false)
          return
        }

        // No report today — prepare suggestions.
        setIsEditing(false)

        // 1) prefill hifz from the last report in this circle (progress-based)
        const { data: last } = await supabase
          .from("daily_reports")
          .select("hifz_surah, hifz_to_ayah, listener_type, listener_user_id, listener_name")
          .eq("student_id", user.id)
          .eq("circle_id", circleId)
          .eq("did_hifz", true)
          .order("report_date", { ascending: false })
          .limit(1)
          .maybeSingle()

        let suggested: AyahRange | null = null
        if (last?.hifz_surah && last?.hifz_to_ayah) {
          const nxt = nextAyah(last.hifz_surah, last.hifz_to_ayah)
          if (nxt) suggested = { surah: nxt.surah, fromAyah: nxt.ayah, toAyah: nxt.ayah }
          // remember who they recited to
          if (last.listener_type) setListenerType(last.listener_type)
          if (last.listener_user_id) setListenerUserId(last.listener_user_id)
          if (last.listener_name) setListenerName(last.listener_name)
        }

        // 2) fall back to memorization_settings start position
        if (!suggested) {
          const { data: settings } = await supabase
            .from("memorization_settings")
            .select("start_surah, start_ayah")
            .eq("user_id", user.id)
            .eq("circle_id", circleId)
            .maybeSingle()

          if (settings) {
            suggested = {
              surah: settings.start_surah ?? 1,
              fromAyah: settings.start_ayah ?? 1,
              toAyah: settings.start_ayah ?? 1,
            }
          } else {
            setHasSettings(false)
          }
        }

        if (suggested) {
          setHifzRange(suggested)
          setRevisionRanges([{ ...suggested }])
        }
      } catch {
        setError("حدث خطأ أثناء تحميل البيانات")
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCircleId, initialCircleId])

  const updateRevisionRange = (index: number, range: AyahRange) => {
    setRevisionRanges((prev) => prev.map((r, i) => (i === index ? range : r)))
  }
  const addRevisionRange = () => setRevisionRanges((prev) => [...prev, { ...emptyRange }])
  const removeRevisionRange = (index: number) =>
    setRevisionRanges((prev) => prev.filter((_, i) => i !== index))

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

      const resolvedListenerName =
        listenerType === "peer"
          ? peers.find((p) => p.id === listenerUserId)?.full_name ?? null
          : listenerType === "other"
            ? listenerName || null
            : null

      const reportData = {
        circle_id: selectedCircleId,
        student_id: user.id,
        report_date: todayStr,
        week_reference: week,
        did_hifz: didHifz,
        hifz_surah: didHifz ? hifzRange.surah : null,
        hifz_from_ayah: didHifz ? hifzRange.fromAyah : null,
        hifz_to_ayah: didHifz ? hifzRange.toAyah : null,
        hifz_mistakes: didHifz ? hifzMistakes : 0,
        hifz_notes: didHifz ? hifzNotes || null : null,
        did_revision: didRevision,
        revision_ranges: didRevision ? revisionRanges : [],
        revision_mistakes: didRevision ? revisionMistakes : 0,
        revision_notes: didRevision ? revisionNotes || null : null,
        listener_type: listenerType,
        listener_user_id: listenerType === "peer" ? listenerUserId || null : null,
        listener_name: resolvedListenerName,
        notes: notes || null,
      }

      const { error: submitError } = await supabase
        .from("daily_reports")
        .upsert(reportData, { onConflict: "circle_id,student_id,report_date" })

      if (submitError) throw submitError
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال التقرير")
    } finally {
      setSubmitting(false)
    }
  }

  const todayFormatted = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  // Build a StructuredReport for the success summary
  const summaryReport: StructuredReport = {
    report_date: new Date().toISOString().split("T")[0],
    did_hifz: didHifz,
    hifz_surah: didHifz ? hifzRange.surah : null,
    hifz_from_ayah: didHifz ? hifzRange.fromAyah : null,
    hifz_to_ayah: didHifz ? hifzRange.toAyah : null,
    hifz_page: null,
    hifz_mistakes: hifzMistakes,
    hifz_notes: hifzNotes || null,
    did_revision: didRevision,
    revision_ranges: didRevision ? revisionRanges : [],
    revision_mistakes: revisionMistakes,
    revision_notes: revisionNotes || null,
    listener_type: listenerType,
    listener_user_id: listenerType === "peer" ? listenerUserId || null : null,
    listener_name:
      listenerType === "peer"
        ? peers.find((p) => p.id === listenerUserId)?.full_name ?? null
        : listenerType === "other"
          ? listenerName || null
          : null,
    notes: notes || null,
    total_mistakes: hifzMistakes + revisionMistakes,
  }

  if (loading) {
    return (
      <DashboardShell role="student">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center gap-2 text-stone-500">
            <Sparkles className="w-8 h-8 text-primary-650 animate-spin" />
            <span>جاري تجهيز تقرير اليوم...</span>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="student">
      <div className="max-w-2xl mx-auto w-full">
        <Link href="/student/dashboard" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold">
          <ArrowRight className="w-4 h-4" />
          العودة للوحة الطالب
        </Link>

        {success ? (
          <Card className="border-emerald-250 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200/50">
                <Check className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
                {isEditing ? "تم تحديث تقرير اليوم!" : "تم تسجيل تقرير اليوم ✓"}
              </CardTitle>
              <CardDescription>سيظهر تقريرك مباشرة لمعلم حلقتك في لوحة المتابعة.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 mt-2">
              <ReportSummary report={summaryReport} />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-grow"
                  onClick={() => {
                    setSuccess(false)
                    setIsEditing(true)
                  }}
                >
                  تعديل التقرير
                </Button>
                <Link href="/student/dashboard" className="flex-grow">
                  <Button variant="primary" className="w-full">العودة للرئيسية</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b border-stone-100 dark:border-stone-900 mb-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <CardTitle className="text-xl font-bold">
                    {isEditing ? "تعديل تقرير اليوم" : "تقرير اليوم"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {todayFormatted}
                    {week ? ` — ${week}` : ""}
                  </CardDescription>
                </div>
                {isEditing && <Badge variant="success">تقرير مسجل مسبقاً</Badge>}
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
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  {error && (
                    <div className="p-3.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50">
                      {error}
                    </div>
                  )}

                  {!hasSettings && !isEditing && (
                    <Link
                      href={`/student/setup?circleId=${selectedCircleId}`}
                      className="flex items-center gap-2 p-3 rounded-xl border border-primary-200/50 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400 text-xs font-semibold"
                    >
                      <Settings2 className="w-4 h-4" />
                      أعدّ نظام حفظك ليجهّز النظام تقاريرك تلقائياً.
                    </Link>
                  )}

                  {/* Circle selection */}
                  {circles.length > 1 ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-stone-700 dark:text-stone-300">الحلقة المستهدفة</label>
                      <select
                        value={selectedCircleId}
                        onChange={(e) => setSelectedCircleId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {circles.map((c) => (
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

                  {/* ① Hifz section */}
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-stone-800 dark:text-stone-200">① الحفظ</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-stone-600 dark:text-stone-400">هل سمّعت حفظاً جديداً اليوم؟</span>
                      <YesNo value={didHifz} onChange={setDidHifz} />
                    </div>

                    {didHifz && (
                      <div className="flex flex-col gap-4">
                        <SurahAyahPicker value={hifzRange} onChange={setHifzRange} />
                        <NumberStepper
                          label="عدد أخطاء الحفظ"
                          hint="الأخطاء المسجلة أثناء التسميع"
                          value={hifzMistakes}
                          onChange={setHifzMistakes}
                        />
                        <Textarea
                          label="ملاحظات على الحفظ (اختياري)"
                          placeholder="مثال: احتجت لإعادة الآيات من 15 إلى 18"
                          value={hifzNotes}
                          onChange={(e) => setHifzNotes(e.target.value)}
                          rows={2}
                        />
                      </div>
                    )}
                  </section>

                  {/* ② Revision section */}
                  <section className="flex flex-col gap-4 border-t border-stone-100 dark:border-stone-900 pt-5">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200">② المراجعة</h3>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-stone-600 dark:text-stone-400">هل سمّعت مراجعة اليوم؟</span>
                      <YesNo value={didRevision} onChange={setDidRevision} />
                    </div>

                    {didRevision && (
                      <div className="flex flex-col gap-4">
                        {revisionRanges.map((r, i) => (
                          <SurahAyahPicker
                            key={i}
                            value={r}
                            onChange={(range) => updateRevisionRange(i, range)}
                            onRemove={revisionRanges.length > 1 ? () => removeRevisionRange(i) : undefined}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={addRevisionRange}
                          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-semibold self-start"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة جزء مراجعة آخر
                        </button>
                        <NumberStepper
                          label="عدد أخطاء المراجعة"
                          value={revisionMistakes}
                          onChange={setRevisionMistakes}
                        />
                        <Textarea
                          label="ملاحظات المراجعة (اختياري)"
                          value={revisionNotes}
                          onChange={(e) => setRevisionNotes(e.target.value)}
                          rows={2}
                        />
                      </div>
                    )}
                  </section>

                  {/* ③ Listener */}
                  <section className="flex flex-col gap-3 border-t border-stone-100 dark:border-stone-900 pt-5">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200">③ سمّعت على</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { v: "teacher", l: "معلم الحلقة" },
                        { v: "peer", l: "طالب من الحلقة" },
                        { v: "other", l: "شخص آخر" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setListenerType(opt.v)}
                          className={`p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                            listenerType === opt.v
                              ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                              : "border-stone-200 dark:border-stone-850 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900"
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>

                    {listenerType === "peer" && (
                      <select
                        value={listenerUserId}
                        onChange={(e) => setListenerUserId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">اختر الطالب...</option>
                        {peers.map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name}</option>
                        ))}
                      </select>
                    )}
                    {listenerType === "other" && (
                      <Input
                        placeholder="اسم المستمع (اختياري)"
                        value={listenerName}
                        onChange={(e) => setListenerName(e.target.value)}
                      />
                    )}
                  </section>

                  {/* ④ General notes */}
                  <section className="flex flex-col gap-3 border-t border-stone-100 dark:border-stone-900 pt-5">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200">④ ملاحظات عامة</h3>
                    <Textarea
                      placeholder="اكتب ملاحظة إن وجدت..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </section>

                  <Button type="submit" className="w-full mt-2" disabled={submitting}>
                    {submitting
                      ? isEditing ? "جاري التحديث..." : "جاري الإرسال..."
                      : isEditing ? "تحديث تقرير اليوم" : "تسجيل تقرير اليوم"}
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

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`p-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
          value
            ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
            : "border-stone-200 dark:border-stone-850 text-stone-600 dark:text-stone-400"
        }`}
      >
        نعم
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`p-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
          !value
            ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
            : "border-stone-200 dark:border-stone-850 text-stone-600 dark:text-stone-400"
        }`}
      >
        لا
      </button>
    </div>
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
