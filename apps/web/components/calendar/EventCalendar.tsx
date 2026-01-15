'use client';

import React, { useState, useMemo, useCallback } from 'react';

// ============================================
// Types
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: 'primary' | 'secondary' | 'pink' | 'blue' | 'green' | 'orange' | 'red';
  location?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  isAllDay?: boolean;
}

export interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  selectedDate?: Date;
  initialView?: 'month' | 'week' | 'day' | 'list';
  minDate?: Date;
  maxDate?: Date;
  showNavigation?: boolean;
  showViewSelector?: boolean;
  className?: string;
}

type ViewType = 'month' | 'week' | 'day' | 'list';

// ============================================
// Utility Functions
// ============================================

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add previous month days
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Add current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add next month days to complete the grid
  const remainingDays = 42 - days.length; // 6 weeks x 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function getWeekDays(date: Date): Date[] {
  const days: Date[] = [];
  const dayOfWeek = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek);

  for (let i = 0; i < 7; i++) {
    days.push(new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isInRange(date: Date, start: Date, end: Date): boolean {
  const d = date.getTime();
  return d >= start.getTime() && d <= end.getTime();
}

// ============================================
// Color Map
// ============================================

const colorMap = {
  primary: {
    bg: 'bg-primary-500/20',
    border: 'border-primary-500/50',
    text: 'text-primary-300',
    dot: 'bg-primary-500',
  },
  secondary: {
    bg: 'bg-secondary-400/20',
    border: 'border-secondary-400/50',
    text: 'text-secondary-300',
    dot: 'bg-secondary-400',
  },
  pink: {
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/50',
    text: 'text-pink-300',
    dot: 'bg-pink-500',
  },
  blue: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-300',
    dot: 'bg-blue-500',
  },
  green: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-300',
    dot: 'bg-green-500',
  },
  orange: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/50',
    text: 'text-orange-300',
    dot: 'bg-orange-500',
  },
  red: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-300',
    dot: 'bg-red-500',
  },
};

// ============================================
// Icons
// ============================================

function ChevronLeftIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ListIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function GridIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

function LocationIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ClockIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ============================================
// Event Pill Component
// ============================================

interface EventPillProps {
  event: CalendarEvent;
  onClick?: () => void;
  compact?: boolean;
}

function EventPill({ event, onClick, compact = false }: EventPillProps) {
  const colors = colorMap[event.color || 'primary'];

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left truncate rounded
        transition-all duration-200
        hover:scale-[1.02] hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-primary-500/50
        ${colors.bg} ${colors.border} ${colors.text}
        ${compact ? 'px-1.5 py-0.5 text-xs border-l-2' : 'px-2 py-1 text-sm border'}
      `}
      title={event.title}
    >
      {compact ? (
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          <span className="truncate">{event.title}</span>
        </span>
      ) : (
        event.title
      )}
    </button>
  );
}

// ============================================
// Month View Component
// ============================================

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

function MonthView({
  currentDate,
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
}: MonthViewProps) {
  const days = useMemo(
    () => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const getEventsForDate = useCallback(
    (date: Date) => {
      return events.filter((event) => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(23, 59, 59, 999);
        return isInRange(date, eventStart, eventEnd);
      });
    },
    [events]
  );

  return (
    <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      {DAYS.map((day) => (
        <div
          key={day}
          className="py-3 text-center text-sm font-medium text-white/50 bg-festival-dark"
        >
          {day}
        </div>
      ))}

      {/* Days */}
      {days.map((date, index) => {
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
        const dayEvents = getEventsForDate(date);
        const isSelected = selectedDate && isSameDay(date, selectedDate);
        const todayClass = isToday(date);

        return (
          <button
            key={index}
            onClick={() => onDateSelect?.(date)}
            className={`
              min-h-24 p-2 bg-festival-dark/80
              transition-all duration-200
              hover:bg-white/5
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/50
              ${!isCurrentMonth ? 'opacity-40' : ''}
              ${isSelected ? 'ring-2 ring-inset ring-primary-500' : ''}
            `}
            aria-label={date.toLocaleDateString()}
            aria-selected={isSelected}
          >
            {/* Date Number */}
            <div
              className={`
                w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1
                ${todayClass
                  ? 'bg-primary-500 text-white'
                  : isSelected
                  ? 'bg-primary-500/20 text-primary-300'
                  : 'text-white'
                }
              `}
            >
              {date.getDate()}
            </div>

            {/* Events */}
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <EventPill
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick?.(event)}
                  compact
                />
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-white/50 pl-1">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Week View Component
// ============================================

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

function WeekView({
  currentDate,
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
}: WeekViewProps) {
  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDateAndHour = useCallback(
    (date: Date, hour: number) => {
      return events.filter((event) => {
        const eventStart = new Date(event.startDate);
        return (
          isSameDay(eventStart, date) &&
          eventStart.getHours() === hour
        );
      });
    },
    [events]
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-white/10">
          <div className="p-2" /> {/* Time column header */}
          {days.map((date, index) => (
            <button
              key={index}
              onClick={() => onDateSelect?.(date)}
              className={`
                p-3 text-center border-l border-white/10
                transition-colors duration-200
                hover:bg-white/5
                ${selectedDate && isSameDay(date, selectedDate) ? 'bg-primary-500/10' : ''}
              `}
            >
              <div className="text-xs text-white/50 uppercase">{DAYS[date.getDay()]}</div>
              <div
                className={`
                  w-8 h-8 mx-auto mt-1 rounded-full flex items-center justify-center
                  text-lg font-semibold
                  ${isToday(date)
                    ? 'bg-primary-500 text-white'
                    : 'text-white'
                  }
                `}
              >
                {date.getDate()}
              </div>
            </button>
          ))}
        </div>

        {/* Time Grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-white/5">
              {/* Time Label */}
              <div className="p-2 text-xs text-white/40 text-right pr-4">
                {hour.toString().padStart(2, '0')}:00
              </div>

              {/* Day Cells */}
              {days.map((date, dayIndex) => {
                const hourEvents = getEventsForDateAndHour(date, hour);
                return (
                  <div
                    key={dayIndex}
                    className="
                      min-h-12 p-1 border-l border-white/5
                      hover:bg-white/5 transition-colors
                    "
                  >
                    {hourEvents.map((event) => (
                      <EventPill
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick?.(event)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Day View Component
// ============================================

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayEvents = useMemo(
    () => events.filter((event) => isSameDay(new Date(event.startDate), currentDate)),
    [events, currentDate]
  );

  const getEventsForHour = useCallback(
    (hour: number) => {
      return dayEvents.filter((event) => {
        const eventHour = new Date(event.startDate).getHours();
        return eventHour === hour;
      });
    },
    [dayEvents]
  );

  return (
    <div className="space-y-4">
      {/* Day Header */}
      <div className="text-center py-4 border-b border-white/10">
        <div className="text-sm text-white/50 uppercase">{DAYS[currentDate.getDay()]}</div>
        <div
          className={`
            inline-flex items-center justify-center w-14 h-14 mt-2 rounded-full
            text-2xl font-bold
            ${isToday(currentDate) ? 'bg-primary-500 text-white' : 'text-white'}
          `}
        >
          {currentDate.getDate()}
        </div>
        <div className="text-white/60 mt-1">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
      </div>

      {/* Time Slots */}
      <div className="max-h-[500px] overflow-y-auto space-y-1">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="flex gap-4">
              <div className="w-16 text-right text-sm text-white/40 py-2">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 min-h-12 border-l border-white/10 pl-4 py-1 space-y-1">
                {hourEvents.map((event) => (
                  <EventPill
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick?.(event)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// List View Component
// ============================================

interface ListViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

function ListView({ events, onEventClick }: ListViewProps) {
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    sortedEvents.forEach((event) => {
      const dateKey = new Date(event.startDate).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    return groups;
  }, [events]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isSameDay(date, today)) {return 'Today';}
    if (isSameDay(date, tomorrow)) {return 'Tomorrow';}

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (Object.keys(groupedEvents).length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="w-16 h-16 mx-auto text-white/20 mb-4" />
        <p className="text-white/50">No events scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([dateStr, dayEvents]) => (
        <div key={dateStr}>
          {/* Date Header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`
                w-12 h-12 rounded-xl flex flex-col items-center justify-center
                ${isToday(new Date(dateStr))
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-white'
                }
              `}
            >
              <span className="text-xs uppercase">{DAYS[new Date(dateStr).getDay()].slice(0, 2)}</span>
              <span className="text-lg font-bold">{new Date(dateStr).getDate()}</span>
            </div>
            <div>
              <div className="font-semibold text-white">{formatDate(dateStr)}</div>
              <div className="text-sm text-white/50">
                {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Events */}
          <div className="space-y-2 pl-15">
            {dayEvents.map((event) => {
              const colors = colorMap[event.color || 'primary'];
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className={`
                    w-full text-left p-4 rounded-xl
                    ${colors.bg} border ${colors.border}
                    transition-all duration-200
                    hover:scale-[1.01] hover:shadow-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-500/50
                  `}
                >
                  <div className="flex items-start gap-4">
                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold ${colors.text}`}>{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-white/60 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/50">
                        {!event.isAllDay && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {formatTime(event.startDate)} - {formatTime(event.endDate)}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <LocationIcon className="w-3.5 h-3.5" />
                            {event.location}
                          </span>
                        )}
                        {event.category && (
                          <span className={`px-2 py-0.5 rounded-full ${colors.bg}`}>
                            {event.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Main Calendar Component
// ============================================

export function EventCalendar({
  events,
  onEventClick,
  onDateSelect,
  onMonthChange,
  selectedDate,
  initialView = 'month',
  minDate,
  maxDate,
  showNavigation = true,
  showViewSelector = true,
  className = '',
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  const [view, setView] = useState<ViewType>(initialView);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      default:
        newDate.setMonth(newDate.getMonth() - 1);
    }

    if (minDate && newDate < minDate) {return;}
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  }, [currentDate, view, minDate, onMonthChange]);

  const handleNext = useCallback(() => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      default:
        newDate.setMonth(newDate.getMonth() + 1);
    }

    if (maxDate && newDate > maxDate) {return;}
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  }, [currentDate, view, maxDate, onMonthChange]);

  const handleToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    onMonthChange?.(today);
  }, [onMonthChange]);

  // Title based on view
  const title = useMemo(() => {
    switch (view) {
      case 'month':
        return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case 'week': {
        const weekDays = getWeekDays(currentDate);
        const start = weekDays[0];
        const end = weekDays[6];
        if (start.getMonth() === end.getMonth()) {
          return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
        }
        return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
      }
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      case 'list':
        return 'Upcoming Events';
      default:
        return '';
    }
  }, [view, currentDate]);

  return (
    <div className={`bg-festival-dark/50 rounded-2xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      {(showNavigation || showViewSelector) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-white/10">
          {/* Navigation */}
          {showNavigation && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                className="
                  p-2 rounded-lg text-white/60
                  hover:bg-white/5 hover:text-white
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50
                "
                aria-label="Previous"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-semibold text-white min-w-48 text-center">
                {title}
              </h2>

              <button
                onClick={handleNext}
                className="
                  p-2 rounded-lg text-white/60
                  hover:bg-white/5 hover:text-white
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50
                "
                aria-label="Next"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              <button
                onClick={handleToday}
                className="
                  ml-2 px-3 py-1.5 rounded-lg text-sm
                  bg-white/5 text-white/70
                  hover:bg-white/10 hover:text-white
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50
                "
              >
                Today
              </button>
            </div>
          )}

          {/* View Selector */}
          {showViewSelector && (
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg" role="tablist">
              {[
                { value: 'month', label: 'Month', icon: GridIcon },
                { value: 'week', label: 'Week', icon: CalendarIcon },
                { value: 'day', label: 'Day', icon: CalendarIcon },
                { value: 'list', label: 'List', icon: ListIcon },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setView(value as ViewType)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500/50
                    ${view === value
                      ? 'bg-primary-500 text-white'
                      : 'text-white/60 hover:text-white'
                    }
                  `}
                  role="tab"
                  aria-selected={view === value}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar Content */}
      <div className="p-4">
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            onEventClick={onEventClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            onEventClick={onEventClick}
          />
        )}
        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
          />
        )}
        {view === 'list' && (
          <ListView events={events} onEventClick={onEventClick} />
        )}
      </div>
    </div>
  );
}

// ============================================
// Mini Calendar Component
// ============================================

interface MiniCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  events?: CalendarEvent[];
  className?: string;
}

export function MiniCalendar({
  selectedDate,
  onDateSelect,
  events = [],
  className = '',
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  const days = useMemo(
    () => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const hasEvents = useCallback(
    (date: Date) => {
      return events.some((event) => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(23, 59, 59, 999);
        return isInRange(date, eventStart, eventEnd);
      });
    },
    [events]
  );

  return (
    <div className={`bg-festival-dark/50 rounded-xl border border-white/10 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentDate(newDate);
          }}
          className="p-1 text-white/50 hover:text-white transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-white">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentDate(newDate);
          }}
          className="p-1 text-white/50 hover:text-white transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-xs text-white/40 py-1">
            {day.charAt(0)}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.slice(0, 42).map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const hasEvent = hasEvents(date);

          return (
            <button
              key={index}
              onClick={() => onDateSelect?.(date)}
              className={`
                relative w-8 h-8 flex items-center justify-center
                text-xs rounded-full transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500/50
                ${!isCurrentMonth ? 'text-white/20' : 'text-white/70 hover:bg-white/10'}
                ${isToday(date) && !isSelected ? 'text-primary-400 font-semibold' : ''}
                ${isSelected ? 'bg-primary-500 text-white' : ''}
              `}
            >
              {date.getDate()}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
