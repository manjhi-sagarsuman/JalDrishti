import { ChevronRight, House } from "lucide-react"
import { Link } from "react-router-dom"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1.5 text-xs text-muted sm:text-sm">
        <li>
          <Link aria-label="Dashboard" className="inline-flex items-center gap-1.5 rounded text-muted hover:text-brand-800" to="/dashboard">
            <House aria-hidden="true" className="size-3.5" />
            <span>Home</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li className="flex items-center gap-1.5" key={`${item.label}-${index}`}>
            <ChevronRight aria-hidden="true" className="size-3.5 text-slate-400" />
            {item.href ? (
              <Link className="rounded hover:text-brand-800" to={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
