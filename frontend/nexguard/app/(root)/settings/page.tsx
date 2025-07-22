'use client';

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
  Loader2,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getCameras, updateCamera, deleteCamera, createCamera,createZone, getZones } from '@/lib/actions/api.actions';
import { SettingsTabList } from '@/constants';
import CameraForm from '@/components/CameraForm';
import { Camera} from '@/Types';

function Settings() {
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: cameras = [], isLoading, error, refetch } = useQuery<Camera[]>({
    queryKey: ['cameras'],
    queryFn: getCameras,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: getZones,
  });

  useEffect(() => {
    if (mode !== 'add' && !selectedCameraId && cameras.length > 0) {
      setSelectedCameraId(cameras[0].camera_id);
    }
    if (selectedCameraId && !cameras.find(c => c.camera_id === selectedCameraId)) {
      setSelectedCameraId(cameras.length > 0 ? cameras[0].camera_id : null);
      if (cameras.length === 0) setMode('view');
    }
  }, [cameras, selectedCameraId, mode]);

  const selectedCamera = useMemo(() =>
    cameras.find(c => c.camera_id === selectedCameraId) || null,
    [cameras, selectedCameraId]
  );

  const { mutate: saveCameraMutate, isPending: isSaving } = useMutation({
    mutationFn: ({ updates, id }: { updates: Partial<Camera>, id?: string }) => 
        id ? updateCamera(id, updates) : createCamera(updates),
    onSuccess: (savedCamera) => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setMode('view');
      setSelectedCameraId(savedCamera.camera_id);
      toast.success(`Camera '${savedCamera.name}' saved successfully`);
    },
    onError: (err: Error) => toast.error(`Save failed: ${err.message}`),
  });

  const {mutateAsync: createZoneMutate} = useMutation({
    mutationFn: (zoneName: string) => createZone(zoneName),
    onSuccess: (newZone) => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success(`Zone '${newZone.name}' created successfully`);
    },
    onError: (err: Error) => toast.error(`Create zone failed: ${err.message}`),
  })
  const { mutate: deleteCameraMutate } = useMutation({
    mutationFn: (id: string) => deleteCamera(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setDeleteDialogOpen(false);
      toast.success('Camera removed successfully');
    },
    onError: (err: Error) => toast.error(`Delete failed: ${err.message}`),
  });

  const handleSelectCamera = (id: string) => {
    setMode('view');
    setSelectedCameraId(id);
  };

  const handleAddClick = () => {
    setMode('add');
    setSelectedCameraId(null);
  };
  
  const handleDeleteClick = useCallback((camera: Camera) => {
    setCameraToDelete(camera);
    setDeleteDialogOpen(true);
  }, []);

  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <section className="flex h-full w-full flex-col bg-gray-50/50 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
      <header className="mb-1 text-3xl font-bold text-gray-800 pb-2">Settings</header>

      <Tabs defaultValue="Cameras" className="w-full flex-1">
        <TabsList className="grid w-full max-w-lg grid-cols-4 bg-gray-200/75 p-1 dark:bg-gray-800">
          {SettingsTabList.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="Cameras" className="mt-8 flex-1">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-1">
              <Button onClick={handleAddClick} disabled={isSaving && mode === 'add'} className="w-full">
                {isSaving && mode === 'add' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Camera
              </Button>
              <div className="space-y-2 overflow-y-auto">
                {isLoading ? Array.from({ length: 4 }).map((_, i) => <CameraItemSkeleton key={i} />)
                  : cameras.map((camera) => (
                    <CameraItem key={camera.camera_id} camera={camera} isSelected={selectedCameraId === camera.camera_id && mode === 'view'} onSelect={() => handleSelectCamera(camera.camera_id)} />
                  ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              {mode === 'add' || mode === 'edit' ? (
                <CameraForm
                  onSubmit={(data, id) => saveCameraMutate({ updates: data, id })}
                  zones={zones}
                  onCreateZone={createZoneMutate}
                />
              ) : selectedCamera ? (
                <CameraForm
                  key={selectedCamera.camera_id}
                  initialData={selectedCamera}
                  onSubmit={(data, id) => saveCameraMutate({ updates: data, id })}
                  onDelete={() => handleDeleteClick(selectedCamera)}
                  zones={zones}
                  onCreateZone={createZoneMutate}
                />
              ) : (
                <EmptyState onAddCamera={handleAddClick}/>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Camera</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{cameraToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCameraToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cameraToDelete) {
                  deleteCameraMutate(cameraToDelete.camera_id);
                  setCameraToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
// --- Camera Item Component ---
const CameraItem = React.memo(({ camera, isSelected, onSelect }: { camera: Camera; isSelected: boolean; onSelect: () => void; }) => (
  <button
    onClick={onSelect}
    className={cn(
      'group relative flex w-full items-center justify-between rounded-lg border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md dark:bg-gray-800 dark:hover:bg-gray-700',
      isSelected
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
        : 'border-gray-200 bg-white dark:border-gray-700'
    )}
  >
    {isSelected && (
      <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
    )}
    <div className="pl-2">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">{camera.name}</h3>
      <div className="mt-1.5 flex items-center text-sm">
        {camera.status === 'online' ? (
          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
        <span
          className={cn(
            'capitalize',
            camera.status === 'online'
              ? 'text-green-700 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {camera.status}
        </span>
      </div>
    </div>
    <SettingsIcon
      className="h-5 w-5 text-gray-400 transition-transform transition-colors duration-300 group-hover:rotate-45 group-hover:scale-110 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
    />
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

const EmptyState = ({ onAddCamera }: { onAddCamera: () => void; }) => (
  <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/50 dark:border-gray-700 dark:bg-gray-800/20">
    <div className="text-center">
      <p className="mt-4 font-medium text-gray-600 dark:text-gray-300">No Camera Available</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a new camera to view and configure its settings.</p>
      <Button onClick={onAddCamera}className="mt-4">
        Add Camera
      </Button>
    </div>
  </div>
);

export default Settings;