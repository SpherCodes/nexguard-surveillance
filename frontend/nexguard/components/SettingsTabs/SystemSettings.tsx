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
import { Loader2, Save } from 'lucide-react';
import { InfrenceFormProps, StorageFormProps} from '@/Types';
import { getInferenceSettings, getSystemStorageSettings, updateInferenceSettings, updateStorageSettings} from '@/lib/actions/api.actions';

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
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="h-7 w-1/2 rounded-md bg-gray-200 animate-pulse" />
            <div className="h-4 w-3/4 rounded-md bg-gray-200 animate-pulse" />
          </div>
          
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <div className="space-y-2">
                <div className="h-6 w-1/3 rounded-md bg-gray-200 animate-pulse" />
                <div className="h-4 w-2/3 rounded-md bg-gray-200 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="h-4 w-1/4 rounded-md bg-gray-200 animate-pulse" />
                <div className="h-11 w-full rounded-md bg-gray-200 animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="h-4 w-1/4 rounded-md bg-gray-200 animate-pulse" />
                <div className="h-11 w-full rounded-md bg-gray-200 animate-pulse" />
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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 h-full">
      {/* Enhanced Navigation Sidebar */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
            <p className="text-sm text-gray-600">Manage core system settings and preferences</p>
          </div>
          
          <nav className="space-y-2">
            {systemSettingsNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left font-semibold transition-all duration-200',
                  'hover:shadow-md hover:-translate-y-0.5',
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg'
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
                    'h-5 w-5',
                    activeSection === item.id ? 'text-white' : 'text-gray-600'
                  )} />
                </div>
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Enhanced Content Panel */}
      <div className="lg:col-span-2">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm h-full overflow-hidden">
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
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-8 h-full">
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-900">AI Detection Settings</h3>
            <p className="text-sm text-gray-600">Configure the AI model and detection confidence</p>
          </div>
          
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <CardTitle className="text-lg text-gray-900">Model Configuration</CardTitle>
              <CardDescription className="text-gray-600">Choose your detection model and confidence settings</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-900">Detection Model</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 border-gray-300 bg-white hover:border-gray-400 focus:border-gray-900 transition-colors">
                        <SelectValue placeholder="Choose a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yolov11n">YOLOv11 Nano (Fastest)</SelectItem>
                      <SelectItem value="yolov11s">YOLOv11 Small (Balanced)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600">Choose the AI model for object detection performance</FormDescription>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="min_detection_threshold" render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-semibold text-gray-900">Confidence Threshold</FormLabel>
                    <div className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-md text-gray-900">
                      {Math.round(field.value * 100)}%
                    </div>
                  </div>
                  <FormControl>
                    <Slider 
                      defaultValue={[field.value * 100]} 
                      max={100} 
                      step={1} 
                      onValueChange={(v) => field.onChange(v[0] / 100)}
                      className="py-4"
                    />
                  </FormControl>
                  <FormDescription className="text-gray-600">Only create events for detections above this confidence level</FormDescription>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button 
            type="submit" 
            disabled={!form.formState.isDirty}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 h-11 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
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
  console.log('StorageForm initialData:', initialData);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-8 h-full">
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-900">Storage Management</h3>
            <p className="text-sm text-gray-600">Configure where recordings are saved and retention policies</p>
          </div>
          
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <CardTitle className="text-lg text-gray-900">Storage Configuration</CardTitle>
              <CardDescription className="text-gray-600">Manage storage location and data retention settings</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <FormField control={form.control} name="storageType" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-900">Storage Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 border-gray-300 bg-white hover:border-gray-400 focus:border-gray-900 transition-colors">
                        <SelectValue placeholder="Choose storage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="cloud">Cloud Storage</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600">Select where recordings will be stored</FormDescription>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="retentionDays" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-900">Retention Period</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                    <FormControl>
                      <SelectTrigger className="h-11 border-gray-300 bg-white hover:border-gray-400 focus:border-gray-900 transition-colors">
                        <SelectValue placeholder="Select retention" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-600">Automatically delete recordings older than this period</FormDescription>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button 
            type="submit" 
            disabled={isLoading || !form.formState.isDirty}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 h-11 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};