-- =============================================================================
-- Multi-teacher support: co-teachers per circle
-- =============================================================================
-- Prerequisite: 20260713010000_fix_rls_recursion.sql (SECURITY DEFINER helpers),
-- 20260713020000, and 20260714000000 must already be applied.
--
-- Until now a circle had exactly ONE teacher: circles.owner_id, checked via
-- is_circle_owner() across every teacher-gated policy. This migration lets a
-- circle have additional co-teachers, modelled as circle_memberships rows with
-- role IN ('teacher','assistant') (roles the table already allows).
--
-- Decisions (locked with the user):
--   • Co-teachers are added via a SEPARATE teacher invite code (not the student
--     code), so handing out the student code never grants teacher access.
--   • A co-teacher can do everything the owner can EXCEPT delete the circle
--     (there is no DELETE policy on circles, so this is enforced by omission).
--   • Co-teachers appear as teachers everywhere (dashboard, members, listeners).
--
-- All changes are additive (one new column + one helper + policy re-definitions
-- that only widen who counts as "teacher"). No data is dropped.

-- =============================================================================
-- 1. Separate teacher invite code
-- =============================================================================
ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS teacher_invite_code TEXT;

COMMENT ON COLUMN public.circles.teacher_invite_code IS
  'Second invite code that grants TEACHER (co-teacher) membership, distinct from the student invite_code';

-- Backfill a unique teacher code for every existing circle. Uses the same
-- alphabet the app uses (no I/O/0/1) and guarantees the code collides with
-- neither an existing student invite_code nor another teacher_invite_code, so
-- the join lookup can resolve a code to a single role unambiguously.
DO $$
DECLARE
  v_circle   RECORD;
  v_code     TEXT;
  v_alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_i        INT;
  v_exists   BOOLEAN;
BEGIN
  FOR v_circle IN
    SELECT id FROM public.circles WHERE teacher_invite_code IS NULL
  LOOP
    LOOP
      v_code := '';
      FOR v_i IN 1..6 LOOP
        v_code := v_code || substr(v_alphabet,
          1 + floor(random() * length(v_alphabet))::int, 1);
      END LOOP;

      SELECT EXISTS (
        SELECT 1 FROM public.circles
        WHERE invite_code = v_code OR teacher_invite_code = v_code
      ) INTO v_exists;

      EXIT WHEN NOT v_exists;
    END LOOP;

    UPDATE public.circles SET teacher_invite_code = v_code WHERE id = v_circle.id;
  END LOOP;
END $$;

ALTER TABLE public.circles
  ALTER COLUMN teacher_invite_code SET NOT NULL;

-- Unique so a teacher code resolves to exactly one circle.
CREATE UNIQUE INDEX IF NOT EXISTS circles_teacher_invite_code_key
  ON public.circles(teacher_invite_code);

-- =============================================================================
-- 2. is_circle_teacher() — owner OR active co-teacher membership
-- =============================================================================
-- SECURITY DEFINER + fixed search_path, same pattern as is_circle_owner /
-- is_circle_member, so it bypasses RLS and cannot re-enter the calling table's
-- policy (no 42P17 recursion).
CREATE OR REPLACE FUNCTION public.is_circle_teacher(target_circle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circles
    WHERE id = target_circle_id
      AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.circle_memberships
    WHERE circle_id = target_circle_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('teacher', 'assistant')
  );
$$;

COMMENT ON FUNCTION public.is_circle_teacher(UUID) IS
  'True if auth.uid() is the circle owner OR an active teacher/assistant member. Use for all teacher-gated access.';

-- Circle IDs the current user can act on as a teacher (owner or co-teacher).
-- Lets server pages express "my circles" as a single .in("id", ids) filter
-- instead of an OR across two tables. Returns a named column so supabase-js
-- rows are { circle_id } rather than function-name-keyed.
CREATE OR REPLACE FUNCTION public.my_teacher_circle_ids()
RETURNS TABLE (circle_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.circles WHERE owner_id = auth.uid()
  UNION
  SELECT cm.circle_id FROM public.circle_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.status = 'active'
    AND cm.role IN ('teacher', 'assistant');
$$;

COMMENT ON FUNCTION public.my_teacher_circle_ids() IS
  'Set of circle IDs the current user owns or co-teaches; for "my circles" filters.';

-- =============================================================================
-- 3. Re-define every teacher-gated policy to use is_circle_teacher
-- =============================================================================
-- These only WIDEN access from "owner" to "owner or co-teacher". Names match
-- the latest definitions (from the fix-recursion / memorization / progression
-- migrations) so this DROP + CREATE cleanly overrides them.

-- circles: UPDATE (metadata, current_week, invite codes). NOT delete.
DROP POLICY IF EXISTS "Owners can update their circles" ON public.circles;
CREATE POLICY "Owners can update their circles"
  ON public.circles FOR UPDATE
  TO authenticated
  USING (public.is_circle_teacher(id))
  WITH CHECK (public.is_circle_teacher(id));

-- circle_memberships: view / manage / remove members
DROP POLICY IF EXISTS "Members can view memberships in their circles" ON public.circle_memberships;
CREATE POLICY "Members can view memberships in their circles"
  ON public.circle_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_circle_teacher(circle_id)
  );

DROP POLICY IF EXISTS "Circle owners can manage memberships" ON public.circle_memberships;
CREATE POLICY "Circle owners can manage memberships"
  ON public.circle_memberships FOR UPDATE
  TO authenticated
  USING (public.is_circle_teacher(circle_id));

DROP POLICY IF EXISTS "Circle owners can remove members" ON public.circle_memberships;
CREATE POLICY "Circle owners can remove members"
  ON public.circle_memberships FOR DELETE
  TO authenticated
  USING (public.is_circle_teacher(circle_id));

-- daily_reports: teachers read their circle's reports
DROP POLICY IF EXISTS "Students can view own reports" ON public.daily_reports;
CREATE POLICY "Students can view own reports"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_circle_teacher(circle_id)
  );

-- memorization_settings: teachers read their circle's students' settings
DROP POLICY IF EXISTS "Circle owners can view settings" ON public.memorization_settings;
CREATE POLICY "Circle owners can view settings"
  ON public.memorization_settings FOR SELECT
  TO authenticated
  USING (public.is_circle_teacher(circle_id));

-- daily_assignments: teachers read their circle's assignments
DROP POLICY IF EXISTS "Circle owners view assignments" ON public.daily_assignments;
CREATE POLICY "Circle owners view assignments"
  ON public.daily_assignments FOR SELECT
  TO authenticated
  USING (public.is_circle_teacher(circle_id));

-- NOTE: circles has no DELETE policy, so deletion remains impossible via the
-- API for everyone (owner included) — co-teachers gain no delete power. If a
-- delete path is added later, gate it on owner_id = auth.uid(), not the helper.
