import { api } from '../api';

interface CalendarEvent {
    _id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    createdBy: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    participants: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    }>;
    linkedDocId?: {
        _id: string;
        Title: string;
    };
    linkedFolderId?: {
        _id: string;
        Name: string;
    };
    meetingRoomId?: string;
    recordingUrl?: string;
    createdAt: string;
    updatedAt: string;
}

interface CreateCalendarEventDto {
    title: string;
    description?: string;
    startDate: Date | string;
    endDate: Date | string;
    participants?: string[];
    linkedDocId?: string;
    linkedFolderId?: string;
}

interface UpdateCalendarEventDto {
    title?: string;
    description?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    participants?: string[];
    linkedDocId?: string;
    linkedFolderId?: string;
}

export const createCalendarEvent = async (data: CreateCalendarEventDto): Promise<CalendarEvent> => {
    const payload = {
        ...data,
        startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
        endDate: data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate,
    };
    const response = await api.post('/calendar', payload);
    return response.data;
};

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
    const response = await api.get('/calendar');
    return response.data;
};

export const getCalendarEventById = async (id: string): Promise<CalendarEvent> => {
    const response = await api.get(`/calendar/${id}`);
    return response.data;
};

export const updateCalendarEvent = async (id: string, data: UpdateCalendarEventDto): Promise<CalendarEvent> => {
    const response = await api.put(`/calendar/${id}`, data);
    return response.data;
};

export const deleteCalendarEvent = async (id: string): Promise<void> => {
    await api.delete(`/calendar/${id}`);
};

export type { CalendarEvent, CreateCalendarEventDto, UpdateCalendarEventDto };

