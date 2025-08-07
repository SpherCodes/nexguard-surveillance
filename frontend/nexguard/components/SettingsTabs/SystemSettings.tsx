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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { useState } from 'react';
import { systemSettingsNav } from '@/constants';
import { Loader2, Save, Plus, Trash2, Users } from 'lucide-react';
import { InfrenceFormProps, StorageFormProps} from '@/Types';
import { getInferenceSettings, getSystemStorageSettings, updateInferenceSettings, updateStorageSettings} from '@/lib/actions/api.actions';

// Access Control Schema
const accessControlSchema = z.object({
  sessionTimeout: z.number().min(5).max(1440),
  maxLoginAttempts: z.number().min(1).max(10),
  requireTwoFactor: z.boolean(),
  allowPasswordReset: z.boolean(),
  passwordMinLength: z.number().min(6).max(50),
  users: z.array(z.object({
    id: z.string(),
    username: z.string().min(1),
    role: z.enum(['admin', 'moderator', 'viewer']),
    email: z.string().email(),
    isActive: z.boolean(),
  }))
});

type AccessControlFormData = z.infer<typeof accessControlSchema>;

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

  // Mock access control data - replace with actual API call
  const { data: accessControlSettings } = useQuery({
    queryKey: ['accessControlSettings'],
    queryFn: () => Promise.resolve({
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      requireTwoFactor: false,
      allowPasswordReset: true,
      passwordMinLength: 8,
      users: [
        { id: '1', username: 'admin', role: 'admin' as const, email: 'admin@nexguard.com', isActive: true },
        { id: '2', username: 'security', role: 'moderator' as const, email: 'security@nexguard.com', isActive: true },
        { id: '3', username: 'viewer', role: 'viewer' as const, email: 'viewer@nexguard.com', isActive: false },
      ]
    }),
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

  const { mutate: saveAccessControlConfig } = useMutation({
    mutationFn: (data: AccessControlFormData) => {
      // Mock API call - replace with actual implementation
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast.success('Access control settings updated');
      queryClient.invalidateQueries({ queryKey: ['accessControlSettings'] });
    },
    onError: () => toast.error('Failed to update access control settings'),
  });

  const renderActivePanel = () => {
    if (isLoading || !inferenceSettings || !storageSettings || !accessControlSettings) {
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
        return <AccessControlForm
          initialData={accessControlSettings}
          onSave={(data: AccessControlFormData) => saveAccessControlConfig(data)}
          isLoading={isLoading}
        />;
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
  initialData: AccessControlFormData;
  onSave: (data: AccessControlFormData) => void;
  isLoading: boolean;
}

const AccessControlForm = ({ initialData, onSave, isLoading }: AccessControlFormProps) => {
  const handleRemoveUser = (userId: string) => {
    const updatedUsers = initialData.users.filter(user => user.id !== userId);
    onSave({ ...initialData, users: updatedUsers });
  };

  const handleToggleUser = (userId: string) => {
    const updatedUsers = initialData.users.map(user => 
      user.id === userId ? { ...user, isActive: !user.isActive } : user
    );
    onSave({ ...initialData, users: updatedUsers });
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    const updatedUsers = initialData.users.map(user => 
      user.id === userId ? { ...user, role: newRole as 'admin' | 'moderator' | 'viewer' } : user
    );
    onSave({ ...initialData, users: updatedUsers });
  };

  return (
    <div className="space-y-4 h-full">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">User Access Control</h3>
        <p className="text-gray-600 text-sm">Manage user accounts and their access permissions</p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-gray-900">Active Users ({initialData.users.length})</CardTitle>
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
            {initialData.users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No users found.</p>
              </div>
            ) : (
              initialData.users.map((user, index) => (
                <div key={user.id} className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                        user.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      )}>
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Select 
                        value={user.role} 
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="h-7 w-20 text-xs border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Switch 
                        checked={user.isActive} 
                        onCheckedChange={() => handleToggleUser(user.id)}
                      />
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveUser(user.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end pt-3 border-t border-gray-200">
        <Button 
          type="button"
          disabled={isLoading}
          className="bg-gray-900 hover:bg-gray-800 text-white px-5 h-8 font-medium text-sm"
        >
          {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />} 
          Save Changes
        </Button>
      </div>
    </div>
  );
};
