'use client'

import { useEffect, useState } from 'react'
import { getCameras, getZones } from '@/lib/actions/api.actions'
import { checkAuthStatus, cn } from '@/lib/utils'
import { Camera as CameraIcon } from 'lucide-react'
import Videocard from '@/components/Videocard'
import { useQuery } from '@tanstack/react-query'
import { User } from '@/Types'

function Home() {
  const [activeZoneId, setActiveZoneId] = useState<number>(0)
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    if (user === null) {
      checkAuthStatus().then(setUser);
    }
  }, [user]);

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
        <div className="flex h-80 w-full items-center justify-center rounded-2xl border-2 border-dashed border-red-200/80 bg-gradient-to-br from-red-50/50 to-white">
          <div className="text-center p-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="mt-6 text-lg font-semibold text-red-600">
              Failed to load data
            </p>
            <p className="mt-2 text-sm text-red-500">
              Please check your connection and try again
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
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setActiveZoneId(0)}
          className={cn(
            "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md",
            activeZoneId === 0
              ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg ring-2 ring-gray-900/20'
              : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200/70'
          )}
        >
          All Zones
        </button>
        {zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => setActiveZoneId(zone.id)}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md",
              activeZoneId === zone.id
                ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg ring-2 ring-gray-900/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200/70'
            )}
          >
            {zone.name}
          </button>
        ))}
      </header>
      <main className="flex-1 overflow-y-none">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-lg font-medium text-gray-600">Loading cameras...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent pb-4 border-b border-gray-200/80">
                {activeZoneId === 0 ? 'All Cameras' : zones.find(z => z.id === activeZoneId)?.name || activeZoneId}
              </h2>
            </div>
            {filteredCameras.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-1 xl:grid-cols-2">
                {filteredCameras.map((camera) => (
                  <Videocard key={camera.cameraId} camera={camera} />
                ))}
              </div>
            ) : (
              <div className="flex h-80 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-200/80 bg-gradient-to-br from-gray-50/50 to-white">
                <div className="text-center p-8">
                  <CameraIcon className="mx-auto h-16 w-16 text-gray-400" />
                  <p className="mt-6 text-lg font-semibold text-gray-600">
                    No cameras found in this zone
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Try selecting a different zone or check your camera configuration
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