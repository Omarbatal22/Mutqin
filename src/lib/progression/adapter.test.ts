import { describe, it, expect } from "vitest"
import { quranToGlobal, globalToQuran } from "./adapter"
import { isValidQuranRange, formatQuranRange } from "../quran"
import {
  normalizeHifzGlobals,
  normalizeRevisionRanges,
} from "../reports/normalize"
import type { QuranRange } from "../reports/types"

// Al-Fatihah has 7 ayahs, so global indices are:
//   Fatihah 1 = 1 ... Fatihah 7 = 7, Baqarah 1 = 8 ... Baqarah 5 = 12.
const FATIHA_TO_BAQARAH: QuranRange = {
  startSurah: 1,
  startAyah: 1,
  endSurah: 2,
  endAyah: 5,
}

describe("adapter: quranToGlobal / globalToQuran", () => {
  it("converts a cross-surah range to the correct global span", () => {
    expect(quranToGlobal(FATIHA_TO_BAQARAH)).toEqual({ start: 1, end: 12 })
  })

  it("round-trips a cross-surah range losslessly", () => {
    const g = quranToGlobal(FATIHA_TO_BAQARAH)!
    expect(globalToQuran(g)).toEqual(FATIHA_TO_BAQARAH)
  })

  it("round-trips a single-surah range", () => {
    const r: QuranRange = { startSurah: 2, startAyah: 135, endSurah: 2, endAyah: 141 }
    const g = quranToGlobal(r)!
    expect(globalToQuran(g)).toEqual(r)
  })

  it("returns null for an out-of-range endpoint", () => {
    // Al-Fatihah only has 7 ayahs.
    expect(quranToGlobal({ startSurah: 1, startAyah: 1, endSurah: 1, endAyah: 99 })).toBeNull()
  })

  it("normalizes reversed endpoints to ascending global order", () => {
    const reversed: QuranRange = { startSurah: 2, startAyah: 5, endSurah: 1, endAyah: 1 }
    expect(quranToGlobal(reversed)).toEqual({ start: 1, end: 12 })
  })
})

describe("isValidQuranRange", () => {
  it("accepts a cross-surah range", () => {
    expect(isValidQuranRange(FATIHA_TO_BAQARAH)).toBe(true)
  })

  it("accepts a single-ayah range", () => {
    expect(isValidQuranRange({ startSurah: 2, startAyah: 5, endSurah: 2, endAyah: 5 })).toBe(true)
  })

  it("rejects start after end (same surah)", () => {
    expect(isValidQuranRange({ startSurah: 2, startAyah: 40, endSurah: 2, endAyah: 15 })).toBe(false)
  })

  it("rejects start surah after end surah", () => {
    expect(isValidQuranRange({ startSurah: 2, startAyah: 1, endSurah: 1, endAyah: 1 })).toBe(false)
  })

  it("rejects a verse that does not exist in its surah", () => {
    expect(isValidQuranRange({ startSurah: 1, startAyah: 1, endSurah: 1, endAyah: 8 })).toBe(false)
  })
})

describe("formatQuranRange", () => {
  it("collapses a same-surah span to compact form", () => {
    expect(formatQuranRange({ startSurah: 2, startAyah: 135, endSurah: 2, endAyah: 141 })).toBe(
      "البقرة: 135–141",
    )
  })

  it("shows a single ayah without a dash", () => {
    expect(formatQuranRange({ startSurah: 2, startAyah: 5, endSurah: 2, endAyah: 5 })).toBe("البقرة: 5")
  })

  it("renders a cross-surah span inline", () => {
    expect(formatQuranRange(FATIHA_TO_BAQARAH)).toBe("الفاتحة 1 ← البقرة 5")
  })
})

describe("normalize: legacy upgrade", () => {
  it("prefers global columns when present", () => {
    expect(
      normalizeHifzGlobals({ hifz_start_global: 1, hifz_end_global: 12 }),
    ).toEqual({ hifzStartGlobal: 1, hifzEndGlobal: 12 })
  })

  it("derives globals from legacy single-surah columns", () => {
    expect(
      normalizeHifzGlobals({ hifz_surah: 2, hifz_from_ayah: 135, hifz_to_ayah: 141 }),
    ).toEqual({ hifzStartGlobal: 142, hifzEndGlobal: 148 })
  })

  it("upgrades legacy revision items and passes through new-shape items", () => {
    const raw = [
      { surah: 2, fromAyah: 1, toAyah: 5 },
      { startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 5 },
      { garbage: true },
    ]
    expect(normalizeRevisionRanges(raw)).toEqual([
      { startSurah: 2, startAyah: 1, endSurah: 2, endAyah: 5 },
      { startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 5 },
    ])
  })

  it("returns an empty array for non-array input", () => {
    expect(normalizeRevisionRanges(null)).toEqual([])
    expect(normalizeRevisionRanges(undefined)).toEqual([])
  })
})
