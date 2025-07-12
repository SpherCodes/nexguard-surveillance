'use client'

import { useState, useEffect } from 'react'
import { getCameras, getZones } from '@/lib/actions/api.actions'
import { cn } from '@/lib/utils'
import { MoreHorizontal, Wifi, Camera as CameraIcon } from 'lucide-react'
import Videocard from '@/components/ui/Videocard'

function Home() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [activeZoneId, setActiveZoneId] = useState<string>('0')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [zoneData, camerasData] = await Promise.all([getZones(), getCameras()])
        setZones(zoneData)
        setCameras(camerasData)
        console.log("Zones:", zoneData)
        console.log("Cameras:", camerasData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter cameras based on the active zone
  const filteredCameras = activeZoneId === '0'
    ? cameras
    : cameras.filter(cam => String(cam.zoneId) === String(activeZoneId))
    console.log('Filtered Cameras:', filteredCameras)
    console.log('Active Zone ID:', activeZoneId)

  return (
    <section className="flex  rounded-xl border h-full w-full flex-col bg-gray-100 sm:p-4 lg:p-4 overflow-none">
      {/* Header with Zone Tabs */}
      <header className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveZoneId('0')}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeZoneId === '0'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
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
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            )}
          >
            {zone.name}
          </button>
        ))}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-none">
        {loading ? (
          // <CameraGridSkeleton />
          <p className="flex items-center justify-center h-full"></p>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{activeZoneId}</h2>
            </div>
            {filteredCameras.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-1 xl:grid-cols-2">
                {filteredCameras.map((camera) => (
                  <Videocard key={camera.camera_id} camera={camera} />
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