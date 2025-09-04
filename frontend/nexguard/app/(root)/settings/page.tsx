'use client';
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsTabList } from '@/constants';
import SystemSettings from '@/components/SettingsTabs/SystemSettings';
import CameraSettings from '@/components/SettingsTabs/CameraSettings';
import { Settings, Camera as CameraIcon, Shield, Bell } from 'lucide-react';
import NotificationSettings from '@/components/SettingsTabs/NotificationSettings';

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('Cameras');

  const tabDescription = useMemo(() => {
    switch (activeTab) {
      case 'Cameras':
        return 'Add, edit, and manage your cameras and zones';
      case 'System':
        return 'Configure AI inference, storage, and access control';
      case 'General':
        return 'Manage notification preferences and general settings';
      default:
        return '';
    }
  }, [activeTab]);

  return (
    <section className="flex h-full w-full flex-col bg-gray-50 min-h-screen rounded-lg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 shadow-sm rounded-t-xl ring-1 ring-gray-100 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className='flex items-center space-x-3'>
            <div className="p-2 rounded-xl bg-gray-100">
              <Settings className="h-6 w-6 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Settings</h1>
              <p className="text-gray-600 text-sm">Configure your surveillance system</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 sm:p-5 pb-28 md:pb-8">
  <Tabs defaultValue="Cameras" onValueChange={setActiveTab} className="w-full h-full max-w-6xl mx-auto">
          <div className="mb-2 sm:mb-3">
      <TabsList className="grid w-full max-w-xl grid-cols-3 bg-gray-100 p-1.5 h-12 rounded-xl ring-1 ring-gray-200 shadow-sm mx-auto">
              {SettingsTabList.map((tab) => {
                const Icon = tab.value === 'Cameras' ? CameraIcon : tab.value === 'System' ? Shield : Bell;
                return (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value}
                    className="text-xs sm:text-sm font-semibold h-9 rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow data-[state=active]:ring-1 data-[state=active]:ring-gray-200"
                    aria-label={tab.label}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                    <span className="hidden xs:inline">{tab.label}</span>
                    <span className="xs:hidden">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <p className="text-center text-xs sm:text-sm text-gray-600 mt-2">{tabDescription}</p>
          </div>

          <div className="flex-1 space-y-4 sm:space-y-6">
            <TabsContent value="Cameras" className="flex-1 mt-0">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
                <CameraSettings />
              </div>
            </TabsContent>
            <TabsContent value="System" className="flex-1 mt-0">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
                <SystemSettings />
              </div>
            </TabsContent>
            <TabsContent value="General" className="flex-1 mt-0">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
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