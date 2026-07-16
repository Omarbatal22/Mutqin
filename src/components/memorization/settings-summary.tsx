import { BookMarked, Repeat, MapPin, Target } from "lucide-react"
import { getSurah } from "@/lib/quran"

/** The subset of memorization_settings this card renders. */
export interface MemorizationSettings {
  start_surah: number
  start_page: number | null
  start_ayah: number
  hifz_amount: "half_page" | "full_page" | "custom"
  hifz_custom_note: string | null
  revision_amount:
    | "quarter_hizb"
    | "half_hizb"
    | "hizb"
    | "two_hizb"
    | "juz"
    | "custom"
  revision_start: number | null
  revision_end: number | null
  revision_cursor?: number | null
}

const HIFZ_LABELS: Record<MemorizationSettings["hifz_amount"], string> = {
  half_page: "نصف صفحة يومياً",
  full_page: "صفحة كاملة يومياً",
  custom: "مقدار مخصص",
}

const REVISION_LABELS: Record<MemorizationSettings["revision_amount"], string> = {
  quarter_hizb: "ربع حزب",
  half_hizb: "نصف حزب",
  hizb: "حزب",
  two_hizb: "حزبان",
  juz: "جزء",
  custom: "مخصص",
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-stone-100 dark:border-stone-900/50 last:border-b-0">
      <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">
        {label}
      </span>
      <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 text-left">
        {value}
      </span>
    </div>
  )
}

interface SettingsSummaryProps {
  settings: MemorizationSettings
}

/**
 * Presentational card summarizing a student's hifz ("saving") and revision
 * ("reviewing") system. Shared by the teacher per-student page and the
 * student's own profile — no data fetching here.
 */
export function MemorizationSettingsSummary({ settings }: SettingsSummaryProps) {
  const startSurahName =
    getSurah(settings.start_surah)?.nameAr ?? `سورة ${settings.start_surah}`

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Hifz (saving) system */}
      <div className="bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-primary-50 dark:bg-primary-950/20 text-primary-650 dark:text-primary-400 rounded-lg flex items-center justify-center">
            <BookMarked className="w-4.5 h-4.5" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
            نظام الحفظ
          </h3>
        </div>
        <div className="flex flex-col">
          <InfoRow label="المقدار اليومي" value={HIFZ_LABELS[settings.hifz_amount]} />
          {settings.hifz_amount === "custom" && settings.hifz_custom_note && (
            <InfoRow label="تفاصيل المقدار" value={settings.hifz_custom_note} />
          )}
          <InfoRow
            label="نقطة البداية"
            value={
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {startSurahName} — آية {settings.start_ayah}
              </span>
            }
          />
          {settings.start_page && (
            <InfoRow label="صفحة البداية" value={`صفحة ${settings.start_page}`} />
          )}
        </div>
      </div>

      {/* Revision (reviewing) system */}
      <div className="bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-500 rounded-lg flex items-center justify-center">
            <Repeat className="w-4.5 h-4.5" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
            نظام المراجعة
          </h3>
        </div>
        <div className="flex flex-col">
          <InfoRow
            label="المقدار اليومي"
            value={REVISION_LABELS[settings.revision_amount]}
          />
          {settings.revision_start && settings.revision_end && (
            <InfoRow
              label="دورة المراجعة"
              value={
                <span className="inline-flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-stone-400" />
                  من الحزب {settings.revision_start} إلى الحزب{" "}
                  {settings.revision_end}
                </span>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
