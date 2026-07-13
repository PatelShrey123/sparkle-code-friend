import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "admin" | "fleet_manager" | "dispatcher" | "safety_officer" | "financial_analyst";
export type AccountStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  name: string;
  email: string;
  status: AccountStatus;
  created_at: string;
}

interface AuthCtx {
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  loading: boolean;
  hasRole: (r: Role) => boolean;
  canManageFleet: boolean;
  canManageDrivers: boolean;
  canManageTrips: boolean;
  canManageMaintenance: boolean;
  canManageFuel: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const { data: profile = null } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,email,status,created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Role[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as Role);
    },
  });

  const hasRole = (r: Role) => roles.includes(r);
  const isAdmin = hasRole("admin");
  const canManageFleet = isAdmin || hasRole("fleet_manager");
  const canManageDrivers = canManageFleet || hasRole("safety_officer");
  const canManageTrips = canManageFleet || hasRole("dispatcher");
  const canManageMaintenance = canManageFleet || hasRole("safety_officer");
  const canManageFuel = canManageFleet || hasRole("financial_analyst");

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        user,
        profile,
        roles,
        loading,
        hasRole,
        canManageFleet,
        canManageDrivers,
        canManageTrips,
        canManageMaintenance,
        canManageFuel,
        isAdmin,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};
