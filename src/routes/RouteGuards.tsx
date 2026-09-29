import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { LoadingState } from "../components/ui"
import type { AppPage } from "./routeConfig"
import { useAuth } from "../hooks/useAuth"
import { isPrototypeMode } from "../lib/appConfig"

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, profile, loading, profileStatus, profileError } = useAuth()
  const location = useLocation()

  if (isPrototypeMode) return children

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas p-6">
        <LoadingState className="w-full max-w-md" label="Restoring your secure session" rows={4} />
      </main>
    )
  }

  if (!session) {
    return <Navigate replace state={{ from: `${location.pathname}${location.search}` }} to="/login" />
  }

  if (profileStatus === "error" || profileError) {
    return <Navigate replace state={{ message: profileError }} to="/unauthorized" />
  }

  if (!profile) {
    return <Navigate replace state={{ message: "Your account does not have an active JalDrishti role profile." }} to="/unauthorized" />
  }

  return children
}

interface RoleGuardProps {
  page: AppPage
  children: ReactNode
}

export function RoleGuard({ page, children }: RoleGuardProps) {
  const { profile } = useAuth()
  if (!profile) return page.roles ? <Navigate replace state={{ message: "Authorized access required for this module." }} to="/unauthorized" /> : children
  if (page.roles && !page.roles.includes(profile.role)) {
    return <Navigate replace state={{ message: "Your account role does not have access to this module." }} to="/unauthorized" />
  }
  return children
}
