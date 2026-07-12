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

const KEY = "transitops.db.v1";

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): DB {
  const vehicles: Vehicle[] = [
    { id: uid(), registration: "TX-9942", name: "VAN-05", type: "Sprinter Van", capacity: 1200, odometer: 48210, cost: 42000, status: "Available" },
    { id: uid(), registration: "HD-2201", name: "TRUCK-11", type: "Heavy Duty", capacity: 12500, odometer: 128400, cost: 98000, status: "On Trip" },
    { id: uid(), registration: "MN-4491", name: "VAN-22", type: "Transit", capacity: 2800, odometer: 62110, cost: 38000, status: "In Shop" },
    { id: uid(), registration: "OL-1102", name: "TRUCK-02", type: "Legacy", capacity: 12000, odometer: 412000, cost: 24000, status: "Retired" },
    { id: uid(), registration: "BT-5521", name: "VAN-09", type: "Electric", capacity: 2500, odometer: 12800, cost: 61000, status: "Available" },
  ];
  const drivers: Driver[] = [
    { id: uid(), name: "Alex Johnson", license: "TX-8829-LMV", category: "LMV", licenseExpiry: "2027-05-14", contact: "+1 555 0110", safetyScore: 4.9, status: "Available" },
    { id: uid(), name: "Priya Sharma", license: "MH-4012-HMV", category: "HMV", licenseExpiry: "2026-11-02", contact: "+91 98 7654 3210", safetyScore: 4.7, status: "On Trip" },
    { id: uid(), name: "Marcus Reed", license: "NY-5561-HMV", category: "HMV", licenseExpiry: "2025-09-30", contact: "+1 555 0142", safetyScore: 4.2, status: "Off Duty" },
    { id: uid(), name: "Elena Vance", license: "CA-1109-LMV", category: "LMV", licenseExpiry: "2024-03-01", contact: "+1 555 0180", safetyScore: 2.8, status: "Suspended" },
  ];
  return {
    users: [
      { id: uid(), name: "Raven K.", email: "admin@transitops.com", password: "admin123", role: "Fleet Manager" },
    ],
    session: null,
    vehicles,
    drivers,
    trips: [],
    maintenance: [
      { id: uid(), vehicleId: vehicles[2].id, type: "Full Brake Set", cost: 1240, date: "2024-10-18", status: "Active" },
    ],
    fuel: [
      { id: uid(), vehicleId: vehicles[0].id, liters: 450, cost: 812.45, date: "2024-10-24", station: "Shell S2" },
      { id: uid(), vehicleId: vehicles[1].id, liters: 320.5, cost: 578.1, date: "2024-10-23", station: "BP Logistics" },
    ],
    expenses: [
      { id: uid(), category: "Tolls", amount: 45, description: "M50 Motorway Pass", date: "2024-10-22" },
      { id: uid(), category: "Misc", amount: 120, description: "Loading Dock Fee", date: "2024-10-21" },
    ],
  };
}

function load(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seed();
  }
}

let db: DB = typeof window === "undefined" ? seed() : load();
const listeners = new Set<() => void>();
function emit() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
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
