import { api } from '../api';

export interface ActivityLog {
    _id: string;
    userId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    location?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ActivityStats {
    totalActivities: number;
    byAction: Array<{
        _id: string;
        count: number;
    }>;
}

export const getRecentActivity = async (hours: number = 24): Promise<ActivityLog[]> => {
    const response = await api.get(`/activity/recent?hours=${hours}`);
    return response.data;
};

export const getActivityStats = async (): Promise<ActivityStats> => {
    const response = await api.get('/activity/stats');
    return response.data;
};

export const getUserActivityLogs = async (limit: number = 50, offset: number = 0): Promise<ActivityLog[]> => {
    const response = await api.get(`/activity?limit=${limit}&offset=${offset}`);
    return response.data;
};

