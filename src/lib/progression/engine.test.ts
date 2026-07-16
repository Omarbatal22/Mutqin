import { describe, it, expect } from "vitest"
import {
  mergeRanges,
  computeFrontier,
  suggestHifz,
  cycleRubBounds,
  normalizeCursor,
  suggestRevisionRubs,
  advanceRevisionCursor,
  REVISION_AMOUNT_RUBS,
  type GlobalRange,
} from "./engine"

// These tests exercise the plan-doc rules directly, in global-ayah-index space.
// They do NOT depend on the generated boundary data except where noted; the hifz
// suggestion tests are in engine-boundaries.test.ts (they need PAGE_STARTS etc).

describe("mergeRanges", () => {
  it("sorts and merges overlapping ranges", () => {
    const r: GlobalRange[] = [
      { start: 10, end: 12 },
      { start: 1, end: 5 },
      { start: 4, end: 8 },
    ]
    expect(mergeRanges(r)).toEqual([
      { start: 1, end: 8 },
      { start: 10, end: 12 },
    ])
  })

  it("merges adjacent (touching) ranges", () => {
    expect(mergeRanges([{ start: 1, end: 5 }, { start: 6, end: 9 }])).toEqual([
      { start: 1, end: 9 },
    ])
  })

  it("drops invalid ranges (start > end)", () => {
    expect(mergeRanges([{ start: 5, end: 1 }])).toEqual([])
  })
})

describe("computeFrontier — continuous progress, not calendar", () => {
  const start = 1

  it("nothing completed -> frontier is start-1 (next to memorize = start)", () => {
    expect(computeFrontier(start, [])).toBe(0)
  })

  it("linear completion advances the frontier", () => {
    expect(computeFrontier(start, [{ start: 1, end: 20 }])).toBe(20)
  })

  it("partial completion stops the frontier mid-way", () => {
    // planned 1..10, actual only 1..6 -> frontier 6, next suggestion starts 7
    expect(computeFrontier(start, [{ start: 1, end: 6 }])).toBe(6)
  })

  it("out-of-sequence recitation does NOT jump the frontier over a gap", () => {
    // completed 1..20 and 41..60, but 21..40 missing -> frontier stuck at 20
    expect(computeFrontier(start, [{ start: 1, end: 20 }, { start: 41, end: 60 }])).toBe(20)
  })

  it("gap resolution: filling the hole merges and advances the frontier", () => {
    expect(
      computeFrontier(start, [
        { start: 1, end: 20 },
        { start: 41, end: 60 },
        { start: 21, end: 40 }, // fills the gap
      ]),
    ).toBe(60)
  })

  it("overachievement past the frontier (contiguous) advances fully", () => {
    // frontier was ~20; student did 1..40 in one go
    expect(computeFrontier(start, [{ start: 1, end: 40 }])).toBe(40)
  })

  it("missed days are irrelevant — frontier tracks achievement only", () => {
    // Two disjoint sessions that are contiguous advance regardless of when.
    expect(computeFrontier(start, [{ start: 1, end: 10 }, { start: 11, end: 15 }])).toBe(15)
  })

  it("respects a non-1 starting position", () => {
    expect(computeFrontier(100, [{ start: 100, end: 110 }])).toBe(110)
    // completion entirely before the start doesn't count
    expect(computeFrontier(100, [{ start: 1, end: 50 }])).toBe(99)
  })
})

describe("revision cycle bounds + cursor", () => {
  it("converts hizb cycle to rub bounds (4 rubs per hizb)", () => {
    expect(cycleRubBounds(1, 10)).toEqual({ startRub: 1, endRub: 40 })
    expect(cycleRubBounds(1, 1)).toEqual({ startRub: 1, endRub: 4 })
    expect(cycleRubBounds(5, 5)).toEqual({ startRub: 17, endRub: 20 })
  })

  it("orders swapped bounds", () => {
    expect(cycleRubBounds(10, 1)).toEqual({ startRub: 1, endRub: 40 })
  })

  it("normalizeCursor snaps null / out-of-range to cycle start", () => {
    const b = cycleRubBounds(1, 10)
    expect(normalizeCursor(null, b)).toBe(1)
    expect(normalizeCursor(999, b)).toBe(1)
    expect(normalizeCursor(0, b)).toBe(1)
    expect(normalizeCursor(20, b)).toBe(20)
  })

  it("amount rub counts match the spec", () => {
    expect(REVISION_AMOUNT_RUBS.quarter_hizb).toBe(1)
    expect(REVISION_AMOUNT_RUBS.half_hizb).toBe(2)
    expect(REVISION_AMOUNT_RUBS.hizb).toBe(4)
    expect(REVISION_AMOUNT_RUBS.two_hizb).toBe(8)
    expect(REVISION_AMOUNT_RUBS.juz).toBe(32)
  })
})

describe("suggestRevisionRubs", () => {
  const b = cycleRubBounds(1, 10) // rubs 1..40

  it("one hizb = 4 rubs from the cursor", () => {
    expect(suggestRevisionRubs(1, "hizb", b)).toEqual({ fromRub: 1, toRub: 4 })
    expect(suggestRevisionRubs(5, "hizb", b)).toEqual({ fromRub: 5, toRub: 8 })
  })

  it("clamps the suggestion to the cycle end", () => {
    // cursor near the end can't spill past rub 40
    expect(suggestRevisionRubs(39, "hizb", b)).toEqual({ fromRub: 39, toRub: 40 })
  })

  it("quarter and half hizb amounts", () => {
    expect(suggestRevisionRubs(9, "quarter_hizb", b)).toEqual({ fromRub: 9, toRub: 9 })
    expect(suggestRevisionRubs(9, "half_hizb", b)).toEqual({ fromRub: 9, toRub: 10 })
  })
})

describe("advanceRevisionCursor — advance & wrap", () => {
  const b = cycleRubBounds(1, 10) // rubs 1..40

  it("advances by rubs actually completed on-path", () => {
    expect(advanceRevisionCursor(1, 4, b)).toBe(5) // did one hizb -> next hizb
  })

  it("partial completion advances only by what was done", () => {
    expect(advanceRevisionCursor(1, 2, b)).toBe(3) // did half a hizb
  })

  it("no on-path completion leaves the cursor unchanged", () => {
    expect(advanceRevisionCursor(9, 0, b)).toBe(9)
  })

  it("wraps to the cycle start after passing the end", () => {
    expect(advanceRevisionCursor(37, 4, b)).toBe(1) // 37+4=41 > 40 -> wrap
  })

  it("off-path revision (0 completed) never wraps or moves", () => {
    expect(advanceRevisionCursor(40, 0, b)).toBe(40)
  })
})
