"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  BookOpen,
  CheckSquare,
  History,
  LogOut,
  User,
  Menu,
  X,
  Plus,
  BarChart3,
} from "lucide-react"

interface DashboardNavProps {
  role: "teacher" | "student"
  userName?: string
}

const teacherNav = [
  { name: "لوحة المتابعة", href: "/teacher/dashboard", icon: CheckSquare },
  { name: "حلقاتي", href: "/teacher/circles", icon: BookOpen },
  { name: "الملف الشخصي", href: "/profile", icon: User },
]

const studentNav = [
  { name: "لوحة الطالب", href: "/student/dashboard", icon: CheckSquare },
  { name: "أرسل تقرير", href: "/student/report", icon: Plus },
  { name: "إحصائياتي", href: "/student/stats", icon: BarChart3 },
  { name: "سجل تقاريري", href: "/student/reports", icon: History },
  { name: "الملف الشخصي", href: "/profile", icon: User },
]

export function DashboardNav({ role, userName = "المستخدم" }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const navItems = role === "teacher" ? teacherNav : studentNav

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#1c1c1a] border-l border-stone-200 dark:border-stone-800 h-screen sticky top-0">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-primary-500/20">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <span className="font-bold text-lg text-stone-900 dark:text-stone-100 font-display">مُتقِن</span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400"
                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary-600 dark:text-primary-400" : "text-stone-400 dark:text-stone-500"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-900 flex flex-col gap-2">
          <div className="px-2 pb-1">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center font-bold text-xs text-stone-700 dark:text-stone-300">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-stone-950 dark:text-stone-150 truncate">{userName}</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                {role === "teacher" ? "معلم حلقة" : "طالب"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 transition-all text-right"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Header for Mobile */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white dark:bg-[#1c1c1a] border-b border-stone-200 dark:border-stone-800 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-bold text-stone-900 dark:text-stone-100">مُتقِن</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="فتح القائمة"
          aria-expanded={mobileMenuOpen}
          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-950 text-stone-600 dark:text-stone-400"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/30 dark:bg-black/50 backdrop-blur-xs transition-opacity" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 max-w-[80vw] h-full bg-white dark:bg-[#1c1c1a] border-l border-stone-200 dark:border-stone-850 p-6 flex flex-col gap-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <span className="font-bold text-stone-900 dark:text-stone-100">مُتقِن</span>
            </div>

            <nav className="flex-grow flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400"
                        : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900 hover:text-stone-900"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary-600 dark:text-primary-400" : "text-stone-400 dark:text-stone-500"}`} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-stone-100 dark:border-stone-900 pt-4 flex flex-col gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center font-bold text-xs">
                  {userName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">{userName}</p>
                  <p className="text-[10px] text-stone-400 truncate">
                    {role === "teacher" ? "معلم حلقة" : "طالب"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400"
              >
                <LogOut className="w-5 h-5 text-red-500" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Bottom Navigation (Mobile Only) */}
      {role === "student" && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#1c1c1a]/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-850 flex justify-around py-2.5 px-4 shadow-lg">
          {studentNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1.5 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-stone-500 dark:text-stone-400"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-950/30"
                    : ""
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}
