import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, StatusPill } from "@/components/AppLayout";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TransitOps" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const vehicles = useDB((d) => d.vehicles);
  const drivers = useDB((d) => d.drivers);
  const trips = useDB((d) => d.trips);

  const active = vehicles.filter((v) => v.status === "On Trip").length;
  const available = vehicles.filter((v) => v.status === "Available").length;
  const inShop = vehicles.filter((v) => v.status === "In Shop").length;
  const retired = vehicles.filter((v) => v.status === "Retired").length;
  const totalNonRetired = vehicles.length - retired;
  const utilization = totalNonRetired
    ? Math.round((active / totalNonRetired) * 100)
    : 0;
  const onDuty = drivers.filter((d) => d.status !== "Off Duty" && d.status !== "Suspended").length;
  const activeTrips = trips.filter((t) => t.status === "Dispatched").length;
  const pendingTrips = trips.filter((t) => t.status === "Draft").length;

  const kpis = [
    { label: "Active Vehicles", value: active, color: "border-primary", icon: "local_shipping" },
    { label: "Available", value: available, color: "border-green-500", icon: "check_circle" },
    { label: "In Shop", value: inShop, color: "border-error", icon: "build" },
    { label: "Active Trips", value: activeTrips, color: "border-secondary", icon: "route" },
    { label: "Pending Trips", value: pendingTrips, color: "border-outline", icon: "pending" },
    { label: "Drivers On Duty", value: onDuty, color: "border-tertiary", icon: "badge" },
  ];

  const statusRows = [
    { label: "On Trip", value: active, total: totalNonRetired, bar: "bg-primary", text: "text-primary" },
    { label: "Available", value: available, total: totalNonRetired, bar: "bg-secondary", text: "text-secondary" },
    { label: "In Shop", value: inShop, total: totalNonRetired, bar: "bg-error", text: "text-error" },
    { label: "Retired", value: retired, total: vehicles.length, bar: "bg-on-surface-variant", text: "text-on-surface-variant" },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`bg-surface-container border border-outline-variant border-l-4 ${k.color} p-4 flex flex-col justify-between h-28`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {k.label}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                  {k.icon}
                </span>
              </div>
              <span className="font-display text-[32px] font-black">
                {String(k.value).padStart(2, "0")}
              </span>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container border border-outline-variant p-6 rounded">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-[18px] font-semibold">Vehicle Status</h2>
              <span className="text-[11px] uppercase tracking-widest text-on-surface-variant">
                Fleet · {vehicles.length}
              </span>
            </div>
            <div className="space-y-4">
              {statusRows.map((r) => {
                const pct = r.total ? Math.max(2, (r.value / r.total) * 100) : 0;
                return (
                  <div key={r.label} className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-on-surface-variant">{r.label}</span>
                      <span className={`font-mono text-[13px] ${r.text}`}>
                        {String(r.value).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                      <div
                        className={`${r.bar} h-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Fleet Utilization
                </span>
                <span className="font-display text-[24px] font-semibold">{utilization}%</span>
              </div>
              <div className="w-full bg-surface-variant h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-tertiary h-full" style={{ width: `${utilization}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant p-6 rounded">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-[18px] font-semibold">Recent Trips</h2>
              <span className="text-[11px] uppercase tracking-widest text-primary">
                {trips.length} logged
              </span>
            </div>
            {trips.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant text-sm">
                No trips yet. Create one from the Trips section.
              </div>
            ) : (
              <div className="space-y-3">
                {trips.slice(0, 5).map((t) => {
                  const v = vehicles.find((x) => x.id === t.vehicleId);
                  const d = drivers.find((x) => x.id === t.driverId);
                  const borderMap: Record<string, string> = {
                    Draft: "border-outline",
                    Dispatched: "border-secondary",
                    Completed: "border-green-500",
                    Cancelled: "border-error",
                  };
                  return (
                    <div
                      key={t.id}
                      className={`bg-surface-container-high p-4 border-l-2 ${borderMap[t.status]} flex justify-between items-start rounded`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] text-primary">
                            TR-{t.id.slice(0, 5).toUpperCase()}
                          </span>
                          <StatusPill status={t.status} />
                        </div>
                        <p className="text-sm">
                          {t.source} → {t.destination}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {v?.name ?? "—"} · {d?.name ?? "Unassigned"} · {t.distance} km
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
