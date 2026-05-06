import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAlerts, useResolveAlert } from '../hooks/useAlerts';
import { Badge, severityVariant } from '../components/ui/Badge';
import { StatusDot } from '../components/ui/StatusDot';
import { PageSpinner } from '../components/ui/LoadingSpinner';
import { vehicleName } from '../types/api';
import type { AlertType, AlertSeverity } from '../types/api';

const ALERT_TYPES: AlertType[] = [
  'fuel_anomaly',
  'maintenance_due',
  'engine_temp',
  'low_fuel',
  'custom',
];
const SEVERITIES: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
const LIMIT = 20;

export default function AlertsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState<boolean | undefined>(false);
  const [page, setPage] = useState(1);

  const resolveAlert = useResolveAlert();

  const { data, isLoading } = useAlerts({
    type: typeFilter || undefined,
    severity: severityFilter || undefined,
    isResolved: resolvedFilter,
    page,
    limit: LIMIT,
  });

  const alerts = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const handleResolve = async (id: string) => {
    await resolveAlert.mutateAsync({ id }).catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Alerts</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {meta?.total ?? 0} alert(s) matching current filters
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All types</option>
          {ALERT_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={resolvedFilter === undefined ? '' : resolvedFilter ? 'true' : 'false'}
          onChange={(e) => {
            const v = e.target.value;
            setResolvedFilter(v === '' ? undefined : v === 'true');
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
          <option value="">All</option>
        </select>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Alert</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Triggered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    No alerts match the current filters
                  </td>
                </tr>
              )}
              {alerts.map((alert) => (
                <tr key={alert._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <StatusDot status={alert.severity} size="sm" />
                      <p className="text-gray-800 leading-snug max-w-xs">{alert.message}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {vehicleName(alert.vehicleId)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={severityVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {alert.type.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {format(new Date(alert.triggeredAt), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    {!alert.isResolved && (
                      <button
                        onClick={() => void handleResolve(alert._id)}
                        disabled={resolveAlert.isPending}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Resolve
                      </button>
                    )}
                    {alert.isResolved && (
                      <span className="text-xs text-gray-400">Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
