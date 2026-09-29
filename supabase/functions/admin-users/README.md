# Admin user management function

Deploy this function before using the Users & Roles page. It verifies the caller's Supabase access token and confirms the caller has an active `ADMIN` profile before reading Auth user email/last-login fields or changing profiles. The service role key is read only from the Edge Function environment and must never be added to frontend variables or committed files.

From the repository root, after installing and linking the Supabase CLI to the shared project:

```powershell
supabase functions deploy admin-users
supabase secrets set APP_ORIGIN=https://your-approved-application-host.example
```

Set `APP_ORIGIN` to the exact deployed application origin before production use. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the function runtime. Do not paste those secrets into source files. The function supports `list`, `invite`, and `update` actions. Inviting users sends an Auth invitation email; the project must have its email provider and redirect URL configured.

Profile role/scope reads and writes remain subject to the canonical RLS policies in `database/migrations/20260929000200_row_level_security.sql`. The function additionally refuses requests from non-admin callers, prevents self-deactivation, and keeps at least one active Admin profile.
