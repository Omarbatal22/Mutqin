"use client"

import * as React from "react"
import { Sun, Moon, Monitor } from "lucide-react"

type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "mutqin-theme"

/** Apply the resolved theme by toggling the `dark` class on <html>. */
function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", isDark)
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "فاتح", icon: Sun },
  { value: "dark", label: "داكن", icon: Moon },
  { value: "system", label: "النظام", icon: Monitor },
]

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("system")

  // Read the stored preference once mounted (matches the pre-paint script).
  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system"
    setTheme(stored)
  }, [])

  // Keep "system" in sync with OS changes while that option is active.
  React.useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyTheme("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  const choose = (next: Theme) => {
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  return (
    <div className="flex gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/50 dark:border-stone-850">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={active}
            title={label}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              active
                ? "bg-white dark:bg-stone-800 text-primary-650 dark:text-primary-400 shadow-xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
