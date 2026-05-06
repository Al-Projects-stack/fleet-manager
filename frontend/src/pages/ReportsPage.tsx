import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useVehicles } from '../hooks/useVehicles';
import { FuelTrendChart } from '../components/charts/FuelTrendChart';
import { PageSpinner } from '../components/ui/LoadingSpinner';
import type { ApiResponse } from '../types/api';

interface FleetSummary {
  vehicles: { _id: string; count: number }[];
  workOrders: {
    _id: string;
    count: number;
    totalEstimatedUsd: number;
    totalActualUsd: number;
  }[];
  alerts: { _id: { severity: string; isResolved: boolean }; count: number }[];
}

interface FuelReport {
  vehicleId: string;
  fuelData: {
    _id: { year: number; month: number; day: number };
    avgFuelLevelPercent: number;
    totalConsumedLiters: number;
    avgSpeedKmh: number;
    maxSpeedKmh: number;
    avgEngineTemp: number;
    readings: number;
  }[];
}

function SummaryCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: vehiclesData } = useVehicles({ limit: 200 });
  const vehicles = vehiclesData?.data ?? [];

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports', 'summary', from, to],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<FleetSummary>>(
        '/reports/summary',
        { params: { from: from || undefined, to: to || undefined } }
      );
      return data.data!;
    },
  });

  const { data: fuelData, isLoading: fuelLoading } = useQuery({
    queryKey: ['reports', 'fuel', selectedVehicleId, from, to],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<FuelReport>>(
        `/reports/fuel/${selectedVehicleId}`,
        { params: { from: from || undefined, to: to || undefined } }
      );
      return data.data!;
    },
    enabled: Boolean(selectedVehicleId),
  });

  const totalVehicles =
    summaryData?.vehicles.reduce((a, v) => a + v.count, 0) ?? 0;
  const totalOpenCost =
    summaryData?.workOrders
      .filter((w) => w._id === 'open' || w._id === 'in_progress')
      .reduce((a, w) => a + w.totalEstimatedUsd, 0) ?? 0;
  const totalUnresolvedAlerts =
    summaryData?.alerts
      .filter((a) => !a._id.isResolved)
      .reduce((a, v) => a + v.count, 0) ?? 0;
  const completedWOs =
    summaryData?.workOrders.find((w) => w._id === 'completed')?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500 mt-0.5">Fleet analytics summary</p>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4">
        <span className="text-sm font-medium text-gray-700">Date range:</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => { setFrom(''); setTo(''); }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Fleet summary stats */}
      {summaryLoading ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Vehicles" value={totalVehicles} />
          <SummaryCard
            title="Unresolved Alerts"
            value={totalUnresolvedAlerts}
            sub="across all vehicles"
          />
          <SummaryCard
            title="Open Cost Estimate"
            value={`$${totalOpenCost.toLocaleString()}`}
            sub="open + in-progress WOs"
          />
          <SummaryCard title="Completed Work Orders" value={completedWOs} />
        </div>
      )}

      {/* Work order status breakdown */}
      {summaryData && summaryData.workOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Work Order Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500">Status</th>
                  <th className="text-right py-2 font-medium text-gray-500">Count</th>
                  <th className="text-right py-2 font-medium text-gray-500">Est. Cost</th>
                  <th className="text-right py-2 font-medium text-gray-500">Actual Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summaryData.workOrders.map((wo) => (
                  <tr key={wo._id}>
                    <td className="py-2 text-gray-700 capitalize">
                      {wo._id.replace('_', ' ')}
                    </td>
                    <td className="py-2 text-right text-gray-600">{wo.count}</td>
                    <td className="py-2 text-right text-gray-600">
                      ${wo.totalEstimatedUsd.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      ${wo.totalActualUsd.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fuel trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Fuel Trend by Vehicle
          </h3>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a vehicle…</option>
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedVehicleId && (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Select a vehicle to view fuel trends
          </div>
        )}

        {selectedVehicleId && fuelLoading && <PageSpinner />}

        {selectedVehicleId && !fuelLoading && fuelData && (
          <FuelTrendChart data={fuelData.fuelData} />
        )}
      </div>
    </div>
  );
}
