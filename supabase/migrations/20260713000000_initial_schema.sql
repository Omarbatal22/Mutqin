-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. Profiles Table (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  preferred_role TEXT DEFAULT 'student' CHECK (preferred_role IN ('teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';

-- =============================================
-- 2. Circles Table (Halaqat)
-- =============================================
CREATE TABLE IF NOT EXISTS public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'archived', 'suspended')),
  current_week INT DEFAULT 1 NOT NULL CHECK (current_week >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.circles IS 'Quran memorization circles (halaqat)';

-- =============================================
-- 3. Circle Memberships Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.circle_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'assistant', 'student')),
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'removed')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(circle_id, user_id)
);

COMMENT ON TABLE public.circle_memberships IS 'User memberships in circles with role-based access';

-- =============================================
-- 4. Daily Reports Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_reference TEXT,
  hifz_content TEXT,
  revision_content TEXT,
  mistakes_count INT DEFAULT 0 NOT NULL CHECK (mistakes_count >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(circle_id, student_id, report_date)
);

COMMENT ON TABLE public.daily_reports IS 'Daily student reports — one per student per circle per day';

-- =============================================
-- 5. Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_daily_reports_circle_date ON public.daily_reports(circle_id, report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_student ON public.daily_reports(student_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_circle_memberships_circle ON public.circle_memberships(circle_id, status);
CREATE INDEX IF NOT EXISTS idx_circle_memberships_user ON public.circle_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_circles_invite_code ON public.circles(invite_code);
CREATE INDEX IF NOT EXISTS idx_circles_owner ON public.circles(owner_id);

-- =============================================
-- 6. Auto-update updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_circles_updated ON public.circles;
CREATE TRIGGER on_circles_updated
  BEFORE UPDATE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_daily_reports_updated ON public.daily_reports;
CREATE TRIGGER on_daily_reports_updated
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 7. Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, preferred_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 8. Row Level Security (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view any profile" ON public.profiles;
CREATE POLICY "Users can view any profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Circles Policies
DROP POLICY IF EXISTS "Members can view their circles" ON public.circles;
CREATE POLICY "Members can view their circles"
  ON public.circles FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_memberships
      WHERE circle_id = circles.id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Anyone can view circle by invite code" ON public.circles;
CREATE POLICY "Anyone can view circle by invite code"
  ON public.circles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Teachers can create circles" ON public.circles;
CREATE POLICY "Teachers can create circles"
  ON public.circles FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their circles" ON public.circles;
CREATE POLICY "Owners can update their circles"
  ON public.circles FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Circle Memberships Policies
DROP POLICY IF EXISTS "Members can view memberships in their circles" ON public.circle_memberships;
CREATE POLICY "Members can view memberships in their circles"
  ON public.circle_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_memberships.circle_id
      AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join circles" ON public.circle_memberships;
CREATE POLICY "Users can join circles"
  ON public.circle_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Circle owners can manage memberships" ON public.circle_memberships;
CREATE POLICY "Circle owners can manage memberships"
  ON public.circle_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_memberships.circle_id
      AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Circle owners can remove members" ON public.circle_memberships;
CREATE POLICY "Circle owners can remove members"
  ON public.circle_memberships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_memberships.circle_id
      AND owner_id = auth.uid()
    )
  );

-- Daily Reports Policies
DROP POLICY IF EXISTS "Students can view own reports" ON public.daily_reports;
CREATE POLICY "Students can view own reports"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = daily_reports.circle_id
      AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can create own reports" ON public.daily_reports;
CREATE POLICY "Students can create own reports"
  ON public.daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circle_memberships
      WHERE circle_id = daily_reports.circle_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Students can update own same-day reports" ON public.daily_reports;
CREATE POLICY "Students can update own same-day reports"
  ON public.daily_reports FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND report_date = CURRENT_DATE
  )
  WITH CHECK (
    student_id = auth.uid()
    AND report_date = CURRENT_DATE
  );
