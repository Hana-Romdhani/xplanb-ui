import { api } from '../api';

export interface DashboardStats {
    totalDocuments: number;
    totalFolders: number;
    totalCollaborators: number;
}

export interface RecentActivity {
    _id: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: string;
    createdAt: string;
    resourceTitle?: string;
    resourceFolder?: string;
}

// Helper function to check if error is a connection error
const isConnectionError = (error: any): boolean => {
    return (
        error?.code === 'ERR_NETWORK' ||
        error?.code === 'ECONNREFUSED' ||
        error?.message?.includes('ERR_CONNECTION_REFUSED') ||
        error?.message?.includes('Network Error') ||
        !error?.response
    );
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
    try {
        const [documentsRes, foldersRes] = await Promise.all([
            api.get('/Document'),
            api.get('/folder/getAllFolder?page=1&perPage=100')
        ]);

        const allFolders = foldersRes.data || [];

        return {
            totalDocuments: documentsRes.data?.length || 0,
            totalFolders: allFolders?.length || 0,
            totalCollaborators: 0, // TODO: Fetch from appropriate endpoint
        };
    } catch (error: any) {
        if (isConnectionError(error)) {
            // Silently handle connection errors - return empty stats
            console.warn('Backend connection unavailable. Returning empty dashboard stats.');
            return {
                totalDocuments: 0,
                totalFolders: 0,
                totalCollaborators: 0,
            };
        } else {
            console.error('Failed to fetch dashboard stats:', error);
            return {
                totalDocuments: 0,
                totalFolders: 0,
                totalCollaborators: 0,
            };
        }
    }
};

export const getRecentActivities = async (): Promise<RecentActivity[]> => {
    try {
        const response = await api.get('/activity/recent?hours=72');
        return response.data;
    } catch (error: any) {
        if (isConnectionError(error)) {
            // Silently handle connection errors - return empty array
            console.warn('Backend connection unavailable. Returning empty activities.');
            return [];
        } else {
            console.error('Failed to fetch recent activities:', error);
            return [];
        }
    }
};

export interface FavoriteDocument {
    _id: string;
    Title: string;
    folderName?: string;
    updatedDate: string;
    folderId?: string;
}

export const getFavoriteDocuments = async (): Promise<FavoriteDocument[]> => {
    try {
        const response = await api.get('/Document/favorites');
        const documents = response.data || [];

        // Helper function to extract folder ID (handles both string and object)
        const extractFolderId = (folderId: any): string | null => {
            if (!folderId) return null;
            if (typeof folderId === 'string') return folderId;
            if (typeof folderId === 'object' && folderId._id) {
                return String(folderId._id);
            }
            return String(folderId);
        };

        // Helper function to get folder name (handles populated folderId)
        const getFolderName = (folderId: any): string => {
            if (!folderId) return 'Uncategorized';

            // If folderId is populated (object with Name property), use it directly
            if (typeof folderId === 'object' && folderId.Name) {
                return folderId.Name;
            }

            // If folderId is populated (object with name property), use it
            if (typeof folderId === 'object' && folderId.name) {
                return folderId.name;
            }

            // Otherwise, it's an ID string or we need to fetch it
            return 'Uncategorized';
        };

        // Get folder IDs that need to be fetched (only if they're not populated)
        const folderIdsToFetch = documents
            .map((doc: any) => {
                const folderId = doc.folderId;
                // Only fetch if it's a string ID, not a populated object
                if (folderId && typeof folderId === 'string') {
                    return folderId;
                }
                return null;
            })
            .filter(Boolean) as string[];

        const folderMap = new Map<string, string>();

        // Only fetch folders if we have IDs that need resolving
        if (folderIdsToFetch.length > 0) {
            try {
                const foldersResponse = await api.get('/folder/getAllFolder?page=1&perPage=100');
                const folders = foldersResponse.data || [];
                folders.forEach((folder: any) => {
                    folderMap.set(folder._id, folder.Name || folder.name || 'Uncategorized');
                });
            } catch (folderError) {
                console.error('Failed to fetch folders for favorite documents:', folderError);
            }
        }

        return documents.map((doc: any) => {
            const folderId = doc.folderId;
            let folderName = 'Uncategorized';

            // Try to get folder name from populated object first
            if (folderId) {
                folderName = getFolderName(folderId);

                // If we couldn't get it from populated object, try the map
                if (folderName === 'Uncategorized' && typeof folderId === 'string') {
                    folderName = folderMap.get(folderId) || 'Uncategorized';
                }
            }

            return {
                _id: doc._id,
                Title: doc.Title,
                folderName: folderName,
                updatedDate: doc.updatedDate || doc.createdDate,
                folderId: extractFolderId(folderId) || undefined
            };
        }).slice(0, 5); // Limit to 5 for dashboard
    } catch (error: any) {
        if (isConnectionError(error)) {
            // Silently handle connection errors - return empty array
            console.warn('Backend connection unavailable. Returning empty favorite documents.');
            return [];
        } else {
            console.error('Failed to fetch favorite documents:', error);
            return [];
        }
    }
};

