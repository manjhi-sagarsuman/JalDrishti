import type { ReactNode } from "react"
import { LoadingState } from "../components/ui"
import type { AppPage } from "./routeConfig"
import { useAuth } from "../hooks/useAuth"
import { isPrototypeMode } from "../lib/appConfig"


interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading } = useAuth()

  if (isPrototypeMode) return children

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas p-6">
        <LoadingState className="w-full max-w-md" label="Loading JalDrishti workspace" rows={4} />
      </main>
    )
  }

  return children
}

interface RoleGuardProps {
  page: AppPage
  children: ReactNode
}

export function RoleGuard({ children }: RoleGuardProps) {
  return children
}

