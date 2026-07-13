import * as React from "react"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`bg-white dark:bg-[#1c1c1a] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs transition-all ${className}`}
      {...props}
    />
  )
)
Card.displayName = "Card"

export const CardHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-5 pb-3 flex flex-col gap-1.5 ${className}`} {...props} />
)
CardHeader.displayName = "CardHeader"

export const CardTitle = ({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100 ${className}`} {...props} />
)
CardTitle.displayName = "CardTitle"

export const CardDescription = ({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-stone-500 dark:text-stone-400 ${className}`} {...props} />
)
CardDescription.displayName = "CardDescription"

export const CardContent = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-5 pt-0 ${className}`} {...props} />
)
CardContent.displayName = "CardContent"

export const CardFooter = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-5 pt-0 border-t border-stone-100 dark:border-stone-900 mt-4 flex items-center justify-between ${className}`} {...props} />
)
CardFooter.displayName = "CardFooter"
