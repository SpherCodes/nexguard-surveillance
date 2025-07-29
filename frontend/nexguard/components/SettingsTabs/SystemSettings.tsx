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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { useState } from 'react';
import { systemSettingsNav } from '@/constants';
import { Loader2, Save, Plus, Crown, User, MoreVertical, Trash2 } from 'lucide-react';
import { InfrenceFormProps, StorageFormProps} from '@/Types';
import { getInferenceSettings, getSystemStorageSettings, updateInferenceSettings, updateStorageSettings} from '@/lib/actions/api.actions';

const SystemSettings = () => {
  const [activeSection, setActiveSection] = useState('inference');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: inferenceSettings } = useQuery({
    queryKey: ['inferenceSettings'],
    queryFn: getInferenceSettings,
  });

  const {data: storageSettings} = useQuery({
    queryKey: ['systemStorageSettings'],
    queryFn: getSystemStorageSettings,
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
    if (isLoading || !inferenceSettings || !storageSettings) {
      return (
        <Card>
          <CardHeader><div className="h-6 w-1/2 rounded-md bg-gray-200 animate-pulse" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
            <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
          </CardContent>
        </Card>
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
      // case 'access':
      //   return <AccessControlPanel
      //     initialData={config.access}
      //     onSave={(data) => saveConfig({ access: data })}
      //   />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      <div className="md:col-span-1">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">System</h2>
        <nav className="space-y-1">
          {systemSettingsNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                activeSection === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Right Column: Content Panel */}
      <div className="md:col-span-3">
        {renderActivePanel()}
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
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Inference Settings</CardTitle>
                <CardDescription>Configure the AI model and detection confidence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                    <FormLabel>Detection Model</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choose a model" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="yolov11n">YOLOv11 Nano (Fastest)</SelectItem>
                        <SelectItem value="yolov11s">YOLOv11 Small (Balanced)</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormDescription>Choose the AI model for object detection.</FormDescription>
                </FormItem>
                )} />
                <FormField control={form.control} name="min_detection_threshold" render={({ field }) => (
                <FormItem>
                    <FormLabel>Confidence Threshold: {field.value * 100}%</FormLabel>
                    <FormControl><Slider defaultValue={[field.value * 100]} max={100} step={1} onValueChange={(v) => field.onChange(v[0] / 100)} /></FormControl>
                    <FormDescription>Only create events for detections above this confidence level.</FormDescription>
                </FormItem>
                )} />
            </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={!form.formState.isDirty}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
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
  console.log('StorageForm initialData:', initialData);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Storage Settings</CardTitle>
                <CardDescription>Manage where recordings are saved and for how long.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="storageType" render={({ field }) => (
                <FormItem>
                    <FormLabel>Storage Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choose storage" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="local">Local Storage</SelectItem>
                        <SelectItem value="cloud">Cloud Storage</SelectItem>
                    </SelectContent>
                    </Select>
                </FormItem>
                )} />
                <FormField control={form.control} name="retentionDays" render={({ field }) => (
                <FormItem>
                    <FormLabel>Retention Period</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select retention" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="14">14 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormDescription>Automatically delete recordings older than this period.</FormDescription>
                </FormItem>
                )} />
            </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};

// --- Access Control Panel ---
const AccessControlPanel = ({ initialData }: UserFormProps) => (
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Access Control</CardTitle>
                    <CardDescription>Manage who has access to your system and their permissions.</CardDescription>
                </div>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Invite User</Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                {initialData.map(user => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={cn(user.role === 'admin' && 'bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/50 dark:text-amber-300')}>
                                {user.role === 'admin' ? <Crown className="mr-1.5 h-3.5 w-3.5" /> : <User className="mr-1.5 h-3.5 w-3.5" />}
                                <span className="capitalize">{user.role}</span>
                            </Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {/* <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Permissions</DropdownMenuItem> */}
                                    <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" /> Remove User
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);