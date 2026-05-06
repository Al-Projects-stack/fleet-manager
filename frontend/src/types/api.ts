export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  count?: number;
}

export type UserRole = 'Admin' | 'Manager' | 'Technician' | 'ReadOnly';
export type VehicleStatus = 'active' | 'inactive' | 'maintenance';
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'cng';
export type AlertType =
  | 'fuel_anomaly'
  | 'maintenance_due'
  | 'engine_temp'
  | 'low_fuel'
  | 'custom';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderType = 'preventive' | 'corrective' | 'inspection';
export type WorkOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  _id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  fuelType: FuelType;
  fuelCapacityLiters: number;
  currentOdometerKm: number;
  status: VehicleStatus;
  lastMaintenanceDate: string | null;
  nextMaintenanceOdometerKm: number | null;
  assignedDriverId: User | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Telemetry {
  _id: string;
  vehicleId: string;
  timestamp: string;
  odometerKm: number;
  fuelLevelPercent: number;
  fuelConsumedLiters: number;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number;
  engineTempCelsius: number;
  engineHours: number;
}

export interface Alert {
  _id: string;
  vehicleId: Vehicle | string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  isResolved: boolean;
  resolvedById: User | null;
  resolvedAt: string | null;
  workOrderId: string | null;
  triggeredAt: string;
  createdAt: string;
}

export interface WorkOrderNote {
  _id: string;
  content: string;
  authorId: User | string;
  createdAt: string;
}

export interface WorkOrder {
  _id: string;
  vehicleId: Vehicle | string;
  title: string;
  description: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assignedToId: User | null;
  createdById: User | string;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  scheduledDate: string | null;
  completedDate: string | null;
  notes: WorkOrderNote[];
  alertId: string | null;
  odometerAtCreationKm: number;
  partsUsed: string[];
  createdAt: string;
  updatedAt: string;
}

// Helpers for populated vs ID-only fields
export function vehicleName(v: Vehicle | string | null | undefined): string {
  if (!v) return 'Unknown';
  return typeof v === 'object' ? v.name : 'Unknown';
}

export function vehiclePlate(v: Vehicle | string | null | undefined): string {
  if (!v) return '';
  return typeof v === 'object' ? v.licensePlate : '';
}

export function userName(u: User | string | null | undefined): string {
  if (!u) return '—';
  return typeof u === 'object' ? u.name : '—';
}
