import * as React from "react"

export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-stone-200/70 dark:bg-stone-800/60 ${className}`}
      {...props}
    />
  )
}
