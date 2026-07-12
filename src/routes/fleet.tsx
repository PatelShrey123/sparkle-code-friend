import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, StatusPill } from "@/components/AppLayout";
import { actions, useDB, type Vehicle, type VehicleStatus } from "@/lib/store";

export const Route = createFileRoute("/fleet")({
  head: () => ({ meta: [{ title: "Fleet Registry — TransitOps" }] }),
  component: FleetPage,
});

const STATUSES: VehicleStatus[] = ["Available", "On Trip", "In Shop", "Retired"];

function FleetPage() {
  const vehicles = useDB((d) => d.vehicles);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VehicleStatus | "All">("All");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  const filtered = useMemo(
    () =>
      vehicles.filter((v) => {
        if (filter !== "All" && v.status !== filter) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.registration.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q)
        );
      }),
    [vehicles, query, filter],
  );

  return (
    <AppLayout title="Fleet Registry">
      <div className="space-y-6">
        <div className="sticky top-[64px] z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-background/95 backdrop-blur space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vehicle name, registration or type..."
              className="w-full bg-surface-container border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(["All", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border transition-colors ${
                  filter === s
                    ? "bg-primary-container text-on-primary-container border-primary-container"
                    : "border-outline-variant text-on-surface-variant hover:border-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState onAdd={() => setOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  setEditing(v);
                  setOpen(true);
                }}
                className={`group cursor-pointer bg-surface-container border border-outline-variant rounded-lg overflow-hidden transition-all hover:border-primary/50 hover:bg-surface-container-high ${
                  v.status === "Retired" ? "opacity-60 grayscale hover:opacity-100 hover:grayscale-0" : ""
                }`}
              >
                <div className="p-4 space-y-4 h-full flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-surface-container-lowest text-primary font-mono text-[11px] px-2 py-1 border border-primary/30 rounded">
                        REG: {v.registration}
                      </span>
                      <h3 className="font-display text-[20px] font-semibold mt-2">{v.name}</h3>
                      <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">
                        {v.type}
                      </p>
                    </div>
                    <StatusPill status={v.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-y border-outline-variant/40 py-3">
                    <div>
                      <span className="text-[11px] uppercase text-on-surface-variant">Capacity</span>
                      <p className="font-mono text-sm">{v.capacity.toLocaleString()} kg</p>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase text-on-surface-variant">Odometer</span>
                      <p className="font-mono text-sm">{v.odometer.toLocaleString()} km</p>
                    </div>
                  </div>

                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant">
                      Cost: ${v.cost.toLocaleString()}
                    </span>
                    <span className="text-primary text-[11px] font-bold uppercase tracking-wider">
                      Edit →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
        className="fixed bottom-20 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-primary-container text-on-primary-container rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform flex items-center justify-center z-50"
      >
        <span className="material-symbols-outlined text-[32px]">add</span>
      </button>

      {open && (
        <VehicleModal
          vehicle={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}
    </AppLayout>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 border border-dashed border-outline-variant rounded-lg">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant">
        local_shipping
      </span>
      <p className="mt-3 text-on-surface-variant">No vehicles match your filter.</p>
      <button
        onClick={onAdd}
        className="mt-4 bg-primary-container text-on-primary-container px-4 py-2 rounded font-bold text-sm"
      >
        Register new vehicle
      </button>
    </div>
  );
}

function VehicleModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Vehicle, "id">>(
    vehicle ?? {
      registration: "",
      name: "",
      type: "Sprinter Van",
      capacity: 1000,
      odometer: 0,
      cost: 0,
      status: "Available",
    },
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container border border-outline-variant rounded-lg max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-display text-[20px] font-semibold">
            {vehicle ? "Edit Vehicle" : "Register Vehicle"}
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            try {
              if (vehicle) actions.updateVehicle(vehicle.id, form);
              else actions.addVehicle(form);
              onClose();
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration #">
              <input
                required
                value={form.registration}
                onChange={(e) => setForm({ ...form, registration: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Name / Model">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Type">
              <input
                required
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Max Load (kg)">
              <input
                required
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: +e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Odometer (km)">
              <input
                required
                type="number"
                value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: +e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Acquisition Cost ($)">
              <input
                required
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: +e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })}
                className="input"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          {error && (
            <div className="text-error text-sm border border-error/30 bg-error-container/10 p-3 rounded">
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            {vehicle && (
              <button
                type="button"
                onClick={() => {
                  actions.deleteVehicle(vehicle.id);
                  onClose();
                }}
                className="px-4 py-2 border border-error/40 text-error rounded text-sm hover:bg-error/10"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant rounded text-sm"
            >
              Cancel
            </button>
            <button className="px-4 py-2 bg-primary-container text-on-primary-container rounded font-bold text-sm">
              {vehicle ? "Save" : "Register"}
            </button>
          </div>
        </form>
        <style>{`.input{width:100%;padding:10px 12px;border:1px solid var(--color-outline-variant);border-radius:6px;background:var(--color-surface-container-lowest);color:var(--color-on-surface);font-size:14px}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
      {label}
      <div className="font-normal normal-case tracking-normal text-on-surface">{children}</div>
    </label>
  );
}
