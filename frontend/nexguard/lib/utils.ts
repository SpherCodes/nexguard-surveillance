/* eslint-disable @typescript-eslint/no-unused-vars */

import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import z from 'zod';
import { Camera } from '@/Types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * Utility function to update camera state in the React Query cache
 * @param queryClient - The React Query client instance
 * @param cameraId - ID of the camera to update
 * @param updates - Partial camera object with properties to update
 */
export function updateCameraInCache(
  queryClient: QueryClient,
  cameraId: number,
  updates: Partial<Camera>
) {
  queryClient.setQueryData<Camera[]>(['cameras'], (prev) => {
    if (!prev) return prev;

    return prev.map((camera) => {
      if (camera.cameraId === cameraId) {
        return { ...camera, ...updates };
      }
      return camera;
    });
  });
}

/**
 * Hook-based version that provides the queryClient automatically
 * Use this in React components
 */
export function useUpdateCameraInCache() {
  const queryClient = useQueryClient();

  return (cameraId: number, updates: Partial<Camera>) => {
    updateCameraInCache(queryClient, cameraId, updates);
  };
}

export const cameraFormSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters.' }),
  videoUrl: z.string().or(z.literal('')),
  enabled: z.boolean(),
  zoneId: z.number()
});

export const inferenceSchema = z.object({
  model: z.string(),
  min_detection_threshold: z.number().min(0).max(100)
});

export const storageSchema = z.object({
  storageType: z.enum(['local', 'cloud']),
  retentionDays: z.number()
});
