// Smart Progression Engine — pure domain logic, no DB/UI/network imports.
//
// Everything works in 1-based GLOBAL ayah indices (1..6236). Adapters to/from
// the app's AyahRange (surah/from/to) live in ./adapter so this stays trivially
// unit-testable over the committed structural constants.
//
// Two independent mechanics, per the plan docs:
//   • Hifz     — LINEAR continuous progress. A "continuous frontier" is the last
//                ayah such that everything from the start position up to it has
//                been recited. Suggestions come off the frontier by hifz unit.
//                Gaps / out-of-sequence recitation are recorded but never advance
//                the frontier across a hole. Progress follows achievement, not
//                the calendar (missed days don't skip ahead).
//   • Revision — a repeating CYCLE over [startHizb..endHizb]. A cursor (in
//                rub-al-hizb units) advances by the chosen amount and WRAPS at
//                the cycle end. Off-path revision doesn't move the cursor.

import { TOTAL_AYAHS } from "../quran/structure"
import { pageRange, pageOf, segmentAt } from "../quran/structure-boundaries"

export type HifzMode = "half_page" | "full_page" | "custom"
export type RevisionAmount =
  | "quarter_hizb"
  | "half_hizb"
  | "hizb"
  | "two_hizb"
  | "juz"
  | "custom"

/** A closed interval of global ayah indices (both ends inclusive). */
export interface GlobalRange {
  start: number
  end: number
}

/** Rubs (rub-al-hizb / quarter) advanced per revision unit. */
export const REVISION_AMOUNT_RUBS: Record<RevisionAmount, number> = {
  quarter_hizb: 1,
  half_hizb: 2,
  hizb: 4,
  two_hizb: 8,
  juz: 32,
  custom: 4, // sensible default; the student can edit the suggested range
}

// ── Hifz ────────────────────────────────────────────────────────────────────

/** Sort + merge overlapping/adjacent global ranges into disjoint ascending runs. */
export function mergeRanges(ranges: GlobalRange[]): GlobalRange[] {
  const valid = ranges
    .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.start <= r.end)
    .map((r) => ({ start: r.start, end: r.end }))
    .sort((a, b) => a.start - b.start)
  const merged: GlobalRange[] = []
  for (const r of valid) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end + 1) {
      last.end = Math.max(last.end, r.end)
    } else {
      merged.push({ ...r })
    }
  }
  return merged
}

/**
 * Continuous hifz frontier: the last global ayah reached without a gap, starting
 * from `startGlobal`. Returns startGlobal - 1 when nothing at/after the start has
 * been completed (i.e. the next ayah to memorize is startGlobal itself).
 *
 * `completed` are the ACTUAL global ranges of completed hifz (source of truth).
 * Out-of-sequence ranges past a gap are ignored for the frontier (but the caller
 * still stores them as history).
 */
export function computeFrontier(startGlobal: number, completed: GlobalRange[]): number {
  const merged = mergeRanges(completed)
  let frontier = startGlobal - 1
  for (const run of merged) {
    // A run only extends the frontier if it connects to it (no gap).
    if (run.start <= frontier + 1 && run.end > frontier) {
      frontier = run.end
    } else if (run.start > frontier + 1) {
      break // first gap — stop; anything beyond is out-of-sequence
    }
    // runs entirely at/behind the frontier are already covered — skip
  }
  return Math.max(startGlobal - 1, Math.min(frontier, TOTAL_AYAHS))
}

/**
 * Suggested next hifz range from a frontier, by mode. Returns null when the
 * frontier is at the end of the mushaf (hifz complete).
 *
 * Partial-completion is handled implicitly: if the frontier sits mid-page/segment
 * (because only part of it was recited), the suggestion is the REMAINDER of that
 * page/segment, not the next one.
 */
export function suggestHifz(mode: HifzMode, frontier: number): GlobalRange | null {
  const nextStart = frontier + 1
  if (nextStart > TOTAL_AYAHS) return null

  if (mode === "half_page") {
    const seg = segmentAt(nextStart)
    if (!seg) return null
    return { start: nextStart, end: seg.e }
  }

  // full_page and custom both suggest to the end of the current page for MVP;
  // custom is then freely edited by the student.
  const page = pageOf(nextStart)
  const range = pageRange(page)
  if (!range) return null
  return { start: nextStart, end: range.end }
}

// ── Revision ─────────────────────────────────────────────────────────────────

/** Convert a cycle expressed in hizb numbers to inclusive rub-al-hizb bounds. */
export function cycleRubBounds(startHizb: number, endHizb: number): { startRub: number; endRub: number } {
  const lo = Math.max(1, Math.min(startHizb, endHizb))
  const hi = Math.min(60, Math.max(startHizb, endHizb))
  return { startRub: (lo - 1) * 4 + 1, endRub: hi * 4 }
}

/** Normalize a possibly-null/out-of-bounds cursor into the cycle. */
export function normalizeCursor(cursor: number | null | undefined, bounds: { startRub: number; endRub: number }): number {
  if (cursor == null || cursor < bounds.startRub || cursor > bounds.endRub) return bounds.startRub
  return cursor
}

/**
 * Suggested revision: `amount`'s worth of rubs starting at the cursor, clamped so
 * it never spills past the cycle end. Returns the inclusive rub index span; the
 * caller converts to a global range via rubRange().
 */
export function suggestRevisionRubs(
  cursor: number,
  amount: RevisionAmount,
  bounds: { startRub: number; endRub: number },
): { fromRub: number; toRub: number } {
  const from = normalizeCursor(cursor, bounds)
  const span = REVISION_AMOUNT_RUBS[amount]
  const to = Math.min(from + span - 1, bounds.endRub)
  return { fromRub: from, toRub: to }
}

/**
 * Advance the revision cursor after a submission. It moves forward only by the
 * number of rubs actually completed FROM the expected position, and wraps to the
 * cycle start once it passes the end. `completedRubs` = how many contiguous rubs
 * beginning at the current cursor were actually revised (0 = nothing on-path →
 * cursor unchanged). Off-path revision is handled by the caller passing 0.
 */
export function advanceRevisionCursor(
  cursor: number,
  completedRubs: number,
  bounds: { startRub: number; endRub: number },
): number {
  const from = normalizeCursor(cursor, bounds)
  if (completedRubs <= 0) return from
  const next = from + completedRubs
  if (next > bounds.endRub) return bounds.startRub // wrap
  return next
}
