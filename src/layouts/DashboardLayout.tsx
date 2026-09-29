import { useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import { Drawer } from "../components/ui"
import { getAppPage } from "../routes/routeConfig"

function DashboardLayout() {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const { pathname } = useLocation()
  const currentPage = getAppPage(pathname)

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Sidebar />
      <div className="min-h-screen lg:pl-64">
        <Navbar onMenuClick={() => setMobileNavigationOpen(true)} />
        <main className="page-container py-5 sm:py-7">
          <Outlet />
        </main>
      </div>
      <Drawer
        className="max-w-[19rem]"
        onClose={() => setMobileNavigationOpen(false)}
        open={mobileNavigationOpen}
        side="left"
        title="Navigation"
      >
        <Sidebar mobile onNavigate={() => setMobileNavigationOpen(false)} />
      </Drawer>
      <span className="sr-only" aria-live="polite">{currentPage ? `${currentPage.label} page` : "Application page"}</span>
    </div>
  )
}

export default DashboardLayout
