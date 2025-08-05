'use client';

// TODO:Fix the Empty state component

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Settings as SettingsIcon,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import CameraForm from '../CameraForm';
import { getCameras, updateCamera, deleteCamera, createCamera, getZones, createZone } from '@/lib/actions/api.actions';
import type { Camera, Zone } from '@/Types';
function CameraSettings() {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);
  const queryClient = useQueryClient();

  const { data: cameras = [], isLoading: isLoadingCameras, error, refetch } = useQuery<Camera[]>({
    queryKey: ['cameras'],
    queryFn: getCameras,
  });
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ['zones'],
    queryFn: getZones,
  });

  useEffect(() => {
    if (!isAdding && !selectedCameraId && cameras.length > 0) {
      setSelectedCameraId(cameras[0].cameraId);
    }

    if (selectedCameraId && !cameras.find(c => c.cameraId === selectedCameraId)) {
      setSelectedCameraId(cameras.length > 0 ? cameras[0].cameraId : null);
      if (cameras.length === 0) setIsAdding(false);
    }
  }, [cameras, selectedCameraId, isAdding]);

  const selectedCamera = useMemo(() =>
    cameras.find(c => c.cameraId === selectedCameraId) || null,
    [cameras, selectedCameraId]
  );
  const { mutate: saveCameraMutate, isPending: isSaving } = useMutation({
    mutationFn: ({ data, id }: { data: Camera, id?: number }) => {
      return id ? updateCamera(id, data) : createCamera(data);
    },
    onSuccess: (savedCamera) => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setIsAdding(false);
      setSelectedCameraId(savedCamera.cameraId);
      toast.success(`Camera '${savedCamera.name}' saved successfully`);
    },
    onError: (err: Error) => toast.error(`Save failed: ${err.message}`),
  });

  const { mutateAsync: createZoneMutate } = useMutation({
    mutationFn: (zoneName: string) => createZone(zoneName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zones'] }),
  });

  const { mutate: deleteCameraMutate, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => deleteCamera(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setDeleteDialogOpen(false);
      toast.success('Camera removed successfully');
    },
    onError: (err: Error) => toast.error(`Delete failed: ${err.message}`),
  });

  const handleSelectCamera = (id: number) => {
    setIsAdding(false);
    setSelectedCameraId(id);
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setSelectedCameraId(null);
  };

  const handleDeleteClick = useCallback((camera: Camera) => {
    setCameraToDelete(camera);
    setDeleteDialogOpen(true);
  }, []);
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Button onClick={handleAddClick} disabled={isSaving && isAdding} className="w-full">
            {isSaving && isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add Camera
          </Button>
          <div className="space-y-2 overflow-y-auto">
            {isLoadingCameras ? Array.from({ length: 4 }).map((_, i) => <CameraItemSkeleton key={i} />)
              : cameras.map((camera) => (
                <CameraItem key={camera.cameraId} camera={camera} isSelected={!isAdding && selectedCameraId === camera.cameraId} onSelect={() => handleSelectCamera(camera.cameraId)} />
              ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {isAdding || selectedCamera ? (
            <CameraForm
              key={isAdding ? 'add-new' : selectedCamera?.cameraId}
              initialData={isAdding ? null : selectedCamera}
              onSubmit={(data, id) => saveCameraMutate({ data, id })}
              onDelete={() => selectedCamera && handleDeleteClick(selectedCamera)}
              zones={zones}
              onCreateZone={createZoneMutate}
            />
          ) : (
            // This state is shown only when there are no cameras at all
            // <EmptyState onAddCamera={handleAddClick} />
            <>There are no cameras to display</>
          )}
        </div>
      </div>

      {/* --- Delete Confirmation Dialog --- */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Camera</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{cameraToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cameraToDelete && deleteCameraMutate(cameraToDelete.cameraId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const CameraItem = React.memo(({ camera, isSelected, onSelect }: { camera: Camera; isSelected: boolean; onSelect: () => void; }) => (
  <button onClick={onSelect} className={cn('group relative flex w-full items-center justify-between rounded-lg border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md dark:bg-gray-800 dark:hover:bg-gray-700', isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700' : 'border-gray-200 bg-white dark:border-gray-700')}>
    {isSelected && <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />}
    <div className="pl-2">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">{camera.name}</h3>
      <div className="mt-1.5 flex items-center text-sm">
        {camera.status === 'online' ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : <XCircle className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />}
        <span className={cn('capitalize', camera.status === 'online' ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400')}>{camera.status}</span>
      </div>
    </div>
    <SettingsIcon className="h-5 w-5 text-gray-400 transition-transform transition-colors duration-300 group-hover:rotate-45 group-hover:scale-110 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
  </button>
));
CameraItem.displayName = 'CameraItem';

const CameraItemSkeleton = () => <div className="h-[78px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />;

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void; }) => (
  <div className="flex h-full w-full items-center justify-center p-8">
    <div className="text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
      <h2 className="mt-4 text-lg font-semibold">Failed to load settings</h2>
      <p className="mt-2 text-gray-500">{message}</p>
      <Button onClick={onRetry} className="mt-4">Try Again</Button>
    </div>
  </div>
);
// const EmptyState = ({ onAddCamera }: { onAddCamera: () => void; }) => (
//   <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/50 dark:border-gray-700 dark:bg-gray-800/20">
//     <div className="text-center">
//       <Camera className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
//       <p className="mt-4 font-medium text-gray-600 dark:text-gray-300">No Camera to Configure</p>
//       <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please add a new camera to begin.</p>
//       <Button onClick={onAddCamera} className="mt-4">Add Camera</Button>
//     </div>
//   </div>
// );

export default CameraSettings;