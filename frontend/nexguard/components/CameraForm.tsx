'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, Trash2, X, PlusCircle, ChevronsUpDown, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

import { CameraFormData, CameraFormProps, Zone } from '@/Types';
import { cameraFormSchema, cn } from '@/lib/utils';

const CameraForm = ({ initialData, onSubmit, onDelete , onCreateZone, zones = [] }: CameraFormProps & { zones?: Zone[] }) => {
  const isEditMode = !!initialData;
  const [loading,  setLoading] = useState(false);
  const form = useForm<CameraFormData>({
    resolver: zodResolver(cameraFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      videoUrl: initialData?.videoUrl || '',
      enabled: initialData?.enabled ?? true,
      zoneId: initialData?.zoneId || undefined,
    },
  });
  
  useEffect(() => {
    form.reset({
      name: initialData?.name || '',
      videoUrl: initialData?.videoUrl || '',
      enabled: initialData?.enabled ?? true,
      zoneId: initialData?.zoneId || undefined,
    });
  }, [initialData, form , zones]);

  const handleSubmit = (data: CameraFormData) => {
    const payload = {
        ...initialData,
        ...data,
    };
    console.log('Submitting camera data:', payload);
    onSubmit(payload, payload?.cameraId);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Update the camera&#39;s display name and assigned location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Camera Name</FormLabel>
                <FormControl><Input placeholder="Front Door Camera" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="zoneId" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Location (Zone)</FormLabel>
                <ZoneCombobox
                  zones={zones}
                  selectedZoneId={field.value}
                  onChange={field.onChange}
                  onCreateZone={onCreateZone}
                />
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* --- Card 2: Connection & Status --- */}
        <Card>
          <CardHeader>
            <CardTitle>Connection & Status</CardTitle>
            <CardDescription>
              Manage the video stream URL and toggle the camera&#39;s active state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="videoUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Stream URL</FormLabel>
                <FormControl><Input placeholder="rtsp://user:pass@192.168.1.100/stream" {...field} /></FormControl>
                <FormDescription>The full RTSP, RTMP, or HTTP stream URL.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="enabled" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                <div className="space-y-0.5">
                  <FormLabel>Camera Enabled</FormLabel>
                  <FormDescription>If disabled, the camera will not record or stream.</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* --- Card 3: Danger Zone (Only in Edit Mode) --- */}
        {isEditMode && onDelete && (
          <Card className="border-red-500/50 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">Delete this camera</p>
                <p className="text-sm text-red-700/80 dark:text-red-400/80">This action is permanent and cannot be undone.</p>
              </div>
              <Button type="button" variant="destructive" onClick={() => onDelete(initialData.camera_id)} disabled={loading} className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* --- Static Action Footer (Only shows when there are changes) --- */}
        {form.formState.isDirty && (
            <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => form.reset()}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isEditMode ? 'Save Changes' : 'Create Camera'}
                </Button>
            </div>
        )}
      </form>
    </Form>
  );
};
const ZoneCombobox = ({ 
    zones, 
    selectedZoneId, 
    onChange, 
    onCreateZone 
}: { 
    zones: Zone[], 
    selectedZoneId: number | undefined, 
    onChange: (value: number) => void, 
    onCreateZone: (zoneName: string) => Promise<Zone>
}) => {

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateZone = async () => {
    if (searchQuery) {
      const newZone = await onCreateZone(searchQuery);
      if (newZone) {
        onChange(newZone.id);
        setOpen(false);
      }
    }
  };

  const currentZone = zones.find(zone => String(zone.id) === String(selectedZoneId));
  const filteredZones = zones.filter((zone) => zone.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const showCreateOption = searchQuery && !filteredZones.some(z => z.name.toLowerCase() === searchQuery.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {currentZone?.name ? currentZone.name : "Select a zone..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Search zones or create new..."
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {showCreateOption ? (
                <div className="p-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleCreateZone}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create &quot;{searchQuery}&quot;
                  </Button>
                </div>
              ) : "No zone found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredZones.map((zone) => (
                <CommandItem
                  key={zone.id}
                  value={zone.name}
                  onSelect={(currentValue) => {
                    const selectedZoneId = zones.find(z => z.name.toLowerCase() === currentValue.toLowerCase());
                    console.log('Selected Zone:', selectedZoneId);
                    if (selectedZoneId && selectedZoneId.id) {
                      onChange(selectedZoneId.id);
                    } else {
                      onChange(0);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(selectedZoneId) === String(zone.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {zone.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};



export default CameraForm;