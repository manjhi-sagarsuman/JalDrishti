import { NavLink, useLocation } from "react-router-dom"
import { navigationSections } from "../routes/routeConfig"
import { useAuth } from "../hooks/useAuth"

interface SidebarProps {
  mobile?: boolean
  onNavigate?: () => void
}

function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const { profile } = useAuth()
  const { search } = useLocation()
  const currentParams = new URLSearchParams(search)
  const scopeParams = new URLSearchParams()
  for (const key of ["watershed", "from", "to"]) {
    const value = currentParams.get(key)
    if (value) scopeParams.set(key, value)
  }
  const scopeSearch = scopeParams.size ? `?${scopeParams.toString()}` : ""
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || (profile && item.roles.includes(profile.role))),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <aside className={`${mobile ? "flex h-full w-full" : "fixed inset-y-0 left-0 hidden w-64 lg:flex"} z-50 flex-col border-r border-white/10 bg-brand-900 text-white`}>
      <div className="flex h-18 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <img alt="" className="size-10 rounded-lg object-contain" src="/logos/jaldrishti-icon.png" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold tracking-tight">JalDrishti</p>
          <p className="mt-0.5 truncate text-[11px] text-blue-100/75">Watershed decision support</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {visibleSections.map((section) => (
          <section key={section.label}>
            <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/65">
              {section.label}
            </h2>
            <ul className="space-y-1">
              {section.items.map(({ path, label, icon: Icon }) => (
                <li key={path}>
                  <NavLink
                    className={({ isActive }) => `group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-white ${isActive ? "bg-brand-600 text-white shadow-sm" : "text-blue-50/90 hover:bg-white/10 hover:text-white"}`}
                    onClick={onNavigate}
                    to={`${path}${scopeSearch}`}
                  >
                    <Icon aria-hidden="true" className="size-4.5 shrink-0 opacity-90" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/[0.07] px-3 py-3">
          <p className="text-xs font-semibold text-white">SIH26015</p>
          <p className="mt-1 text-xs leading-5 text-blue-100/70">Geospatial watershed monitoring</p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
