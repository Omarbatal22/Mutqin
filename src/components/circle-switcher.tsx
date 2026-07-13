"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

interface Circle {
  id: string
  name: string
}

interface CircleSwitcherProps {
  circles: Circle[]
  activeCircleId: string
}

export function CircleSwitcher({ circles, activeCircleId }: CircleSwitcherProps) {
  const router = useRouter()

  return (
    <select
      value={activeCircleId}
      onChange={(e) => {
        router.push(`/teacher/dashboard?circleId=${e.target.value}`)
      }}
      className="px-4 py-2 rounded-xl border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {circles.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
