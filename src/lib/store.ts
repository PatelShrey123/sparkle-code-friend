import { useSyncExternalStore } from "react";

export type VehicleStatus = "Available" | "On Trip" | "In Shop" | "Retired";
export type DriverStatus = "Available" | "On Trip" | "Off Duty" | "Suspended";
export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";
export type Role = "Fleet Manager" | "Dispatcher" | "Safety Officer" | "Financial Analyst";

export interface Vehicle {
  id: string;
  registration: string;
  name: string;
  type: string;
  capacity: number; // kg
  odometer: number;
  cost: number;
  status: VehicleStatus;
}
export interface Driver {
  id: string;
  name: string;
  license: string;
  category: string;
  licenseExpiry: string; // ISO
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
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}
export interface Session {
  userId: string;
}

interface DB {
  users: User[];
  session: Session | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: MaintenanceLog[];
  fuel: FuelLog[];
  expenses: Expense[];
}

const KEY = "transitops.db.v2";

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): DB {
  return {
    users: [
      {
        id: "admin-seed",
        name: "Admin",
        email: "admin@transitops.com",
        password: "admin123",
        role: "Fleet Manager",
      },
    ],
    session: null,
    vehicles: [],
    drivers: [],
    trips: [],
    maintenance: [],
    fuel: [],
    expenses: [],
  };
}

let db: DB = seed();
const listeners = new Set<() => void>();
let hydrated = false;

function emit() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        db = JSON.parse(raw);
      } else {
        localStorage.setItem(KEY, JSON.stringify(db));
      }
    } catch {
      // keep seed
    }
    // notify after mount
    queueMicrotask(() => listeners.forEach((l) => l()));
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDB<T>(selector: (d: DB) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(db),
    () => selector(db),
  );
}

export const actions = {
  reset() {
    db = seed();
    emit();
  },
  // Auth
  signup(u: Omit<User, "id">) {
    if (db.users.some((x) => x.email === u.email)) throw new Error("Email already registered");
    const user: User = { ...u, id: uid() };
    db = { ...db, users: [...db.users, user], session: { userId: user.id } };
    emit();
    return user;
  },
  login(email: string, password: string) {
    const user = db.users.find((u) => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid credentials");
    db = { ...db, session: { userId: user.id } };
    emit();
    return user;
  },
  logout() {
    db = { ...db, session: null };
    emit();
  },
  // Vehicles
  addVehicle(v: Omit<Vehicle, "id">) {
    if (db.vehicles.some((x) => x.registration.toLowerCase() === v.registration.toLowerCase()))
      throw new Error("Registration number must be unique");
    db = { ...db, vehicles: [...db.vehicles, { ...v, id: uid() }] };
    emit();
  },
  updateVehicle(id: string, patch: Partial<Vehicle>) {
    db = { ...db, vehicles: db.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) };
    emit();
  },
  deleteVehicle(id: string) {
    db = { ...db, vehicles: db.vehicles.filter((v) => v.id !== id) };
    emit();
  },
  // Drivers
  addDriver(d: Omit<Driver, "id">) {
    db = { ...db, drivers: [...db.drivers, { ...d, id: uid() }] };
    emit();
  },
  updateDriver(id: string, patch: Partial<Driver>) {
    db = { ...db, drivers: db.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)) };
    emit();
  },
  deleteDriver(id: string) {
    db = { ...db, drivers: db.drivers.filter((d) => d.id !== id) };
    emit();
  },
  // Trips
  createTrip(t: Omit<Trip, "id" | "status" | "createdAt">) {
    const vehicle = db.vehicles.find((v) => v.id === t.vehicleId);
    const driver = db.drivers.find((d) => d.id === t.driverId);
    if (!vehicle || !driver) throw new Error("Vehicle or driver not found");
    if (vehicle.status === "Retired" || vehicle.status === "In Shop")
      throw new Error("Vehicle is not eligible for dispatch");
    if (vehicle.status === "On Trip") throw new Error("Vehicle is already on a trip");
    if (driver.status === "On Trip") throw new Error("Driver is already on a trip");
    if (driver.status === "Suspended") throw new Error("Driver is suspended");
    if (new Date(driver.licenseExpiry) < new Date()) throw new Error("Driver license expired");
    if (t.cargoWeight > vehicle.capacity)
      throw new Error(`Cargo weight ${t.cargoWeight}kg exceeds capacity ${vehicle.capacity}kg`);
    const trip: Trip = { ...t, id: uid(), status: "Draft", createdAt: new Date().toISOString() };
    db = { ...db, trips: [trip, ...db.trips] };
    emit();
    return trip;
  },
  dispatchTrip(id: string) {
    const trip = db.trips.find((t) => t.id === id);
    if (!trip) return;
    const vehicle = db.vehicles.find((v) => v.id === trip.vehicleId);
    const driver = db.drivers.find((d) => d.id === trip.driverId);
    if (!vehicle || !driver) throw new Error("Missing asset");
    if (vehicle.status !== "Available" && vehicle.status !== "On Trip")
      throw new Error("Vehicle unavailable");
    if (driver.status === "Suspended") throw new Error("Driver suspended");
    db = {
      ...db,
      trips: db.trips.map((t) => (t.id === id ? { ...t, status: "Dispatched" as TripStatus } : t)),
      vehicles: db.vehicles.map((v) => (v.id === vehicle.id ? { ...v, status: "On Trip" as VehicleStatus } : v)),
      drivers: db.drivers.map((d) => (d.id === driver.id ? { ...d, status: "On Trip" as DriverStatus } : d)),
    };
    emit();
  },
  completeTrip(id: string, finalOdometer?: number, fuelConsumed?: number) {
    const trip = db.trips.find((t) => t.id === id);
    if (!trip) return;
    db = {
      ...db,
      trips: db.trips.map((t) =>
        t.id === id
          ? { ...t, status: "Completed" as TripStatus, finalOdometer, fuelConsumed }
          : t,
      ),
      vehicles: db.vehicles.map((v) =>
        v.id === trip.vehicleId
          ? {
              ...v,
              status: "Available" as VehicleStatus,
              odometer: finalOdometer ?? v.odometer + trip.distance,
            }
          : v,
      ),
      drivers: db.drivers.map((d) =>
        d.id === trip.driverId ? { ...d, status: "Available" as DriverStatus } : d,
      ),
    };
    emit();
  },
  cancelTrip(id: string) {
    const trip = db.trips.find((t) => t.id === id);
    if (!trip) return;
    const wasDispatched = trip.status === "Dispatched";
    db = {
      ...db,
      trips: db.trips.map((t) => (t.id === id ? { ...t, status: "Cancelled" as TripStatus } : t)),
      vehicles: wasDispatched
        ? db.vehicles.map((v) =>
            v.id === trip.vehicleId ? { ...v, status: "Available" as VehicleStatus } : v,
          )
        : db.vehicles,
      drivers: wasDispatched
        ? db.drivers.map((d) =>
            d.id === trip.driverId ? { ...d, status: "Available" as DriverStatus } : d,
          )
        : db.drivers,
    };
    emit();
  },
  // Maintenance
  addMaintenance(m: Omit<MaintenanceLog, "id">) {
    db = {
      ...db,
      maintenance: [{ ...m, id: uid() }, ...db.maintenance],
      vehicles:
        m.status === "Active"
          ? db.vehicles.map((v) =>
              v.id === m.vehicleId && v.status !== "Retired"
                ? { ...v, status: "In Shop" as VehicleStatus }
                : v,
            )
          : db.vehicles,
    };
    emit();
  },
  closeMaintenance(id: string) {
    const m = db.maintenance.find((x) => x.id === id);
    if (!m) return;
    const hasOtherActive = db.maintenance.some(
      (x) => x.id !== id && x.vehicleId === m.vehicleId && x.status === "Active",
    );
    db = {
      ...db,
      maintenance: db.maintenance.map((x) =>
        x.id === id ? { ...x, status: "Completed" as const } : x,
      ),
      vehicles: hasOtherActive
        ? db.vehicles
        : db.vehicles.map((v) =>
            v.id === m.vehicleId && v.status === "In Shop"
              ? { ...v, status: "Available" as VehicleStatus }
              : v,
          ),
    };
    emit();
  },
  addFuel(f: Omit<FuelLog, "id">) {
    db = { ...db, fuel: [{ ...f, id: uid() }, ...db.fuel] };
    emit();
  },
  addExpense(e: Omit<Expense, "id">) {
    db = { ...db, expenses: [{ ...e, id: uid() }, ...db.expenses] };
    emit();
  },
};

export function currentUser(): User | null {
  if (!db.session) return null;
  return db.users.find((u) => u.id === db.session!.userId) ?? null;
}
