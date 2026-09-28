import {
  BarChart3,
  Camera,
  FileText,
  Home,
  Images,
  Layers3,
  Map,
  MapPinned,
  MonitorCheck,
  Upload,
  Settings,
  BookOpen,
} from "lucide-react"

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
}

function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const publicItems = [
    {
      id: "dashboard",
      label: "Home",
      icon: Home,
    },
    {
      id: "map",
      label: "Explore Map",
      icon: Map,
    },
    {
      id: "watersheds",
      label: "Watersheds",
      icon: MapPinned,
    },
    {
      id: "images",
      label: "Field Images",
      icon: Images,
    },
    {
      id: "layers",
      label: "Data Layers",
      icon: Layers3,
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
    },
    {
      id: "documentation",
      label: "Documentation",
      icon: BookOpen,
    },
  ]

  const governmentItems = [
    {
      id: "government-dashboard",
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      id: "planning",
      label: "Project Planning",
      icon: MapPinned,
    },
    {
      id: "analysis",
      label: "Analysis Tools",
      icon: BarChart3,
    },
    {
      id: "upload",
      label: "Data Upload",
      icon: Upload,
    },
    {
      id: "monitoring",
      label: "Monitoring",
      icon: MonitorCheck,
    },
    {
      id: "export",
      label: "Export Reports",
      icon: FileText,
    },
  ]

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-[#082F57] text-white shadow-xl">

      {<img
          src="/logos/jaldrishti-icon.png"
          alt="JalDrishti"
          className="h-11 w-11 rounded-xl object-contain"
        />}

      <div className="border-b border-white/10 px-5 py-5">

        <div className="flex items-center gap-3">

          <img
            src="/logos/jaldrishti-icon.png"
            alt="JalDrishti"
            className="h-11 w-11 rounded-xl object-contain"
          />

          <div>
            <h1 className="text-lg font-bold tracking-tight">
              JalDrishti
            </h1>

            <p className="text-[11px] text-blue-200">
              GeoAI Watershed Intelligence
            </p>
          </div>

        </div>

      </div>

      {/* ================================
          PUBLIC NAVIGATION
          ================================ */}

      <div className="flex-1 overflow-y-auto px-3 py-5">

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">
          Explore
        </p>

        <nav className="space-y-1">

          {publicItems.map((item) => {

            const Icon = item.icon

            const active =
              activePage === item.id

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-[#168BE5] text-white shadow-lg shadow-blue-950/20"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >

                <Icon
                  className={`h-[18px] w-[18px] ${
                    active
                      ? "text-white"
                      : "text-blue-200 group-hover:text-white"
                  }`}
                />

                <span>{item.label}</span>

              </button>
            )
          })}

        </nav>

        {/* ================================
            GOVERNMENT SECTION
            ================================ */}

        <div className="mt-8">

          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">
            For Government Officials
          </p>

          <nav className="space-y-1">

            {governmentItems.map((item) => {

              const Icon = item.icon

              const active =
                activePage === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#168BE5] text-white shadow-lg"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >

                  <Icon className="h-[18px] w-[18px]" />

                  <span>{item.label}</span>

                </button>
              )
            })}

          </nav>

        </div>

      </div>

      {/* ================================
          SIDEBAR FOOTER
          ================================ */}

      <div className="border-t border-white/10 p-3">

        <div className="rounded-xl bg-white/10 p-3">

          <div className="flex items-center gap-2">

            <Settings className="h-4 w-4 text-blue-200" />

            <span className="text-xs font-medium">
              JalDrishti Platform
            </span>

          </div>

          <p className="mt-1 text-[10px] leading-4 text-blue-200">
            GeoAI • Water • Land • Rural Development
          </p>

        </div>

      </div>

    </aside>
  )
}

export default Sidebar