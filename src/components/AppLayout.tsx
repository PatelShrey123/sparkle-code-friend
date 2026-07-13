import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { useAuth, ROLE_LABEL } from "@/hooks/use-auth";
import { useBindActions } from "@/lib/store";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/fleet", label: "Fleet", icon: "local_shipping" },
  { to: "/drivers", label: "Drivers", icon: "person" },
  { to: "/trips", label: "Trips", icon: "route" },
  { to: "/maintenance", label: "Maintenance", icon: "build" },
  { to: "/fuel", label: "Fuel & Expenses", icon: "local_gas_station" },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
];

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const { user, profile, roles, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
      </div>
    );
  }

  if (profile && profile.status !== "approved") {
    return <PendingScreen status={profile.status} onSignOut={signOut} />;
  }

  const roleLabel = roles[0] ? ROLE_LABEL[roles[0]] : "";

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <aside className="hidden md:flex flex-col fixed left-0 top-0 w-[240px] h-full bg-surface-container-low border-r border-outline-variant z-30">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-outline-variant">
          <Logo size={32} showWordmark />
        </div>
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  active
                    ? "text-primary font-bold border-l-4 border-primary bg-surface-container-high"
                    : "text-on-surface-variant hover:bg-surface-container border-l-4 border-transparent"
                }`}
              >
                <span className="material-symbols-outlined">{n.icon}</span>
                <span className="font-display text-[15px] font-semibold">{n.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin/users"
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                pathname.startsWith("/admin")
                  ? "text-primary font-bold border-l-4 border-primary bg-surface-container-high"
                  : "text-on-surface-variant hover:bg-surface-container border-l-4 border-transparent"
              }`}
            >
              <span className="material-symbols-outlined">shield_person</span>
              <span className="font-display text-[15px] font-semibold">Manage Users</span>
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-outline-variant">
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      <header className="fixed top-0 right-0 left-0 md:left-[240px] z-20 bg-background/95 backdrop-blur border-b border-outline-variant h-[64px] flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-[22px] md:text-[24px] font-semibold">{title}</h1>
        </div>
        <ProfileMenu
          name={profile?.name ?? user.email ?? ""}
          email={profile?.email ?? user.email ?? ""}
          role={roleLabel}
          isAdmin={isAdmin}
          onLogout={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
        />
      </header>

      <main className="md:ml-[240px] pt-[64px] pb-24 md:pb-8 min-h-screen">
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center bg-surface-container border-t border-outline-variant h-16 md:hidden">
        {nav.slice(0, 5).map((n) => {
          const active = pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex flex-col items-center justify-center px-2 ${
                active ? "text-primary font-bold" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
              <span className="text-[10px] uppercase tracking-wider mt-0.5">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function PendingScreen({
  status,
  onSignOut,
}: {
  status: "pending" | "rejected";
  onSignOut: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const rejected = status === "rejected";
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-container border border-outline-variant rounded-lg p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary-container/20 flex items-center justify-center">
          <span className={`material-symbols-outlined text-[40px] ${rejected ? "text-error" : "text-primary"}`}>
            {rejected ? "block" : "hourglass_top"}
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold">
          {rejected ? "Account rejected" : "Awaiting approval"}
        </h2>
        <p className="text-on-surface-variant text-sm">
          {rejected
            ? "An admin has rejected your account request. Contact your fleet administrator for details."
            : "Your account has been created and is waiting for admin approval. You'll get access as soon as an admin approves you."}
        </p>
        <button
          onClick={async () => {
            await onSignOut();
            navigate({ to: "/login" });
          }}
          className="w-full h-11 bg-primary-container text-on-primary-container font-bold rounded hover:brightness-110"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function ProfileMenu({
  name,
  email,
  role,
  isAdmin,
  onLogout,
}: {
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex items-center gap-4" ref={ref}>
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-[13px] font-semibold">{name}</span>
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
          {role}
        </span>
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold border border-outline-variant hover:brightness-110 transition"
          aria-label="Open profile"
        >
          {name.slice(0, 1).toUpperCase()}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-72 bg-surface-container border border-outline-variant rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-outline-variant">
              <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
                {name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{name}</p>
                <p className="text-xs text-on-surface-variant truncate">{email}</p>
              </div>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant text-[11px] uppercase tracking-wider">Role</span>
                <span className="font-semibold">{role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant text-[11px] uppercase tracking-wider">Status</span>
                <span className="text-green-400 font-semibold">Approved</span>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/admin/users" });
                }}
                className="w-full text-left px-4 py-3 border-t border-outline-variant text-sm hover:bg-surface-container-high flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">shield_person</span>
                Manage Users
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full text-left px-4 py-3 border-t border-outline-variant text-sm hover:bg-surface-container-high flex items-center gap-2 text-error"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Available: "bg-green-500/15 text-green-400 border-green-500/30",
    "On Trip": "bg-secondary-container/20 text-secondary border-secondary/30",
    "In Shop": "bg-primary-container/20 text-primary border-primary/30",
    Retired: "bg-surface-variant/40 text-on-surface-variant border-outline-variant",
    "Off Duty": "bg-surface-variant/40 text-on-surface-variant border-outline-variant",
    Suspended: "bg-error-container/20 text-error border-error/30",
    Dispatched: "bg-secondary-container/20 text-secondary border-secondary/30",
    Completed: "bg-green-500/15 text-green-400 border-green-500/30",
    Cancelled: "bg-error-container/20 text-error border-error/30",
    Draft: "bg-surface-variant/40 text-on-surface-variant border-outline-variant",
    Active: "bg-primary-container/20 text-primary border-primary/30",
  };
  const cls = map[status] ?? "bg-surface-variant/40 text-on-surface-variant border-outline-variant";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded uppercase border ${cls}`}
    >
      {status}
    </span>
  );
}
