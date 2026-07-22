import { describe, it, expect } from "vitest"
import {
  computeConsistency,
  getWeekDays,
  getMonthHeatmap,
  isHoliday,
  addDays,
} from "./engine"

describe("Consistency Engine", () => {
  it("recognizes Fridays as default holidays", () => {
    // 2026-07-24 is a Friday (day 5)
    expect(isHoliday("2026-07-24")).toBe(true)
    // 2026-07-25 is a Saturday (day 6)
    expect(isHoliday("2026-07-25")).toBe(false)
  })

  it("calculates current streak excluding Fridays", () => {
    // Wed, Thu, Fri (holiday), Sat, Sun (today)
    // Submitted: Wed (2026-07-22), Thu (2026-07-23), Sat (2026-07-25), Sun (2026-07-26)
    const submitted = ["2026-07-22", "2026-07-23", "2026-07-25", "2026-07-26"]
    const stats = computeConsistency(submitted, "2026-07-26")
    // Friday is skipped, so streak should be 4 days
    expect(stats.currentStreak).toBe(4)
  })

  it("does not break streak if today is not submitted yet", () => {
    // Submitted yesterday (Sat 2026-07-25), today is Sun 2026-07-26 (not submitted yet)
    const submitted = ["2026-07-25"]
    const stats = computeConsistency(submitted, "2026-07-26")
    expect(stats.currentStreak).toBe(1)
  })

  it("detects pending Grace Day for missed required day", () => {
    // Submitted Thu 2026-07-23, Fri 2026-07-24 (holiday), missed Sat 2026-07-25, today is Sun 2026-07-26
    const submitted = ["2026-07-23"]
    const stats = computeConsistency(submitted, "2026-07-26")
    expect(stats.graceAvailable).toBe(true)
    expect(stats.pendingGraceDate).toBe("2026-07-25")
  })

  it("protects streak when Grace Day is used", () => {
    // Submitted Thu 2026-07-23, Fri 2026-07-24 (holiday), Grace used Sat 2026-07-25, Submitted Sun 2026-07-26
    const submitted = ["2026-07-23", "2026-07-26"]
    const graceUsed = ["2026-07-25"]
    const stats = computeConsistency(submitted, "2026-07-26", graceUsed)
    expect(stats.currentStreak).toBe(3) // Thu, Grace Sat, Sun
    expect(stats.graceAvailable).toBe(false)
  })

  it("recovers Grace Day after 14 consecutive required days", () => {
    const graceUsed = ["2026-07-01"]
    // Generate 14 consecutive non-Friday submitted dates after July 1st
    const submitted: string[] = []
    let cur = "2026-07-02"
    let count = 0
    while (count < 14) {
      if (!isHoliday(cur)) {
        submitted.push(cur)
        count++
      }
      cur = addDays(cur, 1)
    }

    const todayStr = submitted[submitted.length - 1]
    const stats = computeConsistency(submitted, todayStr, graceUsed)
    expect(stats.consecutiveSinceGrace).toBeGreaterThanOrEqual(14)
    expect(stats.graceAvailable).toBe(true)
  })

  it("calculates weekly progress correctly", () => {
    // Today is Wednesday 2026-07-22
    const submitted = ["2026-07-18", "2026-07-19", "2026-07-20", "2026-07-21", "2026-07-22"]
    const week = getWeekDays("2026-07-22", new Set(submitted), new Set())
    expect(week.days).toHaveLength(7)
    // Friday (index 6 in Sat->Fri list) is holiday
    expect(week.days[6].status).toBe("holiday")
    expect(week.submittedDays).toBe(5)
  })

  it("calculates monthly consistency percentage", () => {
    const submitted = ["2026-07-01", "2026-07-02", "2026-07-04"]
    const stats = computeConsistency(submitted, "2026-07-05")
    expect(stats.monthlyConsistencyPct).toBeGreaterThan(0)
    expect(stats.monthlyConsistencyPct).toBeLessThanOrEqual(100)
  })

  it("triggers achievements based on milestones", () => {
    const submitted = ["2026-07-01"]
    const stats = computeConsistency(submitted, "2026-07-01")
    const firstReport = stats.achievements.find((a) => a.id === "first_report")
    expect(firstReport?.earned).toBe(true)
  })
})
