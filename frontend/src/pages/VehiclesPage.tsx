import { useState, FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useVehicles, useCreateVehicle, useDeleteVehicle, useVehicle } from '../hooks/useVehicles';
import { useAuthStore } from '../stores/authStore';
import { Badge, vehicleStatusVariant } from '../components/ui/Badge';
import { StatusDot } from '../components/ui/StatusDot';
import { PageSpinner } from '../components/ui/LoadingSpinner';
import { getErrorMessage } from '../services/api';
import type { FuelType } from '../types/api';

const FUEL_TYPES: FuelType[] = ['gasoline', 'diesel', 'electric', 'hybrid', 'cng'];
const CURRENT_YEAR = new Date().getFullYear();

interface VehicleForm {
  name: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  fuelType: FuelType;
  fuelCapacityLiters: number;
  currentOdometerKm: number;
}

const EMPTY_FORM: VehicleForm = {
  name: '',
  make: '',
  model: '',
  year: CURRENT_YEAR,
  vin: '',
  licensePlate: '',
  fuelType: 'diesel',
  fuelCapacityLiters: 80,
  currentOdometerKm: 0,
};

export default function VehiclesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const { data: selectedVehicle, isLoading: vehicleLoading } = useVehicle(selectedVehicleId || '');

  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useVehicles({ status: statusFilter || undefined, limit: 100 });
  const createVehicle = useCreateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const vehicles = data?.data ?? [];
  const canWrite = role === 'Admin' || role === 'Manager';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await createVehicle.mutateAsync(form);
      setShowCreate(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete vehicle "${name}"? This cannot be undone.`)) return;
    await deleteVehicle.mutateAsync(id).catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Vehicles</h2>
          <p className="text-sm text-gray-500 mt-0.5">{vehicles.length} vehicle(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
          {canWrite && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fuel Level</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Odometer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plate</th>
                {role === 'Admin' && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    No vehicles found
                  </td>
                </tr>
              )}
{vehicles.map((v) => (
                <tr 
                  key={v._id} 
                  className="hover:bg-gray-50 transition-all cursor-pointer" 
                  onClick={() => setSelectedVehicleId(v._id)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={v.status} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">{v.name}</p>
                        <p className="text-xs text-gray-400">
                          {v.year} {v.make} {v.model}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={vehicleStatusVariant(v.status)}>
                      {v.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    — {/* live level requires telemetry query */}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.currentOdometerKm.toLocaleString()} km
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {v.licensePlate}
                  </td>
                  {role === 'Admin' && (
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(v._id, v.name); }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create vehicle modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">
              Add Vehicle
            </h3>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Truck 01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Make *</label>
                  <input
                    required
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Model *</label>
                  <input
                    required
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
                  <input
                    type="number"
                    required
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fuel Type *</label>
                  <select
                    value={form.fuelType}
                    onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FUEL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    VIN * (17 chars)
                  </label>
                  <input
                    required
                    maxLength={17}
                    value={form.vin}
                    onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    License Plate *
                  </label>
                  <input
                    required
                    value={form.licensePlate}
                    onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fuel Capacity (L) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.fuelCapacityLiters}
                    onChange={(e) => setForm({ ...form, fuelCapacityLiters: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setFormError(''); setForm(EMPTY_FORM); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVehicle.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createVehicle.isPending ? 'Creating…' : 'Create Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedVehicleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {vehicleLoading ? 'Loading...' : selectedVehicle?.name}
                </h3>
                <button
                  onClick={() => setSelectedVehicleId(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 -m-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {vehicleLoading ? (
                <PageSpinner />
              ) : selectedVehicle ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Basic Info</h4>
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-gray-500">Status</dt>
                          <dd>
                            <Badge variant={vehicleStatusVariant(selectedVehicle.status)}>
                              {selectedVehicle.status}
                            </Badge>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Year/Make/Model</dt>
                          <dd>{`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">VIN</dt>
                          <dd className="font-mono uppercase">{selectedVehicle.vin}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">License Plate</dt>
                          <dd className="font-mono uppercase">{selectedVehicle.licensePlate}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Fuel Type</dt>
                          <dd className="capitalize">{selectedVehicle.fuelType}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Fuel Capacity</dt>
                          <dd>{selectedVehicle.fuelCapacityLiters} L</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Current Odometer</dt>
                          <dd>{selectedVehicle.currentOdometerKm.toLocaleString()} km</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Assigned & Dates</h4>
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-gray-500">Assigned Driver</dt>
                          <dd>{selectedVehicle.assignedDriverId?.name || 'Unassigned'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Last Maintenance</dt>
                          <dd>{selectedVehicle.lastMaintenanceDate ? new Date(selectedVehicle.lastMaintenanceDate).toLocaleDateString() : 'Never'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Next Maintenance</dt>
                          <dd>{selectedVehicle.nextMaintenanceOdometerKm ? `${selectedVehicle.nextMaintenanceOdometerKm.toLocaleString()} km` : 'Not scheduled'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Created</dt>
                          <dd>{new Date(selectedVehicle.createdAt).toLocaleDateString()}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Notes</dt>
                          <dd className="italic text-gray-600">{selectedVehicle.notes || 'No notes'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 italic">
                      Last updated: {new Date(selectedVehicle.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">Vehicle not found</p>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
