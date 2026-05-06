import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { ApiResponse, Alert } from '../types/api';

const KEY = ['alerts'] as const;

interface AlertFilters {
  vehicleId?: string;
  type?: string;
  severity?: string;
  isResolved?: boolean;
  page?: number;
  limit?: number;
}

interface AlertStatEntry {
  _id: string;
  total: number;
  unresolved: number;
}

export function useAlerts(filters?: AlertFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Alert[]>>('/alerts', {
        params: filters,
      });
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useAlertStats() {
  return useQuery({
    queryKey: [...KEY, 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AlertStatEntry[]>>(
        '/alerts/stats'
      );
      return data.data ?? [];
    },
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      workOrderId,
    }: {
      id: string;
      workOrderId?: string;
    }) => {
      const { data } = await apiClient.patch<ApiResponse<Alert>>(
        `/alerts/${id}/resolve`,
        { workOrderId: workOrderId ?? null }
      );
      return data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
