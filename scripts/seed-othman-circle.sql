-- =============================================================================
-- SEED: عثمان بن عفان circle — mock data to preview the weekly report grid
-- =============================================================================
-- RUN THIS IN THE SUPABASE DASHBOARD SQL EDITOR (it runs as the DB owner and
-- bypasses RLS + can write to auth.users). It will NOT work through the anon key.
--
-- What it creates, all idempotent (safe to re-run):
--   • 1 teacher + 6 students as real auth.users (+ profiles)
--   • the "عثمان بن عفان" circle owned by that teacher
--   • memberships for all 6 students (5 active w/ settings, 1 without → "setup required")
--   • memorization_settings for 5 students (hifz + revision systems)
--   • a full current week (Sat→Fri, Africa/Cairo) of daily_reports with a
--     deliberate mix of states so every grid cell type shows up:
--       - a perfect-week student (submits every past day)
--       - students who miss scattered days
--       - a student who never submits
--       - the no-settings student (no reports)
--
-- Login for every seeded user:  <email> / Passw0rd!seed
-- Emails: teacher.othman@seed.mutqin / s1..s6.othman@seed.mutqin
--
-- To remove everything this created, run the CLEANUP block at the very bottom.
-- =============================================================================

-- pgcrypto provides crypt()/gen_salt() for the password hash. On Supabase it is
-- pre-installed in the "extensions" schema; this guarantees it is reachable.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  -- Fixed UUIDs so re-runs update the same rows instead of duplicating.
  v_teacher   uuid := '0e100000-0000-4000-a000-000000000001';
  v_circle    uuid := '0e100000-0000-4000-c000-000000000001';
  v_tz        text := 'Africa/Cairo';
  v_today     date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  v_week_start date;
  v_pw        text := extensions.crypt('Passw0rd!seed', extensions.gen_salt('bf'));

  -- student_id, name, has_settings, and a 7-char submit pattern for Sat..Fri
  -- ('Y' = submitted that day, '.' = did not). Future days are ignored.
  v_students jsonb := '[
    {"id":"0e100000-0000-4000-b000-000000000001","name":"عبد الله بن مسعود","email":"s1.othman@seed.mutqin","settings":true,  "pattern":"YYYYYYY"},
    {"id":"0e100000-0000-4000-b000-000000000002","name":"مصعب بن عمير",      "email":"s2.othman@seed.mutqin","settings":true,  "pattern":"YY.YY.Y"},
    {"id":"0e100000-0000-4000-b000-000000000003","name":"سعد بن أبي وقاص",   "email":"s3.othman@seed.mutqin","settings":true,  "pattern":"Y.Y.Y.."},
    {"id":"0e100000-0000-4000-b000-000000000004","name":"الزبير بن العوام",  "email":"s4.othman@seed.mutqin","settings":true,  "pattern":"YYY...."},
    {"id":"0e100000-0000-4000-b000-000000000005","name":"طلحة بن عبيد الله", "email":"s5.othman@seed.mutqin","settings":true,  "pattern":"......."},
    {"id":"0e100000-0000-4000-b000-000000000006","name":"أبو عبيدة الجراح",  "email":"s6.othman@seed.mutqin","settings":false, "pattern":"......."}
  ]'::jsonb;

  v_stu       jsonb;
  v_sid       uuid;
  v_email     text;
  v_name      text;
  v_pattern   text;
  v_has_set   boolean;
  i           int;
  v_day       date;
  v_submit    boolean;
  -- rolling hifz position so each student's ranges look progressive
  v_surah     int;
  v_from      int;
  v_to        int;
  v_hifz_mist int;
  v_rev_mist  int;
BEGIN
  -- Week start = most recent Saturday (Sat=6 in ISO dow via a small calc).
  -- extract(dow) : Sun=0..Sat=6 → days since Saturday = (dow + 1) % 7
  v_week_start := v_today - ((extract(dow from v_today)::int + 1) % 7);

  -- ---- Teacher auth user + profile ------------------------------------------
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data,
                          confirmation_token, recovery_token,
                          email_change_token_new, email_change)
  VALUES (v_teacher, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'teacher.othman@seed.mutqin', v_pw,
          now(), now(), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
          '', '', '', '')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.profiles (id, full_name, preferred_role)
  VALUES (v_teacher, 'الأستاذ عثمان', 'teacher')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name,
                                 preferred_role = 'teacher';

  -- ---- Circle ---------------------------------------------------------------
  INSERT INTO public.circles (id, name, description, owner_id, invite_code, timezone)
  VALUES (v_circle, 'عثمان بن عفان', 'حلقة تجريبية للمعاينة', v_teacher, 'OTHMAN', v_tz)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
                                 owner_id = EXCLUDED.owner_id,
                                 timezone = EXCLUDED.timezone;

  -- teacher membership
  INSERT INTO public.circle_memberships (circle_id, user_id, role, status)
  VALUES (v_circle, v_teacher, 'teacher', 'active')
  ON CONFLICT (circle_id, user_id) DO UPDATE SET role = 'teacher', status = 'active';

  -- ---- Students -------------------------------------------------------------
  FOR v_stu IN SELECT * FROM jsonb_array_elements(v_students)
  LOOP
    v_sid     := (v_stu->>'id')::uuid;
    v_email   := v_stu->>'email';
    v_name    := v_stu->>'name';
    v_pattern := v_stu->>'pattern';
    v_has_set := (v_stu->>'settings')::boolean;

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data,
                            confirmation_token, recovery_token,
                            email_change_token_new, email_change)
    VALUES (v_sid, '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', v_email, v_pw, now(), now(), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
            '', '', '', '')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    INSERT INTO public.profiles (id, full_name, preferred_role)
    VALUES (v_sid, v_name, 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    INSERT INTO public.circle_memberships (circle_id, user_id, role, status)
    VALUES (v_circle, v_sid, 'student', 'active')
    ON CONFLICT (circle_id, user_id) DO UPDATE SET role = 'student', status = 'active';

    -- memorization settings (skip for the "setup required" student)
    IF v_has_set THEN
      INSERT INTO public.memorization_settings
        (user_id, circle_id, start_surah, start_page, start_ayah,
         hifz_amount, revision_amount, revision_start, revision_end, revision_cursor)
      VALUES (v_sid, v_circle, 2, 2, 1,
              'full_page', 'hizb', 1, 10, 1)
      ON CONFLICT (user_id, circle_id) DO UPDATE
        SET hifz_amount = EXCLUDED.hifz_amount,
            revision_amount = EXCLUDED.revision_amount,
            revision_start = EXCLUDED.revision_start,
            revision_end = EXCLUDED.revision_end;
    END IF;

    -- daily reports across the week per the submit pattern
    -- reset a per-student rolling hifz range (surah 2, moving ~10 ayahs/day)
    v_surah := 2;
    v_from  := 1;
    FOR i IN 0..6 LOOP
      v_day    := v_week_start + i;
      v_submit := substr(v_pattern, i + 1, 1) = 'Y';

      -- only seed reports for days that have already happened (<= today)
      IF v_submit AND v_day <= v_today THEN
        v_to        := v_from + 9;
        v_hifz_mist := (i * 2 + length(v_name)) % 4;         -- 0..3 pseudo-random
        v_rev_mist  := (i + length(v_name)) % 3;             -- 0..2 pseudo-random

        INSERT INTO public.daily_reports
          (circle_id, student_id, report_date, did_hifz, hifz_surah,
           hifz_from_ayah, hifz_to_ayah, hifz_page, hifz_mistakes,
           did_revision, revision_ranges, revision_mistakes,
           listener_type, listener_name)
        VALUES
          (v_circle, v_sid, v_day, true, v_surah, v_from, v_to, 2, v_hifz_mist,
           true,
           jsonb_build_array(jsonb_build_object('surah', 1, 'fromAyah', 1, 'toAyah', 7)),
           v_rev_mist, 'teacher', 'الأستاذ عثمان')
        ON CONFLICT (circle_id, student_id, report_date) DO UPDATE
          SET hifz_from_ayah = EXCLUDED.hifz_from_ayah,
              hifz_to_ayah = EXCLUDED.hifz_to_ayah,
              hifz_mistakes = EXCLUDED.hifz_mistakes,
              revision_mistakes = EXCLUDED.revision_mistakes;

        v_from := v_to + 1;  -- advance the rolling frontier
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed complete. Circle % , week starting %', v_circle, v_week_start;
END $$;

-- =============================================================================
-- CLEANUP — uncomment and run to delete everything the seed created.
-- (auth.users delete cascades to profiles → memberships → settings → reports)
-- =============================================================================
-- DELETE FROM auth.users WHERE id IN (
--   '0e100000-0000-4000-a000-000000000001',
--   '0e100000-0000-4000-b000-000000000001',
--   '0e100000-0000-4000-b000-000000000002',
--   '0e100000-0000-4000-b000-000000000003',
--   '0e100000-0000-4000-b000-000000000004',
--   '0e100000-0000-4000-b000-000000000005',
--   '0e100000-0000-4000-b000-000000000006'
-- );
