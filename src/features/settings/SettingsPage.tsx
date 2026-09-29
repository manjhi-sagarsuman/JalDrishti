import { useState } from "react"
import { KeyRound, Settings2, ShieldCheck } from "lucide-react"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { Badge, Button, Card, PageHeader, SectionHeader, Select, Tabs, type SelectOption } from "../../components/ui"
import { useAuth } from "../../hooks/useAuth"
import { getSupabaseClient } from "../../lib/supabase"
import { formatCoordinate, formatPreferredDate, updateUserSettings, useUserSettings } from "../../lib/userSettings"
import { mapLayers } from "../../maps/mapLayers"

type SettingsSection = "profile" | "application" | "map" | "data" | "notifications" | "security"
const sections = [
  { value: "profile", label: "Profile" }, { value: "application", label: "Application" }, { value: "map", label: "Map Settings" },
  { value: "data", label: "Data Preferences" }, { value: "notifications", label: "Notifications" }, { value: "security", label: "Security" },
] as const
const landingOptions: SelectOption[] = [{ value: "/dashboard", label: "Dashboard" }, { value: "/gis/watersheds", label: "Watershed Explorer" }, { value: "/analysis/analytics", label: "Analytics Center" }]
const baseMapOptions: SelectOption[] = [{ value: "streets", label: "Streets" }, { value: "satellite", label: "Satellite" }]
const zoomOptions: SelectOption[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((zoom) => ({ value: String(zoom), label: `Zoom ${zoom}` }))

function PreferenceToggle({ checked, description, label, onChange }: { checked: boolean; description: string; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-line p-4"><span><span className="block text-sm font-medium text-ink">{label}</span><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span><input checked={checked} className="mt-1 size-4 accent-blue-800" onChange={(event) => onChange(event.target.checked)} type="checkbox" /></label>
}

export default function SettingsPage() {
  const { profile, session } = useAuth()
  const userId = session?.user.id ?? "anonymous"
  const preferences = useUserSettings(userId)
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [sendingReset, setSendingReset] = useState(false)

  function updatePreference(update: Parameters<typeof updateUserSettings>[1]) {
    updateUserSettings(userId, update)
    setNotice("Setting saved in this browser for your account.")
    setError("")
  }
  function saveLayer(layerId: (typeof mapLayers)[number]["id"], enabled: boolean) {
    updatePreference((current) => ({ ...current, map: { ...current.map, defaultLayerIds: enabled ? [...new Set([...current.map.defaultLayerIds, layerId])] : current.map.defaultLayerIds.filter((item) => item !== layerId) } }))
  }
  async function sendPasswordReset() {
    const email = session?.user.email
    if (!email) { setError("This session does not include an email address for account recovery."); return }
    setSendingReset(true); setError(""); setNotice("")
    const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    if (resetError) setError("Password recovery could not be requested. Check the Supabase Auth email and redirect configuration.")
    else setNotice(`Password recovery instructions were sent to ${email}.`)
    setSendingReset(false)
  }

  const header = <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "System" }, { label: "Settings" }]} />} description="Manage your account display and browser-level application preferences." eyebrow="Workspace configuration" title="Settings" />
  return <div className="page-section">
    {header}
    {notice && <p aria-live="polite" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">{notice}</p>}
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">{error}</p>}
    <Card className="p-0"><Tabs label="Settings sections" onChange={(value) => setActiveSection(value as SettingsSection)} tabs={sections} value={activeSection} />
      <div className="p-4 sm:p-6">
        {activeSection === "profile" && <section className="space-y-4"><SectionHeader description="Profile identity and role are managed by your administrator." title="Profile" /><dl className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-canvas p-4"><dt className="text-xs text-muted">Name</dt><dd className="mt-1 text-sm font-semibold text-ink">{profile?.displayName || "Name not recorded"}</dd></div><div className="rounded-lg bg-canvas p-4"><dt className="text-xs text-muted">Email</dt><dd className="mt-1 break-all text-sm font-semibold text-ink">{session?.user.email ?? "Not available"}</dd></div><div className="rounded-lg bg-canvas p-4"><dt className="text-xs text-muted">Role</dt><dd className="mt-1"><Badge variant="info">{profile?.role.replaceAll("_", " ") ?? "Not verified"}</Badge></dd></div><div className="rounded-lg bg-canvas p-4"><dt className="text-xs text-muted">User ID</dt><dd className="mt-1 break-all text-xs font-medium text-ink">{profile?.userId ?? "Not available"}</dd></div></dl><p className="text-xs text-muted">To change your display name or role, contact a project administrator.</p></section>}

        {activeSection === "application" && <section className="max-w-2xl space-y-4"><SectionHeader description="Choose where the application opens after sign-in." title="Application" /><Select label="Default landing page" onChange={(event) => updatePreference((current) => ({ ...current, application: { ...current.application, landingPage: event.target.value } }))} options={landingOptions} value={preferences.application.landingPage} /><div className="rounded-lg border border-line bg-canvas p-4"><div className="flex items-center gap-2"><Settings2 aria-hidden="true" className="size-4 text-brand-800" /><p className="text-sm font-medium text-ink">Application appearance</p></div><p className="mt-1 text-xs leading-5 text-muted">The workspace currently uses the standard light government GIS theme. No additional themes are configured.</p></div></section>}

        {activeSection === "map" && <section className="space-y-5"><SectionHeader description="Preferences apply to the default map view and map layers where a page does not set a task-specific view." title="Map Settings" /><div className="grid gap-4 sm:grid-cols-2"><Select label="Default map" onChange={(event) => updatePreference((current) => ({ ...current, map: { ...current.map, defaultBaseMap: event.target.value as "streets" | "satellite" } }))} options={baseMapOptions} value={preferences.map.defaultBaseMap} /><Select label="Default zoom" onChange={(event) => updatePreference((current) => ({ ...current, map: { ...current.map, defaultZoom: Number(event.target.value) } }))} options={zoomOptions} value={String(preferences.map.defaultZoom)} /><Select label="Coordinate display" onChange={(event) => updatePreference((current) => ({ ...current, map: { ...current.map, coordinateFormat: event.target.value as "decimal" | "dms" } }))} options={[{ value: "decimal", label: "Decimal degrees" }, { value: "dms", label: "Degrees, minutes, seconds" }]} value={preferences.map.coordinateFormat} /></div><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Satellite basemaps require a configured provider style. No satellite style is currently supplied, so maps use Streets until one is configured.</p><PreferenceToggle checked={preferences.map.showCursorCoordinates} description="Show the pointer position in the selected coordinate format on interactive maps." label="Show map coordinates" onChange={(value) => updatePreference((current) => ({ ...current, map: { ...current.map, showCursorCoordinates: value } }))} /><div><h3 className="text-sm font-semibold text-ink">Default visible layers</h3><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{mapLayers.map((layer) => <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm text-ink" key={layer.id}><input checked={preferences.map.defaultLayerIds.includes(layer.id)} className="size-4 accent-blue-800" onChange={(event) => saveLayer(layer.id, event.target.checked)} type="checkbox" /><span>{layer.label}</span></label>)}</div></div><p className="text-xs text-muted">Coordinate preview: {formatCoordinate(78.96, 20.59, preferences.map.coordinateFormat)}</p></section>}

        {activeSection === "data" && <section className="max-w-2xl space-y-4"><SectionHeader description="These choices affect display only; they do not alter stored dates or source data." title="Data Preferences" /><Select label="Date and time display" onChange={(event) => updatePreference((current) => ({ ...current, data: { dateTimeZone: event.target.value as "local" | "utc" } }))} options={[{ value: "local", label: "Browser local time" }, { value: "utc", label: "UTC" }]} value={preferences.data.dateTimeZone} /><Card className="bg-canvas p-4 shadow-none"><p className="text-sm font-medium text-ink">Display preview</p><p className="mt-1 text-sm text-muted">{formatPreferredDate(new Date().toISOString(), preferences.data.dateTimeZone)}</p><p className="mt-2 text-xs leading-5 text-muted">This preference changes date formatting only. It does not change acquisition timestamps, analysis periods, coordinates, or database records.</p></Card></section>}

        {activeSection === "notifications" && <section className="max-w-2xl space-y-4"><SectionHeader description="Save which event categories you want surfaced when in-app notifications are available." title="Notifications" /><PreferenceToggle checked={preferences.notifications.dataValidation} description="Quality warnings and validation status changes." label="Data validation" onChange={(value) => updatePreference((current) => ({ ...current, notifications: { ...current.notifications, dataValidation: value } }))} /><PreferenceToggle checked={preferences.notifications.analysisCompletion} description="Completion of remote-sensing and change-analysis work." label="Analysis completion" onChange={(value) => updatePreference((current) => ({ ...current, notifications: { ...current.notifications, analysisCompletion: value } }))} /><PreferenceToggle checked={preferences.notifications.reportGeneration} description="Report generation and export status." label="Report generation" onChange={(value) => updatePreference((current) => ({ ...current, notifications: { ...current.notifications, reportGeneration: value } }))} /><p className="text-xs leading-5 text-muted">Notification delivery is not configured in this application yet. These preferences are saved locally and do not send email or push notifications.</p></section>}

        {activeSection === "security" && <section className="max-w-2xl space-y-4"><SectionHeader description="Authentication is handled by Supabase Auth. This page never displays passwords or tokens." title="Security" /><Card className="p-4"><div className="flex items-start gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 text-environment-700" /><div><p className="text-sm font-semibold text-ink">Signed-in account</p><p className="mt-1 text-sm text-muted">{session?.user.email ?? "Email unavailable"}</p><p className="mt-1 text-xs text-muted">Session expires {session?.expires_at ? formatPreferredDate(new Date(session.expires_at * 1000).toISOString(), preferences.data.dateTimeZone) : "not available"}</p></div></div></Card><Card className="p-4"><div className="flex items-start gap-3"><KeyRound aria-hidden="true" className="mt-0.5 size-5 text-brand-800" /><div className="flex-1"><p className="text-sm font-semibold text-ink">Password recovery</p><p className="mt-1 text-xs leading-5 text-muted">Request a recovery email through the configured Supabase Auth provider.</p><Button className="mt-3" disabled={sendingReset || !session?.user.email} onClick={() => void sendPasswordReset()} size="sm">{sendingReset ? "Sending…" : "Send password recovery email"}</Button></div></div></Card></section>}
      </div>
    </Card>
  </div>
}
