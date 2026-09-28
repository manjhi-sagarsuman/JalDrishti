function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-400">
          SIH 26015
        </p>

        <h1 className="mt-1 text-3xl font-bold text-white">
          Watershed Dashboard
        </h1>

        <p className="mt-2 text-slate-400">
          Visualize and analyze geo-coded watershed data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Watersheds</p>
          <p className="mt-2 text-3xl font-bold text-white">--</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Geo-coded Images</p>
          <p className="mt-2 text-3xl font-bold text-white">--</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Vegetation Index</p>
          <p className="mt-2 text-3xl font-bold text-white">--</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Water Coverage</p>
          <p className="mt-2 text-3xl font-bold text-white">--</p>
        </div>
      </div>

      <div className="min-h-[400px] rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">
          Watershed Map
        </h2>

        <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-lg bg-slate-950 text-slate-500">
          MapLibre map will appear here
        </div>
      </div>
    </div>
  )
}

export default Dashboard