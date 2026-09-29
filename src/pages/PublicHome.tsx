import {
  BarChart3,
  ChevronRight,
  Droplets,
  Image,
  Map,
  Satellite,
  Trees,
} from "lucide-react"
import { Link } from "react-router-dom"

function PublicHome() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* Header */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* CHANGE LOGO HERE */}

          <img
            src="/logos/jaldrishti-full-logo.png"
            alt="JalDrishti"
            className="w-44 sm:w-52"
          />

          <nav className="hidden items-center gap-6 md:flex">

            <a href="#features" className="text-sm text-slate-600 hover:text-blue-600">
              Features
            </a>

            <a href="#data" className="text-sm text-slate-600 hover:text-blue-600">
              Data
            </a>

            <a href="#about" className="text-sm text-slate-600 hover:text-blue-600">
              About
            </a>

            <Link
              to="/login"
              className="rounded-lg bg-[#062b4c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Sign In
            </Link>

          </nav>

          <Link
            to="/login"
            className="rounded-lg bg-[#062b4c] px-4 py-2 text-sm font-semibold text-white md:hidden"
          >
            Sign In
          </Link>

        </div>

      </header>


      {/* Hero */}

      <section className="relative overflow-hidden">

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">

          <div>

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
              <Satellite className="h-4 w-4" />
              GeoAI Watershed Intelligence
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-[#062b4c] sm:text-5xl lg:text-6xl">

              Understand
              <span className="text-blue-600"> Watersheds.</span>

              <br />

              Make Better Decisions.

            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Explore watershed boundaries, water bodies, land use,
              vegetation and geo-coded field evidence through
              one geospatial intelligence platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#062b4c] px-6 py-3.5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Explore JalDrishti
                <ChevronRight className="h-4 w-4" />
              </Link>

              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Explore Features
              </a>

            </div>

          </div>


          {/* Hero image */}

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">

            {/* CHANGE HERO IMAGE HERE */}

            <img
              src="/images/jaldrishti-login-hero.jpg"
              alt="Watershed satellite visualization"
              className="h-80 w-full rounded-2xl object-cover sm:h-100"
            />

          </div>

        </div>

      </section>


      {/* Features */}

      <section
        id="features"
        className="border-y border-slate-200 bg-white py-16"
      >

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="max-w-2xl">

            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Explore
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#062b4c]">
              Watershed intelligence in one place
            </h2>

            <p className="mt-3 text-slate-500">
              Public-facing information is simple and accessible,
              while advanced analysis remains available to authorized users.
            </p>

          </div>


          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <Feature
              icon={Map}
              title="Explore Maps"
              description="View watershed boundaries, drainage and water bodies."
            />

            <Feature
              icon={Image}
              title="Field Evidence"
              description="Explore geo-coded field images and observations."
            />

            <Feature
              icon={Trees}
              title="Vegetation"
              description="Understand vegetation and land-use patterns."
            />

            <Feature
              icon={BarChart3}
              title="Indicators"
              description="View key watershed indicators and trends."
            />

          </div>

        </div>

      </section>


      {/* Data */}

      <section
        id="data"
        className="bg-slate-50 py-16"
      >

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="grid gap-6 md:grid-cols-3">

            <InfoCard
              icon={Droplets}
              title="Water"
              text="Water bodies and watershed water-related information."
            />

            <InfoCard
              icon={Trees}
              title="Land & Vegetation"
              text="Land-use and vegetation information from geospatial datasets."
            />

            <InfoCard
              icon={Satellite}
              title="Satellite Data"
              text="Geospatial imagery and derived environmental indicators."
            />

          </div>

        </div>

      </section>


      {/* About */}

      <section
        id="about"
        className="bg-[#062b4c] py-16 text-white"
      >

        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">

          <h2 className="text-3xl font-bold">
            JalDrishti
          </h2>

          <p className="mt-4 leading-7 text-blue-100">
            A GeoAI-enabled watershed intelligence platform designed
            to bring spatial data, field evidence and analytical
            insights together for better watershed understanding.
          </p>

          <Link
            to="/login"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#062b4c] hover:bg-blue-50"
          >
            Access Platform
            <ChevronRight className="h-4 w-4" />
          </Link>

        </div>

      </section>


      {/* Footer */}

      <footer className="border-t border-slate-200 bg-white py-6">

        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-center text-xs text-slate-400 sm:px-6 md:flex-row md:justify-between lg:px-8">

          <span>
            © 2026 JalDrishti • GeoAI Watershed Intelligence
          </span>

          <span>
            Watersheds • Water • Land • Data • Intelligence
          </span>

        </div>

      </footer>

    </main>
  )
}


function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Map
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-5 font-semibold text-[#062b4c]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

    </div>
  )
}


function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Map
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">

      <Icon className="h-7 w-7 text-green-600" />

      <h3 className="mt-5 text-lg font-bold text-[#062b4c]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {text}
      </p>

    </div>
  )
}

export default PublicHome
