import { useState } from "react"
import { Bell, LogOut, Menu, ShieldCheck } from "lucide-react"
import { IconButton } from "./ui"
import { useAuth } from "../hooks/useAuth"
import { GlobalGisSearch, type SearchResultItem } from "./search/GlobalGisSearch"

interface NavbarProps {
  onMenuClick: () => void
}

function Navbar({ onMenuClick }: NavbarProps) {
  const { profile, session, signOut } = useAuth()
  const [openMenu, setOpenMenu] = useState<"notifications" | "profile" | null>(null)

  function toggleMenu(menu: "notifications" | "profile") {
    setOpenMenu((current) => current === menu ? null : menu)
  }

  async function handleSignOut() {
    try {
      await signOut()
      setOpenMenu(null)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const handleSelectSearchResult = (item: SearchResultItem) => {
    window.dispatchEvent(new CustomEvent("jaldrishti:search-select", { detail: item }))
  }

  const displayName = profile?.displayName || "GIS Officer"
  const userEmail = session?.user.email || "officer@jaldrishti.gov.in"

  return (
    <header className="sticky top-0 z-40 flex min-h-[4.5rem] items-center justify-between gap-3 border-b border-line bg-white/95 px-3 backdrop-blur sm:px-5 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4 flex-1">
        <IconButton className="lg:hidden" icon={Menu} label="Open navigation" onClick={onMenuClick} />
        
        {/* National GIS Portal Branding Subtext */}
        <div className="hidden xl:flex items-center gap-2 border-r border-line pr-4 mr-2">
          <ShieldCheck className="size-5 text-brand-800" />
          <div className="leading-tight">
            <p className="text-[11px] font-bold tracking-wider uppercase text-brand-900">JalDrishti GIS Platform</p>
            <p className="text-[9px] text-muted">Ministry of Jal Shakti / State Water Resources</p>
          </div>
        </div>

        {/* Global GIS Search */}
        <div className="relative hidden w-[min(28rem,38vw)] md:block">
          <GlobalGisSearch onSelectFeature={handleSelectSearchResult} />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="relative">
          <IconButton
            icon={Bell}
            label="Open notifications"
            onClick={() => toggleMenu("notifications")}
          />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-600 ring-2 ring-white" />
          {openMenu === "notifications" && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-white p-3 shadow-xl text-xs">
              <h3 className="font-semibold text-ink border-b border-line pb-2 mb-2">GIS Operational Alerts</h3>
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                  <p className="font-semibold text-brand-900">New Field Evidence Pinned</p>
                  <p className="text-[11px] text-muted">Field engineer uploaded geo-tagged check dam photos in Ralegan Siddhi.</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-line">
                  <p className="font-semibold text-ink">Satellite Pass Completed</p>
                  <p className="text-[11px] text-muted">Sentinel-2 scene processed for Ahmednagar district.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("profile")}
            className="flex items-center gap-2 rounded-lg border border-line p-1.5 hover:bg-slate-50"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-brand-800 text-white font-semibold text-xs">
              {displayName.charAt(0)}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-ink">
              {displayName}
            </span>
          </button>
          {openMenu === "profile" && (
            <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-line bg-white p-2 shadow-xl text-xs">
              <div className="p-2 border-b border-line mb-1">
                <p className="font-semibold text-ink truncate">{displayName}</p>
                <p className="text-[11px] text-muted truncate">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-red-600 hover:bg-red-50"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
