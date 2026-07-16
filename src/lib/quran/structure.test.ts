import { describe, it, expect } from "vitest"
import {
  TOTAL_AYAHS,
  SURAH_OFFSET,
  globalIndex,
  fromGlobal,
  clampGlobal,
} from "./structure"

// These are self-contained: they derive from SURAHS ayah counts only and need
// no generated boundary data.

describe("global ayah index math", () => {
  it("total ayahs is 6236 (Hafs/Madani)", () => {
    expect(TOTAL_AYAHS).toBe(6236)
  })

  it("surah offsets: al-Fatiha at 0, al-Baqara after 7", () => {
    expect(SURAH_OFFSET[1]).toBe(0)
    expect(SURAH_OFFSET[2]).toBe(7)
  })

  it("globalIndex anchors", () => {
    expect(globalIndex(1, 1)).toBe(1) // very first ayah
    expect(globalIndex(2, 1)).toBe(8) // al-Baqara ayah 1
    expect(globalIndex(114, 6)).toBe(6236) // very last ayah
  })

  it("globalIndex rejects out-of-range", () => {
    expect(globalIndex(1, 8)).toBeNull() // al-Fatiha has 7
    expect(globalIndex(0, 1)).toBeNull()
    expect(globalIndex(115, 1)).toBeNull()
    expect(globalIndex(2, 0)).toBeNull()
  })

  it("fromGlobal inverts globalIndex", () => {
    expect(fromGlobal(1)).toEqual({ surah: 1, ayah: 1 })
    expect(fromGlobal(8)).toEqual({ surah: 2, ayah: 1 })
    expect(fromGlobal(6236)).toEqual({ surah: 114, ayah: 6 })
  })

  it("round-trips across the whole mushaf", () => {
    for (let g = 1; g <= TOTAL_AYAHS; g++) {
      const p = fromGlobal(g)!
      expect(globalIndex(p.surah, p.ayah)).toBe(g)
    }
  })

  it("fromGlobal rejects out-of-range", () => {
    expect(fromGlobal(0)).toBeNull()
    expect(fromGlobal(6237)).toBeNull()
  })

  it("clampGlobal bounds into [1, TOTAL]", () => {
    expect(clampGlobal(-5)).toBe(1)
    expect(clampGlobal(99999)).toBe(TOTAL_AYAHS)
    expect(clampGlobal(100)).toBe(100)
  })
})
