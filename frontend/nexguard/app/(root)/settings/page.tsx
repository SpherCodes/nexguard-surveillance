'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsTabList } from '@/constants';
import SystemSettings from '@/components/SettingsTabs/SystemSettings';
import CameraSettings from '@/components/SettingsTabs/CameraSettings';
import { Settings } from 'lucide-react';

function SettingsPage() {

  return (
    <section className="flex h-full w-full flex-col bg-gray-50/50">
      <div className='flex items-center'>
        <div className="p-3 rounded-2xl">
            <Settings className="h-8 w-8" />
        </div>
        <header className="text-4xl font-bold">
              Settings
        </header>
      </div>
      <Tabs defaultValue="Cameras" className="w-full flex-1">
        <TabsList className="grid w-full max-w-lg grid-cols-4 bg-gray-200/75 p-1">
          {SettingsTabList.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="Cameras" className="mt-8 flex-1">
          <CameraSettings
            />
        </TabsContent>
        <TabsContent value="System">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </section>
  );
}
export default SettingsPage;