import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, Truck, ClipboardList, Activity } from 'lucide-react';
import { apiClient } from '../services/api';
import { useAlerts } from '../hooks/useAlerts';
import { Badge, severityVariant } from '../components/ui/Badge';
import { StatusDot } from '../components/ui/StatusDot';
import { PageSpinner } from '../components/ui/LoadingSpinner';
import type { ApiResponse, Alert } from '../types/api';
import { vehicleName } from '../types/api';

interface VehicleStatEntry { _id: string; count: number }
interface AlertStatEntry { _id: { severity: string; isResolved: boolean }; count: number }
interface WOStatEntry { _id: string; count: number; totalEstimatedUsd: number }
interface FleetSummary {
  vehicles: VehicleStatEntry[];
  alerts: AlertStatEntry[];
  workOrders: WOStatEntry[];
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  onClick,
}: {
  title: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 transition-all duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95'
          : ''
      }`}
    >
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {onClick && (
          <p className="text-xs text-blue-500 mt-1 font-medium">View all →</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<FleetSummary>>(
        '/reports/summary'
      );
      return data.data!;
    },
    refetchInterval: 60_000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useAlerts({
    isResolved: false,
    limit: 6,
    page: 1,
  });

  const recentAlerts = (alertsData?.data as Alert[] | undefined) ?? [];

  const totalVehicles =
    summaryData?.vehicles.reduce((a, v) => a + v.count, 0) ?? 0;
  const activeVehicles =
    summaryData?.vehicles.find((v) => v._id === 'active')?.count ?? 0;
  const unresolvedAlerts =
    summaryData?.alerts
      .filter((a) => !a._id.isResolved)
      .reduce((a, v) => a + v.count, 0) ?? 0;
  const openWorkOrders =
    summaryData?.workOrders.find((w) => w._id === 'open')?.count ?? 0;

  if (summaryLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-0.5">Fleet overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Vehicles"
          value={totalVehicles}
          sub={`${activeVehicles} active`}
          icon={Truck}
          color="bg-blue-500"
          onClick={() => navigate('/dashboard/vehicles')}
        />
        <StatCard
          title="Unresolved Alerts"
          value={unresolvedAlerts}
          icon={AlertTriangle}
          color={unresolvedAlerts > 0 ? 'bg-red-500' : 'bg-green-500'}
          onClick={() => navigate('/dashboard/alerts')}
        />
        <StatCard
          title="Open Work Orders"
          value={openWorkOrders}
          icon={ClipboardList}
          color="bg-amber-500"
          onClick={() => navigate('/dashboard/work-orders')}
        />
        <StatCard
          title="In Maintenance"
          value={
            summaryData?.vehicles.find((v) => v._id === 'maintenance')?.count ?? 0
          }
          icon={Activity}
          color="bg-purple-500"
          onClick={() => navigate('/dashboard/vehicles')}
        />
      </div>

      {/* Recent unresolved alerts */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Recent Unresolved Alerts
          </h3>
        </div>

        {alertsLoading ? (
          <div className="p-8 flex justify-center">
            <PageSpinner />
          </div>
        ) : recentAlerts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No unresolved alerts — fleet is healthy!
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentAlerts.map((alert) => (
              <div key={alert._id} className="px-5 py-3 flex items-center gap-4">
                <StatusDot status={alert.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {vehicleName(alert.vehicleId)} ·{' '}
                    {format(new Date(alert.triggeredAt), 'MMM d, HH:mm')}
                  </p>
                </div>
                <Badge variant={severityVariant(alert.severity)}>
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle status breakdown */}
      {summaryData && summaryData.vehicles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Vehicle Status Breakdown
          </h3>
          <div className="flex gap-6">
            {summaryData.vehicles.map((v) => (
              <div key={v._id} className="flex items-center gap-2">
                <StatusDot status={v._id} />
                <span className="text-sm text-gray-600 capitalize">{v._id}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {v.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
