import React, { useEffect, useState } from 'react'
import FeedCard from '../FeedCard'
import { Calendar } from './calendar'
import { getDetectionEventsByDay } from '@/lib/actions/api.actions'

const RightFeed = ({alertEvent}:{alertEvent: DetectionEvent[]}) => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [detectionEventsData, setDetectionEventsData] = useState<DetectionEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchDetections = async () => {
      setLoading(true)
      try{
        const response =  getDetectionEventsByDay(selectedDate)
        setDetectionEventsData(await response)
      }
      catch(error) {
        console.error('Error fetching detection events:', error)
      }
      finally{
        setLoading(false)
      }
    }
    fetchDetections()
  },[selectedDate])
  console.log('RightFeed Alert Events:', alertEvent)
  return (
    <section className="h-screen  bg-white flex flex-col">
        <div className='flex flex-col h-full'>
          <h1 className='text-3xl font-semibold px-6 py-4 '>Feed</h1>
          <Calendar
            onSelectedDate={(date:Date) => {
              setSelectedDate(date)
            }}
          />
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
            {loading && <p>Loading...</p>}
            {alertEvent.map((event, index) => (
              <FeedCard key={index} alertEvent={event} />
            ))}
          </div>
        </div>
    </section>
  )
}


export default RightFeed
