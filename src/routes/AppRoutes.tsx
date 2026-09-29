import { Fragment, lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../hooks/AuthProvider"
import { LoadingState } from "../components/ui"
import DashboardLayout from "../layouts/DashboardLayout"
import Dashboard from "../features/dashboard/Dashboard"
import Login from "../pages/Login"
import RoutePlaceholder from "../pages/RoutePlaceholder"
import Unauthorized from "../pages/Unauthorized"
import { ProtectedRoute, RoleGuard } from "./RouteGuards"
import { appPages } from "./routeConfig"
import { useAuth } from "../hooks/useAuth"
import { useUserSettings } from "../lib/userSettings"

const MapPage = lazy(() => import("../pages/MapPage"))
const WatershedExplorer = lazy(() => import("../features/watershed/WatershedExplorer"))
const EvidenceModule = lazy(() => import("../features/evidence/EvidenceModule"))
const InterventionsModule = lazy(() => import("../features/interventions/InterventionsModule"))
const SatelliteDataModule = lazy(() => import("../features/remote-sensing/SatelliteDataModule"))
const AnalyticsCenter = lazy(() => import("../features/analytics/AnalyticsCenter"))
const ChangeDetectionPage = lazy(() => import("../features/change-detection/ChangeDetectionPage"))
const AiEvidenceInsights = lazy(() => import("../features/ai-insights/AiEvidenceInsights"))
const ReportsPage = lazy(() => import("../pages/ReportsPage"))
const DataManagement = lazy(() => import("../features/data-management/DataManagement"))
const UsersRolesPage = lazy(() => import("../features/users-roles/UsersRolesPage"))
const SettingsPage = lazy(() => import("../features/settings/SettingsPage"))

function LoginRoute() {
  return <Login />
}

function ShellRoutes() {
  const { session } = useAuth()
  const settings = useUserSettings(session?.user.id ?? "anonymous")
  return (
    <Routes>
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} path="/">
        <Route index element={<Navigate replace to={settings.application.landingPage} />} />
        {appPages.map((page) => page.path === "/dashboard" ? (
          <Route element={<Dashboard />} key={page.path} path="dashboard" />
        ) : page.path === "/gis/map-layers" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading interactive map" rows={5} />}><MapPage /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : page.path === "/gis/watersheds" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading watershed explorer" rows={5} />}><WatershedExplorer /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : page.path === "/gis/field-evidence" ? (
          <Fragment key={page.path}>
            <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading field evidence" rows={5} />}><EvidenceModule /></Suspense></RoleGuard>} path={page.path.slice(1)} />
            <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading evidence detail" rows={5} />}><EvidenceModule /></Suspense></RoleGuard>} path={`${page.path.slice(1)}/:evidenceId`} />
          </Fragment>
        ) : page.path === "/analysis/interventions" ? (
          <Fragment key={page.path}>
            <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading interventions" rows={5} />}><InterventionsModule /></Suspense></RoleGuard>} path={page.path.slice(1)} />
            <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading intervention detail" rows={5} />}><InterventionsModule /></Suspense></RoleGuard>} path={`${page.path.slice(1)}/:interventionId`} />
          </Fragment>
        ) : page.path === "/analysis/satellite-data" ? (
          <Fragment key={page.path}>
            <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading satellite data" rows={5} />}><SatelliteDataModule /></Suspense></RoleGuard>} path={page.path.slice(1)} />
            <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading satellite scene" rows={5} />}><SatelliteDataModule /></Suspense></RoleGuard>} path={`${page.path.slice(1)}/:sceneId`} />
          </Fragment>
        ) : page.path === "/analysis/analytics" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading analytics center" rows={5} />}><AnalyticsCenter /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : page.path === "/analysis/change-detection" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading temporal change detection" rows={5} />}><ChangeDetectionPage /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : page.path === "/intelligence/ai-insights" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading AI evidence insights" rows={5} />}><AiEvidenceInsights /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : page.path === "/reports" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading report drafts" rows={4} />}><ReportsPage /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : page.path === "/system/data-management" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading data management" rows={5} />}><DataManagement /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : page.path === "/system/users-roles" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading user administration" rows={5} />}><UsersRolesPage /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : page.path === "/system/settings" ? (
          <Route element={<RoleGuard page={page}><Suspense fallback={<LoadingState label="Loading settings" rows={4} />}><SettingsPage /></Suspense></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ) : (
          <Route element={<RoleGuard page={page}><RoutePlaceholder page={page} /></RoleGuard>} key={page.path} path={page.path.slice(1)} />
        ))}
        <Route element={<Navigate replace to="/dashboard" />} path="*" />
      </Route>
      <Route element={<LoginRoute />} path="/login" />
      <Route element={<Unauthorized />} path="/unauthorized" />
    </Routes>
  )
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ShellRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
