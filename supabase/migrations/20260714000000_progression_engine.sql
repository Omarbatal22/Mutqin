-- =============================================
-- Progression engine foundations (Phase 1)
-- =============================================
-- Prerequisite: 20260713010000_fix_rls_recursion.sql (SECURITY DEFINER helpers
-- is_circle_owner(uuid) / is_circle_member(uuid)) and
-- 20260713020000_memorization_and_structured_reports.sql must already be applied.
--
-- All changes here are ADDITIVE (new column with default / new table). No
-- existing daily_reports data is reshaped or dropped -> zero data-loss risk.

-- =============================================
-- 1. Circle timezone — the authority for "which day" a report counts for
-- =============================================
-- The client previously computed report_date in UTC while the same-day UPDATE
-- policy compared against CURRENT_DATE (server UTC): a near-midnight mismatch
-- that mis-attributed reports AND broke same-day edits. From now on report_date
-- is derived server-side from the circle's timezone (see the RPC in the next
-- migration) and the RLS gate below uses circle-local date.
ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Cairo';

COMMENT ON COLUMN public.circles.timezone IS 'IANA tz (e.g. Africa/Cairo); defines the circle day boundary for report_date';

-- =============================================
-- 2. Revision cycle end + stateful cursor on memorization_settings
-- =============================================
-- revision_start already exists (cycle start hizb). Add the cycle END and the
-- current cursor. The cursor is stored because the revision cycle advances and
-- WRAPS statefully; the hifz frontier is deliberately NOT cached (recomputed
-- from reports, the source of truth).
--
-- Units: revision_start / revision_end are user-facing HIZB numbers (1..60) —
-- the cycle bounds the student picks ("from hizb 1 to hizb 10"). revision_cursor
-- is the finer RUB-AL-HIZB / quarter index (1..240, 4 rubs per hizb) so that
-- quarter-hizb and half-hizb revision amounts can advance the cursor precisely.
ALTER TABLE public.memorization_settings
  ADD COLUMN IF NOT EXISTS revision_end INT CHECK (revision_end BETWEEN 1 AND 60),
  ADD COLUMN IF NOT EXISTS revision_cursor INT CHECK (revision_cursor BETWEEN 1 AND 240);

COMMENT ON COLUMN public.memorization_settings.revision_end IS 'Revision cycle end (hizb number, 1..60)';
COMMENT ON COLUMN public.memorization_settings.revision_cursor IS 'Current position in the repeating revision cycle (rub-al-hizb index, 1..240); advanced by submit RPC';

-- =============================================
-- 3. daily_assignments — the PLANNED side (suggestion), separate from the report
-- =============================================
-- The assignment exists before any report, persists on a no-show, and can go
-- stale independently. Actual results stay in daily_reports. Plan <-> actual
-- join on (circle_id, student_id, date).
CREATE TABLE IF NOT EXISTS public.daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,

  -- Planned hifz (ayah-aligned, whole ayahs)
  hifz_surah INT CHECK (hifz_surah BETWEEN 1 AND 114),
  hifz_from_ayah INT CHECK (hifz_from_ayah >= 1),
  hifz_to_ayah INT CHECK (hifz_to_ayah >= 1),

  -- Planned revision, mirrors the actual daily_reports.revision_ranges shape
  revision_ranges JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Provenance for computed staleness (NOT a stored 'stale' flag). On GET-today
  -- the engine recomputes the frontier from reports; if it != source_frontier
  -- the suggestion is regenerated and overwritten.
  source_frontier INT,   -- global ayah index the hifz suggestion was computed from
  source_cursor INT,     -- revision cursor snapshot at generation time

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'skipped')),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (circle_id, student_id, assignment_date)
);

COMMENT ON TABLE public.daily_assignments IS 'Per-student per-day PLANNED hifz/revision suggestion (the assignment). Actual results live in daily_reports.';

CREATE INDEX IF NOT EXISTS idx_daily_assignments_circle_date
  ON public.daily_assignments(circle_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_daily_assignments_student
  ON public.daily_assignments(student_id, assignment_date DESC);

DROP TRIGGER IF EXISTS on_daily_assignments_updated ON public.daily_assignments;
CREATE TRIGGER on_daily_assignments_updated
  BEFORE UPDATE ON public.daily_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.daily_assignments ENABLE ROW LEVEL SECURITY;

-- Student owns their assignments (mirrors memorization_settings policy shape,
-- reusing is_circle_member to avoid the circles<->memberships recursion).
DROP POLICY IF EXISTS "Students manage own assignments" ON public.daily_assignments;
CREATE POLICY "Students manage own assignments"
  ON public.daily_assignments FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid() AND public.is_circle_member(circle_id));

-- Circle owner can read assignments for their circle's dashboard.
DROP POLICY IF EXISTS "Circle owners view assignments" ON public.daily_assignments;
CREATE POLICY "Circle owners view assignments"
  ON public.daily_assignments FOR SELECT
  TO authenticated
  USING (public.is_circle_owner(circle_id));

-- =============================================
-- 4. Replace the UTC same-day UPDATE gate with a circle-local one
-- =============================================
-- Was: report_date = CURRENT_DATE (server UTC). Now compares report_date to the
-- circle's local date so it agrees with the server-computed report_date.
DROP POLICY IF EXISTS "Students can update own same-day reports" ON public.daily_reports;
CREATE POLICY "Students can update own same-day reports"
  ON public.daily_reports FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND report_date = (
      (now() AT TIME ZONE (
        SELECT c.timezone FROM public.circles c WHERE c.id = daily_reports.circle_id
      ))::date
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    AND report_date = (
      (now() AT TIME ZONE (
        SELECT c.timezone FROM public.circles c WHERE c.id = daily_reports.circle_id
      ))::date
    )
  );
