'use client'

import { useEffect, useMemo, useState } from 'react'
import { getCameras, getZones } from '@/lib/actions/api.actions'
import { checkAuthStatus, cn } from '@/lib/utils'
import { Camera as CameraIcon, LayoutGrid, Minimize2 } from 'lucide-react'
import Videocard from '@/components/Videocard'
import { useQuery } from '@tanstack/react-query'
import { User } from '@/Types'
import { useIsMobile } from '@/hooks/useIsMobile'

function Home() {
  const [activeZoneId, setActiveZoneId] = useState<number>(0)
  const [denseGrid, setDenseGrid] = useState<boolean>(false)
  const [user, setUser] = useState<User | null>(null)
  const isMobile = useIsMobile()
  
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
  console.log('isLoading is :',isLoading)


  // Derive grid classes based on density and viewport
  const gridClass = useMemo(() => {
    // On mobile, always 1 column for readability
    if (isMobile) return 'grid grid-cols-1 gap-2 sm:gap-3';
    // Desktop: dense shows more columns with tighter gaps
    return denseGrid
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6';
  }, [denseGrid, isMobile])

  if (zonesError || camerasError) {
    return (
      <section className="flex h-full w-full flex-col sm:p-4 lg:p-4 overflow-none">
        <div className="flex h-64 sm:h-80 w-full items-center justify-center rounded-2xl border-2 border-dashed border-red-200/80 bg-gradient-to-br from-red-50/50 to-white">
          <div className="text-center p-4 sm:p-8">
            <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg font-semibold text-red-600">
              Failed to load data
            </p>
            <p className="mt-2 text-xs sm:text-sm text-red-500">
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
      {/* Enhanced Header with Mobile-First Design */}
      <header className="mb-3 sm:mb-5 sticky top-0 z-10 bg-gradient-to-b from-white/80 to-white/40 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="pt-3 sm:pt-4 px-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Security Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1 pb-2">Monitor your surveillance system</p>
          <div className="flex items-center justify-between">
            {/* Zone Filter Buttons - Horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pr-1">
              <button
                onClick={() => setActiveZoneId(0)}
                className={cn(
                  'flex-shrink-0 rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md',
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
                    'flex-shrink-0 rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md',
                    activeZoneId === zone.id
                      ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg ring-2 ring-gray-900/20'
                      : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200/70'
                  )}
                >
                  {zone.name}
                </button>
              ))}
            </div>

            {/* Density toggle (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <button
                onClick={() => setDenseGrid((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                  denseGrid ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                )}
                title={denseGrid ? 'Comfortable' : 'Compact'}
              >
                {denseGrid ? <Minimize2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                {denseGrid ? 'Comfortable' : 'Compact'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 sm:h-80">
            <div className="text-center p-4 sm:p-8">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-gray-600">Loading cameras...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent pb-2 sm:pb-4 border-b border-gray-200/80">
                {activeZoneId === 0 ? 'All Cameras' : zones.find(z => z.id === activeZoneId)?.name || activeZoneId}
              </h2>
            </div>
            {filteredCameras.length > 0 ? (
              <div className={gridClass}>
                {filteredCameras.map((camera) => (
                  <Videocard key={camera.cameraId} camera={camera} compact={denseGrid || isMobile} autoPause />
                ))}
              </div>
            ) : (
              <div className="flex h-64 sm:h-80 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-200/80 bg-gradient-to-br from-gray-50/50 to-white">
                <div className="text-center p-4 sm:p-8">
                  <CameraIcon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400" />
                  <p className="mt-4 sm:mt-6 text-base sm:text-lg font-semibold text-gray-600">
                    No cameras found in this zone
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-gray-500">
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