"use client"

import * as React from "react"
import { getDetectionEventsByDay } from "@/lib/actions/api.actions"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  defaultMonth = new Date(),
  onSelectedDate,
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  onSelectedDate?: (date: Date, events: any[]) => void
}) {

  // Helper function to get start of week (Sunday)
  const getWeekStart = (date: Date): Date => {
    const startOfWeek = new Date(date)
    const dayOfWeek = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    return startOfWeek
  }

  // Helper function to get end of week (Saturday)
  const getWeekEnd = (weekStart: Date): Date => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    return weekEnd
  }

  // Helper function to safely add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  // State to track the current week
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() => {
    const date = defaultMonth || new Date()
    return getWeekStart(date)
  })

  // Calculate the week end date
  const currentWeekEnd = getWeekEnd(currentWeekStart)

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

  // State for selected date
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)

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

          <div className="flex items-center space-x-1 flex-1 justify-center">
            {weekDays.map((day, index) => {
              const isToday = day.getTime() === today.getTime()
              const isSelected = selectedDate && day.getTime() === selectedDate.getTime()
              const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
              const dayNumber = day.getDate()

              return (
                <button
                  key={index}
                  onClick={ async () => {
                    setSelectedDate(day)
                    const data = await getDetectionEventsByDay(day)
                    onSelectedDate?.(day, data)
                  }}
                  className={cn(
                    "flex flex-col items-center min-w-[28px] px-1.5 py-1.5 rounded-lg transition-all duration-200",
                    isSelected || isToday
                      ? "bg-black text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-0.5",
                    isSelected || isToday ? "text-white" : "text-gray-500"
                  )}>
                    {dayName}
                  </div>
                  <div className={cn(
                    "text-sm font-bold",
                    isSelected || isToday ? "text-white" : "text-gray-900"
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
    "bg-white p-3 max-w-[22em] w-full mx-auto flex justify-center",
    className
  )}>
    <div className="w-full overflow-x-auto">
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