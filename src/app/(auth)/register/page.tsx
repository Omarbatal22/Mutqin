"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BookOpen, User, GraduationCap } from "lucide-react"

function RegisterPageContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const inviteCode = searchParams.get("inviteCode")

  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [role, setRole] = React.useState<"teacher" | "student">("student")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const emailRedirectTo = inviteCode 
        ? `${window.location.origin}/auth/callback?next=/invite/${inviteCode}`
        : `${window.location.origin}/auth/callback`

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            preferred_role: role,
          },
          emailRedirectTo,
        },
      })


      if (signUpError) {
        setError(signUpError.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError("حدث خطأ ما، يرجى المحاولة مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50/50 dark:bg-[#121212] islamic-pattern">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-200/50">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">تم إنشاء الحساب بنجاح!</h2>
          <p className="text-stone-600 dark:text-stone-400 mt-2">
            تم إرسال بريد إلكتروني لتفعيل حسابك. يرجى مراجعة بريدك الإلكتروني والضغط على رابط التفعيل لتتمكن من تسجيل الدخول.
          </p>
          <Link href="/login" className="mt-6 block w-full">
            <Button className="w-full">
              الانتقال لصفحة تسجيل الدخول
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50/50 dark:bg-[#121212] islamic-pattern">
      <div className="w-full max-w-md my-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-primary-500/20 mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-display">مُتقِن</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">منصة إدارة التقارير اليومية لحلقات التحفيظ</p>
        </div>

        <Card className="border-stone-200/60 dark:border-stone-800/80 shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">إنشاء حساب جديد</CardTitle>
            <CardDescription>ابدأ تنظيم ومتابعة الحلقات اليوم في خطوات بسيطة</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="flex flex-col gap-4 mt-2">
              {error && (
                <div className="p-3.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/30">
                  {error}
                </div>
              )}

              <Input
                label="الاسم الكامل"
                type="text"
                placeholder="عبدالله أحمد"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="البريد الإلكتروني"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="text-right"
              />

              <Input
                label="كلمة المرور"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                className="text-right"
              />

              {/* Role Selection Option */}
              {!inviteCode && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    سأستخدم المنصة كـ:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("student")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        role === "student"
                          ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                          : "border-stone-200 dark:border-stone-850 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-600 dark:text-stone-400"
                      }`}
                    >
                      <User className="w-5 h-5 mb-1.5" />
                      <span className="text-sm font-semibold">طالب</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("teacher")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        role === "teacher"
                          ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/10 text-primary-700 dark:text-primary-400"
                          : "border-stone-200 dark:border-stone-850 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-600 dark:text-stone-400"
                      }`}
                    >
                      <GraduationCap className="w-5 h-5 mb-1.5" />
                      <span className="text-sm font-semibold">معلم حلقة</span>
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
              </Button>
            </form>

            <div className="text-center mt-6 text-sm text-stone-500 dark:text-stone-400">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                تسجيل الدخول
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-stone-500 animate-pulse">جاري التحميل...</span>
      </div>
    }>
      <RegisterPageContent />
    </React.Suspense>
  )
}
