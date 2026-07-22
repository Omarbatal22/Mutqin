import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Circle IDs the current user can act on as a teacher — owner OR active
 * member (role teacher/assistant/student). Safe fallback if RPC is unavailable.
 */
export async function getTeacherCircleIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const idsSet = new Set<string>()

  // 1. Try RPC my_teacher_circle_ids
  try {
    const { data: rpcData } = await supabase.rpc("my_teacher_circle_ids")
    if (Array.isArray(rpcData)) {
      for (const row of rpcData) {
        const id = typeof row === "string" ? row : row?.circle_id
        if (id) idsSet.add(id)
      }
    }
  } catch {
    // Ignore RPC failure
  }

  // 2. Query circles owned by user
  const { data: owned } = await supabase
    .from("circles")
    .select("id")
    .eq("owner_id", user.id)

  for (const c of owned || []) {
    idsSet.add(c.id)
  }

  // 3. Query active memberships for user
  const { data: memberships } = await supabase
    .from("circle_memberships")
    .select("circle_id")
    .eq("user_id", user.id)
    .eq("status", "active")

  for (const m of memberships || []) {
    idsSet.add(m.circle_id)
  }

  return Array.from(idsSet)
}
