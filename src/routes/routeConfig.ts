import {
  BarChart3,
  BookOpen,
  Camera,
  Database,
  FileText,
  GitCompareArrows,
  Layers3,
  LayoutDashboard,
  MapPinned,
  Settings,
  Satellite,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import type { AppRole } from "../hooks/authTypes"

export interface AppPage {
  path: string
  label: string
  section: string
  icon: LucideIcon
  description: string
  roles?: readonly AppRole[]
}

export interface NavigationSection {
  label: string
  items: AppPage[]
}

export const navigationSections: NavigationSection[] = [
  {
    label: "Overview",
    items: [
      { path: "/dashboard", label: "Dashboard", section: "Overview", icon: LayoutDashboard, description: "A workspace for watershed program status and operational summaries." },
    ],
  },
  {
    label: "GIS",
    items: [
      { path: "/gis/watersheds", label: "Watersheds", section: "GIS", icon: MapPinned, description: "Explore watershed boundaries, linked field evidence, and environmental indicators." },
      { path: "/gis/field-evidence", label: "Field Evidence", section: "GIS", icon: Camera, description: "Review, map, and upload geotagged field observations and evidence." },
      { path: "/gis/map-layers", label: "Map Layers", section: "GIS", icon: Layers3, description: "Map layer selection and visibility controls will be available here." },
    ],
  },
  {
    label: "Analysis",
    items: [
      { path: "/analysis/analytics", label: "Analytics", section: "Analysis", icon: BarChart3, description: "Analyze recorded vegetation, water, land-cover, and change-detection results." },
      { path: "/analysis/satellite-data", label: "Satellite Data", section: "Analysis", icon: Satellite, description: "Review satellite scenes, acquisition metadata, raster references, and available observations." },
      { path: "/analysis/change-detection", label: "Change Detection", section: "Analysis", icon: GitCompareArrows, description: "Compare watershed indicator records across two dates and map recorded spatial change." },
      { path: "/analysis/interventions", label: "Interventions", section: "Analysis", icon: Workflow, description: "Register watershed interventions and review their spatial and temporal evidence." },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { path: "/intelligence/ai-insights", label: "AI Insights", section: "Intelligence", icon: Sparkles, description: "Review structured field, satellite, and indicator evidence with source-aware draft interpretation." },
      { path: "/intelligence/knowledge-base", label: "Knowledge Base", section: "Intelligence", icon: BookOpen, description: "Project guidance and reference material will be available here." },
    ],
  },
  {
    label: "Reports",
    items: [
      { path: "/reports", label: "Reports", section: "Reports", icon: FileText, description: "Report creation and previously generated reports will be available here." },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/system/data-management", label: "Data Management", section: "System", icon: Database, description: "Data source management and validation workflows will be available here.", roles: ["ADMIN", "GIS_ANALYST"] },
      { path: "/system/users-roles", label: "Users & Roles", section: "System", icon: Users, description: "User and role administration will be available to administrators.", roles: ["ADMIN"] },
      { path: "/system/settings", label: "Settings", section: "System", icon: Settings, description: "Workspace preferences and configuration will be available here." },
    ],
  },
]

export const appPages = navigationSections.flatMap((section) => section.items)

export function getAppPage(pathname: string) {
  return appPages.find((page) => page.path === pathname)
}
