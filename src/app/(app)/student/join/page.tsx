"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ArrowRight, Search, Check, AlertCircle } from "lucide-react"

interface CircleDetails {
  id: string
  name: string
  description: string | null
  owner_id: string
  profiles: { full_name: string } | { full_name: string }[] | null
}

export default function JoinCirclePage() {
  const router = useRouter()
  const supabase = createClient()

  const [inviteCode, setInviteCode] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [circle, setCircle] = React.useState<CircleDetails | null>(null)
  const [alreadyMember, setAlreadyMember] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const handleSearchCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setCircle(null)
    setAlreadyMember(false)

    try {
      const code = inviteCode.trim().toUpperCase()
      if (!code) return

      // Fetch circle details by invite_code or teacher_invite_code
      const { data: circleData, error: circleError } = await supabase
        .from("circles")
        .select(`
          id,
          name,
          description,
          owner_id,
          profiles:owner_id (full_name)
        `)
        .or(`invite_code.eq.${code},teacher_invite_code.eq.${code}`)
        .single()

      if (circleError || !circleData) {
        setError("رمز الدعوة غير صحيح أو غير موجود")
        return
      }

      setCircle(circleData as unknown as CircleDetails)

      // Check membership
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: membership } = await supabase
          .from("circle_memberships")
          .select("id, status")
          .eq("circle_id", circleData.id)
          .eq("user_id", user.id)
          .single()

        if (membership) {
          if (membership.status === "active") {
            setAlreadyMember(true)
          }
        }
      }
    } catch {
      setError("حدث خطأ أثناء البحث، يرجى المحاولة مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinCircle = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      if (!circle) return

      // If they had joined but status was removed/inactive, we update or upsert.
      // Upsert by checking circle_id + user_id unique constraint.
      const { error: joinError } = await supabase
        .from("circle_memberships")
        .upsert({
          circle_id: circle.id,
          user_id: user.id,
          role: "student",
          status: "active"
        }, { onConflict: "circle_id,user_id" })

      if (joinError) throw joinError

      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء الانضمام للحلقة"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="max-w-md mx-auto w-full">
        {/* Back Link */}
        <Link href="/student/dashboard" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold">
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </Link>

        {success ? (
          <Card className="border-emerald-250 text-center shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200/50">
                <Check className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
                تم الانضمام بنجاح!
              </CardTitle>
              <CardDescription>
                أنت الآن عضو في حلقة &quot;{circle?.name}&quot;. يمكنك الآن البدء في إرسال تقاريرك اليومية.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-2">
              <div className="flex gap-3">
                <Link href="/student/dashboard" className="flex-grow">
                  <Button variant="secondary" className="w-full">
                    لوحة التحكم
                  </Button>
                </Link>
                <Link href="/student/report" className="flex-grow">
                  <Button variant="primary" className="w-full">
                    إرسال تقرير اليوم
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold">الانضمام إلى حلقة</CardTitle>
              <CardDescription>
                أدخل كود الحلقة المكون من 6 أحرف للانضمام إليها
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form onSubmit={handleSearchCode} className="flex gap-2">
                <Input
                  placeholder="مثال: ABC123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="font-mono text-center tracking-widest text-lg font-bold placeholder-stone-300"
                  dir="ltr"
                  maxLength={6}
                  required
                />
                <Button type="submit" disabled={loading}>
                  <Search className="w-4.5 h-4.5" />
                </Button>
              </form>

              {error && (
                <div className="p-3.5 text-xs text-red-650 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/30 flex items-center gap-2">
                  <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {circle && (
                <div className="mt-4 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 flex flex-col gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-bold">تفاصيل الحلقة</span>
                    <h3 className="text-lg font-extrabold text-stone-900 dark:text-stone-100 mt-1">{circle.name}</h3>
                    {circle.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 line-clamp-2">
                        {circle.description}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-stone-600 dark:text-stone-400 border-t border-stone-100 dark:border-stone-850 pt-3">
                    <span>المعلم المسؤول: </span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {(circle && (Array.isArray(circle.profiles)
                        ? circle.profiles[0]?.full_name
                        : circle.profiles?.full_name)) || "غير محدد"}
                    </span>
                  </div>

                  {alreadyMember ? (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl border border-amber-200/50 flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>أنت عضو بالفعل في هذه الحلقة!</span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full mt-2"
                      onClick={handleJoinCircle}
                      disabled={loading}
                    >
                      {loading ? "جاري الانضمام..." : "تأكيد الانضمام للحلقة"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
