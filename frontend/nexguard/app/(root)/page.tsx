'use client'

import { useState } from 'react'
import { getCameras, getZones } from '@/lib/actions/api.actions'
import { cn } from '@/lib/utils'
import { Camera as CameraIcon } from 'lucide-react'
import Videocard from '@/components/Videocard'
import { useQuery } from '@tanstack/react-query'

function Home() {
  const [activeZoneId, setActiveZoneId] = useState<number>(0)
  const {
    data: zones = [],
    isLoading: zonesLoading,
    error: zonesError
  } = useQuery({
    queryKey: ['zones'],
    queryFn: getZones,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, 
  })

  const {
    data: cameras = [],
    isLoading: camerasLoading,
    error: camerasError
  } = useQuery({
    queryKey: ['cameras'],
    queryFn: getCameras,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const isLoading = zonesLoading || camerasLoading

  if (zonesError || camerasError) {
    return (
      <section className="flex h-full w-full flex-col sm:p-4 lg:p-4 overflow-none">
        <div className="flex h-64 w-full items-center justify-center rounded-lg border-2 border-dashed border-red-200 dark:border-red-700">
          <div className="text-center">
            <p className="text-red-500 font-medium">
              Failed to load data. Please try again.
            </p>
          </div>
        </div>
      </section>
    )
  }
  const filteredCameras = activeZoneId === 0
    ? cameras
    : cameras.filter(cam => String(cam.zoneId) === String(activeZoneId))

  return (
    <section className="flex h-full w-full flex-col overflow-none">
      <header className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveZoneId(0)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeZoneId === 0
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          )}
        >
          All
        </button>
        {zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => setActiveZoneId(zone.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeZoneId === zone.id
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400'
            )}
          >
            {zone.name}
          </button>
        ))}
      </header>
      <main className="flex-1 overflow-y-none">
        {isLoading ? (
          <p className="flex items-center justify-center h-full">Loading...</p>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {activeZoneId === 0 ? 'All Cameras' : zones.find(z => z.id === activeZoneId)?.name || activeZoneId}
              </h2>
            </div>
            {filteredCameras.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-1 xl:grid-cols-2">
                {filteredCameras.map((camera) => (
                  <Videocard key={camera.cameraId} camera={camera} />
                ))}
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-sm font-medium text-gray-500">
                    No cameras found in this zone.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </section>
  )
}
export default Home