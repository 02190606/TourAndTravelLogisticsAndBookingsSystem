import { motion } from 'framer-motion'
import type { ReactNode, MouseEventHandler } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: ReactNode
  children?: ReactNode
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: MouseEventHandler<HTMLButtonElement>
}

const variants = {
  primary: 'bg-primary text-white hover:bg-teal-700 shadow-sm shadow-primary/20 font-semibold',
  secondary: 'bg-secondary text-white hover:bg-blue-950 shadow-sm shadow-secondary/20 font-semibold',
  danger: 'bg-danger text-white hover:bg-red-600 shadow-sm shadow-danger/20 font-semibold',
  outline: 'border border-slate-300 bg-white text-text-primary hover:border-primary hover:text-primary shadow-sm',
  ghost: 'text-text-secondary hover:bg-slate-100 hover:text-text-primary',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  onClick,
}: ButtonProps) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onClick}
      type={type}
      className={`
        inline-flex min-h-9 items-center justify-center gap-2 rounded-md
        transition-all duration-200 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? icon : null}
      {children}
    </motion.button>
  )
}
