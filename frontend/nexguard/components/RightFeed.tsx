'use client'
import React, { useEffect, useState } from 'react'
import { getDetectionEventsByDay } from '@/lib/actions/api.actions'
import { Calendar } from './ui/calendar'
import { ListFilter, Loader2, Calendar as CalendarIcon, AlertCircle } from 'lucide-react'
import FeedCard from './FeedCard'
import { useQuery } from '@tanstack/react-query'
import { DetectionEvent } from '@/Types'

const RightFeed = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const {
    data: events = [],
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['detectionEvents', selectedDate.toISOString().split('T')[0]],
    queryFn: () => getDetectionEventsByDay(selectedDate),
    enabled: !!selectedDate,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10, 
    retry: 2,
  })

  useEffect(() => {
    console.log('Selected date changed:', selectedDate)
    console.log(`Fetched data: ${events}`)
  }, [selectedDate, events])
  
  console.log('Fetched events:', events)

  const LoadingState = () => (
    <div className="h-full overflow-y-auto">
      <div className="space-y-2 p-2">
        {[...Array(6)].map((_, index) => (
          <div 
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="w-full h-32 bg-gray-200 rounded-lg mb-3"></div>
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const EmptyState = () => (
    <div className="flex flex-col h-full items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex flex-col items-center space-y-3 sm:space-y-4 max-w-sm text-center">
        <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl">
          <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">No events found</h3>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            No detection events were recorded on{' '}
            <span className="font-medium text-gray-700">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
          Try selecting a different date
        </div>
      </div>
    </div>
  )

  const ErrorState = () => (
    <div className="flex flex-col h-full items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex flex-col items-center space-y-3 sm:space-y-4 max-w-sm text-center">
        <div className="p-3 sm:p-4 bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm sm:text-base font-semibold text-red-900">Unable to load events</h3>
          <p className="text-xs sm:text-sm text-red-600 leading-relaxed">
            There was a problem loading events for{' '}
            {selectedDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}. Please check your connection and try again.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs sm:text-sm bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg transition-colors border border-red-200 font-medium touch-target"
        >
          Retry
        </button>
      </div>
    </div>
  )

  return (
  <section className="flex flex-col h-full bg-white md:rounded-r-2xl">
      {/* Header */}
  <div className="flex items-center justify-between p-2 sm:p-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <button type="button" className="p-1 hover:bg-gray-100 rounded">
            <ListFilter className="h-5 w-5 text-gray-600" />
          </button>
          {isFetching && !isLoading && (
            <div className="flex items-center space-x-1">
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              <span className="text-xs text-blue-600">Updating...</span>
            </div>
          )}
        </div>
        {events.length > 0 && (
          <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Calendar */}
  <div className="border-b border-gray-100">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              console.log('Selected date changed:', date);
              setSelectedDate(date);
            }
          }}
        />
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : events.length > 0 ? (
          <div className="h-full overflow-y-auto">
            <div className="space-y-2 p-2 sm:p-3">
              {events.map((event: DetectionEvent) => (
                <FeedCard key={event.id} alertEvent={event} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  )
}

export default RightFeed