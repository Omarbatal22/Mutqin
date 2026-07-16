# Mutqin — Smart Quran Progression Engine & Daily Experience

## Context

Mutqin is a Quran-memorization circle (halaqa) app: teachers run circles, students submit
a daily report of what they recited. It's live but minimal — the daily report is whatever
the student types, there is no notion of a *suggested* assignment, no planned-vs-actual, and
no progression logic. Today's "smart" behavior is a single client-side call to `nextAyah()`
that prefills the next ayah from the last report.

The 7 planning docs in `D:\mutqin\plan\` describe a much more capable system built around one
cycle: **Student Config → Progression Engine → Daily Assignment → Actual Report → Recalculate
Progress → Next Assignment**. This plan evolves the current app into that system, phased, with
**student daily experience shipped first** and **ayah-boundary precision** (half-page/segments
start & end on whole ayahs — the plan's own MVP recommendation).

**User-confirmed decisions:** Full phased rebuild · ayah-boundary precision · student experience
first · default circle timezone **Africa/Cairo** · **add Vitest** for engine unit tests.

### Current architecture (verified — the constraints that shape this plan)
- **No service/data layer.** Server components read Supabase inline (`await createClient()` from
  `@/lib/supabase/server`, `export const dynamic = 'force-dynamic'`). Client components read/write
  directly via `@/lib/supabase/client` in `useEffect`/handlers. Writes are `.upsert(payload,{onConflict})`.
- **RLS scopes every row.** Cross-table checks go through SECURITY DEFINER helpers
  `is_circle_owner(uuid)` / `is_circle_member(uuid)` (in `supabase/migrations/…010000_fix_rls_recursion.sql`)
  to avoid the 42P17 recursion that was already hit once.
- **Middleware is `src/proxy.ts`** (Next 16 rename) → delegates to `src/lib/supabase/middleware.ts`,
  which gates `/student|/teacher|/profile`. `params`/`searchParams`/`cookies()` are Promises.
- **Quran data is surah-only:** `src/lib/quran/surahs.ts` (114 × {number, nameAr, ayahCount}).
  `index.ts` has `getSurah, ayahCount, nextAyah, formatRange, isValidRange`. **No page/juz/hizb/rub/
  global-sequence/segment data exists anywhere.**
- **Tables:** `profiles`, `circles`, `circle_memberships`, `memorization_settings`, `daily_reports`
  (flat: hifz_* cols + `revision_ranges` JSONB + listener + `total_mistakes` GENERATED; unique
  `(circle_id, student_id, report_date)`).
- **Known latent bug:** client computes `report_date` in UTC while the same-day update RLS policy
  compares `report_date = CURRENT_DATE` (server UTC) → near-midnight mismatch. `circles.timezone`
  + server-computed date must **replace** this, not sit beside it.

### Key UI/infra to reuse (do not rebuild)
- `src/components/ui/*` (Button, Card*, Input, Textarea, Badge, **NumberStepper**), `DashboardShell`
  (role-based chrome + student bottom nav), `ReportSummary` (full/compact — the single render path
  for a `StructuredReport`; used by success screen, both dashboards, history, teacher per-student),
  `SurahAyahPicker`, `CircleSwitcher` (client `<select>` pattern for server pages).
- RLS helpers `is_circle_owner` / `is_circle_member`; the `.upsert(onConflict)` idiom; the inline
  `"use server"` action pattern already in `invite/[code]/page.tsx`.
- Tailwind 4 theme in `globals.css` (`@theme`: primary=emerald, accent=amber; RTL Arabic).
  Note: components reference undefined shades (`stone-250/650/850`, `primary-650`) — add these to
  `@theme` opportunistically so styling isn't silently dropped.

---

## Architecture decisions (locked)

1. **Quran structural data = bundled static TS, generated offline.** Immutable global reference data
   belongs in the bundle, not Postgres — the engine must be a pure, unit-testable function over
   constants (no DB fixtures, no service layer to invent). Store **boundaries, not 6236 ayahs**:
   604 page-start global indices, 240 rub-al-hizb starts (→ 60 hizb every 4th, 30 juz every 8th),
   ~1208 half-page segments `{startGlobal,endGlobal}`, and cumulative surah offsets (from existing
   `SURAHS`). ~2k integers, server-side only. Source: **Tanzil `quran-data.xml`** (pages/juz/rub,
   already ayah-aligned) + **QUL 15-line Madani layout** (for half-page derivation only).
   ⚠️ **Half-page boundaries are derived & opinionated, not canonical** — rule: half-page end = last
   ayah *starting* on line ≤ 7; commit rule + output together; validate a sample vs a physical Madani
   mushaf before calling it "precise." Treat as MVP-approximate.

2. **Schema evolution = additive only** (no `daily_reports` reshape → zero data-loss risk):
   - New **`daily_assignments`** table holds *planned* hifz/revision (the assignment exists before any
     report, persists on no-show, goes stale independently). **Actual** stays in flat `daily_reports`.
   - **Skip** `daily_report_entries` / `ReportEntryRecitation` normalization for MVP (hifz is one range;
     revision already JSONB). Join plan↔actual on `(circle_id, student_id, date)`.
   - **Extend** `memorization_settings` (add `revision_end`, `revision_cursor`) rather than split into
     Profile/Config tables. Store the revision cursor (stateful wrap); do **not** cache the hifz
     frontier (recompute `max(hifz end)` from reports — the source of truth).
   - Add **`circles.timezone`** (default `'Africa/Cairo'`).

3. **Atomic submit = Postgres RPC `submit_daily_report(...)` SECURITY DEFINER, called from a Next.js
   server action.** RPC gives real atomicity (report write + assignment→submitted + cursor update
   commit together) the client can't. Server action re-checks auth (server functions are POST-reachable).
   **Engine math stays in TS**; RPC does persistence + timezone-correct `report_date` +
   self-derives the hifz frontier (ignores any client-passed frontier). "GET today" runs server-side
   in the Today server component via a shared `getToday()` helper that runs the engine and upserts the
   day's assignment so the suggestion is stable within the day.

---

## Phase 0 — Quran structural reference data  *(foundation; nothing else works without it)*

- `scripts/generate-quran-data.ts` — offline generator: reads Tanzil `quran-data.xml` + QUL line
  layout, emits committed TS. Documents the half-page rule inline. Run once; output committed.
- `src/lib/quran/data/{page-starts,quarter-starts,segments}.ts` — generated constants.
- `src/lib/quran/structure.ts` — pure helpers over the constants:
  `globalIndex(surah,ayah) ↔ fromGlobal(i)`, `pageOf`, `juzOf`, `hizbOf`, `rubOf`, `segmentOf`,
  `nextSegment`, `pageRange`, `hizbRange`, `rubRange`, `juzRange`. Extends existing `index.ts` helpers.
- **Verify:** `src/lib/quran/structure.test.ts` — spot-check known anchors (2:1 on page 2; juz 2 starts
  2:142; hizb 2 = quarter 5; last ayah 114:6 = page 604) + round-trip `globalIndex∘fromGlobal`.

## Phase 1 — Schema migration  *(additive, one new migration file)*

`supabase/migrations/20260714000000_progression_engine.sql`:
- `ALTER TABLE circles ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Africa/Cairo';`
- `ALTER TABLE memorization_settings ADD COLUMN revision_end INT CHECK(1..60), ADD COLUMN revision_cursor INT;`
- `CREATE TABLE daily_assignments (...)` per the DDL in decisions (planned hifz cols, `revision_ranges`
  JSONB, `source_frontier`, `source_cursor`, `status ∈ {pending,submitted,skipped}`,
  `UNIQUE(circle_id,student_id,assignment_date)`), RLS mirroring `memorization_settings` and reusing
  `is_circle_member` / `is_circle_owner`.
- Replace the `daily_reports` same-day UPDATE policy: compare against **circle-local date**
  `((now() AT TIME ZONE c.timezone)::date)`, not `CURRENT_DATE`.
- **Verify:** apply locally (`supabase db reset` or `db push`); confirm policies & table exist; existing
  `daily_reports` rows untouched.

## Phase 2 — Progression Engine  *(pure TS; the "brain")*

- `src/lib/progression/engine.ts` — pure functions, no DB/UI imports:
  - `computeFrontier(reports)` — merge completed hifz actual ranges from starting position, stop at first
    gap → continuous frontier (out-of-sequence & gaps do **not** advance across a hole).
  - `suggestHifz(settings, frontier)` — next full/half-page segment from frontier; remainder-of-unit on
    partial; end-of-range → completed.
  - `suggestRevision(settings, cursor)` — next range by amount within cycle start→end, **wrap** at end.
  - `advanceRevisionCursor(cursor, actual, settings)` — advance only when actual starts at expected
    position & moves forward in-cycle; off-path recorded but cursor unchanged.
  - Types: `EngineSettings`, `Suggestion`, `TodayView`.
- **Verify:** `src/lib/progression/engine.test.ts` (Vitest) covering the doc's exact cases: full/half
  progression, partial→remainder, overachievement, no-completion (no move), out-of-sequence + gap
  resolution/merge, missed days (progress by achievement not calendar), revision partial/wrap/off-path.
- Add Vitest: `vitest` + `vitest.config.ts` + `"test": "vitest"` in `package.json`.

## Phase 3 — Submit RPC + server helpers  *(atomicity + server-run engine)*

`supabase/migrations/20260714010000_submit_report_rpc.sql`:
- `submit_daily_report(p_circle_id, p_assignment_id, p_report jsonb, p_new_cursor int)` SECURITY DEFINER:
  internal auth re-check (`auth.uid()` + `is_circle_member`), timezone-correct `report_date`, upsert
  `daily_reports` (idempotent → preserves edit-same-day), mark assignment `submitted`, persist
  `revision_cursor`, self-derive frontier.

`src/lib/progression/today.ts` (server-only):
- `getToday(circleId)` — auth, load settings + reports + existing assignment, run engine, upsert
  `daily_assignments` (stable within day; regenerate when `source_frontier ≠ recomputed frontier`),
  return a `TodayView`.
- `submitReport(input)` — `"use server"` action: re-auth, run engine for `newCursor`, call the RPC,
  `refresh()`.

## Phase 4 — Student Today experience  *(ship target)*

Rebuild `src/app/(app)/student/report/page.tsx` around the pre-filled Today model (plan: *Today First,
Pre-filled, Progressive Disclosure, Mobile-first*):
- Server component calls `getToday()`; a client form child handles the result flow.
- Hifz & Revision cards show the **suggested** range (badge "مقترح تلقائياً") + result chooser:
  **أكملت المطلوب / أكملت جزءاً / سمّعت غير المقترح / لم أسمّع**. Completed reuses suggestion as actual;
  partial → bottom-sheet "to which ayah"; different → `SurahAyahPicker`; not-done hides mistakes/listener.
- Reuse `NumberStepper`, `SurahAyahPicker`, `ReportSummary`, listener selector w/ **last-listener memory**.
  Submit → `submitReport` action. Already-submitted → read-only + "تعديل التقرير".
- Update `student/setup/page.tsx` to also capture revision cycle **end** (writes `revision_end`).
- **Verify:** `/verify` skill — drive setup → Today (suggestion appears) → complete → submit → return
  shows read-only; confirm next day suggests the following segment; confirm partial yields remainder.

## Phase 5 — Teacher dashboard planned-vs-actual  *(read-model polish)*

- Extend `teacher/dashboard/page.tsx` (already the submitted/not-submitted read-model) and the
  per-student page to show **المقترح vs الفعلي** by joining `daily_assignments` ↔ `daily_reports` on
  `(circle_id, student_id, date)`; add `Setup Required` status for students with no `memorization_settings`.
- **Verify:** with two students (one submitted, one not), dashboard shows correct counts, planned-vs-actual,
  and setup-required state.

---

## Notes / risks
- **Half-page precision is approximate** (derived, not canonical) — validate a sample vs a physical
  Madani mushaf; acceptable for MVP per the plan docs.
- Timezone change **replaces** the UTC `CURRENT_DATE` gate — verify near-midnight attribution once.
- Deferred by design (plan allows later without core rewrite): `daily_report_entries` / per-entry
  recitation normalization, invitations table, teacher-assigned plans, attendance/exams/analytics.
- Each phase is independently shippable; Phases 0–1 are prerequisites for everything after.
