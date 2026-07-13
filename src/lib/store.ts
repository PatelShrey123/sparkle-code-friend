// Thin backwards-compatible adapter over the Supabase-backed React Query hooks
// so the existing route files can continue using `useDB(...)` and `actions.*`
// while all reads/writes go through Lovable Cloud (Postgres + RLS).
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useVehicles,
  useDrivers,
  useTrips,
  useMaintenance,
  useFuel,
  useExpenses,
  type Vehicle as DBVehicle,
  type Driver as DBDriver,
  type Trip as DBTrip,
  type MaintenanceLog as DBMaint,
  type FuelLog as DBFuel,
  type Expense as DBExp,
  type VehicleStatus,
  type DriverStatus,
  type TripStatus,
  type ExpenseCategory,
} from "@/lib/queries";

export type { VehicleStatus, DriverStatus, TripStatus };
export type Role = "Fleet Manager" | "Dispatcher" | "Safety Officer" | "Financial Analyst";

// Legacy row shapes (camelCase) the routes expect
export interface Vehicle {
  id: string;
  registration: string;
  name: string;
  type: string;
  capacity: number;
  odometer: number;
  cost: number;
  status: VehicleStatus;
}
export interface Driver {
  id: string;
  name: string;
  license: string;
  category: string;
  licenseExpiry: string;
  contact: string;
  safetyScore: number;
  status: DriverStatus;
}
export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  distance: number;
  status: TripStatus;
  createdAt: string;
  revenue?: number;
  fuelConsumed?: number;
  finalOdometer?: number;
}
export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type: string;
  cost: number;
  date: string;
  status: "Active" | "Completed";
  notes?: string;
}
export interface FuelLog {
  id: string;
  vehicleId: string;
  liters: number;
  cost: number;
  date: string;
  station?: string;
}
export interface Expense {
  id: string;
  tripId?: string;
  category: "Tolls" | "Misc" | "Consumables" | "Parking" | "Other";
  amount: number;
  description: string;
  date: string;
}

// --- mappers ---
const mapVehicle = (v: DBVehicle): Vehicle => ({ ...v });
const mapDriver = (d: DBDriver): Driver => ({
  id: d.id,
  name: d.name,
  license: d.license,
  category: d.category,
  licenseExpiry: d.license_expiry,
  contact: d.contact,
  safetyScore: d.safety_score,
  status: d.status,
});
const mapTrip = (t: DBTrip): Trip => ({
  id: t.id,
  source: t.source,
  destination: t.destination,
  vehicleId: t.vehicle_id,
  driverId: t.driver_id,
  cargoWeight: t.cargo_weight,
  distance: t.distance,
  status: t.status,
  createdAt: t.created_at,
  revenue: t.revenue ?? undefined,
  fuelConsumed: t.fuel_consumed ?? undefined,
  finalOdometer: t.final_odometer ?? undefined,
});
const mapMaint = (m: DBMaint): MaintenanceLog => ({
  id: m.id,
  vehicleId: m.vehicle_id,
  type: m.type,
  cost: m.cost,
  date: m.date,
  status: m.status,
  notes: m.notes ?? undefined,
});
const mapFuel = (f: DBFuel): FuelLog => ({
  id: f.id,
  vehicleId: f.vehicle_id,
  liters: f.liters,
  cost: f.cost,
  date: f.date,
  station: f.station ?? undefined,
});
const mapExp = (e: DBExp): Expense => ({
  id: e.id,
  tripId: e.trip_id ?? undefined,
  category: e.category,
  amount: e.amount,
  description: e.description,
  date: e.date,
});

interface Snapshot {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: MaintenanceLog[];
  fuel: FuelLog[];
  expenses: Expense[];
}

/**
 * Returns a slice of the live backend data. Loads everything through React Query
 * so every route stays reactive.
 */
export function useDB<T>(selector: (d: Snapshot) => T): T {
  const v = useVehicles().data ?? [];
  const d = useDrivers().data ?? [];
  const t = useTrips().data ?? [];
  const m = useMaintenance().data ?? [];
  const f = useFuel().data ?? [];
  const e = useExpenses().data ?? [];
  const snap: Snapshot = {
    vehicles: v.map(mapVehicle),
    drivers: d.map(mapDriver),
    trips: t.map(mapTrip),
    maintenance: m.map(mapMaint),
    fuel: f.map(mapFuel),
    expenses: e.map(mapExp),
  };
  return selector(snap);
}

/**
 * Hook to invalidate query caches after a mutation ran outside of React.
 * `actions` below uses a lazy queryClient reference kept in module state.
 */
let _qcRef: ReturnType<typeof useQueryClient> | null = null;
export function useBindActions() {
  const qc = useQueryClient();
  _qcRef = qc;
  return null;
}

function invalidate(keys: string[]) {
  const qc = _qcRef;
  if (!qc) return;
  keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

// Runtime lookups used by trip creation
function getCached<T>(key: string): T[] {
  return (_qcRef?.getQueryData<T[]>([key]) ?? []) as T[];
}

export const actions = {
  async addVehicle(v: Omit<Vehicle, "id">) {
    const { error } = await supabase.from("vehicles").insert({
      registration: v.registration,
      name: v.name,
      type: v.type,
      capacity: v.capacity,
      odometer: v.odometer,
      cost: v.cost,
      status: v.status,
    });
    if (error) throw new Error(error.message);
    invalidate(["vehicles"]);
  },
  async updateVehicle(id: string, patch: Partial<Vehicle>) {
    const { error } = await supabase.from("vehicles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    invalidate(["vehicles"]);
  },
  async deleteVehicle(id: string) {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) throw new Error(error.message);
    invalidate(["vehicles"]);
  },
  async addDriver(d: Omit<Driver, "id">) {
    const { error } = await supabase.from("drivers").insert({
      name: d.name,
      license: d.license,
      category: d.category,
      license_expiry: d.licenseExpiry,
      contact: d.contact,
      safety_score: d.safetyScore,
      status: d.status,
    });
    if (error) throw new Error(error.message);
    invalidate(["drivers"]);
  },
  async updateDriver(id: string, patch: Partial<Driver>) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.license !== undefined) dbPatch.license = patch.license;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.licenseExpiry !== undefined) dbPatch.license_expiry = patch.licenseExpiry;
    if (patch.contact !== undefined) dbPatch.contact = patch.contact;
    if (patch.safetyScore !== undefined) dbPatch.safety_score = patch.safetyScore;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    const { error } = await supabase.from("drivers").update(dbPatch).eq("id", id);
    if (error) throw new Error(error.message);
    invalidate(["drivers"]);
  },
  async deleteDriver(id: string) {
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) throw new Error(error.message);
    invalidate(["drivers"]);
  },
  createTrip(t: Omit<Trip, "id" | "status" | "createdAt">): Trip {
    // Synchronous-looking API for legacy routes; validate + kick off insert.
    const vehicles = getCached<DBVehicle>("vehicles");
    const drivers = getCached<DBDriver>("drivers");
    const v = vehicles.find((x) => x.id === t.vehicleId);
    const d = drivers.find((x) => x.id === t.driverId);
    if (!v || !d) throw new Error("Vehicle or driver not found");
    if (v.status === "Retired" || v.status === "In Shop")
      throw new Error("Vehicle is not eligible for dispatch");
    if (v.status === "On Trip") throw new Error("Vehicle is already on a trip");
    if (d.status === "On Trip") throw new Error("Driver is already on a trip");
    if (d.status === "Suspended") throw new Error("Driver is suspended");
    if (new Date(d.license_expiry) < new Date()) throw new Error("Driver license expired");
    if (t.cargoWeight > v.capacity)
      throw new Error(`Cargo weight ${t.cargoWeight}kg exceeds capacity ${v.capacity}kg`);
    const trip: Trip = {
      ...t,
      id: crypto.randomUUID(),
      status: "Draft",
      createdAt: new Date().toISOString(),
    };
    supabase
      .from("trips")
      .insert({
        id: trip.id,
        source: t.source,
        destination: t.destination,
        vehicle_id: t.vehicleId,
        driver_id: t.driverId,
        cargo_weight: t.cargoWeight,
        distance: t.distance,
        revenue: t.revenue ?? null,
        status: "Draft",
      })
      .then(({ error }) => {
        if (error) console.error(error);
        invalidate(["trips"]);
      });
    return trip;
  },
  async dispatchTrip(id: string) {
    const { data: trip, error } = await supabase.from("trips").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    await supabase.from("trips").update({ status: "Dispatched" }).eq("id", id);
    await supabase.from("vehicles").update({ status: "On Trip" }).eq("id", trip.vehicle_id);
    await supabase.from("drivers").update({ status: "On Trip" }).eq("id", trip.driver_id);
    invalidate(["trips", "vehicles", "drivers"]);
  },
  async completeTrip(id: string, finalOdometer?: number, fuelConsumed?: number) {
    const { data: trip, error } = await supabase.from("trips").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    await supabase
      .from("trips")
      .update({ status: "Completed", final_odometer: finalOdometer ?? null, fuel_consumed: fuelConsumed ?? null })
      .eq("id", id);
    const { data: veh } = await supabase.from("vehicles").select("odometer").eq("id", trip.vehicle_id).single();
    await supabase
      .from("vehicles")
      .update({ status: "Available", odometer: finalOdometer ?? ((veh?.odometer ?? 0) + trip.distance) })
      .eq("id", trip.vehicle_id);
    await supabase.from("drivers").update({ status: "Available" }).eq("id", trip.driver_id);
    invalidate(["trips", "vehicles", "drivers"]);
  },
  async cancelTrip(id: string) {
    const { data: trip, error } = await supabase.from("trips").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    const was = trip.status === "Dispatched";
    await supabase.from("trips").update({ status: "Cancelled" }).eq("id", id);
    if (was) {
      await supabase.from("vehicles").update({ status: "Available" }).eq("id", trip.vehicle_id);
      await supabase.from("drivers").update({ status: "Available" }).eq("id", trip.driver_id);
    }
    invalidate(["trips", "vehicles", "drivers"]);
  },
  async addMaintenance(m: Omit<MaintenanceLog, "id">) {
    const { error } = await supabase.from("maintenance_logs").insert({
      vehicle_id: m.vehicleId,
      type: m.type,
      cost: m.cost,
      date: m.date,
      status: m.status,
      notes: m.notes ?? null,
    });
    if (error) throw new Error(error.message);
    if (m.status === "Active") {
      await supabase.from("vehicles").update({ status: "In Shop" }).eq("id", m.vehicleId).neq("status", "Retired");
    }
    invalidate(["maintenance_logs", "vehicles"]);
  },
  async closeMaintenance(id: string) {
    const { data: m, error } = await supabase.from("maintenance_logs").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    await supabase.from("maintenance_logs").update({ status: "Completed" }).eq("id", id);
    const { data: others } = await supabase
      .from("maintenance_logs")
      .select("id")
      .eq("vehicle_id", m.vehicle_id)
      .eq("status", "Active")
      .neq("id", id);
    if (!others || others.length === 0) {
      await supabase.from("vehicles").update({ status: "Available" }).eq("id", m.vehicle_id).eq("status", "In Shop");
    }
    invalidate(["maintenance_logs", "vehicles"]);
  },
  async addFuel(f: Omit<FuelLog, "id">) {
    const { error } = await supabase.from("fuel_logs").insert({
      vehicle_id: f.vehicleId,
      liters: f.liters,
      cost: f.cost,
      date: f.date,
      station: f.station ?? null,
    });
    if (error) throw new Error(error.message);
    invalidate(["fuel_logs"]);
  },
  async addExpense(e: Omit<Expense, "id">) {
    const cat = e.category as ExpenseCategory;
    const { error } = await supabase.from("expenses").insert({
      trip_id: e.tripId ?? null,
      category: cat,
      amount: e.amount,
      description: e.description,
      date: e.date,
    });
    if (error) throw new Error(error.message);
    invalidate(["expenses"]);
  },
};
