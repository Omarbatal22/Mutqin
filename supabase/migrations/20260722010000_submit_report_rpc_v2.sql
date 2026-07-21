-- =============================================
-- Submit report RPC v2 — multi-surah hifz columns
-- =============================================
-- Replaces submit_daily_report to write the new global-ayah-index hifz columns
-- (hifz_start_global / hifz_end_global) instead of the legacy single-surah
-- columns. Legacy columns are left NULL on new writes; the read-normalizer uses
-- the global columns as the source of truth. Everything else (timezone-correct
-- report_date, idempotent upsert, assignment -> submitted, cursor update) is
-- unchanged from the original RPC.

CREATE OR REPLACE FUNCTION public.submit_daily_report(
  p_circle_id UUID,
  p_assignment_id UUID,
  p_report JSONB,
  p_new_cursor INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_student_id UUID;
  v_tz TEXT;
  v_report_date DATE;
BEGIN
  -- 1. Get authenticated user ID
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify circle membership using the is_circle_member helper
  IF NOT public.is_circle_member(p_circle_id) THEN
    RAISE EXCEPTION 'Not authorized: student is not an active member of this circle';
  END IF;

  -- 3. Retrieve circle timezone and compute local date
  SELECT timezone INTO v_tz FROM public.circles WHERE id = p_circle_id;
  IF v_tz IS NULL THEN
    v_tz := 'Africa/Cairo'; -- fallback
  END IF;
  v_report_date := (now() AT TIME ZONE v_tz)::date;

  -- 4. Upsert the daily report (multi-surah global columns)
  INSERT INTO public.daily_reports (
    circle_id,
    student_id,
    report_date,
    week_reference,
    did_hifz,
    hifz_start_global,
    hifz_end_global,
    hifz_page,
    hifz_mistakes,
    hifz_notes,
    did_revision,
    revision_ranges,
    revision_mistakes,
    revision_notes,
    listener_type,
    listener_user_id,
    listener_name,
    notes
  ) VALUES (
    p_circle_id,
    v_student_id,
    v_report_date,
    p_report->>'week_reference',
    COALESCE((p_report->>'did_hifz')::boolean, TRUE),
    (p_report->>'hifz_start_global')::int,
    (p_report->>'hifz_end_global')::int,
    (p_report->>'hifz_page')::int,
    COALESCE((p_report->>'hifz_mistakes')::int, 0),
    p_report->>'hifz_notes',
    COALESCE((p_report->>'did_revision')::boolean, TRUE),
    COALESCE((p_report->'revision_ranges'), '[]'::jsonb),
    COALESCE((p_report->>'revision_mistakes')::int, 0),
    p_report->>'revision_notes',
    p_report->>'listener_type',
    (p_report->>'listener_user_id')::uuid,
    p_report->>'listener_name',
    p_report->>'notes'
  )
  ON CONFLICT (circle_id, student_id, report_date)
  DO UPDATE SET
    week_reference = EXCLUDED.week_reference,
    did_hifz = EXCLUDED.did_hifz,
    hifz_start_global = EXCLUDED.hifz_start_global,
    hifz_end_global = EXCLUDED.hifz_end_global,
    hifz_page = EXCLUDED.hifz_page,
    hifz_mistakes = EXCLUDED.hifz_mistakes,
    hifz_notes = EXCLUDED.hifz_notes,
    did_revision = EXCLUDED.did_revision,
    revision_ranges = EXCLUDED.revision_ranges,
    revision_mistakes = EXCLUDED.revision_mistakes,
    revision_notes = EXCLUDED.revision_notes,
    listener_type = EXCLUDED.listener_type,
    listener_user_id = EXCLUDED.listener_user_id,
    listener_name = EXCLUDED.listener_name,
    notes = EXCLUDED.notes,
    -- Legacy single-surah columns are no longer maintained; clear them so a
    -- re-submitted (edited) row doesn't carry stale single-surah data.
    hifz_surah = NULL,
    hifz_from_ayah = NULL,
    hifz_to_ayah = NULL,
    updated_at = NOW();

  -- 5. Mark daily assignment as submitted
  IF p_assignment_id IS NOT NULL THEN
    UPDATE public.daily_assignments
    SET status = 'submitted', updated_at = NOW()
    WHERE id = p_assignment_id AND circle_id = p_circle_id AND student_id = v_student_id;
  ELSE
    UPDATE public.daily_assignments
    SET status = 'submitted', updated_at = NOW()
    WHERE circle_id = p_circle_id AND student_id = v_student_id AND assignment_date = v_report_date;
  END IF;

  -- 6. Update revision_cursor on memorization_settings
  IF p_new_cursor IS NOT NULL THEN
    UPDATE public.memorization_settings
    SET revision_cursor = p_new_cursor, updated_at = NOW()
    WHERE circle_id = p_circle_id AND user_id = v_student_id;
  END IF;
END;
$$;
