'use client'

import { useState, useEffect } from 'react'
import { getCameras } from '@/lib/actions/api.actions'
import Videocard from '@/components/ui/Videocard';

function Home() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All Cameras');

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setLoading(true);
        const camerasData = await getCameras();
        console.log('Cameras:', camerasData);
        setCameras(camerasData);
      } catch (error) {
        console.error('Failed to fetch cameras:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  // Filter cameras based on selection
  const filteredCameras = cameras.filter(camera => {
    if (selectedFilter === 'All Cameras') return true;
    return camera.location === selectedFilter;
  });

  return (
    <section className='home px-6 py-8 bg-gray-50 min-h-screen'>
      <header className='mb-8'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-3xl font-bold text-gray-900'>Security Cameras</h1>
          <div className='flex items-center space-x-4'>
            <select 
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            >
              <option value="All Cameras">All Cameras</option>
              <option value="Front Door">Front Door</option>
              <option value="Back Yard">Back Yard</option>
              <option value="Living Room">Living Room</option>
              <option value="Garage">Garage</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-gray-600">Loading cameras...</p>
            </div>
          ) : filteredCameras.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCameras.map((camera) => (
                <Videocard 
                  key={camera.camera_id}
                  camera={camera} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📹</div>
              <p className="text-gray-600 text-lg">No cameras available</p>
              <p className="text-gray-500 text-sm mt-2">
                {selectedFilter !== 'All Cameras' 
                  ? `No cameras found for "${selectedFilter}"`
                  : 'Check your camera connections and try again'
                }
              </p>
            </div>
          )}
        </div>
      </header>
    </section>
  )
}

export default Home;
