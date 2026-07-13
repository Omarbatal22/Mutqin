import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Plus, Users, QrCode, Layers } from "lucide-react"

export const revalidate = 0 // Disable cache for real-time dashboard data

export default async function TeacherCirclesPage() {
  const supabase = await createClient()

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch teacher profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id || "")
    .single()

  // Fetch circles owned by teacher, join with member count
  const { data: circles } = await supabase
    .from("circles")
    .select(`
      id,
      name,
      description,
      invite_code,
      status,
      created_at
    `)
    .eq("owner_id", user?.id || "")
    .order("created_at", { ascending: false })

  // For each circle, let's fetch members count
  const circlesWithCount = await Promise.all(
    (circles || []).map(async (circle) => {
      const { count } = await supabase
        .from("circle_memberships")
        .select("*", { count: "exact", head: true })
        .eq("circle_id", circle.id)
        .eq("role", "student")
        .eq("status", "active")

      return {
        ...circle,
        studentCount: count || 0,
      }
    })
  )

  return (
    <DashboardShell role="teacher" userName={profile?.full_name || "الأستاذ"}>
      <div className="flex flex-col gap-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display">حلقاتي التعليمية</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">أنشئ وأدِر حلقات تحفيظ القرآن الكريم الخاصة بك</p>
          </div>
          <Link href="/teacher/circles/create">
            <Button className="flex items-center gap-2">
              <Plus className="w-4.5 h-4.5" />
              إنشاء حلقة جديدة
            </Button>
          </Link>
        </div>

        {/* Circles Grid */}
        {circlesWithCount.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-850 rounded-2xl text-center shadow-xs">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-4 border border-primary-200/50">
              <Layers className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold">لا توجد حلقات نشطة</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm">
              لم تقم بإنشاء أي حلقة تحفيظ بعد. اضغط على الزر أعلاه لإنشاء حلقتك الأولى ودعوة الطلاب.
            </p>
            <Link href="/teacher/circles/create" className="mt-5">
              <Button size="sm">إنشاء حلقة جديدة</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circlesWithCount.map((circle) => (
              <Card key={circle.id} className="hover:border-primary-500/50 hover:shadow-md transition-all flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-bold">{circle.name}</CardTitle>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-250">
                      نشطة
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1 min-h-[40px]">
                    {circle.description || "لا يوجد وصف للحلقة"}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-stone-100 dark:border-stone-900 text-sm">
                    <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                      <Users className="w-4.5 h-4.5 text-stone-400" />
                      <span>{circle.studentCount} طالب</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                      <QrCode className="w-4.5 h-4.5 text-stone-400" />
                      <span className="font-mono text-xs">{circle.invite_code}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/teacher/dashboard?circleId=${circle.id}`} className="flex-grow">
                      <Button variant="primary" size="sm" className="w-full">
                        لوحة المتابعة
                      </Button>
                    </Link>
                    <Link href={`/teacher/circles/${circle.id}/members`}>
                      <Button variant="outline" size="sm" title="إدارة الطلاب">
                        <Users className="w-4.5 h-4.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
