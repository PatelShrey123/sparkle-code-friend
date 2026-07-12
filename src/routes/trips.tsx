import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, StatusPill } from "@/components/AppLayout";
import { actions, useDB } from "@/lib/store";

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Trip Dispatcher — TransitOps" }] }),
  component: TripsPage,
});

function TripsPage() {
  const vehicles = useDB((d) => d.vehicles);
  const drivers = useDB((d) => d.drivers);
  const trips = useDB((d) => d.trips);

  const today = new Date();
  const eligibleVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "Available"),
    [vehicles],
  );
  const eligibleDrivers = useMemo(
    () =>
      drivers.filter(
        (d) =>
          d.status === "Available" && d.status !== "Suspended" && new Date(d.licenseExpiry) > today,
      ),
    [drivers, today],
  );

  const [form, setForm] = useState({
    source: "Gandhinagar Depot",
    destination: "Ahmedabad Hub",
    vehicleId: "",
    driverId: "",
    cargoWeight: 100,
    distance: 30,
    revenue: 500,
  });
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const vehicle = vehicles.find((v) => v.id === form.vehicleId);
  const overCap = vehicle && form.cargoWeight > vehicle.capacity;

  return (
    <AppLayout title="Trip Dispatcher">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-surface-container border border-outline-variant p-6 rounded-lg space-y-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">route</span>
            <h2 className="font-display font-semibold text-[18px]">Create Trip</h2>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setMsg(null);
              try {
                if (!form.vehicleId || !form.driverId)
                  throw new Error("Select vehicle and driver");
                const trip = actions.createTrip({
                  source: form.source,
                  destination: form.destination,
                  vehicleId: form.vehicleId,
                  driverId: form.driverId,
                  cargoWeight: form.cargoWeight,
                  distance: form.distance,
                  revenue: form.revenue,
                });
                actions.dispatchTrip(trip.id);
                setMsg(`Dispatched TR-${trip.id.slice(0, 5).toUpperCase()}`);
                setForm({ ...form, vehicleId: "", driverId: "", cargoWeight: 100 });
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <F label="Source">
                <input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required />
              </F>
              <F label="Destination">
                <input className="input" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
              </F>
              <F label="Vehicle (Available only)">
                <select className="input" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
                  <option value="">Select vehicle</option>
                  {eligibleVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — cap {v.capacity}kg
                    </option>
                  ))}
                </select>
              </F>
              <F label="Driver (Eligible only)">
                <select className="input" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} required>
                  <option value="">Select driver</option>
                  {eligibleDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.category}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Cargo Weight (kg)">
                <input className="input" type="number" value={form.cargoWeight} onChange={(e) => setForm({ ...form, cargoWeight: +e.target.value })} required />
              </F>
              <F label="Distance (km)">
                <input className="input" type="number" value={form.distance} onChange={(e) => setForm({ ...form, distance: +e.target.value })} required />
              </F>
              <F label="Estimated Revenue ($)">
                <input className="input" type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: +e.target.value })} />
              </F>
            </div>

            {overCap && (
              <div className="bg-error-container/20 border-l-4 border-error p-4 rounded flex items-start gap-3">
                <span className="material-symbols-outlined text-error">warning</span>
                <div>
                  <p className="font-display font-semibold text-error text-sm">Capacity Exceeded</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Cargo {form.cargoWeight}kg exceeds vehicle capacity {vehicle?.capacity}kg.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="text-error text-sm border border-error/30 bg-error-container/10 p-3 rounded">
                {error}
              </div>
            )}
            {msg && (
              <div className="text-green-400 text-sm border border-green-500/30 bg-green-500/10 p-3 rounded">
                {msg}
              </div>
            )}

            <button
              disabled={!!overCap}
              className="w-full bg-primary-container text-on-primary-container font-display font-semibold py-4 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
            >
              Dispatch Trip
            </button>
          </form>
        </section>

        <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-display font-semibold text-[18px]">Trip Ledger</h2>
            <span className="text-[11px] uppercase tracking-widest text-on-surface-variant">
              {trips.length} records
            </span>
          </div>
          <div className="divide-y divide-outline-variant max-h-[600px] overflow-y-auto">
            {trips.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant text-sm">
                No trips yet.
              </div>
            )}
            {trips.map((t) => {
              const v = vehicles.find((x) => x.id === t.vehicleId);
              const d = drivers.find((x) => x.id === t.driverId);
              return (
                <div key={t.id} className="p-4 space-y-2 hover:bg-surface-container-high">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] text-primary">
                        TR-{t.id.slice(0, 5).toUpperCase()}
                      </span>
                      <StatusPill status={t.status} />
                    </div>
                    <div className="flex gap-2">
                      {t.status === "Dispatched" && (
                        <>
                          <button
                            onClick={() => actions.completeTrip(t.id, (v?.odometer ?? 0) + t.distance, t.distance / 8)}
                            className="text-[11px] px-3 py-1 rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 font-bold uppercase tracking-wider"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => actions.cancelTrip(t.id)}
                            className="text-[11px] px-3 py-1 rounded border border-error/40 text-error hover:bg-error/10 font-bold uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm">
                    <span className="text-on-surface-variant">Route:</span> {t.source} → {t.destination}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-on-surface-variant">
                    <span>Vehicle: <span className="text-on-surface font-mono">{v?.name ?? "—"}</span></span>
                    <span>Driver: <span className="text-on-surface">{d?.name ?? "—"}</span></span>
                    <span>Cargo: <span className="text-on-surface font-mono">{t.cargoWeight}kg</span></span>
                    <span>Distance: <span className="text-on-surface font-mono">{t.distance}km</span></span>
                    {t.revenue != null && <span>Revenue: <span className="text-on-surface font-mono">${t.revenue}</span></span>}
                    {t.fuelConsumed != null && <span>Fuel: <span className="text-on-surface font-mono">{t.fuelConsumed.toFixed(1)}L</span></span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
      {label}
      <div className="font-normal normal-case tracking-normal text-on-surface">{children}</div>
    </label>
  );
}
