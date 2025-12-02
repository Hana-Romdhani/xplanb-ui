import { api } from '../lib/api';

export interface ProductivityMetrics {
    hoursEdited: number;
    documentsEdited: number;
    pomodoroSessions: number;
    averageSessionLength: number;
    lastActiveDate: string;
}

export interface TeamCollaboration {
    activeEditors: number;
    totalComments: number;
    totalCoEdits: number;
    averageSessionDuration: number;
    mostActiveUsers: Array<{
        userId: string;
        userName: string;
        hoursActive: number;
    }>;
}

export interface ProjectOverview {
    folderId: string;
    folderName: string;
    totalDocuments: number;
    completedDocuments: number;
    completionPercentage: number;
    lastActivity: string;
    activeUsers: number;
}

export interface CalendarLinks {
    eventId: string;
    eventTitle: string;
    startTime: string;
    endTime: string;
    linkedDocId?: string;
    linkedDocTitle?: string;
    linkedFolderId?: string;
    linkedFolderName?: string;
}

export const analyticsApi = {
    // Get user productivity metrics
    getProductivity: async (userId?: string, startDate?: string, endDate?: string): Promise<ProductivityMetrics> => {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);

        const response = await api.get(`/analytics/productivity?${params.toString()}`);
        return response.data;
    },

    // Get team collaboration metrics
    getTeamCollaboration: async (organizationId?: string, startDate?: string, endDate?: string): Promise<TeamCollaboration> => {
        const params = new URLSearchParams();
        if (organizationId) params.append('organizationId', organizationId);
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);

        const response = await api.get(`/analytics/team?${params.toString()}`);
        return response.data;
    },

    // Get project overview
    getProjectOverview: async (folderId?: string): Promise<ProjectOverview[]> => {
        const params = new URLSearchParams();
        if (folderId) params.append('folderId', folderId);

        const response = await api.get(`/analytics/projectOverview?${params.toString()}`);
        return response.data;
    },

    // Get calendar links
    getCalendarLinks: async (startDate: string, endDate: string): Promise<CalendarLinks[]> => {
        const params = new URLSearchParams();
        params.append('start', startDate);
        params.append('end', endDate);

        const response = await api.get(`/analytics/calendarLinks?${params.toString()}`);
        return response.data;
    },

    // Get version analytics
    getVersionAnalytics: async (startDate?: string, endDate?: string): Promise<any> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);

        const response = await api.get(`/analytics/versions?${params.toString()}`);
        return response.data;
    },

    // Get folder analytics
    getFolderAnalytics: async (): Promise<FolderAnalytics> => {
        const response = await api.get('/analytics/folders');
        return response.data;
    },
};

export interface FolderAnalytics {
    totalFolders: number;
    totalDocuments: number;
    totalSharedFolders: number;
    averageDocumentsPerFolder: number;
    folderStats: Array<{
        folderId: string;
        folderName: string;
        totalDocuments: number;
        recentDocuments: number;
        totalComments: number;
        activeCollaborators: number;
        sharedWith: number;
    }>;
    mostActiveFolders: Array<{
        folderId: string;
        folderName: string;
        totalDocuments: number;
        recentDocuments: number;
        totalComments: number;
        activeCollaborators: number;
        sharedWith: number;
    }>;
}

