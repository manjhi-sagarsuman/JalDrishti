import type { ElementType } from "react"

export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ElementType
  className?: string
}

export function StatCard({ title, value, description, icon: Icon, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-line bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted truncate">{title}</span>
        {Icon && (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-800">
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-ink">{value}</span>
      </div>
      {description && <p className="mt-1 text-[11px] text-muted truncate">{description}</p>}
    </div>
  )
}

export default StatCard
