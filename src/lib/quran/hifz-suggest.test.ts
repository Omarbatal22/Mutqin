import { describe, it, expect } from "vitest"
import { globalIndex } from "./structure"
import { pageRange, segmentAt } from "./structure-boundaries"
import { suggestHifz } from "../progression/engine"

// Hifz suggestion behavior against real page/segment boundaries. Needs the
// generated data (Phase 0). These verify the plan's page/half-page rules.

describe("suggestHifz — full page", () => {
  it("suggests the remainder of the current page from a mid-page frontier", () => {
    // frontier at first ayah of page 3 means next starts at ayah 2-of-page-3
    const page3 = pageRange(3)!
    const frontier = page3.start // completed only the first ayah of page 3
    const s = suggestHifz("full_page", frontier)!
    expect(s.start).toBe(frontier + 1)
    expect(s.end).toBe(page3.end) // to end of the SAME page, not the next
  })

  it("suggests a whole next page when frontier is at a page end", () => {
    const page2 = pageRange(2)!
    const s = suggestHifz("full_page", page2.end)!
    const page3 = pageRange(3)!
    expect(s.start).toBe(page3.start)
    expect(s.end).toBe(page3.end)
  })

  it("returns null at the end of the mushaf (hifz complete)", () => {
    expect(suggestHifz("full_page", 6236)).toBeNull()
  })
})

describe("suggestHifz — half page", () => {
  it("suggests the current half-page segment remainder", () => {
    const seg = segmentAt(globalIndex(2, 1)!)!
    const s = suggestHifz("half_page", seg.s - 1)! // frontier just before the segment
    expect(s.start).toBe(seg.s)
    expect(s.end).toBe(seg.e)
  })
})
