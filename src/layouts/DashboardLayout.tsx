import { useState, type ReactNode } from "react"
import Sidebar from "../components/Sidebar"
import Navbar from "../components/Navbar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardLayout({ children }: DashboardLayoutProps) {

  const [activePage, setActivePage] = useState("dashboard")

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* SIDEBAR */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {/* MAIN AREA */}
      <div className="ml-64 min-h-screen">

        <Navbar />

        <main className="p-6">

          {children}

        </main>

      </div>

    </div>
  )
}

export default DashboardLayout