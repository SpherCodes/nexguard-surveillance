'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { getDetectionEventsByDay, getCameras } from '@/lib/actions/api.actions'
import { Calendar } from './ui/calendar'
import { ListFilter, Loader2, Calendar as CalendarIcon, AlertCircle, X, Check, ChevronDown } from 'lucide-react'
import FeedCard from './FeedCard'
import { useQuery } from '@tanstack/react-query'
import { DetectionEvent} from '@/Types'
import { cn } from '@/lib/utils'

type SortOption = 'newest' | 'oldest' | 'confidence-high' | 'confidence-low'
type ConfidenceFilter = 'all' | 'high' | 'medium' | 'low'

const RightFeed = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCameras, setSelectedCameras] = useState<string[]>([])
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  const {
    data: events = [],
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['detectionEvents', selectedDate.toISOString().split('T')[0]],
    queryFn: () => getDetectionEventsByDay(selectedDate),
    enabled: !!selectedDate,
    refetchOnWindowFocus: true,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10, 
    retry: 2,
  })

  const {} = useQuery({
    queryKey: ['cameras'],
    queryFn: getCameras,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Get unique camera IDs from events
  const availableCameraIds = useMemo(() => {
    const cameraIds = new Set(events.map(event => event.cameraId))
    return Array.from(cameraIds).sort()
  }, [events])

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = events

    // Filter by selected cameras
    if (selectedCameras.length > 0) {
      filtered = filtered.filter(event => selectedCameras.includes(event.cameraId))
    }

    // Filter by confidence level
    if (confidenceFilter !== 'all') {
      filtered = filtered.filter(event => {
        const confidence = event.confidence || 0
        switch (confidenceFilter) {
          case 'high':
            return confidence > 0.8
          case 'medium':
            return confidence > 0.5 && confidence <= 0.8
          case 'low':
            return confidence <= 0.5
          default:
            return true
        }
      })
    }

    // Sort events
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        case 'confidence-high':
          return (b.confidence || 0) - (a.confidence || 0)
        case 'confidence-low':
          return (a.confidence || 0) - (b.confidence || 0)
        default:
          return 0
      }
    })

    return sorted
  }, [events, selectedCameras, confidenceFilter, sortBy])

  const toggleCameraFilter = (cameraId: string) => {
    setSelectedCameras(prev => 
      prev.includes(cameraId) 
        ? prev.filter(id => id !== cameraId)
        : [...prev, cameraId]
    )
  }

  const clearAllFilters = () => {
    setSelectedCameras([])
    setConfidenceFilter('all')
    setSortBy('newest')
  }

  const hasActiveFilters = selectedCameras.length > 0 || confidenceFilter !== 'all' || sortBy !== 'newest'

  useEffect(() => {
    console.log('Selected date changed:', selectedDate)
    console.log(`Fetched data: ${events}`)
  }, [selectedDate, events])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-filter-dropdown]')) {
        setShowFilters(false)
      }
    }

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilters])
  
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
          <div className="relative">
            <button 
              type="button" 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-1 hover:bg-gray-100 rounded transition-colors relative",
                hasActiveFilters && "bg-blue-50 text-blue-600"
              )}
            >
              <ListFilter className="h-5 w-5" />
              {hasActiveFilters && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></div>
              )}
            </button>
            
            {/* Filter Dropdown */}
            {showFilters && (
              <div 
                data-filter-dropdown
                className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              >
                <div className="p-3 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Filters</h3>
                    <div className="flex items-center gap-2">
                      {hasActiveFilters && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear all
                        </button>
                      )}
                      <button
                        onClick={() => setShowFilters(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Sort by</label>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white"
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="confidence-high">High confidence first</option>
                        <option value="confidence-low">Low confidence first</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Confidence Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Confidence Level</label>
                    <div className="flex gap-2">
                      {(['all', 'high', 'medium', 'low'] as ConfidenceFilter[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setConfidenceFilter(level)}
                          className={cn(
                            "px-3 py-1.5 text-xs rounded-full border transition-colors",
                            confidenceFilter === level
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          {level === 'all' ? 'All' : `${level.charAt(0).toUpperCase()}${level.slice(1)}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Camera Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Cameras</label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {availableCameraIds.length > 0 ? (
                        availableCameraIds.map((cameraId) => (
                          <label key={cameraId} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCameras.includes(cameraId)}
                              onChange={() => toggleCameraFilter(cameraId)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Camera {cameraId}</span>
                            {selectedCameras.includes(cameraId) && (
                              <Check className="h-3 w-3 text-blue-600" />
                            )}
                          </label>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">No cameras available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {isFetching && !isLoading && (
            <div className="flex items-center space-x-1">
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              <span className="text-xs text-blue-600">Updating...</span>
            </div>
          )}
        </div>
        {filteredAndSortedEvents.length > 0 && (
          <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
            {filteredAndSortedEvents.length} event{filteredAndSortedEvents.length !== 1 ? 's' : ''}
            {hasActiveFilters && events.length !== filteredAndSortedEvents.length && (
              <span className="text-gray-400"> of {events.length}</span>
            )}
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
        ) : filteredAndSortedEvents.length > 0 ? (
          <div className="h-full overflow-y-auto">
            <div className="space-y-2 p-2 sm:p-3">
              {filteredAndSortedEvents.map((event: DetectionEvent) => (
                <FeedCard key={event.id} alertEvent={event} />
              ))}
            </div>
          </div>
        ) : events.length > 0 ? (
          <div className="flex flex-col h-full items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4 max-w-sm text-center">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <ListFilter className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">No events match filters</h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  Try adjusting your filter settings or clearing all filters to see more events.
                </p>
              </div>
              <button 
                onClick={clearAllFilters}
                className="text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-colors border border-blue-200 font-medium"
              >
                Clear filters
              </button>
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