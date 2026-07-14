import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL, type Role, type Profile } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Approval — TransitOps" }] }),
  component: AdminUsersPage,
});

const ROLES: Role[] = ["admin", "fleet_manager", "dispatcher", "safety_officer", "financial_analyst"];

interface UserRow extends Profile {
  roles: Role[];
}

function AdminUsersPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async (): Promise<UserRow[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id,name,email,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: allRoles, error: rErr } = await supabase.from("user_roles").select("user_id,role");
      if (rErr) throw rErr;
      return (profiles ?? []).map((p) => ({
        ...(p as Profile),
        roles: (allRoles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role),
      }));
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "pending" }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  if (!loading && !isAdmin) {
    return (
      <AppLayout title="Approval">
        <div className="p-8 text-center border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-4xl text-error">block</span>
          <p className="mt-2 text-on-surface-variant">Admins only.</p>
        </div>
      </AppLayout>
    );
  }

  const pending = users.filter((u) => u.status === "pending");
  const others = users.filter((u) => u.status !== "pending");

  return (
    <AppLayout title="Approval">
      <div className="space-y-8">
        <section className="bg-surface-container border border-outline-variant rounded-lg p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">verified_user</span>
              </div>
              <div>
                <h2 className="font-display font-semibold text-[20px]">Approval</h2>
                <p className="text-sm text-on-surface-variant">Accept or reject new account requests.</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded border border-primary/30 bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[16px]">pending_actions</span>
              {pending.length} waiting
            </span>
          </div>
          {isLoading && <p className="text-on-surface-variant text-sm">Loading...</p>}
          {!isLoading && pending.length === 0 && (
            <div className="p-6 text-center text-on-surface-variant text-sm border border-dashed border-outline-variant rounded-lg">
              No users are waiting for approval.
            </div>
          )}
          <div className="space-y-2">
            {pending.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                onApprove={() => setStatus.mutate({ id: u.id, status: "approved" })}
                onReject={() => setStatus.mutate({ id: u.id, status: "rejected" })}
                onRoleChange={(role) => setRole.mutate({ userId: u.id, role })}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-secondary">group</span>
            <h2 className="font-display font-semibold text-[18px]">
              User history ({others.length})
            </h2>
          </div>
          <div className="space-y-2">
            {others.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                onApprove={() => setStatus.mutate({ id: u.id, status: "approved" })}
                onReject={() => setStatus.mutate({ id: u.id, status: "rejected" })}
                onRoleChange={(role) => setRole.mutate({ userId: u.id, role })}
              />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function UserCard({
  user,
  onApprove,
  onReject,
  onRoleChange,
}: {
  user: UserRow;
  onApprove: () => void;
  onReject: () => void;
  onRoleChange: (role: Role) => void;
}) {
  const statusColor =
    user.status === "approved"
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : user.status === "rejected"
        ? "text-error border-error/30 bg-error/10"
        : "text-primary border-primary/30 bg-primary/10";

  return (
    <div className="bg-surface-container border border-outline-variant p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shrink-0">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{user.name}</p>
          <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
        </div>
      </div>

      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${statusColor}`}>
        {user.status}
      </span>

      <select
        value={user.roles[0] ?? "dispatcher"}
        onChange={(e) => onRoleChange(e.target.value as Role)}
        className="text-sm px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        {user.status !== "approved" && (
          <button
            onClick={onApprove}
            className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30 rounded hover:bg-green-500/25"
          >
            Approve
          </button>
        )}
        {user.status !== "rejected" && (
          <button
            onClick={onReject}
            className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-error/10 text-error border border-error/30 rounded hover:bg-error/20"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
