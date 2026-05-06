import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { ApiResponse, Vehicle } from '../types/api';

const KEY = ['vehicles'] as const;

interface VehicleFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Vehicle[]>>('/vehicles', {
        params: filters,
      });
      return data;
    },
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Vehicle>>(`/vehicles/${id}`);
      return data.data!;
    },
    enabled: Boolean(id),
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Vehicle>) => {
      const { data } = await apiClient.post<ApiResponse<Vehicle>>('/vehicles', payload);
      return data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Vehicle> & { id: string }) => {
      const { data } = await apiClient.patch<ApiResponse<Vehicle>>(
        `/vehicles/${id}`,
        payload
      );
      return data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/vehicles/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
