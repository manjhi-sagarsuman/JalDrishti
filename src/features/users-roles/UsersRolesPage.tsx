import { useEffect, useState, type FormEvent } from "react"
import { KeyRound, Pencil, Plus, RefreshCw, UserRoundCog } from "lucide-react"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable"
import { Badge, Button, Card, ErrorState, Input, LoadingState, Modal, PageHeader, SectionHeader, Select, Tabs, type SelectOption } from "../../components/ui"
import { appRoles, type AppRole } from "../../hooks/authTypes"
import { useAuth } from "../../hooks/useAuth"
import { getSupabaseClient } from "../../lib/supabase"

type AccountStatus = "ACTIVE" | "SUSPENDED" | "UNASSIGNED"
interface ManagedUser { userId: string; name: string | null; email: string | null; role: AppRole | null; organization: string | null; status: AccountStatus; lastLogin: string | null; stateId: string | null; districtId: string | null; blockId: string | null; villageId: string | null }
interface ScopeOption { id: string; name: string; parentId: string | null }
interface RoleScope { stateId: string | null; districtId: string | null; blockId: string | null; villageId: string | null }
type AdminAction = { action: "list" } | ({ action: "invite"; email: string; name: string; organization: string; role: AppRole } & RoleScope) | ({ action: "update"; userId: string; name: string; organization: string; role: AppRole; status: "ACTIVE" | "SUSPENDED" } & RoleScope)

const roleOptions: SelectOption[] = appRoles.map((role) => ({ value: role, label: role.replaceAll("_", " ") }))
const tabs = [{ value: "users", label: "Users" }, { value: "permissions", label: "Permissions" }] as const
const permissionRows = [
  { area: "User and role administration", values: { ADMIN: "Manage", STATE_OFFICER: "No access", DISTRICT_OFFICER: "No access", FIELD_OFFICER: "No access", GIS_ANALYST: "No access" } },
  { area: "Administrative data visibility", values: { ADMIN: "All areas", STATE_OFFICER: "Assigned state", DISTRICT_OFFICER: "Assigned district", FIELD_OFFICER: "Assigned field scope", GIS_ANALYST: "All areas" } },
  { area: "Watershed data management", values: { ADMIN: "All areas", STATE_OFFICER: "Assigned scope", DISTRICT_OFFICER: "Assigned scope", FIELD_OFFICER: "Read only", GIS_ANALYST: "All areas" } },
  { area: "Submit field evidence", values: { ADMIN: "Allowed", STATE_OFFICER: "Allowed", DISTRICT_OFFICER: "Allowed", FIELD_OFFICER: "Allowed", GIS_ANALYST: "Allowed" } },
  { area: "Data sources", values: { ADMIN: "Manage", STATE_OFFICER: "Read", DISTRICT_OFFICER: "Read", FIELD_OFFICER: "Read", GIS_ANALYST: "Manage" } },
] as const

async function callAdmin(action: AdminAction): Promise<{ users?: ManagedUser[]; error?: string }> {
  const { data, error } = await getSupabaseClient().functions.invoke("admin-users", { body: action })
  if (error) {
    const context = error.context
    if (context instanceof Response) {
      try { const body = await context.json() as { error?: string }; return { error: body.error ?? "User administration request failed." } }
      catch { /* Use the generic message below. */ }
    }
    return { error: error.message || "User administration request failed." }
  }
  return data as { users?: ManagedUser[]; error?: string }
}

function formatDate(value: string | null) {
  if (!value) return "Never / not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function statusVariant(status: AccountStatus): "success" | "warning" | "neutral" {
  return status === "ACTIVE" ? "success" : status === "SUSPENDED" ? "warning" : "neutral"
}

export default function UsersRolesPage() {
  const { configurationError, session } = useAuth()
  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users")
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [organization, setOrganization] = useState("")
  const [role, setRole] = useState<AppRole>("FIELD_OFFICER")
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE")
  const [states, setStates] = useState<ScopeOption[]>([])
  const [districts, setDistricts] = useState<ScopeOption[]>([])
  const [blocks, setBlocks] = useState<ScopeOption[]>([])
  const [villages, setVillages] = useState<ScopeOption[]>([])
  const [scope, setScope] = useState<RoleScope>({ stateId: null, districtId: null, blockId: null, villageId: null })

  async function loadUsers() {
    setLoading(true); setError(null)
    const result = await callAdmin({ action: "list" })
    if (result.error) setError(result.error)
    else setUsers(result.users ?? [])
    setLoading(false)
  }
  useEffect(() => {
    let active = true
    callAdmin({ action: "list" }).then((result) => {
      if (!active) return
      if (result.error) setError(result.error)
      else setUsers(result.users ?? [])
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "User directory could not be loaded.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    const client = getSupabaseClient()
    Promise.all([
      client.from("states").select("id, name").order("name").limit(1000),
      client.from("districts").select("id, name, state_id").order("name").limit(5000),
      client.from("blocks").select("id, name, district_id").order("name").limit(10000),
      client.from("villages").select("id, name, block_id").order("name").limit(20000),
    ]).then(([stateRows, districtRows, blockRows, villageRows]) => {
      if (!active) return
      setStates((stateRows.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), parentId: null })))
      setDistricts((districtRows.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), parentId: String(row.state_id) })))
      setBlocks((blockRows.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), parentId: String(row.district_id) })))
      setVillages((villageRows.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), parentId: String(row.block_id) })))
    }).catch(() => { /* Unavailable geography leaves spatial assignment empty; the server rejects incomplete assignments. */ })
    return () => { active = false }
  }, [])

  function openAdd() {
    setEditing(null); setName(""); setEmail(""); setOrganization(""); setRole("FIELD_OFFICER"); setStatus("ACTIVE"); setScope({ stateId: null, districtId: null, blockId: null, villageId: null }); setMessage(""); setFormOpen(true)
  }
  function openEdit(user: ManagedUser) {
    setEditing(user); setName(user.name ?? ""); setEmail(user.email ?? ""); setOrganization(user.organization ?? ""); setRole(user.role ?? "FIELD_OFFICER"); setStatus(user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"); setScope({ stateId: user.stateId, districtId: user.districtId, blockId: user.blockId, villageId: user.villageId }); setMessage(""); setFormOpen(true)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setMessage("")
    try {
      const result = editing
        ? await callAdmin({ action: "update", userId: editing.userId, name: name.trim(), organization: organization.trim(), role, status, ...scope })
        : await callAdmin({ action: "invite", email: email.trim(), name: name.trim(), organization: organization.trim(), role, ...scope })
      if (result.error) { setError(result.error); return }
      setFormOpen(false)
      setMessage(editing ? "User profile and role updated." : "Invitation sent and role profile created.")
      await loadUsers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "User operation failed.") }
    finally { setSaving(false) }
  }
  async function toggleStatus(user: ManagedUser) {
    if (!user.role) return
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"
    if (user.userId === session?.user.id && nextStatus === "SUSPENDED") { setMessage("You cannot suspend your own administrator account."); return }
    setSaving(true); setError(null); setMessage("")
    const result = await callAdmin({ action: "update", userId: user.userId, name: user.name ?? user.email ?? "User", organization: user.organization ?? "", role: user.role, status: nextStatus, stateId: user.stateId, districtId: user.districtId, blockId: user.blockId, villageId: user.villageId })
    if (result.error) setError(result.error)
    else { setMessage(`Account ${nextStatus === "ACTIVE" ? "activated" : "deactivated"}.`); await loadUsers() }
    setSaving(false)
  }

  const columns: DataTableColumn<ManagedUser>[] = [
    { key: "name", header: "Name", render: (user) => <div><p className="font-semibold text-ink">{user.name || "Name not recorded"}</p><p className="mt-1 text-xs text-muted">{user.userId}</p></div> },
    { key: "email", header: "Email", render: (user) => user.email ?? "Not recorded" },
    { key: "role", header: "Role", render: (user) => user.role ? user.role.replaceAll("_", " ") : <Badge variant="warning">Unassigned</Badge> },
    { key: "organization", header: "Organization", render: (user) => user.organization || "Not recorded" },
    { key: "status", header: "Status", render: (user) => <Badge variant={statusVariant(user.status)}>{user.status}</Badge> },
    { key: "lastLogin", header: "Last Login", render: (user) => formatDate(user.lastLogin) },
    { key: "actions", header: "Actions", align: "right", render: (user) => <div className="flex justify-end gap-1"><Button aria-label={`Edit ${user.email ?? user.userId}`} leadingIcon={Pencil} onClick={() => openEdit(user)} size="sm" variant="quiet">Edit</Button>{user.role && <Button disabled={saving || user.userId === session?.user.id} onClick={() => void toggleStatus(user)} size="sm" variant={user.status === "ACTIVE" ? "danger" : "secondary"}>{user.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button>}</div> },
  ]

  const header = <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "System" }, { label: "Users & Roles" }]} />} description="Administer account profiles and review the role permissions enforced by Supabase Row Level Security." eyebrow="System administration" title="Users & Roles" actions={<Button leadingIcon={Plus} onClick={openAdd}>Add user</Button>} />
  if (configurationError) return <div className="page-section">{header}<ErrorState description="Configure Supabase before managing user accounts." title="Supabase setup required" /></div>
  if (loading) return <div className="page-section">{header}<Card><LoadingState label="Loading user directory" rows={5} /></Card></div>
  if (error && !users.length) return <div className="page-section">{header}<ErrorState description={error} onRetry={() => void loadUsers()} title="User administration unavailable" /></div>

  return <div className="page-section">
    {header}
    {error && <ErrorState className="mb-4" description={error} title="User operation failed" />}
    {message && <p aria-live="polite" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">{message}</p>}
    <Card className="p-0"><Tabs label="Users and permissions" onChange={(value) => setActiveTab(value as "users" | "permissions")} tabs={tabs} value={activeTab} />
      <div className="p-4 sm:p-5">
        {activeTab === "users" ? <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><SectionHeader description="Email and last-login values come from Supabase Auth; role and organization values come from profile metadata." title="Account directory" /><Button leadingIcon={RefreshCw} onClick={() => void loadUsers()} size="sm" variant="secondary">Refresh</Button></div><DataTable caption="User account directory" columns={columns} emptyDescription="Invite an account to create its application profile." emptyTitle="No users found" getRowKey={(user) => user.userId} rows={users} /></div> : <div className="space-y-4"><SectionHeader description="This summary mirrors the scope rules in the canonical PostgreSQL RLS policies. Route visibility is an additional UI guard, not a replacement for RLS." title="Permissions model" /><div className="overflow-x-auto rounded-xl border border-line"><table className="min-w-208 w-full text-left text-xs"><thead className="bg-slate-50 uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Capability</th>{appRoles.map((item) => <th className="px-3 py-3" key={item}>{item.replaceAll("_", " ")}</th>)}</tr></thead><tbody className="divide-y divide-line">{permissionRows.map((row) => <tr key={row.area}><th className="px-3 py-3 font-semibold text-ink">{row.area}</th>{appRoles.map((item) => <td className="px-3 py-3 text-muted" key={item}>{row.values[item]}</td>)}</tr>)}</tbody></table></div><div className="rounded-lg border border-line bg-canvas p-4"><div className="flex items-start gap-3"><KeyRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-800" /><p className="text-xs leading-5 text-muted">The database checks active profiles and assigned state/district/block/village scope through <code>current_user_role()</code>, <code>can_access_admin_area()</code>, and <code>can_manage_watershed()</code>. User-management APIs use a server-side Admin check. Changing a user's profile role does not grant access beyond the RLS rules.</p></div></div></div>}
      </div>
    </Card>
    <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit user profile" : "Invite user"}>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        {!editing && <Input autoComplete="email" label="Email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />}
        {editing && <div><p className="text-xs text-muted">Email</p><p className="mt-1 text-sm font-medium text-ink">{email}</p></div>}
        <Input autoComplete="name" label="Name" onChange={(event) => setName(event.target.value)} required value={name} />
        <Input label="Organization" onChange={(event) => setOrganization(event.target.value)} value={organization} />
        <Select label="Role" onChange={(event) => setRole(event.target.value as AppRole)} options={roleOptions} value={role} />
        <div className="rounded-lg border border-line bg-canvas p-3"><p className="text-sm font-semibold text-ink">RLS geographic scope</p><p className="mt-1 text-xs leading-5 text-muted">State, District, and Field Officers need matching assignments for watershed access. Admin and GIS Analyst roles have global GIS scope.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Select label="State" onChange={(event) => setScope({ stateId: event.target.value || null, districtId: null, blockId: null, villageId: null })} options={states.map((item) => ({ value: item.id, label: item.name }))} placeholder="No state scope" value={scope.stateId ?? ""} /><Select label="District" onChange={(event) => setScope((current) => ({ ...current, districtId: event.target.value || null, blockId: null, villageId: null }))} options={districts.filter((item) => item.parentId === scope.stateId).map((item) => ({ value: item.id, label: item.name }))} placeholder="No district scope" value={scope.districtId ?? ""} /><Select label="Block" onChange={(event) => setScope((current) => ({ ...current, blockId: event.target.value || null, villageId: null }))} options={blocks.filter((item) => item.parentId === scope.districtId).map((item) => ({ value: item.id, label: item.name }))} placeholder="No block scope" value={scope.blockId ?? ""} /><Select label="Village" onChange={(event) => setScope((current) => ({ ...current, villageId: event.target.value || null }))} options={villages.filter((item) => item.parentId === scope.blockId).map((item) => ({ value: item.id, label: item.name }))} placeholder="No village scope" value={scope.villageId ?? ""} /></div></div>
        {editing && <Select label="Account status" onChange={(event) => setStatus(event.target.value as "ACTIVE" | "SUSPENDED")} options={[{ value: "ACTIVE", label: "Active" }, { value: "SUSPENDED", label: "Deactivated" }]} value={status} />}
        {!editing && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">An invitation email will be sent through Supabase Auth. The user must accept it before signing in.</p>}
        <div className="flex justify-end gap-2"><Button onClick={() => setFormOpen(false)} type="button" variant="secondary">Cancel</Button><Button disabled={saving} leadingIcon={editing ? UserRoundCog : Plus} type="submit">{saving ? "Saving…" : editing ? "Save changes" : "Send invitation"}</Button></div>
      </form>
    </Modal>
  </div>
}
