"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { SURAHS, getSurah } from "@/lib/quran"
import { ArrowRight, Check, Settings2 } from "lucide-react"

interface CircleOption {
  id: string
  name: string
}

const HIFZ_OPTIONS = [
  { value: "half_page", label: "نصف صفحة يومياً" },
  { value: "full_page", label: "صفحة كاملة يومياً" },
  { value: "custom", label: "مقدار مخصص" },
] as const

const REVISION_OPTIONS = [
  { value: "quarter_hizb", label: "ربع حزب" },
  { value: "half_hizb", label: "نصف حزب" },
  { value: "hizb", label: "حزب" },
  { value: "two_hizb", label: "حزبان" },
  { value: "juz", label: "جزء" },
  { value: "custom", label: "مخصص" },
] as const

function SetupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const preselectedCircle = searchParams.get("circleId") || ""

  const [step, setStep] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  const [circles, setCircles] = React.useState<CircleOption[]>([])
  const [circleId, setCircleId] = React.useState(preselectedCircle)

  // Step 1 — starting position
  const [startSurah, setStartSurah] = React.useState(1)
  const [startPage, setStartPage] = React.useState("")
  const [startAyah, setStartAyah] = React.useState(1)
  // Step 2 — hifz amount
  const [hifzAmount, setHifzAmount] = React.useState<string>("full_page")
  const [hifzCustomNote, setHifzCustomNote] = React.useState("")
  // Step 3 — revision amount
  const [revisionAmount, setRevisionAmount] = React.useState<string>("hizb")
  // Step 4 — revision start
  const [revisionStart, setRevisionStart] = React.useState(1)

  const maxAyah = getSurah(startSurah)?.ayahCount ?? 1

  // Load the student's circles + any existing settings for the active circle
  React.useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        const { data: memberships } = await supabase
          .from("circle_memberships")
          .select("circle_id, circles ( id, name )")
          .eq("user_id", user.id)
          .eq("status", "active")
          .eq("role", "student")

        const opts = (memberships || [])
          .map((m) => {
            const c = Array.isArray(m.circles) ? m.circles[0] : m.circles
            return c as CircleOption | null
          })
          .filter((c): c is CircleOption => !!c)
        setCircles(opts)

        const active = preselectedCircle || opts[0]?.id || ""
        setCircleId(active)

        if (active) {
          const { data: existing } = await supabase
            .from("memorization_settings")
            .select("*")
            .eq("user_id", user.id)
            .eq("circle_id", active)
            .single()

          if (existing) {
            setStartSurah(existing.start_surah ?? 1)
            setStartPage(existing.start_page ? String(existing.start_page) : "")
            setStartAyah(existing.start_ayah ?? 1)
            setHifzAmount(existing.hifz_amount ?? "full_page")
            setHifzCustomNote(existing.hifz_custom_note ?? "")
            setRevisionAmount(existing.revision_amount ?? "hizb")
            setRevisionStart(existing.revision_start ?? 1)
          }
        }
      } catch {
        setError("حدث خطأ أثناء تحميل البيانات")
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedCircle])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      if (!circleId) {
        setError("يرجى اختيار الحلقة")
        setSaving(false)
        return
      }

      const { error: upsertError } = await supabase
        .from("memorization_settings")
        .upsert(
          {
            user_id: user.id,
            circle_id: circleId,
            start_surah: startSurah,
            start_page: startPage ? Number(startPage) : null,
            start_ayah: startAyah,
            hifz_amount: hifzAmount,
            hifz_custom_note: hifzAmount === "custom" ? hifzCustomNote : null,
            revision_amount: revisionAmount,
            revision_start: revisionStart,
          },
          { onConflict: "user_id,circle_id" },
        )

      if (upsertError) throw upsertError
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ النظام")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell role="student">
        <div className="flex items-center justify-center min-h-[50vh] text-stone-500 animate-pulse">
          جاري التحميل...
        </div>
      </DashboardShell>
    )
  }

  if (done) {
    return (
      <DashboardShell role="student">
        <div className="max-w-md mx-auto w-full">
          <Card className="border-emerald-250 text-center shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200/50">
                <Check className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
                تم إعداد نظامك بنجاح!
              </CardTitle>
              <CardDescription>
                سيجهّز النظام تقرير اليوم تلقائياً بناءً على نظامك وآخر موضع وصلت إليه.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-2">
              <div className="flex gap-3">
                <Link href="/student/dashboard" className="flex-grow">
                  <Button variant="secondary" className="w-full">لوحة الطالب</Button>
                </Link>
                <Link href={`/student/report?circleId=${circleId}`} className="flex-grow">
                  <Button variant="primary" className="w-full">تقرير اليوم</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  const totalSteps = 4

  return (
    <DashboardShell role="student">
      <div className="max-w-lg mx-auto w-full">
        <Link href="/student/dashboard" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold">
          <ArrowRight className="w-4 h-4" />
          العودة للوحة الطالب
        </Link>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary-600" />
              إعداد نظام الحفظ والمراجعة
            </CardTitle>
            <CardDescription>الخطوة {step} من {totalSteps}</CardDescription>
            {/* Progress */}
            <div className="flex gap-1.5 mt-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < step ? "bg-primary-600" : "bg-stone-200 dark:bg-stone-800"
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            {error && (
              <div className="p-3.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50">
                {error}
              </div>
            )}

            {/* Circle selector (only when more than one) */}
            {circles.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">الحلقة</label>
                <select
                  value={circleId}
                  onChange={(e) => setCircleId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {circles.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 1 — starting position */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-stone-800 dark:text-stone-200">أين وصلت في الحفظ؟</h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">السورة</label>
                  <select
                    value={startSurah}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      setStartSurah(n)
                      setStartAyah((a) => Math.min(a, getSurah(n)?.ayahCount ?? 1))
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {SURAHS.map((s) => (
                      <option key={s.number} value={s.number}>{s.number}. {s.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="الآية"
                    type="number"
                    min={1}
                    max={maxAyah}
                    value={startAyah}
                    onChange={(e) => setStartAyah(Math.min(Math.max(1, Number(e.target.value)), maxAyah))}
                    dir="ltr"
                    className="text-center font-mono"
                  />
                  <Input
                    label="الصفحة (اختياري)"
                    type="number"
                    min={1}
                    max={604}
                    value={startPage}
                    onChange={(e) => setStartPage(e.target.value)}
                    dir="ltr"
                    className="text-center font-mono"
                  />
                </div>
              </div>
            )}

            {/* Step 2 — hifz amount */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-stone-800 dark:text-stone-200">ما نظام حفظك اليومي؟</h3>
                <div className="grid gap-2.5">
                  {HIFZ_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setHifzAmount(opt.value)}
                      className={`p-4 rounded-xl border-2 text-right font-semibold transition-all ${
                        hifzAmount === opt.value
                          ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                          : "border-stone-200 dark:border-stone-850 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {hifzAmount === "custom" && (
                  <Input
                    label="وصف المقدار المخصص"
                    placeholder="مثال: ثُمن صفحة، خمس آيات..."
                    value={hifzCustomNote}
                    onChange={(e) => setHifzCustomNote(e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Step 3 — revision amount */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-stone-800 dark:text-stone-200">ما نظام مراجعتك اليومي؟</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {REVISION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRevisionAmount(opt.value)}
                      className={`p-4 rounded-xl border-2 text-center font-semibold transition-all ${
                        revisionAmount === opt.value
                          ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                          : "border-stone-200 dark:border-stone-850 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 — revision start */}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-stone-800 dark:text-stone-200">من أين تبدأ المراجعة؟</h3>
                <Input
                  label="رقم الحزب (1 - 60)"
                  type="number"
                  min={1}
                  max={60}
                  value={revisionStart}
                  onChange={(e) => setRevisionStart(Math.min(Math.max(1, Number(e.target.value)), 60))}
                  dir="ltr"
                  className="text-center font-mono"
                />
                <p className="text-xs text-stone-500">
                  سيبدأ النظام باقتراح المراجعة من هذا الحزب، ثم يتقدّم تلقائياً بحسب نظامك.
                </p>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex gap-3 mt-2">
              {step > 1 && (
                <Button variant="secondary" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                  السابق
                </Button>
              )}
              {step < totalSteps ? (
                <Button className="flex-1" onClick={() => setStep((s) => s + 1)}>
                  التالي
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ النظام"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

export default function StudentSetupPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-stone-500 animate-pulse">جاري التحميل...</span>
      </div>
    }>
      <SetupPageContent />
    </React.Suspense>
  )
}
