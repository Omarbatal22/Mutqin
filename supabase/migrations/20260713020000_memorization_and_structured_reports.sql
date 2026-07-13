-- =============================================
-- Memorization settings + structured daily reports (Phase 1)
-- =============================================
-- Prerequisite: 20260713010000_fix_rls_recursion.sql must already be applied.
-- This migration reuses its SECURITY DEFINER helpers is_circle_owner(uuid) and
-- is_circle_member(uuid) so the new policies do NOT reintroduce the 42P17
-- infinite-recursion between circles and circle_memberships.
--
-- GREENFIELD: daily_reports has no data worth preserving, so we drop the old
-- free-text columns and reshape the table into structured Quran data.

-- =============================================
-- 1. memorization_settings — the student's personal hifz/revision system
-- =============================================
CREATE TABLE IF NOT EXISTS public.memorization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,

  -- Starting position in the mushaf
  start_surah INT NOT NULL DEFAULT 1 CHECK (start_surah BETWEEN 1 AND 114),
  start_page INT CHECK (start_page BETWEEN 1 AND 604),
  start_ayah INT NOT NULL DEFAULT 1 CHECK (start_ayah >= 1),

  -- Daily hifz amount
  hifz_amount TEXT NOT NULL DEFAULT 'full_page'
    CHECK (hifz_amount IN ('half_page', 'full_page', 'custom')),
  hifz_custom_note TEXT,

  -- Revision system
  revision_amount TEXT NOT NULL DEFAULT 'hizb'
    CHECK (revision_amount IN ('quarter_hizb', 'half_hizb', 'hizb', 'two_hizb', 'juz', 'custom')),
  revision_start INT CHECK (revision_start BETWEEN 1 AND 60), -- hizb number

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, circle_id)
);

COMMENT ON TABLE public.memorization_settings IS 'Per-student hifz/revision system within a circle';

CREATE INDEX IF NOT EXISTS idx_memorization_settings_user ON public.memorization_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_memorization_settings_circle ON public.memorization_settings(circle_id);

DROP TRIGGER IF EXISTS on_memorization_settings_updated ON public.memorization_settings;
CREATE TRIGGER on_memorization_settings_updated
  BEFORE UPDATE ON public.memorization_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.memorization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own settings" ON public.memorization_settings;
CREATE POLICY "Students manage own settings"
  ON public.memorization_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Circle owners can view settings" ON public.memorization_settings;
CREATE POLICY "Circle owners can view settings"
  ON public.memorization_settings FOR SELECT
  TO authenticated
  USING (public.is_circle_owner(circle_id));

-- =============================================
-- 2. Reshape daily_reports into structured data
-- =============================================
-- Drop the old free-text / single-count columns (greenfield, no data to keep).
ALTER TABLE public.daily_reports DROP COLUMN IF EXISTS hifz_content;
ALTER TABLE public.daily_reports DROP COLUMN IF EXISTS revision_content;
ALTER TABLE public.daily_reports DROP COLUMN IF EXISTS mistakes_count;

-- Hifz (structured)
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS did_hifz BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS hifz_surah INT CHECK (hifz_surah BETWEEN 1 AND 114);
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS hifz_from_ayah INT CHECK (hifz_from_ayah >= 1);
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS hifz_to_ayah INT CHECK (hifz_to_ayah >= 1);
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS hifz_page INT CHECK (hifz_page BETWEEN 1 AND 604);
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS hifz_mistakes INT NOT NULL DEFAULT 0 CHECK (hifz_mistakes >= 0);
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS hifz_notes TEXT;

-- Revision (structured; supports multiple ranges)
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS did_revision BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS revision_ranges JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS revision_mistakes INT NOT NULL DEFAULT 0 CHECK (revision_mistakes >= 0);
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Recitation listener ("سمّعت على مَن؟")
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS listener_type TEXT
  CHECK (listener_type IN ('teacher', 'peer', 'other'));
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS listener_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS listener_name TEXT;

-- Single rollup so dashboards can keep reading one "errors" number.
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS total_mistakes INT
  GENERATED ALWAYS AS (hifz_mistakes + revision_mistakes) STORED;

-- Note: existing RLS policies on daily_reports (from the fix-recursion migration)
-- already gate insert/update on student_id = auth.uid() + is_circle_member(circle_id),
-- and select on student_id or is_circle_owner(circle_id). No policy change needed.
