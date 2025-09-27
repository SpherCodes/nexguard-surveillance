/* eslint-disable @typescript-eslint/no-unused-vars */

import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import z from 'zod';
import { Camera } from '@/Types';
import { getCurrentUser } from './actions/user.actions';

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

export const checkAuthStatus = async () => {
  try {
    const currentUser = await getCurrentUser();
    return currentUser;
  } catch (error) {
    return null;
  }
};
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
  min_detection_threshold: z.number().min(0).max(1).step(0.01)
});

export const storageSchema = z.object({
  storageType: z.enum(['local', 'cloud']),
  retentionDays: z.number()
});

export const authFormSchema = (type: 'Sign-up' | 'Sign-in') => {
  if (type === 'Sign-in') {
    return z.object({
      userName: z.string().min(1, { message: 'Username is required.' }),
      password: z.string().min(1, { message: 'Password is required.' })
    });
  }

  return z
    .object({
      userName: z
        .string()
        .min(6, { message: 'Username must be at least 6 characters.' }),
      firstName: z
        .string()
        .min(2, { message: 'First name must be at least 2 characters.' }),
      lastName: z
        .string()
        .min(2, { message: 'Last name must be at least 2 characters.' }),
      middleName: z.string().optional(),
      password: z
        .string()
        .min(6, { message: 'Password must be at least 6 characters.' }),
      confirmPassword: z
        .string()
        .min(6, { message: 'Confirm Password must match.' }),
      email: z.string().email({ message: 'Invalid email address.' }),
      phoneNumber: z
        .string()
        .min(10, { message: 'Phone number must be at least 10 digits.' }),
      acceptTerms: z.boolean().refine((val) => val, {
        message: 'You must accept the terms and conditions.'
      })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match"
    });
};
