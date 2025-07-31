/* eslint-disable @typescript-eslint/no-unused-vars */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import z from 'zod';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
