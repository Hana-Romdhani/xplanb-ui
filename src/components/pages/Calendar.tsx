import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import AddEventModal from '../modals/AddEventModal';
import { getCalendarEvents } from '@/lib/services/calendarService';
import { toast } from 'sonner';
import { CalendarEvent } from '@/lib/services/calendarService';

const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-pink-500', 'bg-yellow-500'];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedEvents = await getCalendarEvents();
      setEvents(fetchedEvents);
    } catch (err: any) {
      console.error('Failed to load events:', err);
      setError(err?.response?.data?.message || 'Failed to load calendar events');
      toast.error('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventCreated = () => {
    loadEvents();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddEventModal(true);
  };

  const handleCloseModal = () => {
    setShowAddEventModal(false);
    setSelectedDate(null);
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      const daysToAdd = direction === 'next' ? 7 : -7;
      newDate.setDate(prev.getDate() + daysToAdd);
      return newDate;
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      const daysToAdd = direction === 'next' ? 1 : -1;
      newDate.setDate(prev.getDate() + daysToAdd);
      return newDate;
    });
  };

  const getEventColor = (index: number) => {
    return colors[index % colors.length];
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((event) => {
      const eventDate = new Date(event.startDate);
      const eventDateStr = eventDate.toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
  };

  const getEventsForTimeSlot = (date: Date, hour: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startDate);
      const eventHour = eventDate.getHours();
      const eventDateStr = eventDate.toISOString().split('T')[0];
      const compareDateStr = date.toISOString().split('T')[0];
      return eventDateStr === compareDateStr && eventHour === hour;
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter((event) => new Date(event.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  };

  // Get week dates
  const getWeekDates = useMemo(() => {
    const dates: Date[] = [];
    const currentDay = currentDate.getDay();
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - currentDay);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // Get hours for day view
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getViewTitle = () => {
    if (view === 'week') {
      const weekStart = getWeekDates[0];
      const weekEnd = getWeekDates[6];
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return monthName;
  };

  const getNavigationButtons = () => {
    if (view === 'week') {
      return (
        <>
          <Button variant="outline" size="icon" className="rounded-lg" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-lg" onClick={() => navigateWeek('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      );
    } else if (view === 'day') {
      return (
        <>
          <Button variant="outline" size="icon" className="rounded-lg" onClick={() => navigateDay('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-lg" onClick={() => navigateDay('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      );
    } else {
      return (
        <>
          <Button variant="outline" size="icon" className="rounded-lg" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-lg" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] mb-2">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and tasks</p>
        </div>
        <Button className="rounded-xl" onClick={() => setShowAddEventModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-red-500 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 p-6 rounded-xl">
          <div className="space-y-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-[20px]">{getViewTitle()}</h2>
                <div className="flex space-x-1">
                  {getNavigationButtons()}
                </div>
              </div>

              <Tabs value={view} onValueChange={(v: any) => setView(v)}>
                <TabsList className="rounded-xl">
                  <TabsTrigger value="month" className="rounded-lg">Month</TabsTrigger>
                  <TabsTrigger value="week" className="rounded-lg">Week</TabsTrigger>
                  <TabsTrigger value="day" className="rounded-lg">Day</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Calendar Grid */}
            {view === 'month' && (
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-[14px] text-muted-foreground py-2">
                    {day}
                  </div>
                ))}

                {/* Empty cells for first week */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayEvents = getEventsForDate(date);
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();

                  return (
                    <div
                      key={day}
                      onClick={() => handleDateClick(date)}
                      className={`aspect-square p-2 rounded-xl border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : ''
                        }`}
                    >
                      <div className={`text-[14px] mb-1 ${isToday ? 'text-blue-600' : ''}`}>{day}</div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event._id}
                            className={`${getEventColor(day % colors.length)} text-white text-[10px] px-1.5 py-0.5 rounded truncate`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {view === 'week' && (
              <div className="space-y-2">
                {/* Day headers */}
                <div className="grid grid-cols-8 gap-2">
                  <div className="text-[14px] text-muted-foreground"></div>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-[14px] text-muted-foreground py-2 font-medium">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Time slots */}
                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 gap-2">
                    <div className="text-[12px] text-muted-foreground py-2 text-right pr-2">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    {getWeekDates.map((date, dayIndex) => {
                      const dayEvents = getEventsForTimeSlot(date, hour);
                      const isToday = date.toDateString() === new Date().toDateString();
                      const dayNumber = date.getDate();

                      return (
                        <div
                          key={`${dayIndex}-${hour}`}
                          onClick={() => handleDateClick(date)}
                          className={`min-h-[80px] p-1 rounded border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                        >
                          <div className={`text-[12px] mb-1 ${isToday ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                            {dayIndex === 0 && dayNumber}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map((event) => (
                              <div
                                key={event._id}
                                className={`${getEventColor(dayIndex % colors.length)} text-white text-[10px] px-1.5 py-0.5 rounded truncate`}
                                title={`${event.title} - ${formatTime(event.startDate)}`}
                              >
                                {formatTime(event.startDate)}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {view === 'day' && (
              <div className="space-y-2">
                <div className="text-center text-[14px] text-muted-foreground mb-2">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>

                {/* Time slots */}
                <div className="space-y-2">
                  {hours.map((hour) => {
                    const dayEvents = getEventsForTimeSlot(currentDate, hour);

                    return (
                      <div key={hour} onClick={() => handleDateClick(currentDate)} className="flex border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                        <div className="text-[12px] text-muted-foreground py-3 px-4 min-w-[80px] text-right">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="flex-1 p-3">
                          {dayEvents.map((event) => (
                            <div
                              key={event._id}
                              className={`${getEventColor(0)} text-white text-[12px] px-3 py-2 rounded mb-1`}
                            >
                              <div className="font-medium">{event.title}</div>
                              <div className="text-[10px] opacity-90">
                                {formatTime(event.startDate)} - {formatTime(event.endDate)}
                              </div>
                              {event.description && (
                                <div className="text-[10px] opacity-80 mt-1">{event.description}</div>
                              )}
                              {event.participants && event.participants.length > 0 && (
                                <div className="text-[10px] opacity-80 mt-1">
                                  {event.participants.length} participant{event.participants.length === 1 ? '' : 's'}
                                </div>
                              )}
                            </div>
                          ))}
                          {dayEvents.length === 0 && <div className="text-[14px] text-muted-foreground">&nbsp;</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Sidebar - Upcoming Events Only */}
        <div className="space-y-6">
          <Card className="p-6 rounded-xl">
            <h3 className="mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {getUpcomingEvents().length > 0 ? (
                getUpcomingEvents().map((event, idx) => (
                  <div
                    key={event._id}
                    className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`w-3 h-3 rounded-full ${getEventColor(idx)}`} />
                      <p className="font-medium">{event.title}</p>
                    </div>
                    <p className="text-[14px] text-muted-foreground">{formatTime(event.startDate)}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {event.participants?.length || 0} participant{event.participants?.length === 1 ? '' : 's'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-[14px]">No upcoming events</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {showAddEventModal && (
        <AddEventModal
          onClose={handleCloseModal}
          onEventCreated={handleEventCreated}
          initialDate={selectedDate || undefined}
        />
      )}
    </div>
  );
}
