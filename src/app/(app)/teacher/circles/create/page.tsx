"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ArrowRight, Copy, Check, QrCode } from "lucide-react"

// Function to generate a random 6-character invite code
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function CreateCirclePage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Success states
  const [createdCircle, setCreatedCircle] = React.useState<{ name: string; code: string } | null>(null)
  const [copiedCode, setCopiedCode] = React.useState(false)
  const [copiedLink, setCopiedLink] = React.useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const code = generateInviteCode()

      // Insert new circle
      const { data: circle, error: insertError } = await supabase
        .from("circles")
        .insert({
          name,
          description,
          owner_id: user.id,
          invite_code: code,
          status: "active",
          current_week: 1,
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === "23505") { // unique constraint violation
          // Retry once with a new code
          const newCode = generateInviteCode()
          const { data: retryCircle, error: retryError } = await supabase
            .from("circles")
            .insert({
              name,
              description,
              owner_id: user.id,
              invite_code: newCode,
            })
            .select()
            .single()

          if (retryError) throw retryError
          
          // Auto add owner as a member
          await supabase.from("circle_memberships").insert({
            circle_id: retryCircle.id,
            user_id: user.id,
            role: "teacher",
            status: "active"
          })

          setCreatedCircle({ name: retryCircle.name, code: newCode })
        } else {
          throw insertError
        }
      } else {
        // Auto add owner as a member
        await supabase.from("circle_memberships").insert({
          circle_id: circle.id,
          user_id: user.id,
          role: "teacher",
          status: "active"
        })

        setCreatedCircle({ name: circle.name, code })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء إنشاء الحلقة، يرجى المحاولة مرة أخرى"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text)
    if (isLink) {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } else {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  return (
    <>
      <div className="max-w-2xl mx-auto w-full">
        {/* Back Link */}
        <Link href="/teacher/circles" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 font-semibold">
          <ArrowRight className="w-4 h-4" />
          العودة للحلقات
        </Link>

        {createdCircle ? (
          <Card className="border-emerald-250 bg-white dark:bg-[#1c1c1a] shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200/50">
                <QrCode className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
                تم إنشاء حلقة &quot;{createdCircle.name}&quot; بنجاح!
              </CardTitle>
              <CardDescription>
                شارك الكود أو رابط الدعوة مع طلابك لينضموا إلى الحلقة ويبدأوا في إرسال تقاريرهم.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 mt-4">
              {/* Invite Code Card */}
              <div className="bg-stone-50 dark:bg-stone-900/50 p-4.5 rounded-2xl border border-stone-200 dark:border-stone-850 flex flex-col items-center gap-2">
                <span className="text-xs text-stone-500 font-semibold">كود دعوة الحلقة</span>
                <span className="text-3xl font-extrabold font-mono tracking-widest text-primary-700 dark:text-primary-400">
                  {createdCircle.code}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdCircle.code, false)}
                  className="mt-2"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 mr-1.5" />
                      تم نسخ الكود
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1.5" />
                      نسخ الكود
                    </>
                  )}
                </Button>
              </div>

              {/* Invite Link Option */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-stone-500 font-semibold">رابط الدعوة المباشر</span>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/invite/${createdCircle.code}`}
                    className="bg-stone-50 dark:bg-stone-900 text-stone-500 font-mono text-xs select-all text-left"
                    dir="ltr"
                  />
                  <Button
                    variant="primary"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/invite/${createdCircle.code}`,
                        true
                      )
                    }
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Link href="/teacher/circles" className="flex-grow">
                  <Button variant="secondary" className="w-full">
                    الذهاب للحلقات
                  </Button>
                </Link>
                <Link href="/teacher/dashboard" className="flex-grow">
                  <Button variant="primary" className="w-full">
                    لوحة المتابعة
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold">إنشاء حلقة جديدة</CardTitle>
              <CardDescription>
                قم بملء البيانات لإنشاء حلقة تحفيظ قرآن جديدة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                {error && (
                  <div className="p-3.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/30">
                    {error}
                  </div>
                )}

                <Input
                  label="اسم الحلقة"
                  placeholder="مثال: حلقة الفجر، حلقة جزء عم"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <Textarea
                  label="الوصف (اختياري)"
                  placeholder="اكتب وصفاً مختصراً للحلقة، مثل مواعيدها، خطتها، أو شروط الانضمام..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />

                <Button type="submit" className="w-full mt-4" disabled={loading}>
                  {loading ? "جاري إنشاء الحلقة..." : "تأكيد وإنشاء الحلقة"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
