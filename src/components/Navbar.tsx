import { useState } from "react"
import { Bell, LogOut, Menu, Search, UserRound, X } from "lucide-react"
import { Link } from "react-router-dom"
import { IconButton } from "./ui"
import { useAuth } from "../hooks/useAuth"

interface NavbarProps {
  onMenuClick: () => void
}

function Navbar({ onMenuClick }: NavbarProps) {
  const { profile, signOut } = useAuth()
  const [openMenu, setOpenMenu] = useState<"notifications" | "profile" | null>(null)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  function toggleMenu(menu: "notifications" | "profile") {
    setOpenMenu((current) => current === menu ? null : menu)
  }

  async function handleSignOut() {
    setSignOutError(null)
    try {
      await signOut()
      setOpenMenu(null)
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Sign out could not be completed.")
    }
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-[4.5rem] items-center justify-between gap-3 border-b border-line bg-white/95 px-3 backdrop-blur sm:px-5 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <IconButton className="lg:hidden" icon={Menu} label="Open navigation" onClick={onMenuClick} />
        <div className="relative hidden w-[min(28rem,38vw)] md:block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search the workspace"
            className="min-h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15"
            placeholder="Search watersheds, evidence, reports..."
            type="search"
          />
        </div>
        <div className="relative md:hidden">
          <IconButton
            icon={mobileSearchOpen ? X : Search}
            label={mobileSearchOpen ? "Close search" : "Open search"}
            onClick={() => setMobileSearchOpen((open) => !open)}
          />
          {mobileSearchOpen && (
            <div className="absolute left-0 top-12 z-50 w-[min(19rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-white p-2 shadow-xl">
              <input
                autoFocus
                aria-label="Search the workspace"
                className="min-h-10 w-full rounded-lg border border-line px-3 text-sm text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                placeholder="Search the workspace..."
                type="search"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="relative">
          <IconButton
            aria-expanded={openMenu === "notifications"}
            aria-haspopup="dialog"
            icon={Bell}
            label="Notifications"
            onClick={() => toggleMenu("notifications")}
          />
          {openMenu === "notifications" && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-line bg-white p-4 shadow-xl sm:w-80" role="dialog" aria-label="Notifications">
              <h2 className="text-sm font-semibold text-ink">Notifications</h2>
              <p className="mt-2 text-sm leading-5 text-muted">Notifications will appear here when available.</p>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            aria-expanded={openMenu === "profile"}
            aria-haspopup="menu"
            className="flex min-h-10 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-canvas focus-visible:outline-brand-600 sm:gap-3 sm:px-3"
            onClick={() => toggleMenu("profile")}
            type="button"
          >
            <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-blue-50 text-brand-800">
              <UserRound className="size-4" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-36 truncate text-xs font-semibold text-ink">{profile?.displayName ?? "Workspace user"}</span>
              <span className="block text-[11px] text-muted">{profile?.role.replaceAll("_", " ") ?? "Account"}</span>
            </span>
          </button>
          {openMenu === "profile" && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-line bg-white p-2 shadow-xl" role="menu" aria-label="User profile">
              <div className="border-b border-line px-3 py-2">
                <p className="text-sm font-semibold text-ink">Workspace profile</p>
                <p className="mt-0.5 text-xs leading-5 text-muted">Signed in with a provisioned account.</p>
              </div>
              <Link
                className="mt-1 block rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas focus-visible:outline-brand-600"
                onClick={() => setOpenMenu(null)}
                role="menuitem"
                to="/system/settings"
              >
                Workspace settings
              </Link>
              <button
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-red-600"
                onClick={() => void handleSignOut()}
                role="menuitem"
                type="button"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Sign out
              </button>
              {signOutError && <p className="px-3 py-2 text-xs text-red-700" role="alert">{signOutError}</p>}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
