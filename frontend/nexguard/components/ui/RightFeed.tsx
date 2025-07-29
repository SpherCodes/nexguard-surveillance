'use client'

import React, { useEffect, useState } from 'react'
import { getDetectionEventsByDay } from '@/lib/actions/api.actions'
import { Calendar } from './calendar'
import { ListFilter, Loader2 } from 'lucide-react'
import FeedCard from '../FeedCard'

const RightFeed = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDetectionsForDay = async () => {
      setIsLoading(true)
      try {
        const fetchedEvents = await getDetectionEventsByDay(selectedDate)
        setEvents(fetchedEvents)
      } catch (error) {
        console.error('Error fetching detection events:', error)
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetectionsForDay()
  }, [selectedDate])

  return (
    <section className="flex h-screen flex-col bg-white">
      <div className="flex items-center justify-between  p-4">
        <h1 className="text-xl font-bold text-gray-900">Feed</h1>
        <button className="text-gray-500 transition-colors hover:text-gray-800">
          <ListFilter className="h-5 w-5" />
        </button>
      </div>

      <div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              setSelectedDate(date)
            }
          }}
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : events.length > 0 ? (
          events.map((event) => (
            <FeedCard key={event.id} event={event} />
          ))
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <p className="text-sm text-gray-500">
              No events recorded on this day.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default RightFeed