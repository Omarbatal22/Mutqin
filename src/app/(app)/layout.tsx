import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardNav } from "@/components/layout/dashboard-nav"

export const dynamic = "force-dynamic"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_role")
    .eq("id", user.id)
    .single()

  const role: "teacher" | "student" =
    profile?.preferred_role === "teacher" ? "teacher" : "student"
  const userName = profile?.full_name || (role === "teacher" ? "الأستاذ" : "الطالب")

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-stone-50/50 dark:bg-[#121212] islamic-pattern">
      <DashboardNav role={role} userName={userName} />
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto min-h-[calc(100vh-68px)] md:h-screen p-6 md:p-10 pb-24 md:pb-10">
        {children}
      </main>
    </div>
  )
}
