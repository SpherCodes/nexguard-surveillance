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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { ReactNode, useEffect, useState } from 'react';
import { systemSettingsNav } from '@/constants';
import { Loader2, Save, Users, Trash2, Brain, Database, Shield, Gauge } from 'lucide-react';
import { InfrenceFormProps, StorageFormProps} from '@/Types';
import { getInferenceSettings, getSystemStorageSettings, updateInferenceSettings, updateStorageSettings} from '@/lib/actions/api.actions';
import { getUsers, getCurrentUser, updateUserStatus, deleteUser } from '@/lib/actions/user.actions';
import type { User } from '@/Types';

type ModelDetail = {
  label: string;
  summary: string;
  highlights: string[];
  technical: string;
  tip: string;
};

const MODEL_DETAILS: Record<string, ModelDetail> = {
  yolo11n: {
    label: 'Edge Ready',
    summary: 'Ultra-fast profile designed for CPU-only gateways and pilots.',
    highlights: ['Fastest latency', 'Minimal VRAM (~1 GB)', 'Ideal for 1-2 streams'],
    technical: '≈7.7M parameters · ~7 MB model file',
    tip: 'Choose this when responsiveness matters more than accuracy.',
  },
  yolo11s: {
    label: 'Balanced',
    summary: 'Balanced accuracy and speed—great default for most workloads.',
    highlights: ['Good accuracy', 'Runs on modest GPUs', 'Handles 3-5 HD streams'],
    technical: '≈22M parameters · ~24 MB model file',
    tip: 'Start here for production environments and tune as needed.',
  },
  yolo11m: {
    label: 'High Fidelity',
    summary: 'Improved precision with moderate compute requirements.',
    highlights: ['Sharper detections', 'Needs mid-range GPU', 'Supports moderate concurrency'],
    technical: '≈49M parameters · ~50 MB model file',
    tip: 'Use when you need better accuracy but can spare GPU headroom.',
  },
  yolo11l: {
    label: 'Accuracy Focused',
    summary: 'Higher capacity model for complex scenes and long-range cameras.',
    highlights: ['High confidence outputs', 'Requires 8GB+ VRAM', 'Best for critical zones'],
    technical: '≈77M parameters · ~79 MB model file',
    tip: 'Deploy on GPU servers where false negatives are unacceptable.',
  },
  yolo11x: {
    label: 'Max Precision',
    summary: 'Largest YOLOv11 variant delivering the strongest accuracy.',
    highlights: ['Deepest feature extraction', 'Needs high-end GPU', 'Best for analytics'],
    technical: '≈140M parameters · ~130 MB model file',
    tip: 'Reserve for analytic review or high-value assets with ample compute.',
  },
};

type ConfidenceInsight = {
  title: string;
  badge: string;
  summary: string;
  bulletPoints: string[];
};

const getConfidenceInsight = (value: number): ConfidenceInsight => {
  if (value <= 0.35) {
    return {
      title: 'High Sensitivity (more alerts)',
      badge: 'Aggressive detection',
      summary: 'Prioritises capturing every possible event. Expect more false positives.',
      bulletPoints: [
        'Recommended during setup, tuning, or for low-risk monitoring.',
        'Review alerts frequently to label and fine-tune zones.',
        'Ideal when missing an event is more costly than false alarms.',
      ],
    };
  }

  if (value <= 0.7) {
    return {
      title: 'Balanced (recommended)',
      badge: 'Everyday operations',
      summary: 'Balanced trade-off between sensitivity and precision for most sites.',
      bulletPoints: [
        'Good starting point for production deployments.',
        'Pairs well with alert review workflows and escalation rules.',
        'Maintains healthy alert volumes without overwhelming operators.',
      ],
    };
  }

  return {
    title: 'High Precision (fewer alerts)',
    badge: 'Strict filtering',
    summary: 'Focuses on the most confident detections to reduce noise.',
    bulletPoints: [
      'Use for sensitive alerts where false alarms are disruptive.',
      'May miss smaller or partial detections—validate with real footage.',
      'Best for stable lighting and predictable camera views.',
    ],
  };
};

type SectionShellProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  headerAside?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
};

const SectionShell = ({
  icon,
  title,
  description,
  headerAside,
  children,
  className,
  contentClassName,
  headerClassName,
}: SectionShellProps) => {
  return (
    <section className={cn('rounded-3xl bg-white/90 shadow-sm backdrop-blur-sm', className)}>
      <div className={cn('p-6 sm:p-8 space-y-6', contentClassName)}>
        <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', headerClassName)}>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-sm">
              {icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
              {description ? (
                <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">{description}</p>
              ) : null}
            </div>
          </div>
          {headerAside ? (
            <div className="flex items-center gap-3 text-xs text-gray-500">{headerAside}</div>
          ) : null}
        </header>
        <div className="space-y-6">{children}</div>
      </div>
    </section>
  );
};

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
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200 border backdrop-blur-sm',
                'flex-1 sm:flex-initial min-w-0',
                activeSection === item.id
                  ? 'bg-gray-900 text-white border-gray-900 shadow-lg'
                  : 'bg-white/70 text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-sm'
              )}
            >
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                activeSection === item.id
                  ? 'bg-white/15 text-white'
                  : 'bg-white text-gray-700 shadow-sm'
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Panel - Borderless Design */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto">
          <div className="space-y-8 sm:space-y-10 p-1 sm:p-2">
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

  const selectedModelName = (form.watch('model') ?? initialData?.model ?? '').toLowerCase();
  const selectedModel = initialData?.available_models?.find(
    (model) => model.name.toLowerCase() === selectedModelName
  );
  const selectedModelDetail = MODEL_DETAILS[selectedModelName];

  const confidenceValue = form.watch('min_detection_threshold') ?? initialData?.min_detection_threshold ?? 0.5;
  const confidenceInsight = getConfidenceInsight(confidenceValue);
  const confidencePercent = Math.round(confidenceValue * 100);

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);
  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-6 sm:space-y-8">
          <SectionShell
            icon={<Brain className="h-5 w-5" />}
            title="AI Detection Settings"
            description="Pick the optimal detection profile and tune confidence thresholds for your environment."
            className="shadow-lg sm:shadow-xl"
            contentClassName="space-y-6 sm:space-y-8"
          >
            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem className="space-y-3 sm:space-y-4">
                <FormLabel className="text-sm sm:text-base font-semibold text-gray-900 pb-3">Detection Model</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-16 sm:h-14 rounded-2xl border border-gray-200/80 bg-white/80 px-4 text-sm font-medium shadow-sm transition-all focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 touch-manipulation">
                      <SelectValue placeholder="Choose a model" className="flex items-center" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[70vh] sm:max-h-72">
                    {initialData?.available_models?.map((model) => (
                      <SelectItem key={model.id} value={model.name} className="py-3 sm:py-2">
                        <div className="flex flex-col gap-2 sm:gap-3 py-1 sm:py-2 text-left">
                          <div className="flex flex-col gap-1.5 sm:gap-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm sm:text-sm">
                              <span className="font-semibold text-gray-900">{model.name.toUpperCase()}</span>
                              {MODEL_DETAILS[model.name.toLowerCase()] ? (
                                <Badge variant="outline" className="border-gray-200 bg-white/80 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                  {MODEL_DETAILS[model.name.toLowerCase()].label}
                                </Badge>
                              ) : null}
                            </div>
                            <span className="text-xs sm:text-xs text-gray-500 leading-relaxed">
                              {model.description || MODEL_DETAILS[model.name.toLowerCase()]?.summary || 'AI Detection Model'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(MODEL_DETAILS[model.name.toLowerCase()]?.highlights ?? []).slice(0, 3).map((highlight) => (
                              <Badge
                                key={`${model.name}-${highlight}`}
                                variant="outline"
                                className="border-gray-200 bg-white text-[10px] text-gray-500"
                              >
                                {highlight}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-gray-400 font-mono break-all leading-tight">
                            {model.path}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs sm:text-xs text-gray-600 leading-relaxed">Match the model profile to your deployment hardware and scene complexity.</FormDescription>
                {selectedModelDetail ? (
                  <div className="rounded-2xl sm:rounded-3xl bg-gray-50/80 p-4 sm:p-6 text-sm text-gray-600 shadow-inner space-y-4 sm:space-y-5">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-1">
                        <p className="text-base sm:text-base font-semibold text-gray-900 leading-tight">
                          {(selectedModel?.name ?? selectedModelName)?.toUpperCase()}
                        </p>
                        <p className="text-sm sm:text-sm text-gray-600 leading-relaxed">
                          {selectedModel?.description || selectedModelDetail.summary}
                        </p>
                      </div>
                      <Badge className="shrink-0 self-start bg-gray-900 text-white text-[10px] font-semibold uppercase tracking-wide">
                        {selectedModelDetail.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedModelDetail.highlights.map((highlight) => (
                        <Badge
                          key={`${selectedModelName}-${highlight}`}
                          variant="outline"
                          className="border-gray-200/70 bg-white/90 text-[11px] text-gray-600"
                        >
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid gap-1.5 sm:gap-1.5 text-xs text-gray-600">
                      <span className="font-medium text-gray-800">Tech snapshot</span>
                      <span className="font-mono text-[11px] sm:text-[11px] text-gray-500 leading-relaxed">
                        {selectedModelDetail.technical}
                      </span>
                      <span className="leading-relaxed">{selectedModelDetail.tip}</span>
                      {selectedModel?.path ? (
                        <span className="font-mono text-[10px] sm:text-[11px] text-gray-400 break-all">{selectedModel.path}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </FormItem>
            )} />

            <FormField control={form.control} name="min_detection_threshold" render={({ field }) => (
              <FormItem className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <FormLabel className="text-sm sm:text-base font-semibold text-gray-900">Confidence Threshold</FormLabel>
                  <div className="text-base sm:text-sm font-bold bg-gray-900 text-white px-4 py-2.5 sm:py-2 rounded-xl shadow-sm self-start sm:self-auto">
                    {confidencePercent}%
                  </div>
                </div>
                <FormControl>
                  <div className="rounded-2xl bg-gray-50/80 p-5 sm:p-6 touch-manipulation">
                    <Slider 
                      value={[confidencePercent]} 
                      max={100} 
                      step={1} 
                      onValueChange={(v) => field.onChange((v[0] ?? 0) / 100)}
                      className="py-4 sm:py-3"
                    />
                    <div className="mt-4 sm:mt-3 flex flex-wrap items-center justify-between gap-y-2 text-[11px] sm:text-[11px] text-gray-500">
                      <span className="font-medium">0%</span>
                      <span className="hidden sm:inline text-gray-400">Low confidence</span>
                      <span className="hidden sm:inline text-gray-400">High confidence</span>
                      <span className="font-medium">100%</span>
                    </div>
                  </div>
                </FormControl>
                <FormDescription className="text-xs sm:text-xs text-gray-600 leading-relaxed">
                  Balance alert volume against missed detections for your operators.
                </FormDescription>
                <Alert className="border-0 bg-white/80 shadow-sm rounded-2xl p-4 sm:p-5">
                  <Gauge className="text-gray-500 h-5 w-5 sm:h-4 sm:w-4" />
                  <div className="space-y-2 sm:space-y-1">
                    <AlertTitle className="text-gray-900 text-sm sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center gap-2">
                      <span>{confidenceInsight.title}</span>
                      <Badge variant="outline" className="border-gray-200 text-[10px] uppercase text-gray-600 self-start sm:self-auto">
                        {confidenceInsight.badge}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="text-xs sm:text-xs text-gray-600 leading-relaxed">
                      <p>{confidenceInsight.summary}</p>
                      <ul className="list-disc pl-4 space-y-1.5 sm:space-y-1 mt-3 sm:mt-2">
                        {confidenceInsight.bulletPoints.map((item) => (
                          <li key={item} className="leading-relaxed">{item}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </div>
                </Alert>
              </FormItem>
            )} />
          </SectionShell>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pb-4 sm:pb-0">
            <Button 
              type="button"
              variant="outline"
              className="w-full sm:w-auto order-2 sm:order-1 h-12 sm:h-11 rounded-2xl border-gray-300 hover:bg-white touch-manipulation"
              onClick={() => form.reset()}
              disabled={!form.formState.isDirty}
            >
              Reset Changes
            </Button>
            <Button 
              type="submit" 
              disabled={!form.formState.isDirty}
              className="w-full sm:w-auto order-1 sm:order-2 h-12 sm:h-11 rounded-2xl bg-gray-900 text-white px-8 font-semibold shadow-sm transition hover:bg-gray-800 hover:shadow-md touch-manipulation"
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
      <form onSubmit={form.handleSubmit(data => onSave(data))} className="space-y-6 sm:space-y-8">
        <SectionShell
          icon={<Database className="h-5 w-5" />}
          title="Storage Management"
          description="Configure your recording destination and retention cadence."
        >
          <FormField control={form.control} name="storageType" render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-sm font-semibold text-gray-900">Storage Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 rounded-2xl border border-gray-200/80 bg-white/80 px-4 text-sm font-medium shadow-sm transition-all focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10">
                    <SelectValue placeholder="Choose storage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="local">
                    <div className="flex flex-col py-1">
                      <span className="font-semibold">Local Storage</span>
                      <span className="text-xs text-gray-500">Keep recordings on this device</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cloud">
                    <div className="flex flex-col py-1">
                      <span className="font-semibold">Cloud Storage</span>
                      <span className="text-xs text-gray-500">Stream recordings to external storage</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription className="text-xs text-gray-600">Pick the storage target that aligns with your infrastructure.</FormDescription>
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
                  <SelectTrigger className="h-12 rounded-2xl border border-gray-200/80 bg-white/80 px-4 text-sm font-medium shadow-sm transition-all focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10">
                    <SelectValue placeholder="Select retention" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="7">
                    <div className="flex items-center justify-between w-full py-1">
                      <span className="font-semibold">7 Days</span>
                      <span className="text-xs text-gray-500 ml-3">Short-term review</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="14">
                    <div className="flex items-center justify-between w-full py-1">
                      <span className="font-semibold">14 Days</span>
                      <span className="text-xs text-gray-500 ml-3">Balanced coverage</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="30">
                    <div className="flex items-center justify-between w-full py-1">
                      <span className="font-semibold">30 Days</span>
                      <span className="text-xs text-gray-500 ml-3">Extended retention</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription className="text-xs text-gray-600">Older footage is automatically purged once it exceeds this horizon.</FormDescription>
            </FormItem>
          )} />
        </SectionShell>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button 
            type="button"
            variant="outline"
            className="w-full sm:w-auto order-2 sm:order-1 h-12 sm:h-11 rounded-2xl border-gray-300 hover:bg-white"
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty}
          >
            Reset Changes
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !form.formState.isDirty}
            className="w-full sm:w-auto order-1 sm:order-2 h-12 sm:h-11 rounded-2xl bg-gray-900 text-white px-8 font-semibold shadow-sm transition hover:bg-gray-800 hover:shadow-md"
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const legend = (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500" /> Active
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-gray-400" /> Inactive
      </span>
    </div>
  );

  return (
    <SectionShell
      icon={<Shield className="h-5 w-5" />}
      title="User Access Control"
      description="Manage operator access, approval status, and escalation visibility."
      headerAside={legend}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 rounded-2xl border border-gray-200/80 bg-white/80 pl-12 pr-4 text-sm shadow-sm transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 h-12 rounded-2xl border border-gray-200/80 bg-white/80 px-4 text-sm font-medium shadow-sm transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10">
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

      <div className="grid gap-3">
        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-10 text-center text-gray-500">
            <Users className="h-10 w-10 mx-auto mb-4 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600 mb-1">No users found</p>
            <p className="text-xs text-gray-400">
              {searchQuery ? 'Adjust your search to broaden the results.' : 'No users match the current filters.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id ?? user.username}
              className="rounded-2xl border border-gray-200/70 bg-white/80 p-5 sm:p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold transition-all',
                      isActive(user.status)
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {(user.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-base truncate">{user.username}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-xl font-semibold',
                        user.role === 'super_admin'
                          ? 'bg-gray-900 text-white'
                          : user.role === 'admin'
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {formatRole(user.role)}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-xl font-semibold',
                        user.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : user.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : user.status === 'suspended'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      )}
                    >
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
                        <SelectTrigger className="h-10 w-32 rounded-2xl border border-gray-200/80 bg-white/80 text-xs font-semibold shadow-sm transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10">
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
                      <span className="text-xs px-3 py-2 rounded-xl bg-gray-50 text-gray-600 font-medium">
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
                        className="h-10 w-10 rounded-2xl border-red-200 text-red-600 transition hover:bg-red-50 hover:border-red-300"
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
    </SectionShell>
  );
};
