"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NumberStepper } from "@/components/ui/number-stepper"
import { SurahAyahPicker } from "@/components/quran/surah-ayah-picker"
import { ReportSummary } from "@/components/reports/report-summary"
import { submitReport } from "./actions"
import type { AyahRange, ListenerType, StructuredReport } from "@/lib/reports/types"
import type { TodayView, DailyAssignment } from "@/lib/progression/today"
import { Check, Plus, Sparkles, Pencil } from "lucide-react"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type HifzOutcome = "completed" | "partial" | "different" | "none"
type RevisionOutcome = "completed" | "partial" | "different" | "none"

interface Props {
  circleId: string
  circles: { id: string; name: string; current_week: number | null }[]
  peers: { id: string; full_name: string }[]
  todayView: TodayView
  todayFormatted: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function assignmentHifzRange(a: DailyAssignment): AyahRange | null {
  if (a.hifz_surah == null || a.hifz_from_ayah == null || a.hifz_to_ayah == null) return null
  return { surah: a.hifz_surah, fromAyah: a.hifz_from_ayah, toAyah: a.hifz_to_ayah }
}

const emptyRange: AyahRange = { surah: 1, fromAyah: 1, toAyah: 1 }

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function SubmitReportForm({
  circleId,
  circles,
  peers,
  todayView,
  todayFormatted,
}: Props) {
  const router = useRouter()
  const { assignment, report } = todayView

  const suggestedHifz = assignment ? assignmentHifzRange(assignment) : null
  const suggestedRevision: AyahRange[] =
    assignment?.revision_ranges && assignment.revision_ranges.length > 0
      ? (assignment.revision_ranges as AyahRange[])
      : [emptyRange]

  const isAlreadySubmitted = !!report

  // ── State ────────────────────────────────────────────────────────────────

  const [isEditing, setIsEditing] = React.useState(!isAlreadySubmitted)
  const [success, setSuccess] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Hifz
  const [hifzOutcome, setHifzOutcome] = React.useState<HifzOutcome>(
    report
      ? report.did_hifz
        ? "completed"
        : "none"
      : "completed",
  )
  const [hifzPartialRange, setHifzPartialRange] = React.useState<AyahRange>(
    suggestedHifz ?? emptyRange,
  )
  const [hifzDifferentRange, setHifzDifferentRange] = React.useState<AyahRange>(emptyRange)
  const [hifzMistakes, setHifzMistakes] = React.useState(report?.hifz_mistakes ?? 0)
  const [hifzNotes, setHifzNotes] = React.useState(report?.hifz_notes ?? "")

  // Revision
  const [revisionOutcome, setRevisionOutcome] = React.useState<RevisionOutcome>(
    report
      ? report.did_revision
        ? "completed"
        : "none"
      : "completed",
  )
  const [revisionPartialRanges, setRevisionPartialRanges] = React.useState<AyahRange[]>(
    suggestedRevision,
  )
  const [revisionDifferentRanges, setRevisionDifferentRanges] = React.useState<AyahRange[]>([
    emptyRange,
  ])
  const [revisionMistakes, setRevisionMistakes] = React.useState(report?.revision_mistakes ?? 0)
  const [revisionNotes, setRevisionNotes] = React.useState(report?.revision_notes ?? "")

  // Listener
  const [listenerType, setListenerType] = React.useState<ListenerType>(
    report?.listener_type ?? "teacher",
  )
  const [listenerUserId, setListenerUserId] = React.useState(report?.listener_user_id ?? "")
  const [listenerName, setListenerName] = React.useState(report?.listener_name ?? "")

  // Notes
  const [notes, setNotes] = React.useState(report?.notes ?? "")
  const [weekRef] = React.useState(
    report?.week_reference ??
      (todayView.circle.current_week ? `الأسبوع ${todayView.circle.current_week}` : ""),
  )

  // ── Derived ──────────────────────────────────────────────────────────────

  const actualHifzRange: AyahRange | null =
    hifzOutcome === "completed"
      ? suggestedHifz
      : hifzOutcome === "partial"
        ? hifzPartialRange
        : hifzOutcome === "different"
          ? hifzDifferentRange
          : null

  const didHifz = hifzOutcome !== "none"

  const actualRevisionRanges: AyahRange[] =
    revisionOutcome === "completed"
      ? suggestedRevision
      : revisionOutcome === "partial"
        ? revisionPartialRanges
        : revisionOutcome === "different"
          ? revisionDifferentRanges
          : []

  const didRevision = revisionOutcome !== "none"

  const resolvedListenerName =
    listenerType === "peer"
      ? peers.find((p) => p.id === listenerUserId)?.full_name ?? null
      : listenerType === "other"
        ? listenerName || null
        : null

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitReport({
        circleId,
        assignmentId: assignment?.id ?? null,
        didHifz,
        hifzRange: actualHifzRange,
        hifzMistakes,
        hifzNotes,
        didRevision,
        revisionRanges: actualRevisionRanges,
        revisionMistakes,
        revisionNotes,
        listenerType,
        listenerUserId: listenerType === "peer" ? listenerUserId || null : null,
        listenerName: resolvedListenerName,
        notes,
        weekReference: weekRef,
      })
      if (!result.success) throw new Error(result.error)
      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال التقرير")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Read-only view (already submitted) ───────────────────────────────────

  if (isAlreadySubmitted && !isEditing && !success) {
    const summaryReport: StructuredReport = {
      report_date: report.report_date,
      did_hifz: report.did_hifz,
      hifz_surah: report.hifz_surah,
      hifz_from_ayah: report.hifz_from_ayah,
      hifz_to_ayah: report.hifz_to_ayah,
      hifz_page: report.hifz_page,
      hifz_mistakes: report.hifz_mistakes,
      hifz_notes: report.hifz_notes,
      did_revision: report.did_revision,
      revision_ranges: (report.revision_ranges as AyahRange[]) ?? [],
      revision_mistakes: report.revision_mistakes,
      revision_notes: report.revision_notes,
      listener_type: report.listener_type,
      listener_user_id: report.listener_user_id,
      listener_name: report.listener_name,
      notes: report.notes,
      total_mistakes: report.total_mistakes,
    }

    return (
      <Card className="border-emerald-200/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200/50">
            <Check className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
            تم تسجيل تقرير اليوم ✓
          </CardTitle>
          <CardDescription>سيظهر تقريرك مباشرة لمعلم حلقتك في لوحة المتابعة.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 mt-2">
          <ReportSummary report={summaryReport} />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-grow flex items-center gap-2"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="w-4 h-4" />
              تعديل التقرير
            </Button>
            <Link href="/student/dashboard" className="flex-grow">
              <Button variant="primary" className="w-full">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    const summaryReport: StructuredReport = {
      report_date: new Date().toISOString().split("T")[0],
      did_hifz: didHifz,
      hifz_surah: actualHifzRange?.surah ?? null,
      hifz_from_ayah: actualHifzRange?.fromAyah ?? null,
      hifz_to_ayah: actualHifzRange?.toAyah ?? null,
      hifz_page: null,
      hifz_mistakes: hifzMistakes,
      hifz_notes: hifzNotes || null,
      did_revision: didRevision,
      revision_ranges: actualRevisionRanges,
      revision_mistakes: revisionMistakes,
      revision_notes: revisionNotes || null,
      listener_type: listenerType,
      listener_user_id: listenerType === "peer" ? listenerUserId || null : null,
      listener_name: resolvedListenerName,
      notes: notes || null,
      total_mistakes: hifzMistakes + revisionMistakes,
    }

    return (
      <Card className="border-emerald-200/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200/50">
            <Check className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
            {isAlreadySubmitted ? "تم تحديث تقرير اليوم!" : "تم تسجيل تقرير اليوم ✓"}
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
              <Button variant="primary" className="w-full">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Edit / New form ───────────────────────────────────────────────────────

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3 border-b border-stone-100 dark:border-stone-900 mb-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <CardTitle className="text-xl font-bold">
              {isEditing && isAlreadySubmitted ? "تعديل تقرير اليوم" : "تقرير اليوم"}
            </CardTitle>
            <CardDescription className="text-xs">
              {todayFormatted}
              {weekRef ? ` — ${weekRef}` : ""}
            </CardDescription>
          </div>
          {isEditing && isAlreadySubmitted && (
            <Badge variant="success">تقرير مسجل مسبقاً</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="p-3.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50">
              {error}
            </div>
          )}

          {/* Circle selector */}
          {circles.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                الحلقة المستهدفة
              </label>
              <select
                value={circleId}
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  url.searchParams.set("circleId", e.target.value)
                  window.location.href = url.toString()
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {circles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ① Hifz section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-stone-800 dark:text-stone-200">① الحفظ</h3>
            </div>

            {suggestedHifz && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50/70 dark:bg-primary-950/10 border border-primary-200/50">
                <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
                    مقترح تلقائياً
                  </span>
                  <span className="text-xs text-primary-600 dark:text-primary-500 truncate">
                    {suggestedHifz.surah}:{suggestedHifz.fromAyah}–{suggestedHifz.toAyah}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "completed", l: "أكملت المطلوب" },
                  { v: "partial", l: "أكملت جزءاً" },
                  { v: "different", l: "سمّعت غير المقترح" },
                  { v: "none", l: "لم أُسمّع" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setHifzOutcome(opt.v)}
                  className={`p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    hifzOutcome === opt.v
                      ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                      : "border-stone-200 dark:border-stone-850 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            {hifzOutcome === "partial" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-stone-500">حتى أي آية وصلت؟</p>
                <SurahAyahPicker
                  value={hifzPartialRange}
                  onChange={setHifzPartialRange}
                />
              </div>
            )}

            {hifzOutcome === "different" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-stone-500">حدد ما سمّعته فعلياً</p>
                <SurahAyahPicker
                  value={hifzDifferentRange}
                  onChange={setHifzDifferentRange}
                />
              </div>
            )}

            {didHifz && (
              <>
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
              </>
            )}
          </section>

          {/* ② Revision section */}
          <section className="flex flex-col gap-4 border-t border-stone-100 dark:border-stone-900 pt-5">
            <h3 className="font-bold text-stone-800 dark:text-stone-200">② المراجعة</h3>

            {suggestedRevision.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50/70 dark:bg-primary-950/10 border border-primary-200/50">
                <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
                    مقترح تلقائياً
                  </span>
                  <span className="text-xs text-primary-600 dark:text-primary-500 truncate">
                    {suggestedRevision
                      .map((r) => `${r.surah}:${r.fromAyah}–${r.toAyah}`)
                      .join(" | ")}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "completed", l: "أكملت المطلوب" },
                  { v: "partial", l: "أكملت جزءاً" },
                  { v: "different", l: "راجعت غير المقترح" },
                  { v: "none", l: "لم أُراجع" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setRevisionOutcome(opt.v)}
                  className={`p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    revisionOutcome === opt.v
                      ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                      : "border-stone-200 dark:border-stone-850 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            {revisionOutcome === "partial" && (
              <div className="flex flex-col gap-3">
                {revisionPartialRanges.map((r, i) => (
                  <SurahAyahPicker
                    key={i}
                    value={r}
                    onChange={(range) =>
                      setRevisionPartialRanges((prev) =>
                        prev.map((x, j) => (j === i ? range : x)),
                      )
                    }
                    onRemove={
                      revisionPartialRanges.length > 1
                        ? () =>
                            setRevisionPartialRanges((prev) => prev.filter((_, j) => j !== i))
                        : undefined
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setRevisionPartialRanges((prev) => [...prev, { ...emptyRange }])
                  }
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-semibold self-start"
                >
                  <Plus className="w-4 h-4" />
                  إضافة جزء آخر
                </button>
              </div>
            )}

            {revisionOutcome === "different" && (
              <div className="flex flex-col gap-3">
                {revisionDifferentRanges.map((r, i) => (
                  <SurahAyahPicker
                    key={i}
                    value={r}
                    onChange={(range) =>
                      setRevisionDifferentRanges((prev) =>
                        prev.map((x, j) => (j === i ? range : x)),
                      )
                    }
                    onRemove={
                      revisionDifferentRanges.length > 1
                        ? () =>
                            setRevisionDifferentRanges((prev) => prev.filter((_, j) => j !== i))
                        : undefined
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setRevisionDifferentRanges((prev) => [...prev, { ...emptyRange }])
                  }
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-semibold self-start"
                >
                  <Plus className="w-4 h-4" />
                  إضافة جزء آخر
                </button>
              </div>
            )}

            {didRevision && (
              <>
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
              </>
            )}
          </section>

          {/* ③ Listener */}
          <section className="flex flex-col gap-3 border-t border-stone-100 dark:border-stone-900 pt-5">
            <h3 className="font-bold text-stone-800 dark:text-stone-200">③ سمّعت على</h3>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: "teacher", l: "معلم الحلقة" },
                  { v: "peer", l: "طالب من الحلقة" },
                  { v: "other", l: "شخص آخر" },
                ] as const
              ).map((opt) => (
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
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            )}
            {listenerType === "other" && (
              <input
                type="text"
                placeholder="اسم المستمع (اختياري)"
                value={listenerName}
                onChange={(e) => setListenerName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
          </section>

          {/* ④ Notes */}
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
              ? isEditing && isAlreadySubmitted
                ? "جاري التحديث..."
                : "جاري الإرسال..."
              : isEditing && isAlreadySubmitted
                ? "تحديث تقرير اليوم"
                : "تسجيل تقرير اليوم"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
