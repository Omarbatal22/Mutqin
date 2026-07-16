import { describe, it, expect } from "vitest"
import { globalIndex } from "./structure"
import {
  pageOf,
  juzOf,
  hizbOf,
  rubOf,
  pageRange,
  juzRange,
  hizbRange,
  segmentAt,
  nextSegment,
  PAGE_COUNT,
  JUZ_COUNT,
  HIZB_COUNT,
  QUARTER_COUNT,
} from "./structure-boundaries"
import { PAGE_STARTS } from "./data/page-starts"
import { JUZ_STARTS } from "./data/juz-starts"
import { QUARTER_STARTS } from "./data/quarter-starts"
import { HALF_PAGE_SEGMENTS } from "./data/segments"

// These need the generated boundary data (scripts/generate-quran-data.ts). If
// that hasn't been run yet the imports fail loudly — which is the intended signal
// that Phase 0 data generation is incomplete.

describe("generated boundary data shape", () => {
  it("has the right counts", () => {
    expect(PAGE_STARTS.length).toBe(PAGE_COUNT) // 604
    expect(JUZ_STARTS.length).toBe(JUZ_COUNT) // 30
    expect(QUARTER_STARTS.length).toBe(QUARTER_COUNT) // 240
    expect(HALF_PAGE_SEGMENTS.length).toBeGreaterThanOrEqual(PAGE_COUNT) // ~1208
  })

  it("starts are strictly ascending and begin at ayah 1", () => {
    expect(PAGE_STARTS[0]).toBe(1)
    expect(JUZ_STARTS[0]).toBe(1)
    expect(QUARTER_STARTS[0]).toBe(1)
    for (let i = 1; i < PAGE_STARTS.length; i++) {
      expect(PAGE_STARTS[i]).toBeGreaterThan(PAGE_STARTS[i - 1])
    }
  })

  it("half-page segments are contiguous and cover the whole mushaf", () => {
    expect(HALF_PAGE_SEGMENTS[0].s).toBe(1)
    for (let i = 1; i < HALF_PAGE_SEGMENTS.length; i++) {
      expect(HALF_PAGE_SEGMENTS[i].s).toBe(HALF_PAGE_SEGMENTS[i - 1].e + 1)
    }
    expect(HALF_PAGE_SEGMENTS[HALF_PAGE_SEGMENTS.length - 1].e).toBe(6236)
  })
})

describe("well-known anchors (Madani mushaf)", () => {
  it("2:142 begins juz 2", () => {
    const g = globalIndex(2, 142)!
    expect(juzOf(g)).toBe(2)
    // and it's the first ayah of that juz
    expect(JUZ_STARTS[1]).toBe(g)
  })

  it("al-Fatiha (1:1) is on page 1, juz 1, hizb 1", () => {
    const g = globalIndex(1, 1)!
    expect(pageOf(g)).toBe(1)
    expect(juzOf(g)).toBe(1)
    expect(hizbOf(g)).toBe(1)
    expect(rubOf(g)).toBe(1)
  })

  it("last ayah 114:6 is on page 604 and in juz 30", () => {
    const g = globalIndex(114, 6)!
    expect(pageOf(g)).toBe(604)
    expect(juzOf(g)).toBe(30)
  })

  it("hizb = every 4th quarter, juz = every 8th quarter", () => {
    // hizb 2 starts at quarter 5
    const hizb2 = hizbRange(2)!
    expect(hizb2.start).toBe(QUARTER_STARTS[4])
    // juz 2 starts at quarter 9
    const juz2 = juzRange(2)!
    expect(juz2.start).toBe(QUARTER_STARTS[8])
  })
})

describe("range round-trips", () => {
  it("pageRange endpoints map back to the same page", () => {
    for (let p = 1; p <= PAGE_COUNT; p++) {
      const r = pageRange(p)!
      expect(pageOf(r.start)).toBe(p)
      expect(pageOf(r.end)).toBe(p)
    }
  })

  it("juz/hizb ranges cover without gaps", () => {
    expect(juzRange(1)!.start).toBe(1)
    expect(juzRange(JUZ_COUNT)!.end).toBe(6236)
    expect(hizbRange(1)!.start).toBe(1)
    expect(hizbRange(HIZB_COUNT)!.end).toBe(6236)
  })

  it("nextSegment walks forward and ends at the mushaf end", () => {
    const first = segmentAt(1)!
    const second = nextSegment(1)!
    expect(second.s).toBe(first.e + 1)
    expect(nextSegment(6236)).toBeNull()
  })
})
