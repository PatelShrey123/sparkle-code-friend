import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, StatusPill } from "@/components/AppLayout";
import { actions, useDB, type Driver, type DriverStatus } from "@/lib/store";

export const Route = createFileRoute("/drivers")({
  head: () => ({ meta: [{ title: "Driver Management — TransitOps" }] }),
  component: DriversPage,
});

const STATUSES: DriverStatus[] = ["Available", "On Trip", "Off Duty", "Suspended"];

function DriversPage() {
  const drivers = useDB((d) => d.drivers);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const filtered = useMemo(
    () =>
      drivers.filter((d) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.license.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
        );
      }),
    [drivers, query],
  );

  const today = new Date();

  return (
    <AppLayout title="Drivers">
      <div className="space-y-6">
        <div className="relative max-w-2xl">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search driver name or license..."
            className="w-full border border-outline-variant px-10 py-3 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => {
            const expired = new Date(d.licenseExpiry) < today;
            return (
              <div
                key={d.id}
                onClick={() => {
                  setEditing(d);
                  setOpen(true);
                }}
                className={`cursor-pointer bg-surface-container border border-outline-variant p-4 rounded-lg space-y-4 transition-all hover:border-primary/50 ${
                  d.status === "Suspended" ? "border-l-4 border-l-error" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-container/20 border border-outline-variant flex items-center justify-center font-display font-bold text-primary text-lg">
                      {d.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">{d.name}</h3>
                      <p className="font-mono text-[13px] text-on-surface-variant">{d.license}</p>
                    </div>
                  </div>
                  <StatusPill status={d.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 border-y border-outline-variant/40 py-3">
                  <div>
                    <span className="text-[11px] uppercase text-on-surface-variant">Category</span>
                    <p className="text-sm">{d.category}</p>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase text-on-surface-variant">Safety</span>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-sm">star</span>
                      <span className="font-mono text-[13px]">{d.safetyScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase tracking-wider text-on-surface-variant">License exp.</span>
                  <span className={`font-mono ${expired ? "text-error" : "text-on-surface"}`}>
                    {d.licenseExpiry}
                    {expired && " · EXPIRED"}
                  </span>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-surface-container/50 border border-dashed border-outline-variant p-6 rounded-lg flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:text-primary hover:border-primary transition-all"
          >
            <span className="material-symbols-outlined text-4xl">person_add</span>
            <p className="font-display font-semibold">Register New Driver</p>
          </button>
        </div>
      </div>

      {open && (
        <DriverModal
          driver={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}
    </AppLayout>
  );
}

function DriverModal({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const [form, setForm] = useState<Omit<Driver, "id">>(
    driver ?? {
      name: "",
      license: "",
      category: "LMV",
      licenseExpiry: new Date(Date.now() + 365 * 86400e3).toISOString().slice(0, 10),
      contact: "",
      safetyScore: 4.5,
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
            {driver ? "Edit Driver" : "Register Driver"}
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
              if (driver) actions.updateDriver(driver.id, form);
              else actions.addDriver(form);
              onClose();
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            <Field label="License #">
              <input required value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} className="input" />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                <option>LMV</option>
                <option>HMV</option>
                <option>HGV</option>
                <option>PSV</option>
              </select>
            </Field>
            <Field label="License Expiry">
              <input required type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} className="input" />
            </Field>
            <Field label="Contact">
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="input" />
            </Field>
            <Field label="Safety Score (0-5)">
              <input required type="number" min={0} max={5} step={0.1} value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: +e.target.value })} className="input" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DriverStatus })} className="input">
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
            {driver && (
              <button
                type="button"
                onClick={() => {
                  actions.deleteDriver(driver.id);
                  onClose();
                }}
                className="px-4 py-2 border border-error/40 text-error rounded text-sm hover:bg-error/10"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-4 py-2 border border-outline-variant rounded text-sm">
              Cancel
            </button>
            <button className="px-4 py-2 bg-primary-container text-on-primary-container rounded font-bold text-sm">
              {driver ? "Save" : "Register"}
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
