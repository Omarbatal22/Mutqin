/**
 * Standalone Consistency Engine
 * 
 * Computes streaks, weekly progress, monthly consistency %, grace day protection,
 * achievement milestones, and Tree of Consistency growth stage.
 * 
 * Pure functions only — no DB / framework dependencies.
 */

export interface DayStatus {
  date: string // YYYY-MM-DD
  dayNameAr: string
  status: 'submitted' | 'missed' | 'holiday' | 'grace' | 'future'
  isToday: boolean
}

export interface WeekProgress {
  days: DayStatus[] // 7 items (Sat -> Fri)
  requiredDays: number
  submittedDays: number
  completionPct: number
}

export interface Achievement {
  id: string
  titleAr: string
  descriptionAr: string
  emoji: string
  earned: boolean
  earnedDate?: string
}

export interface ConsistencyStats {
  currentStreak: number
  longestStreak: number
  monthlyConsistencyPct: number
  graceAvailable: boolean
  graceUsedDate: string | null
  pendingGraceDate: string | null // Missed required day that user could use grace on
  consecutiveSinceGrace: number
  totalReports: number
  currentWeek: WeekProgress
  monthHeatmap: DayStatus[]
  achievements: Achievement[]
  treeStage: 0 | 1 | 2 | 3
}

/**
 * Default weekly holiday is Friday (JS getDay() = 5).
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday.
 */
export const DEFAULT_HOLIDAYS = [5]

/**
 * Returns true if a date string YYYY-MM-DD falls on a configured holiday.
 */
export function isHoliday(dateStr: string, holidays: number[] = DEFAULT_HOLIDAYS): boolean {
  const d = new Date(dateStr + "T00:00:00Z")
  return holidays.includes(d.getUTCDay())
}

/**
 * Formats a Date object to YYYY-MM-DD UTC string.
 */
export function toISODate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Adds offset days to a YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return toISODate(d)
}

const ARABIC_DAY_NAMES: Record<number, string> = {
  6: "السبت",
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
}

/**
 * Computes Saturday -> Friday week for a given anchor date.
 */
export function getWeekDays(
  todayStr: string,
  submittedSet: Set<string>,
  graceSet: Set<string>,
  holidays: number[] = DEFAULT_HOLIDAYS
): WeekProgress {
  const todayDate = new Date(todayStr + "T00:00:00Z")
  const utcDay = todayDate.getUTCDay()
  
  // Saturday is day 6. Days since Saturday: (utcDay + 1) % 7
  const daysSinceSat = (utcDay + 1) % 7
  
  const satDate = new Date(todayDate)
  satDate.setUTCDate(todayDate.getUTCDate() - daysSinceSat)

  const days: DayStatus[] = []
  let requiredCount = 0
  let submittedCount = 0

  for (let i = 0; i < 7; i++) {
    const d = new Date(satDate)
    d.setUTCDate(satDate.getUTCDate() + i)
    const dateStr = toISODate(d)
    const dayIndex = d.getUTCDay()
    const dayNameAr = ARABIC_DAY_NAMES[dayIndex] || ""
    const isToday = dateStr === todayStr
    const isFut = dateStr > todayStr
    const isHol = holidays.includes(dayIndex)

    let status: DayStatus["status"] = "missed"

    if (isHol) {
      status = "holiday"
    } else if (isFut) {
      status = "future"
    } else if (submittedSet.has(dateStr)) {
      status = "submitted"
      requiredCount++
      submittedCount++
    } else if (graceSet.has(dateStr)) {
      status = "grace"
      requiredCount++
      submittedCount++ // Grace counts toward streak & progress
    } else {
      status = "missed"
      if (!isToday) {
        requiredCount++
      }
    }

    days.push({
      date: dateStr,
      dayNameAr,
      status,
      isToday,
    })
  }

  const completionPct = requiredCount > 0 ? Math.round((submittedCount / requiredCount) * 100) : 100

  return {
    days,
    requiredDays: requiredCount,
    submittedDays: submittedCount,
    completionPct,
  }
}

/**
 * Computes calendar heatmap for a given YYYY-MM month or current month of todayStr.
 */
export function getMonthHeatmap(
  todayStr: string,
  submittedSet: Set<string>,
  graceSet: Set<string>,
  holidays: number[] = DEFAULT_HOLIDAYS,
  yearMonth?: string // YYYY-MM
): DayStatus[] {
  const targetYM = yearMonth || todayStr.slice(0, 7)
  const [y, m] = targetYM.split("-").map(Number)
  
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const days: DayStatus[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const d = new Date(dateStr + "T00:00:00Z")
    const dayIndex = d.getUTCDay()
    const isToday = dateStr === todayStr
    const isFut = dateStr > todayStr
    const isHol = holidays.includes(dayIndex)

    let status: DayStatus["status"] = "missed"
    if (isHol) {
      status = "holiday"
    } else if (isFut) {
      status = "future"
    } else if (submittedSet.has(dateStr)) {
      status = "submitted"
    } else if (graceSet.has(dateStr)) {
      status = "grace"
    }

    days.push({
      date: dateStr,
      dayNameAr: ARABIC_DAY_NAMES[dayIndex],
      status,
      isToday,
    })
  }

  return days
}

/**
 * Calculates streaks and Grace Day status.
 */
export function computeConsistency(
  submittedDates: string[],
  todayStr: string,
  graceUsedDates: string[] = [],
  holidays: number[] = DEFAULT_HOLIDAYS
): ConsistencyStats {
  const submittedSet = new Set(submittedDates)
  const graceSet = new Set(graceUsedDates)

  // 1. Calculate Current Streak
  let currentStreak = 0
  let checkDate = todayStr

  // If today is a required day and student hasn't submitted yet today, start checking from yesterday so streak doesn't reset prematurely
  if (!isHoliday(todayStr, holidays) && !submittedSet.has(todayStr) && !graceSet.has(todayStr)) {
    checkDate = addDays(todayStr, -1)
  }

  let tempDate = checkDate

  // Safety bound: walk back at most 1000 days
  for (let i = 0; i < 1000; i++) {
    if (isHoliday(tempDate, holidays)) {
      tempDate = addDays(tempDate, -1)
      continue
    }

    if (submittedSet.has(tempDate) || graceSet.has(tempDate)) {
      currentStreak++
      tempDate = addDays(tempDate, -1)
    } else {
      break
    }
  }

  // 2. Calculate Longest Streak
  let longestStreak = 0
  if (submittedDates.length > 0) {
    const allDates = Array.from(new Set([...submittedDates, ...graceUsedDates])).sort()
    const earliest = allDates[0]
    let curr = 0

    let walkDate = earliest
    while (walkDate <= todayStr) {
      if (isHoliday(walkDate, holidays)) {
        walkDate = addDays(walkDate, 1)
        continue
      }

      if (submittedSet.has(walkDate) || graceSet.has(walkDate)) {
        curr++
        if (curr > longestStreak) longestStreak = curr
      } else {
        curr = 0
      }
      walkDate = addDays(walkDate, 1)
    }
  }
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }

  // 3. Grace Day protection logic
  const graceUsedDate = graceUsedDates.length > 0 ? graceUsedDates[graceUsedDates.length - 1] : null
  
  let consecutiveSinceGrace = 0
  if (graceUsedDate) {
    let walkDate = addDays(graceUsedDate, 1)
    while (walkDate <= todayStr) {
      if (!isHoliday(walkDate, holidays)) {
        if (submittedSet.has(walkDate)) {
          consecutiveSinceGrace++
        } else if (walkDate !== todayStr) {
          consecutiveSinceGrace = 0
        }
      }
      walkDate = addDays(walkDate, 1)
    }
  }

  const graceAvailable = graceUsedDates.length === 0 || consecutiveSinceGrace >= 14

  // Check if yesterday (or last required day before today) was missed and is eligible for Grace protection
  let pendingGraceDate: string | null = null
  if (graceAvailable) {
    let yesterday = addDays(todayStr, -1)
    while (isHoliday(yesterday, holidays)) {
      yesterday = addDays(yesterday, -1)
    }
    if (!submittedSet.has(yesterday) && !graceSet.has(yesterday)) {
      pendingGraceDate = yesterday
    }
  }

  // 4. Monthly Consistency %
  const currentYM = todayStr.slice(0, 7)
  const heatmap = getMonthHeatmap(todayStr, submittedSet, graceSet, holidays, currentYM)
  const requiredDaysInMonth = heatmap.filter(
    (d) => d.status !== "future" && d.status !== "holiday"
  )
  const submittedInMonth = requiredDaysInMonth.filter(
    (d) => d.status === "submitted" || d.status === "grace"
  )
  const monthlyConsistencyPct =
    requiredDaysInMonth.length > 0
      ? Math.round((submittedInMonth.length / requiredDaysInMonth.length) * 100)
      : 100

  // 5. Current Week Progress
  const currentWeek = getWeekDays(todayStr, submittedSet, graceSet, holidays)

  // 6. Tree Stage computation
  const totalReports = submittedDates.length
  let treeStage: 0 | 1 | 2 | 3 = 0
  if (totalReports >= 90 || currentStreak >= 90) {
    treeStage = 3 // Full flourishing tree
  } else if (totalReports >= 30 || currentStreak >= 30) {
    treeStage = 2 // Young leafy tree
  } else if (totalReports >= 7 || currentStreak >= 7) {
    treeStage = 1 // Sprout / seedling
  } else {
    treeStage = 0 // Seed / early sprout
  }

  // 7. Achievements
  const achievements: Achievement[] = [
    {
      id: "first_report",
      titleAr: "التقرير الأول",
      descriptionAr: "أرسلت تقريرك الأول بنجاح",
      emoji: "🌱",
      earned: totalReports >= 1,
    },
    {
      id: "first_week",
      titleAr: "أسبوع المثابرة الأول",
      descriptionAr: "حافظت على إنجاز أسبوع كامل",
      emoji: "⭐",
      earned: currentStreak >= 7 || longestStreak >= 7,
    },
    {
      id: "streak_30",
      titleAr: "مواظب متميز (٣٠ يوماً)",
      descriptionAr: "حققت سلسلة استمرار لمدة ٣٠ يوماً متواصلة",
      emoji: "🔥",
      earned: currentStreak >= 30 || longestStreak >= 30,
    },
    {
      id: "streak_100",
      titleAr: "حافظ متقن (١٠٠ يوم)",
      descriptionAr: "إنجاز استثنائي: ١٠٠ يوم من المتابعة والمثابرة",
      emoji: "👑",
      earned: currentStreak >= 100 || longestStreak >= 100,
    },
    {
      id: "reports_100",
      titleAr: "مائة تقرير",
      descriptionAr: "أكملت تقديم ١٠٠ تقرير يومي إجمالاً",
      emoji: "📜",
      earned: totalReports >= 100,
    },
    {
      id: "perfect_month",
      titleAr: "شهر مكتمل ١٠٠٪",
      descriptionAr: "حققت نسبة التزام كاملة خلال الشهر الحالي",
      emoji: "🏆",
      earned: monthlyConsistencyPct === 100 && requiredDaysInMonth.length >= 20,
    },
    {
      id: "half_year",
      titleAr: "نصف عام من الإتقان",
      descriptionAr: "ثبات ومثابرة لمدة ٦ أشهر",
      emoji: "🌳",
      earned: totalReports >= 150 || longestStreak >= 180,
    },
    {
      id: "one_year",
      titleAr: "عام كامل مع القرآن",
      descriptionAr: "سنة كاملة في رحلة حفظ وتلاوة كتاب الله",
      emoji: "✨",
      earned: totalReports >= 300 || longestStreak >= 365,
    },
  ]

  return {
    currentStreak,
    longestStreak,
    monthlyConsistencyPct,
    graceAvailable,
    graceUsedDate,
    pendingGraceDate,
    consecutiveSinceGrace,
    totalReports,
    currentWeek,
    monthHeatmap: heatmap,
    achievements,
    treeStage,
  }
}
