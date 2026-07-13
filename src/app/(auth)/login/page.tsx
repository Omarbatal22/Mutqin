"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BookOpen } from "lucide-react"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const redirectTo = searchParams.get("redirectTo") || "/dashboard"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log("Attempting login for email:", email)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error("Login failed with signInError:", signInError)
        console.error("signInError message:", signInError.message)
        const errorMsg = typeof signInError.message === 'string' 
          ? (signInError.message === "Invalid login credentials" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : signInError.message)
          : JSON.stringify(signInError)
        setError(errorMsg)
      } else {
        console.log("Login successful, redirecting to:", redirectTo)
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err) {
      console.error("Login catch block error:", err)
      setError("حدث خطأ ما، يرجى المحاولة مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50/50 dark:bg-[#121212] islamic-pattern">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-primary-500/20 mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-display">مُتقِن</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">منصة إدارة التقارير اليومية لحلقات التحفيظ</p>
        </div>

        <Card className="border-stone-200/60 dark:border-stone-800/80 shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">مرحباً بك مجدداً</CardTitle>
            <CardDescription>قم بتسجيل الدخول لمتابعة التقارير اليومية</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
              {error && (
                <div className="p-3.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/30">
                  {error}
                </div>
              )}

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

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    كلمة المرور
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>

            <div className="text-center mt-6 text-sm text-stone-500 dark:text-stone-400">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                إنشاء حساب جديد
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-stone-500 animate-pulse">جاري التحميل...</span>
      </div>
    }>
      <LoginPageContent />
    </React.Suspense>
  )
}
