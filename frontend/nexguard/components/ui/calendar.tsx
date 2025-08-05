"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Calendar({
  className,
  defaultMonth = new Date(),
  selected,
  onSelect,
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  selected?: Date
  onSelect: (date: Date | undefined) => void
}) {

  // Helper function to get start of week (Sunday)
  const getWeekStart = (date: Date): Date => {
    const startOfWeek = new Date(date)
    const dayOfWeek = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    return startOfWeek
  }

  // Helper function to safely add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  // State to track the current week - initialize with selected date if available
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() => {
    const initialDate = selected || defaultMonth || new Date()
    return getWeekStart(initialDate)
  })

  // Update week when selected date changes
  React.useEffect(() => {
    if (selected) {
      const selectedWeekStart = getWeekStart(selected)
      setCurrentWeekStart(selectedWeekStart)
    }
  }, [selected])

  // Navigation functions with proper date handling
  const goToPreviousWeek = () => {
    const newStart = addDays(currentWeekStart, -7)
    setCurrentWeekStart(newStart)
  }

  const goToNextWeek = () => {
    const newStart = addDays(currentWeekStart, 7)
    setCurrentWeekStart(newStart)
  }

  // Generate the week days
  const weekDays = React.useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i))
    }
    return days
  }, [currentWeekStart])

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  // Custom horizontal week component
  const HorizontalWeekView = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Format month and year for the current week
    const monthYear = currentWeekStart.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })

    return (
      <div className="flex flex-col justify-center items-center">
        {/* Month and Year Header */}
        <div className="text-center mb-1">
          <div className="text-sm text-gray-600 font-medium">
            {monthYear}
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between w-full gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousWeek}
            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full flex-shrink-0"
          >
            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
          </Button>

          <div className="flex items-center gap-0.5 flex-1 justify-center">
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, today)
              const isSelected = selected && isSameDay(day, selected)
              const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
              const dayNumber = day.getDate()

              return (
                <button
                  key={index}
                  onClick={() => {
                    onSelect(day)
                  }}
                  className={cn(
                    "flex flex-col items-center flex-1 min-w-0 px-1 py-1.5 rounded-lg transition-all duration-200",
                    isSelected
                      ? "bg-black text-white shadow-md" 
                      : isToday
                      ? "bg-gray-200 text-gray-900 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-0.5 truncate",
                    isSelected ? "text-white" : "text-gray-500"
                  )}>
                    {dayName}
                  </div>
                  <div className={cn(
                    "text-sm font-bold",
                    isSelected ? "text-white" : "text-gray-900"
                  )}>
                    {dayNumber}
                  </div>
                </button>
              )
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextWeek}
            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full flex-shrink-0"
          >
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white p-3 w-full mx-auto",
      className
    )}>
      <div className="w-full">
        <HorizontalWeekView />
      </div>
    </div>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "h-8 w-8 text-gray-700 font-medium text-sm hover:bg-gray-100 rounded-lg transition-colors",
        "data-[selected-single=true]:bg-black data-[selected-single=true]:text-white data-[selected-single=true]:font-semibold",
        "data-[range-middle=true]:bg-gray-100 data-[range-middle=true]:text-gray-700",
        "data-[range-start=true]:bg-black data-[range-start=true]:text-white data-[range-start=true]:font-semibold",
        "data-[range-end=true]:bg-black data-[range-end=true]:text-white data-[range-end=true]:font-semibold",
        modifiers.today && "bg-black text-white font-semibold",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }