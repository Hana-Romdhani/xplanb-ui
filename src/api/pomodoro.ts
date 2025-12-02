import { api } from '../lib/api';

export interface PomodoroSession {
    _id: string;
    userId: string;
    startTime: string;
    endTime?: string;
    type: 'work' | 'break' | 'long_break';
    duration: number; // in minutes
    completed?: boolean;
    interrupted?: boolean;
    interruptionReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface StartPomodoroSessionDto {
    type: 'work' | 'break' | 'long_break';
    duration: number;
}

export interface StopPomodoroSessionDto {
    interrupted?: boolean;
    interruptionReason?: string;
}

export interface PomodoroStats {
    totalSessions: number;
    completedSessions: number;
    interruptedSessions: number;
    totalWorkTime: number;
    totalBreakTime: number;
    averageSessionLength: number;
    productivityScore: number;
}

export interface DailySessionData {
    date: string;
    sessionCount: number;
    totalMinutes: number;
    averageMinutes: number;
    sessions: Array<{
        id: string;
        duration: number;
        startTime: string;
        endTime?: string;
    }>;
}

export interface DailySessionsResponse {
    dailyStats: DailySessionData[];
    totalDays: number;
    totalSessions: number;
    totalMinutes: number;
    averageMinutesPerDay: number;
}

export const pomodoroApi = {
    // Start a new Pomodoro session
    startSession: async (data: StartPomodoroSessionDto): Promise<PomodoroSession> => {
        const response = await api.post('/pomodoro/start', data);
        return response.data;
    },

    // Stop a session
    stopSession: async (sessionId: string, data?: StopPomodoroSessionDto): Promise<PomodoroSession> => {
        const response = await api.post(`/pomodoro/stop/${sessionId}`, data || {});
        return response.data;
    },

    // Get active session
    getActiveSession: async (): Promise<PomodoroSession | null> => {
        try {
            const response = await api.get('/pomodoro/active');
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    // Get stats for a period
    getStats: async (period?: 'daily' | 'weekly' | 'monthly'): Promise<PomodoroStats> => {
        const params = period ? `?period=${period}` : '';
        const response = await api.get(`/pomodoro/stats${params}`);
        return response.data;
    },

    // Get recent sessions
    getRecentSessions: async (limit: number = 10): Promise<PomodoroSession[]> => {
        const response = await api.get(`/pomodoro/recent?limit=${limit}`);
        return response.data;
    },

    // Get daily sessions breakdown
    getDailySessions: async (startDate?: string, endDate?: string): Promise<DailySessionsResponse> => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const queryString = params.toString();
        const url = `/pomodoro/daily${queryString ? `?${queryString}` : ''}`;
        const response = await api.get(url);
        return response.data;
    },
};

