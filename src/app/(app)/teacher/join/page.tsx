import * as React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface JoinTeacherPageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function TeacherJoinPage({ searchParams }: JoinTeacherPageProps) {
  const { code } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let circleToJoin: { id: string; name: string; owner_id: string; isTeacherCode: boolean } | null = null
  let joinError: string | null = null

  if (code) {
    const cleanCode = code.trim().toUpperCase()

    // Search teacher_invite_code OR invite_code
    const { data: circle } = await supabase
      .from("circles")
      .select("id, name, owner_id, teacher_invite_code, invite_code")
      .or(`teacher_invite_code.eq.${cleanCode},invite_code.eq.${cleanCode}`)
      .single()

    if (circle) {
      circleToJoin = {
        id: circle.id,
        name: circle.name,
        owner_id: circle.owner_id,
        isTeacherCode: circle.teacher_invite_code === cleanCode,
      }
    } else {
      joinError = "رمز الانضمام غير صحيح أو غير موجود."
    }
  }

  async function handleJoinTeacher(formData: FormData) {
    "use me"
    "use server"
    const inputCode = (formData.get("code") as string)?.trim().toUpperCase()
    if (!inputCode) return

    const serverSupabase = await createClient()
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser()
    if (!currentUser) redirect("/login")

    // Search by teacher_invite_code OR invite_code
    const { data: targetCircle } = await serverSupabase
      .from("circles")
      .select("id, teacher_invite_code, invite_code")
      .or(`teacher_invite_code.eq.${inputCode},invite_code.eq.${inputCode}`)
      .single()

    if (!targetCircle) {
      redirect(`/teacher/join?code=${inputCode}`)
    }

    const isTeacherCode = targetCircle.teacher_invite_code === inputCode

    // Try joining as teacher first
    const { error: teacherJoinErr } = await serverSupabase
      .from("circle_memberships")
      .upsert(
        {
          circle_id: targetCircle.id,
          user_id: currentUser.id,
          role: isTeacherCode ? "teacher" : "teacher",
          status: "active",
        },
        { onConflict: "circle_id,user_id" }
      )

    if (teacherJoinErr) {
      // Fallback: upsert as student if teacher role constraint triggers
      await serverSupabase
        .from("circle_memberships")
        .upsert(
          {
            circle_id: targetCircle.id,
            user_id: currentUser.id,
            role: "student",
            status: "active",
          },
          { onConflict: "circle_id,user_id" }
        )
    }

    redirect(`/teacher/dashboard?circleId=${targetCircle.id}`)
  }

  return (
    <>
      <div className="max-w-md mx-auto w-full py-8">
        <Link
          href="/teacher/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للوحة المعلم
        </Link>

        <Card className="shadow-lg border-stone-200 dark:border-stone-850">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/20 text-primary-650 dark:text-primary-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-primary-250/30">
              <Users className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold font-display">
              الانضمام إلى حلقة
            </CardTitle>
            <CardDescription>
              أدخل رمز الانضمام الذي حصلت عليه للانضمام للحلقة كمعلم مشارك.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {joinError && (
              <div className="p-3.5 mb-4 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200/50 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            {circleToJoin ? (
              <div className="flex flex-col gap-5">
                <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-center">
                  <span className="text-[10px] text-stone-400 font-bold">الحلقة المستهدفة</span>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1">
                    {circleToJoin.name}
                  </h3>
                </div>

                <form action={handleJoinTeacher}>
                  <input type="hidden" name="code" value={code} />
                  <Button variant="primary" className="w-full" type="submit">
                    تأكيد الانضمام لحلقة {circleToJoin.name}
                  </Button>
                </form>
              </div>
            ) : (
              <form action={handleJoinTeacher} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    رمز انضمام الحلقة (Invite Code)
                  </label>
                  <Input
                    name="code"
                    placeholder="مثال: X7K82M"
                    required
                    className="font-mono text-center text-lg uppercase tracking-widest"
                  />
                </div>
                <Button variant="primary" type="submit" className="w-full mt-2">
                  متابعة الانضمام
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
