import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BookOpen, UserCheck, AlertCircle } from "lucide-react"

interface InvitePageProps {
  params: Promise<{ code: string }>
}

interface ProfileInfo {
  full_name: string
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params
  const supabase = await createClient()

  // Find the circle
  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .select(`
      id,
      name,
      description,
      invite_code,
      profiles:owner_id (full_name)
    `)
    .eq("invite_code", code.toUpperCase())
    .single()

  if (circleError || !circle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50/50 dark:bg-[#121212] islamic-pattern">
        <Card className="max-w-md w-full border-red-200 text-center shadow-md">
          <CardHeader>
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-650 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">دعوة غير صالحة</CardTitle>
            <CardDescription>رابط الدعوة هذا غير صحيح أو انتهت صلاحيته.</CardDescription>
          </CardHeader>
          <CardContent className="mt-2">
            <Link href="/" className="w-full">
              <Button className="w-full">الذهاب للرئيسية</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get current user session
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // If not logged in, redirect to register with inviteCode query param
    redirect(`/register?inviteCode=${code.toUpperCase()}`)
  }

  // Check if already a member
  const { data: membership } = await supabase
    .from("circle_memberships")
    .select("id, status")
    .eq("circle_id", circle.id)
    .eq("user_id", user.id)
    .single()

  const alreadyJoined = membership && membership.status === "active"

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50/50 dark:bg-[#121212] islamic-pattern">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-primary-500/20 mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-display">مُتقِن</h1>
        </div>

        <Card className="border-stone-200/60 dark:border-stone-800/80 shadow-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-primary-200/50">
              <UserCheck className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">دعوة للانضمام لحلقة</CardTitle>
            <CardDescription>تمت دعوتك للانضمام إلى حلقة التحفيظ التالية</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 mt-2">
            <div className="p-4 rounded-xl border border-stone-100 dark:border-stone-850 bg-stone-50/50 dark:bg-stone-900/20 text-center">
              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">{circle.name}</h3>
              {circle.description && (
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{circle.description}</p>
              )}
              <div className="text-xs text-stone-400 mt-3 border-t border-stone-100 dark:border-stone-900 pt-2.5">
                المعلم المسؤول: <span className="font-bold text-stone-700 dark:text-stone-300">
                  {Array.isArray(circle.profiles)
                    ? (circle.profiles[0] as unknown as ProfileInfo)?.full_name
                    : (circle.profiles as unknown as ProfileInfo)?.full_name || "غير محدد"}
                </span>
              </div>
            </div>

            {alreadyJoined ? (
              <div className="text-center flex flex-col gap-3">
                <div className="p-3 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl border border-amber-250 font-medium">
                  أنت عضو بالفعل في هذه الحلقة!
                </div>
                <Link href="/student/dashboard" className="w-full">
                  <Button className="w-full">الذهاب للوحة الطالب</Button>
                </Link>
              </div>
            ) : (
              <form action={async () => {
                "use server"
                const serverSupabase = await createClient()
                const { data: { user } } = await serverSupabase.auth.getUser()

                if (user) {
                  await serverSupabase
                    .from("circle_memberships")
                    .upsert({
                      circle_id: circle.id,
                      user_id: user.id,
                      role: "student",
                      status: "active"
                    }, { onConflict: "circle_id,user_id" })

                  redirect("/student/dashboard")
                }
              }} className="w-full">
                <Button type="submit" className="w-full">
                  تأكيد الانضمام للحلقة
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
