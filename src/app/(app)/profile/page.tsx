"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { User, Mail, Shield, Check, BookOpen, LogOut } from "lucide-react"
import {
  MemorizationSettingsSummary,
  type MemorizationSettings,
} from "@/components/memorization/settings-summary"

interface UserProfileData {
  id: string
  email?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState(false)
  const [user, setUser] = React.useState<UserProfileData | null>(null)
  
  const [fullName, setFullName] = React.useState("")
  const [role, setRole] = React.useState<"teacher" | "student">("student")

  const [circleSettings, setCircleSettings] = React.useState<
    { circleId: string; circleName: string; settings: MemorizationSettings }[]
  >([])

  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push("/login")
          return
        }

        setUser(authUser)

        // Fetch user profile details
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, preferred_role")
          .eq("id", authUser.id)
          .single()

        if (profile) {
          setFullName(profile.full_name || "")
          setRole(profile.preferred_role === "teacher" ? "teacher" : "student")
        }

        // Fetch the student's memorization system per circle (own rows via RLS)
        const { data: settingsRows } = await supabase
          .from("memorization_settings")
          .select(
            "circle_id, start_surah, start_page, start_ayah, hifz_amount, hifz_custom_note, revision_amount, revision_start, revision_end, revision_cursor, circles ( name )",
          )
          .eq("user_id", authUser.id)

        setCircleSettings(
          (settingsRows || []).map((row) => {
            const circle = Array.isArray(row.circles) ? row.circles[0] : row.circles
            return {
              circleId: row.circle_id as string,
              circleName: (circle as { name: string } | null)?.name ?? "حلقة",
              settings: row as unknown as MemorizationSettings,
            }
          }),
        )
      } catch {
        setError("حدث خطأ أثناء تحميل بيانات الحساب")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          preferred_role: role,
        })
        .eq("id", user?.id || "")

      if (updateError) throw updateError

      setSuccess(true)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء تحديث بيانات الملف الشخصي"
      setError(message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[50vh]">
          <span className="text-stone-500 animate-pulse">جاري تحميل بيانات الملف الشخصي...</span>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-xl mx-auto w-full">
        <h1 className="text-2xl font-bold font-display mb-6">الملف الشخصي وإعدادات الحساب</h1>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold">معلومات الحساب الأساسية</CardTitle>
            <CardDescription>عرض وتعديل معلومات حسابك ودورك المفضل</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
              {error && (
                <div className="p-3.5 text-xs text-red-655 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3.5 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl border border-emerald-250 flex items-center gap-2">
                  <Check className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>تم تحديث بيانات الملف الشخصي بنجاح.</span>
                </div>
              )}

              {/* Email (Read-only) */}
              <div className="flex flex-col gap-1.5 opacity-75">
                <label className="text-sm font-medium text-stone-500 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  البريد الإلكتروني (غير قابل للتعديل)
                </label>
                <Input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-stone-50 dark:bg-stone-900 border-stone-200 text-stone-500 font-mono text-xs select-all text-left"
                  dir="ltr"
                />
              </div>

              {/* Full Name input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  الاسم الكامل
                </label>
                <Input
                  placeholder="مثال: أحمد عبدالله"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Preferred role selection */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  الدور المفضل في المنصة
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all ${
                      role === "student"
                        ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                        : "border-stone-200 dark:border-stone-850 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-600 dark:text-stone-400"
                    }`}
                  >
                    <span className="text-sm font-semibold">طالب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("teacher")}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all ${
                      role === "teacher"
                        ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                        : "border-stone-200 dark:border-stone-850 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-600 dark:text-stone-400"
                    }`}
                  >
                    <span className="text-sm font-semibold">معلم</span>
                  </button>
                </div>
                <p className="text-[10px] text-stone-450 mt-1 leading-normal">
                  ملاحظة: هذا الخيار يحدد لوحة التحكم الافتراضية التي يتم توجيهك إليها عند تسجيل الدخول.
                </p>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={updating}>
                {updating ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Memorization system per circle (student's own hifz + revision) */}
        {circleSettings.length > 0 && (
          <div className="mt-8 flex flex-col gap-6">
            <h2 className="text-lg font-bold font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-650" />
              نظام الحفظ والمراجعة
            </h2>
            {circleSettings.map(({ circleId, circleName, settings }) => (
              <div key={circleId} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-stone-700 dark:text-stone-300">
                    حلقة {circleName}
                  </span>
                  <Link
                    href={`/student/setup?circleId=${circleId}`}
                    className="text-xs font-semibold text-primary-650 dark:text-primary-400 hover:underline"
                  >
                    تعديل النظام
                  </Link>
                </div>
                <MemorizationSettingsSummary settings={settings} />
              </div>
            ))}
          </div>
        )}

        {/* Logout button at bottom of Profile page */}
        <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-850">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-red-200 dark:border-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold py-3"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 text-red-500" />
            تسجيل الخروج من الحساب
          </Button>
        </div>
      </div>
    </>
  )
}
