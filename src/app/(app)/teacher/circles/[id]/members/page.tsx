import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { ArrowRight, QrCode, Copy, Trash2, Users, AlertCircle } from "lucide-react"

export const dynamic = 'force-dynamic'

interface DBProfile {
  id: string
  full_name: string
  preferred_role: string | null
}

interface DBMembership {
  id: string
  joined_at: string
  profiles: DBProfile | DBProfile[] | null
}

interface CircleMembersPageProps {
  params: Promise<{ id: string }>
}

export default async function CircleMembersPage({ params }: CircleMembersPageProps) {
  const { id: circleId } = await params
  const supabase = await createClient()

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch circle details
  const { data: circle } = await supabase
    .from("circles")
    .select("name, invite_code, owner_id")
    .eq("id", circleId)
    .single()

  // Verify ownership
  if (!circle || circle.owner_id !== user?.id) {
    redirect("/teacher/circles")
  }

  // Fetch active student memberships
  const { data: memberships } = await supabase
    .from("circle_memberships")
    .select(`
      id,
      joined_at,
      profiles:user_id (
        id,
        full_name,
        preferred_role
      )
    `)
    .eq("circle_id", circleId)
    .eq("role", "student")
    .eq("status", "active")
    .order("joined_at", { ascending: true })

  const students = (memberships as unknown as DBMembership[] || []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (!profile) return null
    return {
      membershipId: m.id,
      joinedAt: m.joined_at,
      id: profile.id,
      full_name: profile.full_name,
      preferred_role: profile.preferred_role
    }
  }).filter((s): s is NonNullable<typeof s> => s !== null)

  // Define Server Action to remove a member
  async function removeMember(formData: FormData) {
    "use server"
    const membershipId = formData.get("membershipId") as string
    if (!membershipId) return

    const serverSupabase = await createClient()
    
    // We update the status to 'removed' instead of hard delete to preserve history if needed,
    // or we can hard delete if we want to clean up.
    // Let's update status to 'removed' per PRD.
    await serverSupabase
      .from("circle_memberships")
      .update({ status: "removed" })
      .eq("id", membershipId)

    // Redirect to refresh the server component state
    redirect(`/teacher/circles/${circleId}/members`)
  }

  return (
    <DashboardShell role="teacher">
      <div className="max-w-4xl mx-auto w-full">
        {/* Back Link */}
        <Link href="/teacher/circles" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold">
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة الحلقات
        </Link>

        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-650" />
              إدارة طلاب حلقة: {circle.name}
            </h1>
            <p className="text-sm text-stone-500 mt-1">دعوة وإدارة أعضاء الحلقة، وعرض تاريخ انضمامهم</p>
          </div>
        </div>

        {/* Invite Code & Link Widget */}
        <Card className="mb-8 border-primary-500/10 shadow-xs bg-white dark:bg-[#1c1c1a]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <QrCode className="w-5 h-5 text-primary-600" />
              دعوة طلاب جدد للحلقة
            </CardTitle>
            <CardDescription>شارك الكود أو الرابط المباشر مع الطلاب لينضموا للحلقة تلقائياً</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4.5 items-stretch pt-2">
            {/* Invite Code display */}
            <div className="flex-1 bg-stone-50 dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-850 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-stone-400 font-bold uppercase">كود الدعوة</span>
                <span className="text-xl font-extrabold font-mono tracking-widest text-primary-700 dark:text-primary-400 mt-0.5">{circle.invite_code}</span>
              </div>
              <button
                // Standard copy logic (fallback inside client component can be implemented, but simple copy is fine)
                className="p-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 hover:bg-stone-100 rounded-lg"
                title="نسخ الكود"
              >
                <Copy className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Invite link display */}
            <div className="flex-[2] bg-stone-50 dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-850 flex items-center justify-between gap-4">
              <div className="flex flex-col overflow-hidden w-full">
                <span className="text-[10px] text-stone-400 font-bold uppercase">رابط الانضمام المباشر</span>
                <span className="text-xs font-mono text-stone-500 truncate mt-1 text-left" dir="ltr">
                  /invite/{circle.invite_code}
                </span>
              </div>
              <button
                className="p-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 hover:bg-stone-100 rounded-lg flex-shrink-0"
                title="نسخ الرابط"
              >
                <Copy className="w-4.5 h-4.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Student list */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-stone-100 dark:border-stone-900/50">
            <CardTitle className="text-base font-bold">الطلاب المنضمين ({students.length})</CardTitle>
            <CardDescription>الطلاب الذين يرسلون تقاريرهم في هذه الحلقة حالياً</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-sm flex flex-col items-center gap-3">
                <AlertCircle className="w-8 h-8 text-stone-300" />
                <p>لا يوجد أي طلاب منضمين لهذه الحلقة بعد.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-900">
                {students.map((student) => {
                  const joinedDate = new Date(student.joinedAt).toLocaleDateString("ar-EG", { year: 'numeric', month: 'short', day: 'numeric' })
                  
                  return (
                    <div 
                      key={student.id} 
                      className="flex items-center justify-between p-5 gap-4 hover:bg-stone-50/50 dark:hover:bg-stone-900/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-100 dark:bg-stone-850 rounded-full flex items-center justify-center font-bold text-sm text-stone-700 dark:text-stone-300">
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{student.full_name}</h4>
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 block">انضم في {joinedDate}</span>
                        </div>
                      </div>

                      {/* Remove Button Action */}
                      <form action={removeMember}>
                        <input type="hidden" name="membershipId" value={student.membershipId} />
                        <Button 
                          type="submit" 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/10 px-2 py-2"
                          title="إزالة الطالب"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </form>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardShell>
  )
}
