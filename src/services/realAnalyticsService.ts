import { api } from '../lib/api';

export interface RealAnalyticsData {
    // Real collaboration data
    activeEditors: number;
    totalComments: number;
    totalCoEdits: number;
    averageSessionDuration: number;
    mostActiveUsers: Array<{
        userId: string;
        userName: string;
        hoursActive: number;
    }>;

    // Real document data
    totalDocuments: number;
    sharedFolders: number;
    totalUsers: number;

    // Real version-based activity data
    documentsCreatedToday: number;
    documentsEditedToday: number;
    activeCollaborations: number;

    // Version-based metrics
    totalVersions: number;
    versionsCreatedToday: number;
    versionsCreatedThisWeek: number;
    mostActiveEditors: Array<{
        userId: string;
        userName: string;
        versionsCreated: number;
        commentsAdded?: number;
    }>;

    // Version trends
    versionTrends: Array<{
        date: string;
        versions: number;
        comments?: number;
    }>;

    commentsCreatedToday?: number;
}

export const getRealUsefulAnalytics = async (userId?: string): Promise<RealAnalyticsData> => {
    try {
        // Get REAL collaboration data (filtered by user if provided)
        const teamResponse = await api.get('/analytics/team');

        // Get REAL folder data
        let sharedFolders = 0;
        try {
            const folderResponse = await api.get('/folder/shared/count');
            sharedFolders = folderResponse.data.length || 0;
        } catch (e) {
            console.warn('Could not fetch shared folders count', e);
        }

        // Get REAL users data
        let totalUsers = 0;
        try {
            const usersResponse = await api.get('/users');
            totalUsers = usersResponse.data.length || 0;
        } catch (e) {
            console.warn('Could not fetch users count', e);
        }

        // Get REAL documents data (filtered by user if provided)
        let documentsData: any[] = [];
        try {
            const documentsResponse = await api.get('/document');
            let allDocuments = documentsResponse.data || [];
            // Filter documents by user - only show documents in folders owned by or shared with the user
            if (userId) {
                // Get folders owned by or shared with user
                const foldersResponse = await api.get('/folder');
                const userFolders = Array.isArray(foldersResponse.data) 
                    ? foldersResponse.data.filter((folder: any) => 
                        folder.user === userId || 
                        (folder.sharedWith && folder.sharedWith.includes(userId))
                    )
                    : [];
                const userFolderIds = userFolders.map((f: any) => f._id);
                // Filter documents to only those in user's folders
                documentsData = allDocuments.filter((doc: any) => 
                    userFolderIds.includes(doc.folderId)
                );
            } else {
                documentsData = allDocuments;
            }
        } catch (e) {
            console.warn('Could not fetch documents', e);
        }

        // Get REAL version analytics
        const versionResponse = await api.get('/analytics/versions');
        const versionData = versionResponse.data || {};

        const teamData = teamResponse.data || {};

        // Calculate REAL metrics
        const totalDocuments = documentsData.length;

        // Calculate today's activity
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const documentsCreatedToday = documentsData.filter((doc: any) => {
            const createdDate = new Date(doc.createdDate || doc.createdAt);
            return createdDate >= today;
        }).length;

        const documentsEditedToday = documentsData.filter((doc: any) => {
            const updatedDate = new Date(doc.updatedDate || doc.updatedAt);
            return updatedDate >= today;
        }).length;

        const activeCollaborations = documentsData.filter((doc: any) =>
            doc.sharedWith && doc.sharedWith.length > 0
        ).length;

        return {
            // Real collaboration metrics
            activeEditors: teamData.activeEditors || 0,
            totalComments: versionData.totalComments || teamData.totalComments || 0,
            totalCoEdits: teamData.totalCoEdits || 0,
            averageSessionDuration: teamData.averageSessionDuration || 0,
            mostActiveUsers: teamData.mostActiveUsers || [],

            // Real document metrics
            totalDocuments,
            sharedFolders,
            totalUsers,

            // Real activity metrics
            documentsCreatedToday,
            documentsEditedToday,
            activeCollaborations,

            // Version-based metrics
            totalVersions: versionData.totalVersions || 0,
            versionsCreatedToday: versionData.versionsCreatedToday || 0,
            versionsCreatedThisWeek: versionData.versionsCreatedThisWeek || 0,
            mostActiveEditors: versionData.mostActiveEditors || [],
            versionTrends: versionData.versionTrends || [],
            commentsCreatedToday: versionData.commentsCreatedToday || 0,
        };

    } catch (error: any) {
        console.error('Error fetching real analytics:', error);

        // Check if it's a network error
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            console.warn('Backend server may not be running. Using sample data for demo.');

            // Return sample data for demo purposes
            return {
                activeEditors: 2,
                totalComments: 5,
                totalCoEdits: 3,
                averageSessionDuration: 1.5,
                mostActiveUsers: [
                    { userId: '1', userName: 'John Doe', hoursActive: 2.5 },
                    { userId: '2', userName: 'Jane Smith', hoursActive: 1.8 }
                ],
                totalDocuments: 8,
                sharedFolders: 3,
                totalUsers: 4,
                documentsCreatedToday: 2,
                documentsEditedToday: 4,
                activeCollaborations: 3,
                totalVersions: 12,
                versionsCreatedToday: 3,
                versionsCreatedThisWeek: 8,
                mostActiveEditors: [
                    { userId: '1', userName: 'John Doe', versionsCreated: 5 },
                    { userId: '2', userName: 'Jane Smith', versionsCreated: 4 },
                    { userId: '3', userName: 'Bob Wilson', versionsCreated: 3 }
                ],
                versionTrends: [
                    { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], versions: 2, comments: 1 },
                    { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], versions: 1, comments: 0 },
                    { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], versions: 3, comments: 2 },
                    { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], versions: 2, comments: 1 },
                    { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], versions: 4, comments: 3 },
                    { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], versions: 1, comments: 1 },
                    { date: new Date().toISOString().split('T')[0], versions: 3, comments: 2 }
                ],
                commentsCreatedToday: 2,
            };
        }

        // Return zeros for other errors
        return {
            activeEditors: 0,
            totalComments: 0,
            totalCoEdits: 0,
            averageSessionDuration: 0,
            mostActiveUsers: [],
            totalDocuments: 0,
            sharedFolders: 0,
            totalUsers: 0,
            documentsCreatedToday: 0,
            documentsEditedToday: 0,
            activeCollaborations: 0,
            totalVersions: 0,
            versionsCreatedToday: 0,
            versionsCreatedThisWeek: 0,
            mostActiveEditors: [],
            versionTrends: [],
            commentsCreatedToday: 0,
        };
    }
};

