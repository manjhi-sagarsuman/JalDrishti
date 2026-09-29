# Supabase setup

This repository has a client foundation and initial schema migration files. No production credentials, seed data, or applied database changes are included.

## Connect a shared Supabase project

1. Create or open the team's shared Supabase project.
2. In the project API settings, copy the Project URL and the publishable key.
3. From the repository root, copy `.env.example` to `.env` and add those values:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Restart the Vite development server after changing `.env`.
5. Keep `.env` local. It is ignored by Git. Commit `.env.example`, which intentionally contains blank values.

The publishable key is intended for browser use, but it is not authorization by itself. Do not place a `service_role` key, database password, or other secret in any `VITE_` variable. Access to database rows must be protected by Row Level Security policies before application data access is added.

## Client behavior

`src/lib/supabase.ts` exports `isSupabaseConfigured`, `getSupabaseClient()`, and `checkSupabaseConnection()`. The client is created lazily; importing the module does not require credentials, so the existing application can still build and run before the manual setup is complete. Calling `getSupabaseClient()` without both variables returns a descriptive configuration error.

`checkSupabaseConnection()` makes a read-only `GET` request to the project's Supabase Auth health endpoint. It does not read or write application tables. Once local credentials are configured, a developer can call it from a temporary development-only check or a future settings diagnostic:

```ts
import { checkSupabaseConnection } from "../lib/supabase"

const result = await checkSupabaseConnection()
console.info(result.message, result.status)
```

Do not leave temporary credential diagnostics or key values in application logs.

## Database schema

The canonical schema and application instructions are in [`database/README.md`](../database/README.md) and `database/migrations/`. Supabase CLI applies migrations from `supabase/migrations/`, so synchronize the reviewed canonical files there before running the CLI. The evidence migration creates the private `geo-photos` bucket and its access policies. Do not make ad hoc changes to shared-project tables or buckets in Supabase Studio.

## Authentication and role profiles

The application uses Supabase Auth email/password sign-in. Public sign-up is not exposed. After the schema and RLS migrations have been applied, create test accounts in the shared project's Authentication user management. Each Auth user also needs a matching `public.profiles` row with that Auth user's UUID, an approved role (`ADMIN`, `STATE_OFFICER`, `DISTRICT_OFFICER`, `FIELD_OFFICER`, or `GIS_ANALYST`), and `status = 'ACTIVE'`. Assign roles through a trusted administrator or database-owner provisioning process; ordinary users cannot grant themselves roles. Do not put passwords or service-role credentials in this repository.

The browser client loads only the signed-in user's profile through the self-read RLS policy. Missing, suspended, unknown-role, or unreadable profiles are denied access. Module navigation and guarded routes also check each module's configured role list. Redirect checks are not a substitute for database RLS: any future data access must continue to enforce authorization in PostgreSQL.
