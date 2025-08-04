'use client'

import React, { useState } from 'react'
import { getDetectionEventsByDay } from '@/lib/actions/api.actions'
import { Calendar } from './ui/calendar'
import { ListFilter, Loader2 } from 'lucide-react'
import FeedCard from './FeedCard'
import { useQuery } from '@tanstack/react-query'
import { DetectionEvent } from '@/Types'


const RightFeed = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setIsLoading] = useState<boolean>(false)
  const {
    data: events = [],
  } = useQuery({
    queryKey: ['events', selectedDate],
    queryFn: async () => {
      try {
        console.log(`Fetching events for date: ${selectedDate.toISOString()}`)
        setIsLoading(true)
        return await getDetectionEventsByDay(selectedDate)
      } catch (error) {
        console.error('Error fetching detection events:', error)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    enabled: !!selectedDate,
  })

  return (
    <section className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2">
        <button type="button">
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
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : events.length > 0 ? (
          events.map((event:DetectionEvent) => (
            <FeedCard
              key={event.id} 
              alertEvent={event}
            />
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