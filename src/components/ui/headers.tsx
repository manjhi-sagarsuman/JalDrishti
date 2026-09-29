import type { ReactNode } from "react"

export interface SectionHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function SectionHeader({ title, description, actions, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export interface PageHeaderProps extends SectionHeaderProps {
  eyebrow?: string
  breadcrumbs?: ReactNode
}

export function PageHeader({ title, description, actions, eyebrow, breadcrumbs, className = "" }: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {breadcrumbs && <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">{breadcrumbs}</nav>}
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
