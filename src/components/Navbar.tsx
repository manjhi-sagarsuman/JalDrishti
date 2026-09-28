import { Bell, Search } from "lucide-react"

function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 backdrop-blur">

      {/* SEARCH */}
      <div className="flex items-center gap-3">

        <div className="relative hidden md:block">

          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

          <input
            type="text"
            placeholder="Search watershed..."
            className="w-72 rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
          />

        </div>

      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">

        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white">

          <Bell className="h-5 w-5" />

          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500" />

        </button>

        {/* USER */}
        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            JD
          </div>

          <div className="hidden sm:block">

            <p className="text-sm font-medium text-white">
              JalDrishti
            </p>

            <p className="text-xs text-slate-500">
              Administrator
            </p>

          </div>

        </div>

      </div>

    </header>
  )
}

export default Navbar