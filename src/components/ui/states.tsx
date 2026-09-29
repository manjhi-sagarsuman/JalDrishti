import { AlertCircle, Inbox } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "./primitives"

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center ${className}`}>
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-full bg-slate-100 text-muted">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export interface LoadingStateProps {
  label?: string
  rows?: number
  className?: string
}

export function LoadingState({ label = "Loading", rows = 3, className = "" }: LoadingStateProps) {
  return (
    <div aria-busy="true" aria-label={label} className={`space-y-3 ${className}`} role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <div aria-hidden="true" className="flex animate-pulse items-center gap-3" key={index}>
          <span className="size-9 shrink-0 rounded-full bg-slate-200" />
          <span className="h-3 flex-1 rounded bg-slate-200" />
          <span className="hidden h-3 w-1/4 rounded bg-slate-100 sm:block" />
        </div>
      ))}
    </div>
  )
}

export interface ErrorStateProps {
  title?: string
  description: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = "Unable to load this information",
  description,
  onRetry,
  retryLabel = "Try again",
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-700" />
        <div>
          <h3 className="text-sm font-semibold text-red-900">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-red-800">{description}</p>
        </div>
      </div>
      {onRetry && <Button onClick={onRetry} size="sm" variant="secondary">{retryLabel}</Button>}
    </div>
  )
}
