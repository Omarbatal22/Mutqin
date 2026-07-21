import { formatQuranRange } from "@/lib/quran"
import { globalToQuran } from "@/lib/progression/adapter"
import { normalizeHifzGlobals, normalizeRevisionRanges } from "@/lib/reports/normalize"
import type { StructuredReport, QuranRange, ListenerType } from "@/lib/reports/types"

function listenerLabel(type: ListenerType | null, name: string | null): string | null {
  if (!type) return null
  if (type === "teacher") return "معلم الحلقة"
  return name || (type === "peer" ? "طالب من الحلقة" : "شخص آخر")
}

interface ReportSummaryProps {
  report: StructuredReport | (Record<string, unknown> & { id?: string; report_date: string })
  /** compact = single-line-ish for dashboard previews; full = detailed cards */
  variant?: "full" | "compact"
}

function getHifzQuranRange(report: ReportSummaryProps["report"]): QuranRange | null {
  const r = report as Record<string, unknown>
  const norm = normalizeHifzGlobals({
    hifz_start_global: (r.hifz_start_global as number | null) ?? null,
    hifz_end_global: (r.hifz_end_global as number | null) ?? null,
    hifz_surah: (r.hifz_surah as number | null) ?? null,
    hifz_from_ayah: (r.hifz_from_ayah as number | null) ?? null,
    hifz_to_ayah: (r.hifz_to_ayah as number | null) ?? null,
  })

  if (norm.hifzStartGlobal != null && norm.hifzEndGlobal != null) {
    return globalToQuran({ start: norm.hifzStartGlobal, end: norm.hifzEndGlobal })
  }
  return null
}

function getRevisionQuranRanges(report: ReportSummaryProps["report"]): QuranRange[] {
  const r = report as Record<string, unknown>
  return normalizeRevisionRanges(r.revision_ranges)
}

/**
 * Single source of truth for rendering a structured daily report. Used by the
 * report success screen, both dashboards, the history list, and the teacher's
 * per-student view.
 */
export function ReportSummary({ report, variant = "full" }: ReportSummaryProps) {
  const hifzQr = getHifzQuranRange(report)
  const hifzText = hifzQr ? formatQuranRange(hifzQr) : null

  const revisionRanges = getRevisionQuranRanges(report)
  const listener = listenerLabel(
    (report.listener_type as ListenerType) ?? null,
    (report.listener_name as string) ?? null,
  )

  const didHifz = Boolean(report.did_hifz)
  const didRevision = Boolean(report.did_revision)
  const hifzMistakes = Number(report.hifz_mistakes ?? 0)
  const revisionMistakes = Number(report.revision_mistakes ?? 0)
  const totalMistakes: number = Number(report.total_mistakes ?? hifzMistakes + revisionMistakes)

  const hifzNotesStr = typeof report.hifz_notes === "string" && report.hifz_notes.trim() ? report.hifz_notes : null
  const revNotesStr = typeof report.revision_notes === "string" && report.revision_notes.trim() ? report.revision_notes : null
  const notesStr = typeof report.notes === "string" && report.notes.trim() ? report.notes : null

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <div>
          <span className="font-medium text-stone-600 dark:text-stone-400">حفظ:</span>{" "}
          {didHifz ? hifzText || "—" : "لا يوجد"}
        </div>
        <div>
          <span className="font-medium text-stone-600 dark:text-stone-400">مراجعة:</span>{" "}
          {didRevision && revisionRanges.length
            ? revisionRanges.map((r) => formatQuranRange(r)).join("، ")
            : "لا يوجد"}
        </div>
        <div>
          <span className="font-medium text-red-650">أخطاء:</span> {totalMistakes}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Hifz */}
      <div className="p-3 bg-stone-50/50 dark:bg-stone-900/20 rounded-xl border border-stone-200/40 dark:border-stone-850/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-450 dark:text-stone-500 font-bold">الحفظ</span>
          {didHifz && (
            <span className="text-[10px] font-bold text-red-650 dark:text-red-400">
              أخطاء الحفظ: {hifzMistakes}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-250">
          {didHifz ? hifzText || "لم يُحدد" : "لم يُسمّع حفظ اليوم"}
        </p>
        {hifzNotesStr && <p className="text-xs text-stone-500 mt-1.5">{hifzNotesStr}</p>}
      </div>

      {/* Revision */}
      <div className="p-3 bg-stone-50/50 dark:bg-stone-900/20 rounded-xl border border-stone-200/40 dark:border-stone-850/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-450 dark:text-stone-500 font-bold">المراجعة</span>
          {didRevision && (
            <span className="text-[10px] font-bold text-red-650 dark:text-red-400">
              أخطاء المراجعة: {revisionMistakes}
            </span>
          )}
        </div>
        {didRevision && revisionRanges.length ? (
          <div className="flex flex-col gap-0.5">
            {revisionRanges.map((r, i) => (
              <p key={i} className="text-sm font-semibold text-stone-800 dark:text-stone-250">
                {formatQuranRange(r)}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-250">
            لم تُسمّع مراجعة اليوم
          </p>
        )}
        {revNotesStr && <p className="text-xs text-stone-500 mt-1.5">{revNotesStr}</p>}
      </div>

      {/* Listener + general notes */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-stone-100 dark:border-stone-900/50 pt-3">
        {listener ? (
          <div className="text-stone-500">
            <span className="font-semibold text-stone-600 dark:text-stone-400">سمّع على: </span>
            <span className="font-bold text-stone-800 dark:text-stone-200">{listener}</span>
          </div>
        ) : (
          <span />
        )}
        <span className="text-[11px] font-bold text-red-650 dark:text-red-400">
          إجمالي الأخطاء: {totalMistakes}
        </span>
      </div>
      {notesStr && (
        <div className="text-xs text-stone-500">
          <span className="font-semibold text-stone-600 dark:text-stone-400">ملاحظات: </span>
          {notesStr}
        </div>
      )}
    </div>
  )
}
