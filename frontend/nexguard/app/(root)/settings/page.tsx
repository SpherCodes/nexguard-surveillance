'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsTabList } from '@/constants';
import SystemSettings from '@/components/SettingsTabs/SystemSettings';
import CameraSettings from '@/components/SettingsTabs/CameraSettings';
import { Settings } from 'lucide-react';
import NotificationSettings from '@/components/SettingsTabs/NotificationSettings';

function SettingsPage() {

  return (
    <section className="flex h-full w-full flex-col bg-gray-50 min-h-screen rounded-lg">
      <div className="bg-white border-b border-gray-200 shadow-sm rounded-t-xl">
        <div className="px-6 py-4">
          <div className='flex items-center space-x-3'>
            <div className="p-2 rounded-xl bg-gray-100">
                <Settings className="h-6 w-6 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 text-sm">Configure your surveillance system</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <Tabs defaultValue="Cameras" className="w-full h-full max-w-6xl mx-auto">
          <div className="mb-4">
            <TabsList className="grid w-full max-w-lg grid-cols-3 bg-gray-200/75 p-1 h-10">
              {SettingsTabList.map((tab) => 
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="text-sm font-medium h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {tab.label}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="flex-1">
            <TabsContent value="Cameras" className="flex-1 mt-0">
              <CameraSettings />
            </TabsContent>
            <TabsContent value="System" className="flex-1 mt-0">
              <SystemSettings />
            </TabsContent>
            <TabsContent value="General" className="flex-1 mt-0">
              <div className="space-y-6">
                <NotificationSettings/>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </section>
  );
}
export default SettingsPage;