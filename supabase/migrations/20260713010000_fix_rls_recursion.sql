-- =============================================
-- Fix: infinite recursion (Postgres 42P17) in RLS policies
-- =============================================
-- The original policies on `circles` and `circle_memberships` referenced each
-- other with EXISTS subqueries:
--   * circles           -> subquery on circle_memberships
--   * circle_memberships -> subquery on circles
-- Evaluating either one re-entered the other's policy, so Postgres aborted with
-- "infinite recursion detected in policy for relation ...". This broke every
-- page that reads circles/memberships/daily_reports (dashboards, join, invite).
--
-- The fix is the canonical Supabase pattern: move the cross-table checks into
-- SECURITY DEFINER functions. They run with the definer's rights, so they
-- bypass RLS and never re-trigger the calling table's policies. No policy cycle.

-- =============================================
-- 1. Helper functions (SECURITY DEFINER = bypass RLS, break the cycle)
-- =============================================
CREATE OR REPLACE FUNCTION public.is_circle_owner(target_circle_id UUID)
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
  );
$$;

CREATE OR REPLACE FUNCTION public.is_circle_member(target_circle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_memberships
    WHERE circle_id = target_circle_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- =============================================
-- 2. Circles policies (rewritten to use helper — no more subquery on memberships)
-- =============================================
DROP POLICY IF EXISTS "Members can view their circles" ON public.circles;
CREATE POLICY "Members can view their circles"
  ON public.circles FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_circle_member(id)
  );

-- =============================================
-- 3. Circle membership policies (rewritten to use helper — no more subquery on circles)
-- =============================================
DROP POLICY IF EXISTS "Members can view memberships in their circles" ON public.circle_memberships;
CREATE POLICY "Members can view memberships in their circles"
  ON public.circle_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_circle_owner(circle_id)
  );

DROP POLICY IF EXISTS "Circle owners can manage memberships" ON public.circle_memberships;
CREATE POLICY "Circle owners can manage memberships"
  ON public.circle_memberships FOR UPDATE
  TO authenticated
  USING (public.is_circle_owner(circle_id));

DROP POLICY IF EXISTS "Circle owners can remove members" ON public.circle_memberships;
CREATE POLICY "Circle owners can remove members"
  ON public.circle_memberships FOR DELETE
  TO authenticated
  USING (public.is_circle_owner(circle_id));

-- =============================================
-- 4. Daily report policies (rewritten to use helpers)
-- =============================================
-- These queried `circles`, which pulled in the recursive cycle above. Using the
-- helpers keeps them from nesting into other tables' RLS.
DROP POLICY IF EXISTS "Students can view own reports" ON public.daily_reports;
CREATE POLICY "Students can view own reports"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_circle_owner(circle_id)
  );

DROP POLICY IF EXISTS "Students can create own reports" ON public.daily_reports;
CREATE POLICY "Students can create own reports"
  ON public.daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND public.is_circle_member(circle_id)
  );
