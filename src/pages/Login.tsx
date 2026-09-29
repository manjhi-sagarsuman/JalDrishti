import { useState, type FormEvent } from "react"
import { Activity, Eye, EyeOff, LockKeyhole, MapPinned, ShieldCheck } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { Button, ErrorState, Input, LoadingState } from "../components/ui"
import { useAuth } from "../hooks/useAuth"
import { useUserSettings } from "../lib/userSettings"

function Login() {
  const { session, profile, loading, profileStatus, configurationError, signIn } = useAuth()
  const preferences = useUserSettings(session?.user.id ?? "anonymous")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as { from?: unknown } | null
  const requestedPath = typeof locationState?.from === "string" ? locationState.from : preferences.application.landingPage
  const returnPath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : preferences.application.landingPage

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-canvas p-6"><LoadingState className="w-full max-w-md" label="Restoring your session" rows={4} /></main>
  }

  if (session && profile) return <Navigate replace to={returnPath} />
  if (session && profileStatus === "ready") {
    return <Navigate replace state={{ message: "Your account does not have an active JalDrishti role profile." }} to="/unauthorized" />
  }
  if (session && profileStatus === "error") {
    return <Navigate replace state={{ message: "We could not verify your application role. Contact an administrator." }} to="/unauthorized" />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(returnPath, { replace: true })
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Sign in could not be completed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-900 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16" aria-label="JalDrishti platform introduction">
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-24 size-[34rem] rounded-full border border-white/10">
          <span className="absolute inset-10 rounded-full border border-white/10" />
          <span className="absolute inset-24 rounded-full border border-white/10" />
          <span className="absolute inset-40 rounded-full bg-environment-600/20 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <img alt="" className="size-12 rounded-xl object-contain" src="/logos/jaldrishti-icon.png" />
          <div>
            <p className="text-lg font-bold tracking-tight">JalDrishti</p>
            <p className="text-xs text-blue-100/75">Watershed decision support</p>
          </div>
        </div>

        <div className="relative max-w-xl py-14">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-blue-100">
            <ShieldCheck aria-hidden="true" className="size-4" /> SIH26015 workspace
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">Geospatial evidence for watershed decisions.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-blue-100/80">
            A secure workspace for geographic data, field evidence, and environmental analysis.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <MapPinned aria-hidden="true" className="size-5 text-sky-200" />
              <p className="mt-3 text-sm font-medium">Spatial context</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <Activity aria-hidden="true" className="size-5 text-emerald-200" />
              <p className="mt-3 text-sm font-medium">Environmental indicators</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <LockKeyhole aria-hidden="true" className="size-5 text-blue-100" />
              <p className="mt-3 text-sm font-medium">Role-based access</p>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-blue-100/60">Access is managed by your project administrator.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12" aria-labelledby="login-title">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img alt="" className="size-11 rounded-xl object-contain" src="/logos/jaldrishti-icon.png" />
            <div>
              <p className="font-bold text-brand-900">JalDrishti</p>
              <p className="text-xs text-muted">Watershed decision support</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-brand-700">Secure workspace</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink" id="login-title">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Use the account provisioned for your project role.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <Input
              autoComplete="username"
              label="Email address"
              onChange={(event) => { setEmail(event.target.value); setError(null) }}
              placeholder="name@example.org"
              required
              type="email"
              value={email}
            />
            <div className="relative">
              <Input
                autoComplete="current-password"
                label="Password"
                onChange={(event) => { setPassword(event.target.value); setError(null) }}
                placeholder="Enter your password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-8 inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-slate-100 hover:text-ink"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
              </button>
            </div>

            {configurationError && <ErrorState description={`${configurationError} See supabase/README.md for setup instructions.`} title="Supabase setup required" />}
            {error && <ErrorState description={error} title="Unable to sign in" />}

            <Button className="w-full" disabled={submitting || Boolean(configurationError)} size="lg" type="submit">
              {submitting ? "Signing in…" : "Sign in securely"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-muted">
            User accounts and role profiles are provisioned by an administrator. Public sign-up is not available.
          </p>
        </div>
      </section>
    </main>
  )
}

export default Login
