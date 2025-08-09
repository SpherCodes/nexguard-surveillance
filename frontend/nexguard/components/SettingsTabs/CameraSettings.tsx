'use client';

// TODO:Fix the Empty state component

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Settings as SettingsIcon,
  Plus,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Camera as CameraIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import CameraForm from '../CameraForm';
import { getCameras, updateCamera, deleteCamera, createCamera, getZones, createZone } from '@/lib/actions/api.actions';
import type { Camera, Zone } from '@/Types';
function CameraSettings() {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
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

  const filteredCameras = useMemo(() => {
    return cameras.filter(camera => {
      const matchesSearch = camera.name!.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (camera?.location && camera.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || camera?.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cameras, searchQuery, statusFilter]);

  const cameraStats = useMemo(() => {
    const total = cameras.length;
    const online = cameras.filter(c => c.status === 'online').length;
    const offline = total - online;
    return { total, online, offline };
  }, [cameras]);
  const { mutate: saveCameraMutate, isPending: isSaving } = useMutation({
    mutationFn: ({ data, id }: { data: Partial<Camera>; id?: number }) => {
      return id ? updateCamera(id, data as Camera) : createCamera(data as Camera);
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
    mutationFn: (zoneName: string) => createZone(zoneName, ''),
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 h-full">
        {/* Camera List Section */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Cameras</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {cameraStats.online}/{cameraStats.total} online
                </span>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search cameras..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
                <Button
                  onClick={handleAddClick}
                  disabled={isSaving && isAdding}
                  size="sm"
                  className="bg-black hover:bg-gray-800 text-white px-3 h-8 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Add Camera"
                >
                  {isSaving && isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex gap-2 mt-3"></div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'flex-1 text-xs',
                    statusFilter === 'all' 
                      ? 'bg-black hover:bg-gray-800 text-white' 
                      : 'bg-white hover:bg-gray-50'
                  )}
                >
                  All ({cameraStats.total})
                </Button>
                <Button
                  variant={statusFilter === 'online' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('online')}
                  className={cn(
                    'flex-1 text-xs',
                    statusFilter === 'online' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-white hover:bg-gray-50'
                  )}
                >
                  <Wifi className="mr-1 h-3 w-3" />
                  Online ({cameraStats.online})
                </Button>
                <Button
                  variant={statusFilter === 'offline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('offline')}
                  className={cn(
                    'flex-1 text-xs',
                    statusFilter === 'offline' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-white hover:bg-gray-50'
                  )}
                >
                  <WifiOff className="mr-1 h-3 w-3" />
                  Offline ({cameraStats.offline})
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <div className="h-full overflow-y-auto space-y-3 pr-2">
              {isLoadingCameras ? (
                Array.from({ length: 3 }).map((_, i) => <CameraItemSkeleton key={i} />)
              ) : filteredCameras.length > 0 ? (
                filteredCameras.map((camera) => (
                  <CameraItem 
                    key={camera.cameraId} 
                    camera={camera} 
                    isSelected={!isAdding && selectedCameraId === camera.cameraId} 
                    onSelect={() => handleSelectCamera(camera.cameraId)} 
                  />
                ))
              ) : searchQuery || statusFilter !== 'all' ? (
                <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                  <Filter className="h-8 w-8 text-gray-300 mb-3" />
                  <h3 className="text-sm font-medium text-gray-600 mb-1">No cameras found</h3>
                  <p className="text-xs text-gray-500">Try adjusting your search or filter criteria</p>
                  <Button 
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <CameraIcon className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-sm font-medium text-gray-600 mb-2">No cameras configured</h3>
                  <p className="text-xs text-gray-500 mb-4">Get started by adding your first camera</p>
                  <Button 
                    onClick={handleAddClick}
                    size="sm"
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Camera
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
            {isAdding || selectedCamera ? (
              <div className="p-6 h-full flex flex-col">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {isAdding ? 'Add New Camera' : selectedCamera?.name}
                    </h3>
                    {!isAdding && selectedCamera && (
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                          selectedCamera.status === 'online'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          <div className={cn(
                            'h-2 w-2 rounded-full',
                            selectedCamera.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                          )} />
                          {selectedCamera.status}
                        </div>
                        {selectedCamera.enabled === false && (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                            Disabled
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {isAdding 
                      ? 'Set up a new camera for your surveillance system' 
                      : `Configure settings for ${selectedCamera?.name || 'this camera'}`
                    }
                  </p>
                  {!isAdding && selectedCamera?.location && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedCamera.location}
                    </p>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  <CameraForm
                    key={isAdding ? 'add-new' : selectedCamera?.cameraId}
                    initialData={isAdding ? null : selectedCamera}
                    onSubmit={(data, id) => saveCameraMutate({ data, id })}
                    onDelete={() => selectedCamera && handleDeleteClick(selectedCamera)}
                    zones={zones}
                    onCreateZone={createZoneMutate}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-6 mb-6">
                  <SettingsIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {cameras.length === 0 ? 'No Cameras Available' : 'Select a Camera to Configure'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md leading-relaxed">
                  {cameras.length === 0 
                    ? 'Get started by adding your first camera to begin monitoring your surveillance system.' 
                    : 'Choose a camera from the list on the left to view and modify its configuration settings.'
                  }
                </p>
                {cameras.length === 0 && (
                  <Button 
                    onClick={handleAddClick}
                    className="bg-black hover:bg-gray-800 text-white px-6 py-3"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Camera
                  </Button>
                )}
                {cameras.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-3 font-medium">Quick Stats:</p>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">{cameraStats.total}</div>
                        <div className="text-gray-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{cameraStats.online}</div>
                        <div className="text-gray-500">Online</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">{cameraStats.offline}</div>
                        <div className="text-gray-500">Offline</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Delete Confirmation Dialog --- */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="text-center sm:text-left">
            <AlertDialogTitle className="text-xl font-semibold text-gray-900">
              Delete Camera
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-2">
              Are you sure you want to delete <span className="font-semibold text-gray-900">&quot;{cameraToDelete?.name}&quot;</span>? 
              <br />
              <span className="text-sm text-red-600 mt-1 block">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:gap-2">
            <AlertDialogCancel className="flex-1 sm:flex-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cameraToDelete && deleteCameraMutate(cameraToDelete.cameraId)}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Delete Camera"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const CameraItem = React.memo(({ camera, isSelected, onSelect }: { camera: Camera; isSelected: boolean; onSelect: () => void; }) => (
  <button 
    onClick={onSelect} 
    className={cn(
      'group relative flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
      isSelected 
        ? 'border-black bg-gray-50 shadow-md ring-1 ring-black/10' 
        : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm hover:bg-gray-50'
    )}
  >
    {/* Selection Indicator */}
    {isSelected && (
      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-black" />
    )}
    
    <div className={cn('flex items-center space-x-3 flex-1 min-w-0', isSelected ? 'pl-3' : 'pl-1')}>
      {/* Status Indicator */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          'h-3 w-3 rounded-full',
          camera.status === 'online' 
            ? 'bg-green-500 shadow-lg shadow-green-500/50' 
            : 'bg-gray-300'
        )}>
          {camera.status === 'online' && (
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
      </div>
      
      {/* Camera Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            'font-semibold truncate text-sm',
            isSelected ? 'text-gray-900' : 'text-gray-700'
          )}>
            {camera.name || 'Unnamed Camera'}
          </h3>
          {camera.enabled ? <>
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
              Enabled
            </span>
          </> : <>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              Disabled
            </span>
          </>}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <span className={cn(
              'capitalize font-medium',
              camera.status === 'online' 
                ? 'text-green-600' 
                : 'text-gray-500'
            )}>
              {camera.status}
            </span>
            {camera.status === 'online' && camera.fps && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">{camera.fps} FPS</span>
              </>
            )}
            {camera.resolution && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">{camera.resolution}</span>
              </>
            )}
          </div>
        </div>
        
        {camera.location && (
          <div className="mt-1">
            <span className="text-xs text-gray-500 truncate block">
              📍 {camera.location}
            </span>
          </div>
        )}
      </div>
    </div>
    
    <div className="flex-shrink-0 ml-2">
      <SettingsIcon className={cn(
        'h-4 w-4 transition-all duration-300 group-hover:rotate-45 group-hover:scale-110',
        isSelected 
          ? 'text-gray-600' 
          : 'text-gray-400 group-hover:text-gray-600'
      )} />
    </div>
  </button>
));
CameraItem.displayName = 'CameraItem';

const CameraItemSkeleton = () => (
  <div className="h-[100px] animate-pulse rounded-xl bg-gray-100 border border-gray-200 p-4">
    <div className="flex items-start space-x-3">
      <div className="h-3 w-3 rounded-full bg-gray-300 mt-1"></div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          <div className="h-4 bg-gray-300 rounded w-12"></div>
        </div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        <div className="h-3 bg-gray-300 rounded w-3/4"></div>
      </div>
      <div className="h-4 w-4 bg-gray-300 rounded"></div>
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void; }) => (
  <div className="flex h-full w-full items-center justify-center p-8">
    <div className="text-center max-w-md">
      <div className="bg-red-50 rounded-full p-4 w-fit mx-auto mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Unable to Load Camera Settings</h2>
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">{message}</p>
      <Button 
        onClick={onRetry} 
        className="bg-black hover:bg-gray-800 text-white px-6 py-2"
      >
        <Loader2 className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  </div>
);

export default CameraSettings;