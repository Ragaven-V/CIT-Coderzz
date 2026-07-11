/**
 * TransitOps - TypeScript Type Definitions
 */

export enum Role {
  FLEET_MANAGER = 'Fleet Manager',
  DISPATCHER = 'Dispatcher',
  SAFETY_OFFICER = 'Safety Officer',
  FINANCIAL_ANALYST = 'Financial Analyst'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export type VehicleType = 'Truck' | 'Van' | 'Trailer' | 'Sedan';
export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';

export interface Vehicle {
  registrationNumber: string; // unique key, PK
  nameModel: string;
  type: VehicleType;
  maxCapacity: number; // in kg
  odometer: number; // in km
  acquisitionCost: number; // in USD
  status: VehicleStatus;
  region: 'North' | 'South' | 'East' | 'West';
  createdAt?: string;
  runningCost?: number; // Fuel + Maintenance costs calculated dynamically
}

export type LicenseCategory = 'Class A' | 'Class B' | 'Class C';
export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';

export interface Driver {
  licenseNumber: string; // unique key, PK
  name: string;
  licenseCategory: LicenseCategory;
  licenseExpiry: string; // YYYY-MM-DD
  contactNumber: string;
  safetyScore: number; // 0-100
  status: DriverStatus;
  createdAt?: string;
}

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

export interface Trip {
  id: string; // TRIP-xxxx
  source: string;
  destination: string;
  vehicleId: string; // FK to Vehicle
  driverLicense: string; // FK to Driver
  cargoWeight: number; // in kg
  distance: number; // in km
  status: TripStatus;
  revenue: number; // in USD
  dateCreated?: string;
  dateDispatched?: string | null;
  dateCompleted?: string | null;
  finalOdometer?: number | null;
  fuelConsumed?: number | null; // in liters
}

export type MaintenanceStatus = 'Active' | 'Closed';

export interface MaintenanceLog {
  id: string; // MAINT-xxxx
  vehicleId: string; // FK to Vehicle
  description: string;
  cost: number;
  dateEntered: string;
  dateCompleted?: string | null;
  status: MaintenanceStatus;
}

export interface FuelLog {
  id: string; // FUEL-xxxx
  vehicleId: string;
  liters: number;
  cost: number;
  date: string;
}

export type ExpenseType = 'Fuel' | 'Maintenance' | 'Tolls' | 'Insurance' | 'Other';

export interface Expense {
  id: string; // EXP-xxxx
  vehicleId: string;
  type: ExpenseType;
  cost: number;
  date: string;
  description: string;
}

export interface KPIStats {
  activeVehicles: number;
  availableVehicles: number;
  maintenanceVehicles: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
}

export interface SystemSettings {
  depotName: string;
  currency: string;
  distanceUnit: string;
  fleetManagerPasscode?: string;
}
