import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, StatusPill } from "@/components/AppLayout";
import { actions, useDB } from "@/lib/store";

export const Route = createFileRoute("/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance Logs — TransitOps" }] }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const vehicles = useDB((d) => d.vehicles);
  const maintenance = useDB((d) => d.maintenance);
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id ?? "",
    type: "Oil Change",
    cost: 200,
    date: new Date().toISOString().slice(0, 10),
    status: "Active" as "Active" | "Completed",
    notes: "",
  });

  const avgMonthly =
    maintenance.length > 0
      ? maintenance.reduce((s, m) => s + m.cost, 0) / Math.max(1, maintenance.length)
      : 0;

  return (
    <AppLayout title="Maintenance">
      <div className="space-y-6">
        <section className="rounded-lg overflow-hidden border border-outline-variant bg-gradient-to-r from-primary-container/20 to-surface-container p-6">
          <span className="bg-primary-container text-on-primary-container px-2 py-1 text-[11px] font-bold uppercase rounded">
            System View
          </span>
          <h2 className="font-display text-[24px] font-semibold mt-2">Operational Maintenance Hub</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Logging a service switches the vehicle to <span className="text-primary">In Shop</span> and hides it from dispatch.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 space-y-4">
            <div className="bg-surface-container p-6 rounded-lg border border-outline-variant">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-semibold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">add_task</span>
                  Log Service Record
                </h3>
              </div>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  actions.addMaintenance(form);
                  setForm({ ...form, cost: 0, notes: "" });
                }}
              >
                <F label="Vehicle">
                  <select className="input" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.registration}) — {v.status}
                      </option>
                    ))}
                  </select>
                </F>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Service Type">
                    <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option>Oil Change</option>
                      <option>Brake Inspection</option>
                      <option>Tire Rotation</option>
                      <option>Transmission</option>
                      <option>Preventive Maint.</option>
                      <option>Diagnostics</option>
                    </select>
                  </F>
                  <F label="Cost (USD)">
                    <input className="input" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Math.max(0, +e.target.value || 0) })} required />
                  </F>
                  <F label="Date">
                    <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </F>
                  <F label="Status">
                    <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "Active" | "Completed" })}>
                      <option value="Active">Active / In Shop</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </F>
                </div>
                <F label="Notes">
                  <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </F>
                <button className="w-full bg-primary-container text-on-primary-container font-display font-semibold py-4 rounded-lg hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">save</span>
                  Update Fleet Log
                </button>
              </form>
            </div>

            <div className="bg-surface-container p-6 rounded-lg border-l-4 border-primary border-y border-r border-outline-variant">
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Avg Cost per Record
              </p>
              <p className="font-display text-[32px] font-black mt-1">${avgMonthly.toFixed(2)}</p>
              <p className="text-xs text-on-surface-variant mt-2">
                {maintenance.length} maintenance records on file.
              </p>
            </div>
          </section>

          <section className="lg:col-span-7">
            <div className="bg-surface-container rounded-lg border border-outline-variant">
              <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                <h3 className="font-display font-semibold text-[18px]">Service History</h3>
              </div>
              <div className="divide-y divide-outline-variant/60 max-h-[600px] overflow-y-auto">
                {maintenance.length === 0 && (
                  <div className="p-8 text-center text-on-surface-variant text-sm">
                    No maintenance records.
                  </div>
                )}
                {maintenance.map((m) => {
                  const v = vehicles.find((x) => x.id === m.vehicleId);
                  return (
                    <div key={m.id} className="grid grid-cols-6 gap-2 px-4 py-3 items-center hover:bg-surface-container-high">
                      <span className="font-mono text-[13px] col-span-1">{v?.name ?? "—"}</span>
                      <span className="text-sm col-span-2">{m.type}</span>
                      <span className="font-mono text-[13px] col-span-1">${m.cost.toFixed(2)}</span>
                      <span className="col-span-1">
                        <StatusPill status={m.status === "Active" ? "In Shop" : "Completed"} />
                      </span>
                      <div className="col-span-1 flex justify-end">
                        {m.status === "Active" && (
                          <button
                            onClick={() => actions.closeMaintenance(m.id)}
                            className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                          >
                            Close →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
      <style>{`.input{width:100%;padding:10px 12px;border:1px solid var(--color-outline-variant);border-radius:6px;background:var(--color-surface-container-lowest);color:var(--color-on-surface);font-size:14px}`}</style>
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
