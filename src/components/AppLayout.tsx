import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDB, actions } from "@/lib/store";
import { Logo } from "@/components/Logo";

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
  const session = useDB((d) => d.session);
  const users = useDB((d) => d.users);
  const user = session ? users.find((u) => u.id === session.userId) : null;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!session) navigate({ to: "/login" });
  }, [session, navigate]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <aside className="hidden md:flex flex-col fixed left-0 top-0 w-[240px] h-full bg-surface-container-low border-r border-outline-variant z-30">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-outline-variant">
          <Logo size={32} showWordmark />
        </div>
        <nav className="flex-1 py-4 space-y-1">
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
        </nav>
        <div className="p-4 border-t border-outline-variant">
          <button
            onClick={() => {
              actions.logout();
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
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[13px] font-semibold">{user?.name}</span>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
              {user?.role}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold border border-outline-variant">
            {user?.name.slice(0, 1)}
          </div>
        </div>
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

export function StatusPill({
  status,
}: {
  status: string;
}) {
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
