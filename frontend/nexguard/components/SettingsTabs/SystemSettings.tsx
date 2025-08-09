'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn, inferenceSchema, storageSchema } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

import { useState } from 'react';
import { systemSettingsNav } from '@/constants';
import { Loader2, Save, Users, Trash2 } from 'lucide-react';
import { InfrenceFormProps, StorageFormProps} from '@/Types';
import { getInferenceSettings, getSystemStorageSettings, updateInferenceSettings, updateStorageSettings} from '@/lib/actions/api.actions';
import { getUsers, getCurrentUser, updateUserStatus, deleteUser } from '@/lib/actions/user.actions';
import type { User } from '@/Types';

const SystemSettings = () => {
  const [activeSection, setActiveSection] = useState('inference');
  const [isLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: inferenceSettings } = useQuery({
    queryKey: ['inferenceSettings'],
    queryFn: getInferenceSettings,
  });

  const {data: storageSettings} = useQuery({
    queryKey: ['systemStorageSettings'],
    queryFn: getSystemStorageSettings,
  });

  // Fetch real users for Access Control (admin endpoint)
  const { data: users = [], isLoading: usersLoading, isError: usersError } = useQuery<User[]>({
    queryKey: ['adminUsers'],
    queryFn: getUsers,
  });
  
  // Current user (to determine admin/super-admin privileges)
  const { data: currentUser } = useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });


  const { mutate: saveInferenceConfig } = useMutation({
    mutationFn: (data: InferenceFormData) => updateInferenceSettings(data),
    onSuccess: () => {
      toast.success('Inference settings updated');
      queryClient.invalidateQueries({ queryKey: ['inferenceSettings'] });
    },
    onError: () => toast.error('Failed to update inference settings'),
  });

  const { mutate: saveStorageConfig} = useMutation({
    mutationFn: (data: StorageFormData) => updateStorageSettings(data),
    onSuccess: () => {
      toast.success('Storage settings updated');
      queryClient.invalidateQueries({ queryKey: ['systemStorageSettings'] });
    },
    onError: () => toast.error('Failed to update storage settings'),
  });

  const renderActivePanel = () => {
    if (isLoading || !inferenceSettings || !storageSettings || usersLoading || usersError) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-1/2 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-4 w-3/4 rounded-lg bg-gray-200 animate-pulse" />
          </div>
          
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-4">
              <div className="space-y-2">
                <div className="h-5 w-1/3 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-3 w-2/3 rounded-lg bg-gray-200 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="h-3 w-1/4 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-10 w-full rounded-lg bg-gray-200 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-3 w-1/4 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-10 w-full rounded-lg bg-gray-200 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    switch (activeSection) {
      case 'inference':
        return <InferenceForm
          initialData={inferenceSettings}
          onSave={(data : InferenceFormData) => saveInferenceConfig(data)}
          isLoading={isLoading}
        />;
      case 'storage':
        return <StorageForm
          initialData={storageSettings}
          onSave={(data : StorageFormData) => saveStorageConfig(data)}
          isLoading={isLoading}
        />;
      case 'access':
        return <AccessControlForm users={users} currentUser={currentUser || undefined} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 h-full max-w-6xl mx-auto">
      {/* Compact Navigation Sidebar */}
      <div className="lg:col-span-1">
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900">System Configuration</h2>
            <p className="text-gray-600 text-sm">Manage core system settings</p>
          </div>
          
          <nav className="space-y-2">
            {systemSettingsNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium transition-all duration-200',
                  'hover:shadow-md hover:-translate-y-0.5 transform',
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg scale-105'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg transition-colors',
                  activeSection === item.id
                    ? 'bg-white/20'
                    : 'bg-gray-100'
                )}>
                  <item.icon className={cn(
                    'h-4 w-4',
                    activeSection === item.id ? 'text-white' : 'text-gray-600'
                  )} />
                </div>
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Compact Content Panel */}
      <div className="lg:col-span-3">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-md h-full overflow-hidden">
          <div className="p-6 h-full">
            {renderActivePanel()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;

// --- Inference Form ---
  type InferenceFormData = z.infer<typeof inferenceSchema>;
  const InferenceForm = ({ initialData, onSave, isLoading }: InfrenceFormProps) => {
  const form = useForm<InferenceFormData>({ resolver: zodResolver(inferenceSchema), defaultValues: initialData });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-6 h-full">
        <div className="space-y-2">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-900">AI Detection Settings</h3>
            <p className="text-gray-600 text-sm">Configure the AI model and detection confidence levels</p>
          </div>
          
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-gray-100">
              <CardTitle className="text-lg text-gray-900">Model Configuration</CardTitle>
              <CardDescription className="text-gray-600 text-sm">Choose your detection model and confidence settings</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-900">Detection Model</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 border-gray-300 bg-white hover:border-gray-400 focus:border-gray-900 transition-colors">
                        <SelectValue placeholder="Choose a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yolov11n">YOLOv11 Nano (Fastest)</SelectItem>
                      <SelectItem value="yolov11s">YOLOv11 Small (Balanced)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600 text-xs">Choose the AI model for object detection performance</FormDescription>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="min_detection_threshold" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-semibold text-gray-900">Confidence Threshold</FormLabel>
                    <div className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-lg text-gray-900 font-semibold">
                      {Math.round(field.value * 100)}%
                    </div>
                  </div>
                  <FormControl>
                    <div className="px-2">
                      <Slider 
                        defaultValue={[field.value * 100]} 
                        max={100} 
                        step={1} 
                        onValueChange={(v) => field.onChange(v[0] / 100)}
                        className="py-3"
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-gray-600 text-xs">Only create events for detections above this confidence level</FormDescription>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button 
            type="submit" 
            disabled={!form.formState.isDirty}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 h-10 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};

// --- Storage Form ---

type StorageFormData = z.infer<typeof storageSchema>;

const StorageForm = ({
  initialData,
  onSave,
  isLoading
}: StorageFormProps
) => {
  const form = useForm<StorageFormData>({ resolver: zodResolver(storageSchema), defaultValues: initialData });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-6 h-full">
        <div className="space-y-2">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900">Storage Management</h3>
            <p className="text-gray-600 text-sm">Configure where recordings are saved and set up retention policies</p>
          </div>
          
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <CardTitle className="text-lg text-gray-900">Storage Configuration</CardTitle>
              <CardDescription className="text-gray-600 text-sm">Manage storage location and data retention settings</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="storageType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-900">Storage Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 border-gray-300 bg-white hover:border-gray-400 focus:border-gray-900 transition-colors">
                        <SelectValue placeholder="Choose storage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="cloud">Cloud Storage</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600 text-xs">Select where recordings will be stored</FormDescription>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="retentionDays" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-semibold text-gray-900">Retention Period</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                    <FormControl>
                      <SelectTrigger className="h-10 border-gray-300 bg-white hover:border-gray-400 focus:border-gray-900 transition-colors">
                        <SelectValue placeholder="Select retention" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600 text-xs">Automatically delete recordings older than this period</FormDescription>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button 
            type="submit" 
            disabled={isLoading || !form.formState.isDirty}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 h-10 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};

// --- Access Control Form ---
interface AccessControlFormProps {
  users: User[];
  currentUser?: User;
}

const AccessControlForm = ({ users, currentUser }: AccessControlFormProps) => {
  const queryClient = useQueryClient();

  const { mutate: mutateStatus } = useMutation({
     mutationFn: ({ userId, status }: { userId: number; status: NonNullable<User['status']> }) =>
       updateUserStatus(userId, status),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update status'),
  });

  const { mutate: mutateDelete, isPending: isDeletingUser } = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete user'),
  });

  const formatRole = (role?: User['role']) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'operator':
        return 'Operator';
      default:
        return 'Unknown';
    }
  };

  const formatStatus = (status?: User['status']) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'suspended':
        return 'Suspended';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const isActive = (status?: User['status']) => status === 'approved';
  const canManageAdminUsers = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  return (
    <div className="space-y-4 h-full">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">User Access Control</h3>
        <p className="text-gray-600 text-sm">View user accounts and access roles</p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-gray-900">Users ({users.length})</CardTitle>
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                Active
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></div>
                Inactive
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No users found.</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id ?? user.username} className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                        isActive(user.status) ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      )}>
                        {(user.username?.[0] || '?').toUpperCase()
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-700">
                        {formatRole(user.role)}
                      </span>
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <Select
                            defaultValue={user.status || 'pending'}
                            onValueChange={(v) => {
                              if (!user.id) return;
                              const isAdminTarget = user.role === 'admin' || user.role === 'super_admin';
                              const allowed = canManageAdminUsers || !isAdminTarget;
                              if (!allowed) {
                                toast.error('Insufficient privileges to modify admin users');
                                return;
                              }
                              if (user.id === currentUser?.id) {
                                toast.error('You cannot change your own status');
                                return;
                              }
                              mutateStatus({ userId: user.id, status: v as NonNullable<User['status']> });
                            }}
                          >
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed">
                            {formatStatus(user.status)}
                          </span>
                        )}
                        {(isAdmin && user.id !== currentUser?.id && (
                          currentUser?.role === 'super_admin'
                            ? user.role !== 'super_admin'
                            : user.role !== 'admin' && user.role !== 'super_admin'
                        )) && (
                           <Button
                             variant="outline"
                             size="icon"
                             className="h-8 w-8 text-red-600"
                             title="Delete user"
                             onClick={() => {
                               if (!user.id) return;
                               if (window.confirm(`Delete user ${user.username}? This cannot be undone.`)) {
                                 mutateDelete(user.id);
                               }
                             }}
                             disabled={isDeletingUser}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )}
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
 };
