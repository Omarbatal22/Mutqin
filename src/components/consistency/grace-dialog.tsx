"use client"

import * as React from "react"
import { Shield, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GraceDialogProps {
  pendingDate: string | null // YYYY-MM-DD missed day
  circleId?: string
  onUseGrace: (dateStr: string) => void
  onDeclineGrace: (dateStr: string) => void
}

export function GraceDialog({
  pendingDate,
  onUseGrace,
  onDeclineGrace,
}: GraceDialogProps) {
  if (!pendingDate) return null

  const formattedDate = new Date(pendingDate + "T00:00:00Z").toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1c1c1a] border border-amber-200 dark:border-amber-900/50 p-6 rounded-2xl max-w-md w-full shadow-2xl flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-300/30">
          <Shield className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
            حماية المثابرة المتاحة
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
            فاتك تسليم تقرير يوم <span className="font-bold text-amber-700 dark:text-amber-400">{formattedDate}</span>.
            هل ترغب في استخدام حماية المثابرة للحفاظ على سلسلة استمرارك؟
          </p>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
          <span>تُسترد حماية المثابرة تلقائياً بعد ١٤ يوماً متواصلة من التسليم.</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button
            variant="primary"
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-none shadow-xs"
            onClick={() => onUseGrace(pendingDate)}
          >
            استخدام الحماية 🛡
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-stone-600 dark:text-stone-400"
            onClick={() => onDeclineGrace(pendingDate)}
          >
            بدء سلسلة جديدة
          </Button>
        </div>
      </div>
    </div>
  )
}
