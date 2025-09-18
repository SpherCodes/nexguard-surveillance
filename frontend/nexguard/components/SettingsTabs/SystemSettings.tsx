'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@/lib/services/notification.service';
import { cn, inferenceSchema, storageSchema } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

import { useState } from 'react';
import { systemSettingsNav } from '@/constants';
import { Loader2, Save, Users, Trash2, Brain, Database, Shield } from 'lucide-react';
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
    mutationFn: (values: InferenceFormData) => {
      // Ensure we only send the fields that can be updated
      const data = {
        model: values.model,
        min_detection_threshold: values.min_detection_threshold
      };
      console.log('Sending inference update:', data);
      return updateInferenceSettings(data);
    },
    onSuccess: () => {
      notifications.settingsUpdated('Inference Settings');
      queryClient.invalidateQueries({ queryKey: ['inferenceSettings'] });
    },
    onError: (error) => {
      console.error('Failed to update inference settings:', error);
      notifications.error('Failed to update inference settings', {
        description: 'Please check your settings and try again.'
      });
    },
  });

  const { mutate: saveStorageConfig} = useMutation({
    mutationFn: (data: StorageFormData) => updateStorageSettings(data),
    onSuccess: () => {
      notifications.settingsUpdated('Storage Settings');
      queryClient.invalidateQueries({ queryKey: ['systemStorageSettings'] });
    },
    onError: () => notifications.error('Failed to update storage settings', {
      description: 'Please check your configuration and try again.'
    }),
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
          onSave={(data : InferenceFormData) => { saveInferenceConfig(data); console.log(data); }}
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
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {/* Mobile-Friendly Header & Navigation */}
  <div className="space-y-6 mb-6">
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">System Configuration</h2>
          <p className="text-gray-600 text-sm">Manage core system settings and user access</p>
        </div>
        
        {/* Horizontal Navigation - Clean Design */}
        <nav className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {systemSettingsNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-5 py-4 text-left font-semibold transition-all duration-200',
                'flex-1 sm:flex-initial min-w-0 relative overflow-hidden',
                activeSection === item.id
                  ? 'bg-gray-900 text-white shadow-lg transform scale-[1.02]'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm ring-1 ring-gray-200'
              )}
            >
              {/* Subtle gradient background for active state */}
              {activeSection === item.id && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black opacity-90" />
              )}
              
              <div className={cn(
                'p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 relative z-10',
                activeSection === item.id
                  ? 'bg-white/15 backdrop-blur-sm'
                  : 'bg-white shadow-sm'
              )}>
                <item.icon className={cn(
                  'h-5 w-5 transition-all duration-200',
                  activeSection === item.id ? 'text-white' : 'text-gray-700'
                )} />
              </div>
              <span className="text-sm font-semibold truncate relative z-10">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Panel - Borderless Design */}
      <div className="flex-1 min-h-0">
        <div className="bg-white rounded-2xl h-full overflow-hidden ring-1 ring-gray-100 shadow-sm">
          <div className="p-6 sm:p-8 h-full overflow-y-auto bg-gradient-to-br from-white via-gray-50/50 to-white">
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
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-6 sm:space-y-8 h-full">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <Brain className="h-5 w-5 text-gray-800" />
              </div>
              AI Detection Settings
            </h3>
            <p className="text-gray-600 text-sm pl-12">Configure the AI model and detection confidence levels</p>
          </div>
          
          {/* Borderless Card Design */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Model Configuration</h4>
                  <p className="text-gray-300 text-sm">Choose your detection model and confidence settings</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 space-y-6">
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-900">Detection Model</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 sm:h-11 border-0 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-900/20 transition-all rounded-xl shadow-sm">
                        <SelectValue placeholder="Choose a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {initialData?.available_models?.map((model) => (
                        <SelectItem key={model.id} value={model.name}>
                          <div className="flex flex-col py-1">
                            <span className="font-semibold">{model.name.toUpperCase()}</span>
                            <span className="text-xs text-gray-500">{model.description || 'AI Detection Model'}</span>
                          </div>
                        </SelectItem>
                      )) || (
                        <SelectItem value="yolo11n">
                          <div className="flex flex-col py-1">
                            <span className="font-semibold">YOLO11N</span>
                            <span className="text-xs text-gray-500">Default model</span>
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600 text-xs">Choose the AI model for object detection performance</FormDescription>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="min_detection_threshold" render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <FormLabel className="text-sm font-semibold text-gray-900">Confidence Threshold</FormLabel>
                    <div className="text-sm font-bold bg-gray-900 text-white px-4 py-2 rounded-xl shadow-sm">
                      {Math.round(field.value * 100)}%
                    </div>
                  </div>
                  <FormControl>
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <Slider 
                        defaultValue={[field.value * 100]} 
                        max={100} 
                        step={1} 
                        onValueChange={(v) => field.onChange(v[0] / 100)}
                        className="py-3"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-3">
                        <span className="font-medium">0%</span>
                        <span className="text-gray-400">Low confidence</span>
                        <span className="text-gray-400">High confidence</span>
                        <span className="font-medium">100%</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription className="text-gray-600 text-xs">Only create events for detections above this confidence level</FormDescription>
                </FormItem>
              )} />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
          <Button 
            type="button"
            variant="outline"
            className="w-full sm:w-auto order-2 sm:order-1 h-12 sm:h-11 rounded-xl border-gray-300 hover:bg-gray-50"
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty}
          >
            Reset Changes
          </Button>
          <Button 
            type="submit" 
            disabled={!form.formState.isDirty}
            className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white px-8 h-12 sm:h-11 font-semibold transition-all duration-200 shadow-sm hover:shadow-md order-1 sm:order-2 rounded-xl"
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
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-6 sm:space-y-8 h-full">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <Database className="h-5 w-5 text-gray-800" />
              </div>
              Storage Management
            </h3>
            <p className="text-gray-600 text-sm pl-12">Configure where recordings are saved and set up retention policies</p>
          </div>
          
          {/* Borderless Card Design */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Storage Configuration</h4>
                  <p className="text-gray-300 text-sm">Manage storage location and data retention settings</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 space-y-6">
              <FormField control={form.control} name="storageType" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-900">Storage Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 sm:h-11 border-0 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-900/20 transition-all rounded-xl shadow-sm">
                        <SelectValue placeholder="Choose storage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">
                        <div className="flex flex-col py-1">
                          <span className="font-semibold">Local Storage</span>
                          <span className="text-xs text-gray-500">Store on this device</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cloud">
                        <div className="flex flex-col py-1">
                          <span className="font-semibold">Cloud Storage</span>
                          <span className="text-xs text-gray-500">Store in the cloud</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600 text-xs">Select where recordings will be stored</FormDescription>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="retentionDays" render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <FormLabel className="text-sm font-semibold text-gray-900">Retention Period</FormLabel>
                    <div className="text-sm font-bold bg-gray-900 text-white px-4 py-2 rounded-xl shadow-sm">
                      {field.value} days
                    </div>
                  </div>
                  <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                    <FormControl>
                      <SelectTrigger className="h-12 sm:h-11 border-0 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-900/20 transition-all rounded-xl shadow-sm">
                        <SelectValue placeholder="Select retention" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="7">
                        <div className="flex items-center justify-between w-full py-1">
                          <span className="font-semibold">7 Days</span>
                          <span className="text-xs text-gray-500 ml-3">Short term</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="14">
                        <div className="flex items-center justify-between w-full py-1">
                          <span className="font-semibold">14 Days</span>
                          <span className="text-xs text-gray-500 ml-3">Medium term</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="30">
                        <div className="flex items-center justify-between w-full py-1">
                          <span className="font-semibold">30 Days</span>
                          <span className="text-xs text-gray-500 ml-3">Long term</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600 text-xs">Automatically delete recordings older than this period</FormDescription>
                </FormItem>
              )} />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
          <Button 
            type="button"
            variant="outline"
            className="w-full sm:w-auto order-2 sm:order-1 h-12 sm:h-11 rounded-xl border-gray-300 hover:bg-gray-50"
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty}
          >
            Reset Changes
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !form.formState.isDirty}
            className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white px-8 h-12 sm:h-11 font-semibold transition-all duration-200 shadow-sm hover:shadow-md order-1 sm:order-2 rounded-xl"
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { mutate: mutateStatus } = useMutation({
     mutationFn: ({ userId, status }: { userId: number; status: NonNullable<User['status']> }) =>
       updateUserStatus(userId, status),
    onSuccess: () => {
      notifications.settingsUpdated('User Status');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (e: Error) => notifications.error('Failed to update user status', {
      description: e.message || 'Please try again.'
    }),
  });

  const { mutate: mutateDelete, isPending: isDeletingUser } = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      notifications.userAction('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (e: Error) => notifications.error('Failed to delete user', {
      description: e.message || 'Please try again.'
    }),
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

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 h-full">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-xl">
              <Shield className="h-5 w-5 text-gray-800" />
            </div>
            User Access Control
          </h3>
          <p className="text-gray-600 text-sm pl-12">View and manage user accounts and access roles</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 sm:h-11 pl-12 pr-4 border-0 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-900/20 transition-all rounded-xl shadow-sm"
              />
              <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 h-12 sm:h-11 border-0 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-900/20 transition-all rounded-xl shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User List - Borderless Design */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Users ({filteredUsers.length})</h4>
                <p className="text-gray-300 text-sm">Manage user access and permissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-300">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Active
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                Inactive
              </span>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600 mb-2">No users found</p>
              <p className="text-xs text-gray-400">
                {searchQuery ? 'Try adjusting your search criteria' : 'No users match the current filter'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id ?? user.username} className="p-6 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all',
                      isActive(user.status) 
                        ? 'bg-gray-900 text-white shadow-sm' 
                        : 'bg-gray-200 text-gray-600'
                    )}>
                      {(user.username?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-base truncate">{user.username}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex gap-2">
                      <span className={cn(
                        "text-xs px-3 py-1.5 rounded-xl font-semibold",
                        user.role === 'super_admin' ? 'bg-gray-900 text-white' :
                        user.role === 'admin' ? 'bg-gray-700 text-white' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {formatRole(user.role)}
                      </span>
                      <span className={cn(
                        "text-xs px-3 py-1.5 rounded-xl font-semibold",
                        user.status === 'approved' ? 'bg-green-100 text-green-700' :
                        user.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        user.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {formatStatus(user.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isAdmin ? (
                        <Select
                          defaultValue={user.status || 'pending'}
                          onValueChange={(v) => {
                            if (!user.id) return;
                            const isAdminTarget = user.role === 'admin' || user.role === 'super_admin';
                            const allowed = canManageAdminUsers || !isAdminTarget;
                            if (!allowed) {
                              notifications.error('Insufficient privileges', {
                                description: 'You cannot modify admin users'
                              });
                              return;
                            }
                            if (user.id === currentUser?.id) {
                              notifications.error('Cannot modify own status', {
                                description: 'You cannot change your own status'
                              });
                              return;
                            }
                            mutateStatus({ userId: user.id, status: v as NonNullable<User['status']> });
                          }}
                        >
                          <SelectTrigger className="h-10 w-32 text-xs border-0 bg-gray-50 hover:bg-gray-100 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs px-3 py-2 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed font-medium">
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
                           className="h-10 w-10 text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-xl"
                           title="Delete user"
                           onClick={() => {
                             if (!user.id) return;
                             if (window.confirm(`Delete user ${user.username}? This cannot be undone.`)) {
                               mutateDelete(user.id);
                             }
                           }}
                           disabled={isDeletingUser}
                         >
                           {isDeletingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                         </Button>
                       )}
                     </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
 };
