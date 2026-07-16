import { CheckCircle2, X, Minus } from "lucide-react"

interface WeekDay {
  /** ISO date YYYY-MM-DD in the circle's local timezone */
  date: string
  /** Arabic weekday name, e.g. السبت */
  dayName: string
  /** Day-of-month, e.g. 12 */
  dayNum: string
}

interface WeeklyStudent {
  id: string
  full_name: string
}

interface WeeklyReportGridProps {
  students: WeeklyStudent[]
  weekDays: WeekDay[]
  /** student_id -> date -> report cell (present means submitted that day) */
  cellMap: Record<string, Record<string, { mistakes: number }>>
  /** today's ISO date (circle-local) — days after this are "upcoming", not "missed" */
  todayStr: string
}

export function WeeklyReportGrid({
  students,
  weekDays,
  cellMap,
  todayStr,
}: WeeklyReportGridProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400 text-sm">
        لا يوجد طلاب في هذه الحلقة بعد.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 dark:border-stone-850">
            <th className="sticky right-0 z-10 bg-white dark:bg-[#1c1c1a] px-4 py-3 text-right font-bold text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
              الطالب
            </th>
            {weekDays.map((day) => {
              const isToday = day.date === todayStr
              return (
                <th
                  key={day.date}
                  className={`px-2 py-3 text-center font-bold text-xs whitespace-nowrap ${
                    isToday
                      ? "text-primary-650 dark:text-primary-400"
                      : "text-stone-500 dark:text-stone-400"
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{day.dayName}</span>
                    <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500">
                      {day.dayNum}
                    </span>
                  </div>
                </th>
              )
            })}
            <th className="px-3 py-3 text-center font-bold text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
              المجموع
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
          {students.map((student) => {
            const studentCells = cellMap[student.id] || {}
            const submittedCount = weekDays.filter(
              (d) => studentCells[d.date]
            ).length
            return (
              <tr
                key={student.id}
                className="hover:bg-stone-50/50 dark:hover:bg-stone-900/10 transition-colors"
              >
                <td className="sticky right-0 z-10 bg-white dark:bg-[#1c1c1a] px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-stone-100 dark:bg-stone-850 rounded-full flex items-center justify-center font-bold text-xs text-stone-700 dark:text-stone-300 shrink-0">
                      {student.full_name.charAt(0)}
                    </div>
                    <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {student.full_name}
                    </span>
                  </div>
                </td>

                {weekDays.map((day) => {
                  const cell = studentCells[day.date]
                  const isUpcoming = day.date > todayStr
                  return (
                    <td key={day.date} className="px-2 py-3 text-center">
                      {cell ? (
                        <div
                          className="inline-flex flex-col items-center gap-0.5"
                          title={`أرسل التقرير — ${cell.mistakes} خطأ`}
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-mono font-bold text-stone-500 dark:text-stone-400">
                            {cell.mistakes}
                          </span>
                        </div>
                      ) : isUpcoming ? (
                        <Minus
                          className="w-4 h-4 text-stone-300 dark:text-stone-700 inline-block"
                          aria-label="لم يحن موعده"
                        />
                      ) : (
                        <X
                          className="w-5 h-5 text-red-400 dark:text-red-500/70 inline-block"
                          aria-label="لم يرسل"
                        />
                      )}
                    </td>
                  )
                })}

                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-xs font-mono font-bold ${
                      submittedCount === weekDays.length
                        ? "text-emerald-600 dark:text-emerald-400"
                        : submittedCount === 0
                        ? "text-stone-400 dark:text-stone-500"
                        : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {submittedCount}/{weekDays.length}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
