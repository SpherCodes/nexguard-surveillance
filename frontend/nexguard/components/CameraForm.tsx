'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, Trash2, X, PlusCircle, ChevronsUpDown, Check, Camera as CameraIcon, Link as LinkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
// removed Card components in favor of borderless containers
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

import { CameraFormData, CameraFormProps, Zone } from '@/Types';
import { cameraFormSchema, cn } from '@/lib/utils';

const CameraForm = ({ initialData, onSubmit, onDelete , onCreateZone, zones = [] }: CameraFormProps & { zones?: Zone[] }) => {
  const isEditMode = !!initialData;
  const [loading] = useState(false);
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
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                <CameraIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">General Information</h3>
                <p className="text-gray-300 text-sm mt-1">Update the camera&#39;s display name and assigned location</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold text-gray-900">Camera Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Front Door Camera" 
                    {...field} 
                    className="h-12 border-0 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-900/20 rounded-xl transition-all"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="zoneId" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-base font-semibold text-gray-900">Location (Zone)</FormLabel>
                <ZoneCombobox
                  zones={zones}
                  selectedZoneId={field.value}
                  onChange={field.onChange}
                  onCreateZone={onCreateZone}
                />
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* --- Card 2: Connection & Status --- */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                <LinkIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Connection & Status</h3>
                <p className="text-gray-300 text-sm mt-1">Manage the video stream URL and toggle the camera&#39;s active state</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <FormField control={form.control} name="videoUrl" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold text-gray-900">Stream URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="rtsp://user:pass@192.168.1.100/stream" 
                    {...field} 
                    className="h-12 border-0 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-900/20 rounded-xl transition-all"
                  />
                </FormControl>
                <FormDescription className="text-gray-600">The full RTSP, RTMP, or HTTP stream URL.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="enabled" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl bg-gray-50 p-4 border-0">
                <div className="space-y-1">
                  <FormLabel className="text-base font-semibold text-gray-900">Camera Enabled</FormLabel>
                  <FormDescription className="text-gray-600">If disabled, the camera will not record or stream.</FormDescription>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                    className="data-[state=checked]:bg-gray-900"
                  />
                </FormControl>
              </FormItem>
            )} />
          </div>
        </div>

        {/* --- Card 3: Danger Zone (Only in Edit Mode) --- */}
        {isEditMode && onDelete && (
          <div className="bg-red-50 rounded-2xl shadow-sm ring-1 ring-red-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
                  <p className="text-red-100 text-sm mt-1">Permanent actions that cannot be undone</p>
                </div>
              </div>
            </div>
            <div className="p-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-red-700">Delete this camera</p>
                <p className="text-sm text-red-600 mt-1">This action is permanent and cannot be undone.</p>
              </div>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => onDelete()} 
                disabled={loading} 
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
        
        {/* --- Static Action Footer (Only shows when there are changes) --- */}
        {form.formState.isDirty && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
            <div className="flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => form.reset()}
                className="hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gray-900 hover:bg-gray-800 focus:ring-gray-900/20"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditMode ? 'Save Changes' : 'Create Camera'}
              </Button>
            </div>
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