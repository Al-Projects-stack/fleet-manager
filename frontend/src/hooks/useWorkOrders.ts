import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { ApiResponse, WorkOrder } from '../types/api';

const KEY = ['work-orders'] as const;

interface WOFilters {
  vehicleId?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

interface CreateWOPayload {
  vehicleId: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  estimatedCostUsd: number;
  scheduledDate?: string | null;
  alertId?: string | null;
  odometerAtCreationKm?: number;
}

interface UpdateWOPayload {
  id: string;
  status?: string;
  priority?: string;
  assignedToId?: string | null;
  estimatedCostUsd?: number;
  actualCostUsd?: number | null;
  completedDate?: string | null;
}

export function useWorkOrders(filters?: WOFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<WorkOrder[]>>(
        '/work-orders',
        { params: filters }
      );
      return data;
    },
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWOPayload) => {
      const { data } = await apiClient.post<ApiResponse<WorkOrder>>(
        '/work-orders',
        payload
      );
      return data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateWOPayload) => {
      const { data } = await apiClient.patch<ApiResponse<WorkOrder>>(
        `/work-orders/${id}`,
        payload
      );
      return data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data } = await apiClient.post<ApiResponse<WorkOrder>>(
        `/work-orders/${id}/notes`,
        { content }
      );
      return data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
