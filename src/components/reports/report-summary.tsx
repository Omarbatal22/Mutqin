import { formatRange } from "@/lib/quran"
import type { StructuredReport, AyahRange, ListenerType } from "@/lib/reports/types"

function listenerLabel(
  type: ListenerType | null,
  name: string | null,
): string | null {
  if (!type) return null
  if (type === "teacher") return "معلم الحلقة"
  // peer/other both carry a resolved name in listener_name at render time
  return name || (type === "peer" ? "طالب من الحلقة" : "شخص آخر")
}

interface ReportSummaryProps {
  report: StructuredReport
  /** compact = single-line-ish for dashboard previews; full = detailed cards */
  variant?: "full" | "compact"
}

/**
 * Single source of truth for rendering a structured daily report. Used by the
 * report success screen, both dashboards, the history list, and the teacher's
 * per-student view.
 */
export function ReportSummary({ report, variant = "full" }: ReportSummaryProps) {
  const hifzText =
    report.did_hifz && report.hifz_surah && report.hifz_from_ayah && report.hifz_to_ayah
      ? formatRange({
          surah: report.hifz_surah,
          fromAyah: report.hifz_from_ayah,
          toAyah: report.hifz_to_ayah,
        })
      : null

  const revisionRanges: AyahRange[] = Array.isArray(report.revision_ranges)
    ? report.revision_ranges
    : []

  const listener = listenerLabel(report.listener_type, report.listener_name)

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <div>
          <span className="font-medium text-stone-600 dark:text-stone-400">حفظ:</span>{" "}
          {report.did_hifz ? hifzText || "—" : "لا يوجد"}
        </div>
        <div>
          <span className="font-medium text-stone-600 dark:text-stone-400">مراجعة:</span>{" "}
          {report.did_revision && revisionRanges.length
            ? revisionRanges.map((r) => formatRange(r)).join("، ")
            : "لا يوجد"}
        </div>
        <div>
          <span className="font-medium text-red-650">أخطاء:</span> {report.total_mistakes ?? 0}
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
          {report.did_hifz && (
            <span className="text-[10px] font-bold text-red-650 dark:text-red-400">
              أخطاء الحفظ: {report.hifz_mistakes}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-250">
          {report.did_hifz ? hifzText || "لم يُحدد" : "لم يُسمّع حفظ اليوم"}
        </p>
        {report.hifz_notes && (
          <p className="text-xs text-stone-500 mt-1.5">{report.hifz_notes}</p>
        )}
      </div>

      {/* Revision */}
      <div className="p-3 bg-stone-50/50 dark:bg-stone-900/20 rounded-xl border border-stone-200/40 dark:border-stone-850/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-450 dark:text-stone-500 font-bold">المراجعة</span>
          {report.did_revision && (
            <span className="text-[10px] font-bold text-red-650 dark:text-red-400">
              أخطاء المراجعة: {report.revision_mistakes}
            </span>
          )}
        </div>
        {report.did_revision && revisionRanges.length ? (
          <div className="flex flex-col gap-0.5">
            {revisionRanges.map((r, i) => (
              <p key={i} className="text-sm font-semibold text-stone-800 dark:text-stone-250">
                {formatRange(r)}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-250">
            لم تُسمّع مراجعة اليوم
          </p>
        )}
        {report.revision_notes && (
          <p className="text-xs text-stone-500 mt-1.5">{report.revision_notes}</p>
        )}
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
          إجمالي الأخطاء: {report.total_mistakes ?? report.hifz_mistakes + report.revision_mistakes}
        </span>
      </div>
      {report.notes && (
        <div className="text-xs text-stone-500">
          <span className="font-semibold text-stone-600 dark:text-stone-400">ملاحظات: </span>
          {report.notes}
        </div>
      )}
    </div>
  )
}
