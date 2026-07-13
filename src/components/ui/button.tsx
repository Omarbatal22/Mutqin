import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger" | "outline"
  size?: "sm" | "md" | "lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-xl"
    
    const variants = {
      primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-sm focus:ring-primary-500 active:scale-[0.98]",
      secondary: "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 focus:ring-stone-400 active:scale-[0.98]",
      accent: "bg-accent-600 hover:bg-accent-700 text-white shadow-sm focus:ring-accent-500 active:scale-[0.98]",
      ghost: "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300",
      danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 active:scale-[0.98]",
      outline: "border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-300 focus:ring-primary-500 active:scale-[0.98]"
    }

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2.5 text-sm",
      lg: "px-6 py-3.5 text-base"
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
