import React from 'react'
import Videocard from '../../components/ui/Videocard'

function Home() {
  return (
    <section className='home px-2 bg-gray-200 border-solid rounded-lg my-2'>
      <header className='mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Live Monitoring</h1>
          <p className='text-gray-600'>Real-time security camera feeds</p>
        </div>
        <div className='flex items-center space-x-4'>
          <select>
            <option>All Cameras</option>
              <option>Front Door</option>
              <option>Back Yard</option>
              <option>Living Room</option>
              <option>Garage</option>
          </select>
        </div>
        <div>
          <Videocard camera={{
            id: "0",
            name: "Front Door Camera",
            location: "Front Entrance",
            status: "online",
            videoUrl: "https://example.com/stream/front-door",
          }} />
        </div>
      </header>
    </section>
  )
}

export default Home
