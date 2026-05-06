import { ReactNode } from 'react';
import type { AlertSeverity, VehicleStatus, WorkOrderStatus, WorkOrderPriority } from '../../types/api';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-600',
  default: 'bg-gray-100 text-gray-800',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function severityVariant(severity: AlertSeverity): BadgeVariant {
  const map: Record<AlertSeverity, BadgeVariant> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return map[severity];
}

export function vehicleStatusVariant(status: VehicleStatus): BadgeVariant {
  const map: Record<VehicleStatus, BadgeVariant> = {
    active: 'success',
    inactive: 'neutral',
    maintenance: 'warning',
  };
  return map[status];
}

export function workOrderStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    open: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'neutral',
    pending: 'warning',
  };
  return map[status] ?? 'neutral';
}

export function priorityVariant(priority: WorkOrderPriority): BadgeVariant {
  const map: Record<WorkOrderPriority, BadgeVariant> = {
    low: 'neutral',
    medium: 'info',
    high: 'warning',
    urgent: 'danger',
  };
  return map[priority];
}
