import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { createCalendarEvent } from '@/lib/services/calendarService';

interface AddEventModalProps {
  onClose: () => void;
  onEventCreated?: () => void;
  initialDate?: Date;
}

export default function AddEventModal({ onClose, onEventCreated, initialDate }: AddEventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Set initial date if provided
  useEffect(() => {
    if (initialDate) {
      const dateStr = initialDate.toISOString().split('T')[0];
      setDate(dateStr);
      // Set default times if not already set
      setStartTime('09:00');
      setEndTime('10:00');
    } else {
      // Reset to empty when no initial date
      setDate('');
      setStartTime('');
      setEndTime('');
    }
  }, [initialDate]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    if (!startTime) {
      toast.error('Please select a start time');
      return;
    }

    if (!endTime) {
      toast.error('Please select an end time');
      return;
    }

    try {
      setIsCreating(true);
      // Combine date and time to create proper Date objects
      const startDate = new Date(`${date}T${startTime}`);
      const endDate = new Date(`${date}T${endTime}`);

      // Parse participants from comma-separated string to array
      const participantArray = participants
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      await createCalendarEvent({
        title,
        description,
        startDate,
        endDate,
        participants: participantArray.length > 0 ? participantArray : undefined,
      });

      toast.success('Event created successfully!');
      onEventCreated?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-[20px]">Add New Event</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div>
            <Label htmlFor="eventTitle">Event Title</Label>
            <Input
              id="eventTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Standup"
              className="mt-1.5 rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="eventDate">Date</Label>
            <Input
              id="eventDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="eventDescription">Description</Label>
            <Textarea
              id="eventDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add event details..."
              className="mt-1.5 rounded-xl min-h-[100px]"
            />
          </div>

          {/*   <div>
            <Label htmlFor="participants">Participants (Email addresses, comma separated)</Label>
            <Input
              id="participants"
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className="mt-1.5 rounded-xl"
            />
          </div> */}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl" disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="rounded-xl" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </div>
    </div>
  );
}
