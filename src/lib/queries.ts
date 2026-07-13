import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VehicleStatus = "Available" | "On Trip" | "In Shop" | "Retired";
export type DriverStatus = "Available" | "On Trip" | "Off Duty" | "Suspended";
export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";
export type MaintStatus = "Active" | "Completed";
export type ExpenseCategory = "Tolls" | "Misc" | "Consumables" | "Parking" | "Other";

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
  license_expiry: string;
  contact: string;
  safety_score: number;
  status: DriverStatus;
}
export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
  distance: number;
  status: TripStatus;
  revenue: number | null;
  fuel_consumed: number | null;
  final_odometer: number | null;
  created_at: string;
}
export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  type: string;
  cost: number;
  date: string;
  status: MaintStatus;
  notes: string | null;
}
export interface FuelLog {
  id: string;
  vehicle_id: string;
  liters: number;
  cost: number;
  date: string;
  station: string | null;
}
export interface Expense {
  id: string;
  trip_id: string | null;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
}

// ---------- generic helper ----------
function useList<T>(table: string, key: string, order: string = "created_at") {
  return useQuery({
    queryKey: [key],
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(table).select("*").order(order, { ascending: false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export const useVehicles = () => useList<Vehicle>("vehicles", "vehicles", "created_at");
export const useDrivers = () => useList<Driver>("drivers", "drivers", "created_at");
export const useTrips = () => useList<Trip>("trips", "trips", "created_at");
export const useMaintenance = () => useList<MaintenanceLog>("maintenance_logs", "maintenance_logs", "date");
export const useFuel = () => useList<FuelLog>("fuel_logs", "fuel_logs", "date");
export const useExpenses = () => useList<Expense>("expenses", "expenses", "date");

// ---------- mutations ----------
function useMut<T>(fn: (v: T) => Promise<unknown>, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

// Vehicles
export const useAddVehicle = () =>
  useMut(async (v: Omit<Vehicle, "id">) => {
    const { error } = await supabase.from("vehicles").insert(v);
    if (error) throw error;
  }, ["vehicles"]);
export const useUpdateVehicle = () =>
  useMut(async ({ id, ...patch }: Partial<Vehicle> & { id: string }) => {
    const { error } = await supabase.from("vehicles").update(patch).eq("id", id);
    if (error) throw error;
  }, ["vehicles"]);
export const useDeleteVehicle = () =>
  useMut(async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) throw error;
  }, ["vehicles"]);

// Drivers
export const useAddDriver = () =>
  useMut(async (d: Omit<Driver, "id">) => {
    const { error } = await supabase.from("drivers").insert(d);
    if (error) throw error;
  }, ["drivers"]);
export const useUpdateDriver = () =>
  useMut(async ({ id, ...patch }: Partial<Driver> & { id: string }) => {
    const { error } = await supabase.from("drivers").update(patch).eq("id", id);
    if (error) throw error;
  }, ["drivers"]);
export const useDeleteDriver = () =>
  useMut(async (id: string) => {
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) throw error;
  }, ["drivers"]);

// Trips — complex ops require multi-row updates; do them client-side via multiple calls
export const useCreateTrip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Omit<Trip, "id" | "status" | "created_at" | "fuel_consumed" | "final_odometer"> & { revenue?: number | null }) => {
      // Validate against current cached state
      const vehicles = qc.getQueryData<Vehicle[]>(["vehicles"]) ?? [];
      const drivers = qc.getQueryData<Driver[]>(["drivers"]) ?? [];
      const v = vehicles.find((x) => x.id === t.vehicle_id);
      const d = drivers.find((x) => x.id === t.driver_id);
      if (!v || !d) throw new Error("Vehicle or driver not found");
      if (v.status === "Retired" || v.status === "In Shop") throw new Error("Vehicle not eligible");
      if (v.status === "On Trip") throw new Error("Vehicle already on a trip");
      if (d.status === "On Trip") throw new Error("Driver already on a trip");
      if (d.status === "Suspended") throw new Error("Driver is suspended");
      if (new Date(d.license_expiry) < new Date()) throw new Error("Driver license expired");
      if (t.cargo_weight > v.capacity)
        throw new Error(`Cargo ${t.cargo_weight}kg exceeds capacity ${v.capacity}kg`);
      const { data, error } = await supabase.from("trips").insert({ ...t, status: "Draft" }).select().single();
      if (error) throw error;
      return data as Trip;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
};

export const useDispatchTrip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      const { data: trip, error: te } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (te) throw te;
      const { error: e1 } = await supabase.from("trips").update({ status: "Dispatched" }).eq("id", tripId);
      if (e1) throw e1;
      await supabase.from("vehicles").update({ status: "On Trip" }).eq("id", trip.vehicle_id);
      await supabase.from("drivers").update({ status: "On Trip" }).eq("id", trip.driver_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
};

export const useCompleteTrip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, finalOdometer, fuelConsumed }: { id: string; finalOdometer?: number; fuelConsumed?: number }) => {
      const { data: trip, error: te } = await supabase.from("trips").select("*").eq("id", id).single();
      if (te) throw te;
      await supabase.from("trips").update({ status: "Completed", final_odometer: finalOdometer ?? null, fuel_consumed: fuelConsumed ?? null }).eq("id", id);
      const { data: veh } = await supabase.from("vehicles").select("odometer").eq("id", trip.vehicle_id).single();
      await supabase.from("vehicles").update({ status: "Available", odometer: finalOdometer ?? ((veh?.odometer ?? 0) + trip.distance) }).eq("id", trip.vehicle_id);
      await supabase.from("drivers").update({ status: "Available" }).eq("id", trip.driver_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
};

export const useCancelTrip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: trip, error: te } = await supabase.from("trips").select("*").eq("id", id).single();
      if (te) throw te;
      const wasDispatched = trip.status === "Dispatched";
      await supabase.from("trips").update({ status: "Cancelled" }).eq("id", id);
      if (wasDispatched) {
        await supabase.from("vehicles").update({ status: "Available" }).eq("id", trip.vehicle_id);
        await supabase.from("drivers").update({ status: "Available" }).eq("id", trip.driver_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
};

// Maintenance
export const useAddMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Omit<MaintenanceLog, "id">) => {
      const { error } = await supabase.from("maintenance_logs").insert(m);
      if (error) throw error;
      if (m.status === "Active") {
        await supabase.from("vehicles").update({ status: "In Shop" }).eq("id", m.vehicle_id).neq("status", "Retired");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance_logs"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
};
export const useCloseMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: m, error } = await supabase.from("maintenance_logs").select("*").eq("id", id).single();
      if (error) throw error;
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance_logs"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
};

// Fuel
export const useAddFuel = () =>
  useMut(async (f: Omit<FuelLog, "id">) => {
    const { error } = await supabase.from("fuel_logs").insert(f);
    if (error) throw error;
  }, ["fuel_logs"]);

// Expenses
export const useAddExpense = () =>
  useMut(async (e: Omit<Expense, "id">) => {
    const { error } = await supabase.from("expenses").insert(e);
    if (error) throw error;
  }, ["expenses"]);
