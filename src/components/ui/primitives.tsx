import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger"
type ButtonSize = "sm" | "md" | "lg"

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-800 text-white hover:bg-brand-900 focus-visible:outline-white",
  secondary: "border border-line bg-white text-ink hover:bg-canvas",
  quiet: "text-brand-800 hover:bg-blue-50",
  danger: "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-300",
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: LucideIcon
  trailingIcon?: LucideIcon
}

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      type={type}
      {...props}
    >
      {LeadingIcon && <LeadingIcon aria-hidden="true" className="size-4 shrink-0" />}
      {children}
      {TrailingIcon && <TrailingIcon aria-hidden="true" className="size-4 shrink-0" />}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
}

export function IconButton({
  icon: Icon,
  label,
  variant = "quiet",
  size = "md",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  const dimensions: Record<ButtonSize, string> = {
    sm: "size-9",
    md: "size-10",
    lg: "size-12",
  }

  return (
    <button
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 ${buttonVariants[variant]} ${dimensions[size]} ${className}`}
      type={type}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  )
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "section" | "div"
  interactive?: boolean
}

export function Card({
  as: Element = "section",
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <Element
      className={`rounded-card border border-line bg-white p-4 shadow-card sm:p-5 ${interactive ? "transition-shadow hover:shadow-lg" : ""} ${className}`}
      {...props}
    />
  )
}

export interface KpiCardProps {
  label: string
  value: ReactNode
  detail?: ReactNode
  icon?: LucideIcon
  tone?: "blue" | "green" | "amber" | "red" | "neutral"
  className?: string
}

const kpiTones = {
  blue: "bg-blue-50 text-brand-800",
  green: "bg-green-50 text-environment-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-800",
  neutral: "bg-slate-100 text-slate-700",
} satisfies Record<NonNullable<KpiCardProps["tone"]>, string>

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
  className = "",
}: KpiCardProps) {
  return (
    <Card className={`flex min-w-0 items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="mt-2 break-words text-2xl font-bold tracking-tight text-ink">{value}</p>
        {detail && <div className="mt-2 text-sm text-muted">{detail}</div>}
      </div>
      {Icon && (
        <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${kpiTones[tone]}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      )}
    </Card>
  )
}

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger"

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-blue-50 text-blue-800",
  success: "bg-green-50 text-green-800",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-800",
}

const badgeDots: Record<BadgeVariant, string> = {
  neutral: "bg-slate-500",
  info: "bg-blue-600",
  success: "bg-green-700",
  warning: "bg-amber-700",
  danger: "bg-red-700",
}

export function Badge({ variant = "neutral", dot = false, className = "", children, ...props }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-4 ${badgeVariants[variant]} ${className}`} {...props}>
      {dot && <span aria-hidden="true" className={`size-1.5 rounded-full ${badgeDots[variant]}`} />}
      {children}
    </span>
  )
}

export type StatusValue = "active" | "pending" | "completed" | "verified" | "rejected" | "inactive" | "critical"

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: StatusValue
  labels?: Partial<Record<StatusValue, string>>
}

const statusStyles: Record<StatusValue, BadgeVariant> = {
  active: "success",
  pending: "warning",
  completed: "success",
  verified: "success",
  rejected: "danger",
  inactive: "neutral",
  critical: "danger",
}

export function StatusBadge({ status, labels, ...props }: StatusBadgeProps) {
  const label = labels?.[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
  return <Badge variant={statusStyles[status]} dot {...props}>{label}</Badge>
}
