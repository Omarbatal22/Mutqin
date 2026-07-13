"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BookOpen } from "lucide-react"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError("حدث خطأ ما، يرجى المحاولة مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

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
            <CardTitle className="text-xl font-bold">استعادة كلمة المرور</CardTitle>
            <CardDescription>أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور</CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="text-center py-4 flex flex-col gap-4">
                <div className="p-3.5 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30">
                  تم إرسال رابط إعادة التعيين بنجاح. تفقد بريدك الإلكتروني.
                </div>
                <Link href="/login">
                  <Button variant="secondary" className="w-full">
                    العودة لتسجيل الدخول
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReset} className="flex flex-col gap-4 mt-2">
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

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "جاري الإرسال..." : "إرسال رابط استعادة المرور"}
                </Button>

                <div className="text-center mt-2">
                  <Link href="/login" className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 font-medium">
                    العودة لصفحة تسجيل الدخول
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
