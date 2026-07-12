import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { actions, useDB } from "@/lib/store";

export const Route = createFileRoute("/fuel")({
  head: () => ({ meta: [{ title: "Fuel & Expenses — TransitOps" }] }),
  component: FuelPage,
});

function FuelPage() {
  const vehicles = useDB((d) => d.vehicles);
  const fuel = useDB((d) => d.fuel);
  const expenses = useDB((d) => d.expenses);
  const trips = useDB((d) => d.trips);

  const [fuelForm, setFuelForm] = useState({
    vehicleId: vehicles[0]?.id ?? "",
    liters: 0,
    cost: 0,
    date: new Date().toISOString().slice(0, 10),
    station: "",
  });
  const [expForm, setExpForm] = useState({
    category: "Tolls" as const,
    amount: 0,
    description: "",
    tripId: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const totals = useMemo(() => {
    const totalFuel = fuel.reduce((s, f) => s + f.cost, 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    return { totalFuel, totalExp, total: totalFuel + totalExp };
  }, [fuel, expenses]);

  return (
    <AppLayout title="Fuel & Expenses">
      <div className="space-y-8">
        <section className="rounded-xl overflow-hidden border border-outline-variant bg-gradient-to-br from-primary-container/20 to-surface-container p-6">
          <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
            Q3 Fleet Efficiency
          </span>
          <h2 className="font-display text-[32px] font-black mt-1">Operational Cost Matrix</h2>
        </section>

        <section className="space-y-4">
          <h3 className="font-display font-semibold text-[18px] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">local_gas_station</span>
            Log Fuel
          </h3>
          <div className="bg-surface-container border border-outline-variant rounded-lg p-4">
            <form
              className="grid grid-cols-1 md:grid-cols-5 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!fuelForm.vehicleId) return;
                actions.addFuel(fuelForm);
                setFuelForm({ ...fuelForm, liters: 0, cost: 0, station: "" });
              }}
            >
              <F label="Vehicle">
                <select className="input" value={fuelForm.vehicleId} onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })} required>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Liters">
                <input className="input" type="number" step="0.1" value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: +e.target.value })} required />
              </F>
              <F label="Cost ($)">
                <input className="input" type="number" step="0.01" value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: +e.target.value })} required />
              </F>
              <F label="Station">
                <input className="input" value={fuelForm.station} onChange={(e) => setFuelForm({ ...fuelForm, station: e.target.value })} />
              </F>
              <button className="bg-primary-container text-on-primary-container rounded-lg font-bold text-sm">
                + Log Fuel
              </button>
            </form>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant text-[11px] uppercase tracking-widest text-on-surface-variant">
              Recent Refills
            </div>
            <div className="divide-y divide-outline-variant">
              {fuel.length === 0 && <div className="p-6 text-center text-on-surface-variant text-sm">No fuel logs yet.</div>}
              {fuel.map((f) => {
                const v = vehicles.find((x) => x.id === f.vehicleId);
                return (
                  <div key={f.id} className="p-4 flex justify-between items-center hover:bg-surface-container-high">
                    <div>
                      <p className="font-semibold">{v?.name ?? "—"}</p>
                      <p className="text-xs text-on-surface-variant">
                        {f.date}{f.station ? ` · ${f.station}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-primary">{f.liters.toFixed(2)} L</p>
                      <p className="text-xs text-on-surface-variant">${f.cost.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-display font-semibold text-[18px] flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">payments</span>
            Trip Expenses
          </h3>
          <div className="bg-surface-container border border-outline-variant rounded-lg p-4">
            <form
              className="grid grid-cols-1 md:grid-cols-5 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                actions.addExpense({
                  category: expForm.category,
                  amount: expForm.amount,
                  description: expForm.description,
                  date: expForm.date,
                  tripId: expForm.tripId || undefined,
                });
                setExpForm({ ...expForm, amount: 0, description: "" });
              }}
            >
              <F label="Category">
                <select className="input" value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value as typeof expForm.category })}>
                  <option>Tolls</option>
                  <option>Misc</option>
                  <option>Consumables</option>
                  <option>Parking</option>
                  <option>Other</option>
                </select>
              </F>
              <F label="Amount ($)">
                <input className="input" type="number" step="0.01" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: +e.target.value })} required />
              </F>
              <F label="Description">
                <input className="input" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} required />
              </F>
              <F label="Trip (opt.)">
                <select className="input" value={expForm.tripId} onChange={(e) => setExpForm({ ...expForm, tripId: e.target.value })}>
                  <option value="">—</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      TR-{t.id.slice(0, 5).toUpperCase()}
                    </option>
                  ))}
                </select>
              </F>
              <button className="bg-secondary-container text-on-secondary-container rounded-lg font-bold text-sm">
                + Add Expense
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expenses.length === 0 && (
              <div className="col-span-2 p-6 text-center text-on-surface-variant text-sm border border-outline-variant rounded-lg">
                No expenses logged.
              </div>
            )}
            {expenses.map((e) => (
              <div key={e.id} className="bg-surface-container border border-outline-variant p-4 rounded-lg flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-secondary/20 text-secondary text-[11px] px-2 py-0.5 rounded border border-secondary/30 uppercase font-bold">
                    {e.category}
                  </span>
                  <span className="font-mono font-bold">${e.amount.toFixed(2)}</span>
                </div>
                <p className="text-sm">{e.description}</p>
                <div className="mt-3 pt-3 border-t border-outline-variant/40 flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">event</span>
                  <span>{e.date}</span>
                  {e.tripId && (
                    <>
                      <span className="material-symbols-outlined text-[16px] ml-2">route</span>
                      <span>TR-{e.tripId.slice(0, 5).toUpperCase()}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-br from-surface-container to-surface-container-low border-l-4 border-primary border-y border-r border-outline-variant rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Total Period Expenditure
              </p>
              <p className="font-display text-[32px] font-black mt-1">
                ${totals.total.toFixed(2)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-12">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Fuel Component
                </p>
                <p className="font-mono text-primary font-bold text-lg">
                  ${totals.totalFuel.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Other Expenses
                </p>
                <p className="font-mono text-secondary font-bold text-lg">
                  ${totals.totalExp.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </section>
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
