import { ShieldAlert } from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "../components/ui"
import { useAuth } from "../hooks/useAuth"

function Unauthorized() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const locationState = location.state as { message?: unknown } | null
  const message = typeof locationState?.message === "string"
    ? locationState.message
    : "Your account is not authorized for this workspace. Contact an administrator to review access."

  async function handleSignOut() {
    setSignOutError(null)
    try {
      await signOut()
      navigate("/login", { replace: true })
    } catch {
      setSignOutError("Sign out could not be completed. Please try again.")
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4 sm:p-6">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 text-center shadow-card sm:p-9" aria-labelledby="unauthorized-title">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-800">
          <ShieldAlert aria-hidden="true" className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink" id="unauthorized-title">Access unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        {signOutError && <p className="mt-3 text-sm text-red-700" role="alert">{signOutError}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {session ? (
            <Button onClick={handleSignOut} variant="secondary">Sign out</Button>
          ) : (
            <Button onClick={() => navigate("/login", { replace: true })}>Return to sign in</Button>
          )}
        </div>
      </section>
    </main>
  )
}

export default Unauthorized
