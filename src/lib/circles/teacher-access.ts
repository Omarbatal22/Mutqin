import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Circle IDs the current user can act on as a teacher — owner OR active
 * co-teacher (role teacher/assistant). Backed by the SECURITY DEFINER RPC
 * `my_teacher_circle_ids()`; use the result with `.in("id", ids)` /
 * `.in("circle_id", ids)` filters on server pages.
 *
 * Returns a guaranteed-non-empty sentinel-free list is NOT done here — callers
 * that pass this straight to `.in()` should guard the empty case themselves
 * (an empty `.in([])` correctly matches nothing).
 */
export async function getTeacherCircleIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data } = await supabase.rpc("my_teacher_circle_ids")
  return ((data as { circle_id: string }[] | null) ?? [])
    .map((row) => row.circle_id)
    .filter(Boolean)
}
