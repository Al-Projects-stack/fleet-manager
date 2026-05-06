import { useState, FormEvent } from 'react';
import { format } from 'date-fns';
import { Plus, X, ChevronRight, AlertCircle, MessageSquare, Send } from 'lucide-react';
import {
  useWorkOrders,
  useCreateWorkOrder,
  useUpdateWorkOrder,
  useAddNote,
} from '../hooks/useWorkOrders';
import { useVehicles } from '../hooks/useVehicles';
import { useAuthStore } from '../stores/authStore';
import { Badge, workOrderStatusVariant, priorityVariant } from '../components/ui/Badge';
import { PageSpinner, InlineSpinner } from '../components/ui/LoadingSpinner';
import { getErrorMessage } from '../services/api';
import { vehicleName, userName } from '../types/api';
import type { WorkOrder, WorkOrderType, WorkOrderPriority, WorkOrderStatus } from '../types/api';

const LIMIT = 25;

interface CreateForm {
  vehicleId: string;
  title: string;
  description: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  estimatedCostUsd: number;
}

const EMPTY_FORM: CreateForm = {
  vehicleId: '',
  title: '',
  description: '',
  type: 'preventive',
  priority: 'medium',
  estimatedCostUsd: 0,
};

const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
};

// ─── Detail panel ─────────────────────────────────────────────────────────────
function DetailPanel({
  wo,
  onClose,
  canUpdate,
}: {
  wo: WorkOrder;
  onClose: () => void;
  canUpdate: boolean;
}) {
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState('');
  const updateWO = useUpdateWorkOrder();
  const addNote = useAddNote();

  const transitions = STATUS_TRANSITIONS[wo.status] ?? [];

  const handleStatusChange = async (status: WorkOrderStatus) => {
    try {
      await updateWO.mutateAsync({ id: wo._id, status });
    } catch (err) {
      console.error(getErrorMessage(err));
    }
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    setNoteError('');
    if (!noteText.trim()) return;
    try {
      await addNote.mutateAsync({ id: wo._id, content: noteText.trim() });
      setNoteText('');
    } catch (err) {
      setNoteError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-96 shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{wo.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{wo.type}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Status & priority */}
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <Badge variant={workOrderStatusVariant(wo.status)}>
            {wo.status.replace('_', ' ')}
          </Badge>
          <Badge variant={priorityVariant(wo.priority)}>{wo.priority}</Badge>
          <span
            className={`w-2 h-2 rounded-full ${STATUS_COLORS[wo.status]}`}
          />
        </div>

        {/* Meta */}
        <div className="px-5 py-4 border-b border-gray-50 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Vehicle</span>
            <span className="font-medium text-gray-800">{vehicleName(wo.vehicleId)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Assigned to</span>
            <span className="font-medium text-gray-800">{userName(wo.assignedToId)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Est. cost</span>
            <span className="font-medium text-gray-800">${Number(wo.estimatedCostUsd ?? 0).toFixed(2)}</span>
          </div>
          {wo.actualCostUsd !== null && wo.actualCostUsd !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-500">Actual cost</span>
              <span className="font-medium text-gray-800">${Number(wo.actualCostUsd ?? 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Created</span>
            <span className="text-gray-600">{format(new Date(wo.createdAt), 'MMM d, yyyy')}</span>
          </div>
          {wo.completedDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Completed</span>
              <span className="text-gray-600">{format(new Date(wo.completedDate), 'MMM d, yyyy')}</span>
            </div>
          )}
          {wo.scheduledDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Scheduled</span>
              <span className="text-gray-600">{format(new Date(wo.scheduledDate), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{wo.description}</p>
        </div>

        {/* Status transitions */}
        {canUpdate && transitions.length > 0 && (
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Move to</p>
            <div className="flex flex-wrap gap-2">
              {transitions.map((next) => (
                <button
                  key={next}
                  onClick={() => void handleStatusChange(next)}
                  disabled={updateWO.isPending}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 transition-colors capitalize font-medium"
                >
                  <ChevronRight className="w-3 h-3" />
                  {next.replace('_', ' ')}
                  {updateWO.isPending && <InlineSpinner />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parts used */}
        {(wo.partsUsed ?? []).length > 0 && (
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Parts Used</p>
            <div className="flex flex-wrap gap-1">
              {(wo.partsUsed ?? []).map((part, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {part}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
Notes {(wo.notes ?? []).length}
            </p>
          </div>

          <div className="space-y-3 mb-4">
            {wo.notes.length === 0 && (
              <p className="text-xs text-gray-400 italic">No notes yet</p>
            )}
            {wo.notes.map((note) => (
              <div key={note._id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {userName(note.authorId)} · {format(new Date(note.createdAt), 'MMM d, HH:mm')}
                </p>
              </div>
            ))}
          </div>

          {/* Add note */}
          {canUpdate && (
            <form onSubmit={(e) => void handleAddNote(e)} className="space-y-2">
              {noteError && (
                <p className="text-xs text-red-500">{noteError}</p>
              )}
              <textarea
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                type="submit"
                disabled={addNote.isPending || !noteText.trim()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
              >
                <Send className="w-3 h-3" />
                {addNote.isPending ? 'Adding…' : 'Add Note'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WorkOrdersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const { data, isLoading, error } = useWorkOrders({
    status: statusFilter || undefined,
    page,
    limit: LIMIT,
  });
  const { data: vehiclesData } = useVehicles({ limit: 200 });

  const createWO = useCreateWorkOrder();

  const workOrders = (data?.data as WorkOrder[] | undefined) ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const vehicles = vehiclesData?.data ?? [];

  const canCreate = role === 'Admin' || role === 'Manager';
  const canUpdate = role === 'Admin' || role === 'Manager' || role === 'Technician';

  // Keep detail panel in sync when data refreshes
  const selectedWOFresh =
    selectedWO ? workOrders.find((w) => w._id === selectedWO._id) ?? selectedWO : null;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await createWO.mutateAsync(form);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex h-full gap-0 -m-6 overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
      {/* ── Left: list panel ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Work Orders</h2>
            <p className="text-xs text-gray-500 mt-0.5">{meta?.total ?? 0} total</p>
          </div>
          <div className="flex items-center gap-3">
            {createSuccess && (
              <span className="text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                ✓ Work order created
              </span>
            )}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {canCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            )}
          </div>
        </div>

        {/* API error */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {getErrorMessage(error)} — try logging out and back in.
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <PageSpinner />
            </div>
          ) : workOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium">No work orders yet</p>
              <p className="text-gray-400 text-sm mt-1">
                {statusFilter ? `No ${statusFilter.replace('_', ' ')} work orders` : 'Create your first work order to get started'}
              </p>
              {canCreate && !statusFilter && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Work Order
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Vehicle</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Cost</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {workOrders.map((wo) => (
                  <tr
                    key={wo._id}
                    onClick={() => setSelectedWO(selectedWOFresh?._id === wo._id ? null : wo)}
                    className={`cursor-pointer transition-colors ${
                      selectedWOFresh?._id === wo._id
                        ? 'bg-blue-50 hover:bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{wo.title}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{wo.type}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{vehicleName(wo.vehicleId)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={workOrderStatusVariant(wo.status)}>
                        {wo.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={priorityVariant(wo.priority)}>{wo.priority}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">${wo.estimatedCostUsd.toFixed(0)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {format(new Date(wo.createdAt), 'MMM d')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between text-sm shrink-0">
            <span className="text-gray-500 text-xs">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: detail panel ── */}
      {selectedWOFresh && (
        <DetailPanel
          wo={selectedWOFresh}
          onClose={() => setSelectedWO(null)}
          canUpdate={canUpdate}
        />
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">New Work Order</h3>
              <button
                onClick={() => { setShowCreate(false); setFormError(''); setForm(EMPTY_FORM); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreate(e)} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle *</label>
                <select
                  required
                  value={form.vehicleId}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>{v.name} — {v.licensePlate}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Oil change and filter replacement"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe the work to be done…"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as WorkOrderType })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as WorkOrderPriority })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Est. Cost ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.estimatedCostUsd}
                    onChange={(e) => setForm({ ...form, estimatedCostUsd: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setFormError(''); setForm(EMPTY_FORM); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWO.isPending}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createWO.isPending ? 'Creating…' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
