import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Reports & Analytics — TransitOps" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const vehicles = useDB((d) => d.vehicles);
  const trips = useDB((d) => d.trips);
  const fuel = useDB((d) => d.fuel);
  const maintenance = useDB((d) => d.maintenance);

  const perVehicle = useMemo(() => {
    return vehicles.map((v) => {
      const vTrips = trips.filter((t) => t.vehicleId === v.id && t.status === "Completed");
      const vFuel = fuel.filter((f) => f.vehicleId === v.id);
      const vMaint = maintenance.filter((m) => m.vehicleId === v.id);
      const distance = vTrips.reduce((s, t) => s + t.distance, 0);
      const litersFromTrips = vTrips.reduce((s, t) => s + (t.fuelConsumed ?? 0), 0);
      const liters = vFuel.reduce((s, f) => s + f.liters, 0) || litersFromTrips;
      const fuelCost = vFuel.reduce((s, f) => s + f.cost, 0);
      const maintCost = vMaint.reduce((s, m) => s + m.cost, 0);
      const revenue = vTrips.reduce((s, t) => s + (t.revenue ?? 0), 0);
      const efficiency = liters > 0 ? distance / liters : 0;
      const roi = v.cost > 0 ? ((revenue - (fuelCost + maintCost)) / v.cost) * 100 : 0;
      return { v, distance, liters, fuelCost, maintCost, revenue, efficiency, roi };
    });
  }, [vehicles, trips, fuel, maintenance]);

  const totalRevenue = perVehicle.reduce((s, r) => s + r.revenue, 0);
  const totalFuelCost = perVehicle.reduce((s, r) => s + r.fuelCost, 0);
  const totalMaintCost = perVehicle.reduce((s, r) => s + r.maintCost, 0);
  const active = vehicles.filter((v) => v.status !== "Retired").length;
  const onTrip = vehicles.filter((v) => v.status === "On Trip").length;
  const utilization = active ? Math.round((onTrip / active) * 100) : 0;

  const exportCsv = () => {
    const rows = [
      ["Vehicle", "Registration", "Distance(km)", "Liters", "Efficiency(km/L)", "Revenue($)", "Fuel($)", "Maint($)", "ROI(%)"],
      ...perVehicle.map((r) => [
        r.v.name,
        r.v.registration,
        r.distance,
        r.liters.toFixed(2),
        r.efficiency.toFixed(2),
        r.revenue.toFixed(2),
        r.fuelCost.toFixed(2),
        r.maintCost.toFixed(2),
        r.roi.toFixed(1),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transitops-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-on-surface-variant text-sm">
            Operational cost, fuel efficiency and ROI per vehicle.
          </p>
          <button
            onClick={exportCsv}
            className="border border-outline-variant px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-surface-container transition text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} color="text-green-400" />
          <Metric label="Fuel Spend" value={`$${totalFuelCost.toLocaleString()}`} color="text-primary" />
          <Metric label="Maintenance" value={`$${totalMaintCost.toLocaleString()}`} color="text-secondary" />
          <Metric label="Fleet Utilization" value={`${utilization}%`} color="text-tertiary" />
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          <div className="grid grid-cols-8 gap-2 px-4 py-3 bg-surface-container-low border-b border-outline-variant text-[11px] uppercase tracking-widest text-on-surface-variant font-bold">
            <span>Vehicle</span>
            <span>Reg</span>
            <span>Distance</span>
            <span>Efficiency</span>
            <span>Revenue</span>
            <span>Fuel</span>
            <span>Maint.</span>
            <span>ROI</span>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {perVehicle.map((r) => (
              <div key={r.v.id} className="grid grid-cols-8 gap-2 px-4 py-3 items-center text-sm hover:bg-surface-container-high">
                <span className="font-display font-semibold">{r.v.name}</span>
                <span className="font-mono text-[13px] text-on-surface-variant">{r.v.registration}</span>
                <span className="font-mono">{r.distance.toLocaleString()} km</span>
                <span className="font-mono text-primary">{r.efficiency.toFixed(2)} km/L</span>
                <span className="font-mono">${r.revenue.toFixed(0)}</span>
                <span className="font-mono">${r.fuelCost.toFixed(0)}</span>
                <span className="font-mono">${r.maintCost.toFixed(0)}</span>
                <span className={`font-mono font-bold ${r.roi >= 0 ? "text-green-400" : "text-error"}`}>
                  {r.roi.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-lg p-6">
          <h3 className="font-display font-semibold text-[18px] mb-4">Cost Distribution per Vehicle</h3>
          <div className="space-y-3">
            {perVehicle.map((r) => {
              const total = r.fuelCost + r.maintCost || 1;
              const fuelPct = (r.fuelCost / total) * 100;
              return (
                <div key={r.v.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-display font-semibold">{r.v.name}</span>
                    <span className="font-mono text-on-surface-variant">
                      ${(r.fuelCost + r.maintCost).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-surface-variant">
                    <div className="bg-primary" style={{ width: `${fuelPct}%` }} />
                    <div className="bg-secondary" style={{ width: `${100 - fuelPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" /> Fuel
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary" /> Maintenance
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-container border border-outline-variant p-4 rounded-lg">
      <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className={`font-display text-[24px] font-black mt-2 ${color}`}>{value}</p>
    </div>
  );
}
