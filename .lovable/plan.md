## Goal
Migrate TransitOps from localStorage to Lovable Cloud with real auth, roles, and admin approval flow. Remove all mock data. Fix UI bugs.

## 1. Enable Cloud + schema

Enable Lovable Cloud, then create these tables (all with RLS + explicit GRANTs):

```text
app_role (enum): admin, fleet_manager, dispatcher, safety_officer, financial_analyst
account_status (enum): pending, approved, rejected

profiles         (id → auth.users, name, email, status, created_at)
user_roles       (id, user_id, role)                    -- roles NEVER on profiles
vehicles         (id, registration UNIQUE, name, type, capacity, odometer, cost, status)
drivers          (id, name, license, category, license_expiry, contact, safety_score, status)
trips            (id, source, destination, vehicle_id, driver_id, cargo_weight,
                  distance, status, created_at, revenue, fuel_consumed, final_odometer)
maintenance_logs (id, vehicle_id, type, cost, date, status, notes)
fuel_logs        (id, vehicle_id, liters, cost, date, station)
expenses         (id, trip_id, category, amount, description, date)
```

`has_role(_user_id, _role)` security-definer function for RLS.
On signup: trigger creates `profiles` row with `status='pending'` and assigns the `dispatcher` role by default (inactive until approved). First signup ever is auto-approved as `admin`.

## 2. Permissions matrix

| Resource | admin / fleet_manager | dispatcher | safety_officer | financial_analyst |
|---|---|---|---|---|
| Vehicles | full | read | read | read |
| Drivers | full | read | full | read |
| Trips | full | full | read | read |
| Maintenance | full | read | full | read |
| Fuel / Expenses | full | read | read | full |
| Analytics | read | read | read | read |
| User approval | admin only | — | — | — |

Enforced via RLS policies + client-side gating (hide buttons the user can't use).

## 3. Auth

- Email + password only (as currently used).
- Login/signup rewired to `supabase.auth.signInWithPassword` / `signUp`.
- Blocked login if `profiles.status !== 'approved'` → shows "Pending admin approval" screen.
- New `/admin/users` route (admin only): list pending users → Approve / Reject / change role.

## 4. Data layer

- Replace `src/lib/store.ts` `useDB`/`actions` with per-resource React Query hooks calling Supabase directly (RLS enforces auth). Keep the same hook names where possible so route files barely change.
- All mutations use the browser Supabase client; RLS blocks unauthorized writes even if UI is bypassed.
- Delete all seed data. Nothing pre-populated.

## 5. UI polish

- ProfileMenu shows real profile (name, email, role, status) from Cloud.
- Hide/disable "Add", "Edit", "Delete", "Dispatch" buttons based on role.
- New admin section in profile menu → "Manage Users" (admin only).
- Empty states already exist; keep them.
- Password visibility toggle already in place.

The "calendar" bug the user mentioned was withdrawn — skipping.

## 6. Files changed

- **New:** migration; `src/integrations/supabase/*` (auto by Cloud); `src/lib/auth.ts`, `src/lib/queries.ts` (React Query hooks); `src/routes/admin.users.tsx`; `src/hooks/use-role.ts`.
- **Rewritten:** `src/lib/store.ts` (thin re-export or removed), `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/components/AppLayout.tsx` (ProfileMenu + role gating).
- **Touched:** `fleet.tsx`, `drivers.tsx`, `trips.tsx`, `maintenance.tsx`, `fuel.tsx`, `analytics.tsx`, `dashboard.tsx` — swap store calls for query hooks, gate action buttons by role.

## Notes
- localStorage data will NOT migrate — fresh start.
- First account to sign up becomes admin automatically (bootstrap).
- Roles live in `user_roles`, never on profiles (prevents privilege escalation).
