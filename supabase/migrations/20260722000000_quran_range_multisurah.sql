-- =============================================
-- Multi-surah Quran ranges (additive)
-- =============================================
-- The flat single-surah columns (hifz_surah / hifz_from_ayah / hifz_to_ayah)
-- cannot represent a range that crosses a surah boundary. We add global-ayah-
-- index columns (1..6236) that encode start and end independently, so a span
-- like Al-Fatihah 1 -> Al-Baqarah 5 is representable.
--
-- This migration is ADDITIVE ONLY: legacy columns are retained (nullable) and
-- left untouched. No data backfill — the application read-normalizer derives
-- globals from the legacy columns for historical rows, so existing data keeps
-- rendering correctly with zero migration risk.

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS hifz_start_global INT CHECK (hifz_start_global BETWEEN 1 AND 6236),
  ADD COLUMN IF NOT EXISTS hifz_end_global   INT CHECK (hifz_end_global BETWEEN 1 AND 6236);

ALTER TABLE public.daily_assignments
  ADD COLUMN IF NOT EXISTS hifz_start_global INT CHECK (hifz_start_global BETWEEN 1 AND 6236),
  ADD COLUMN IF NOT EXISTS hifz_end_global   INT CHECK (hifz_end_global BETWEEN 1 AND 6236);

-- NOTE: revision_ranges JSONB now stores multi-surah objects
--   {startSurah, startAyah, endSurah, endAyah}
-- instead of the legacy {surah, fromAyah, toAyah}. Both shapes are tolerated by
-- the application normalizer, so no data change is required here.
