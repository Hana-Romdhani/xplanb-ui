import axios from "axios";
import { API_URL, ACCESS_TOKEN_KEY } from "../lib/config";

// API URL without /api suffix since backend controllers are at root
const baseURL = API_URL.replace('/api', '');

const axiosAuth = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

console.log('🔧 Folders API Base URL:', baseURL);

axiosAuth.interceptors.request.use((config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 Unauthorized errors - redirect to login
axiosAuth.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('Unauthorized - token may be expired or invalid');
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            // Don't redirect immediately - let the component handle it
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export interface Folder {
    _id: string;
    Name: string;
    createdDate: string;
    user: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    documents: string[];
    sharedWith: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        picture?: string;
        avatar?: string;
    }>;
    userAccess: Array<{
        userId: string | {
            _id: string;
            firstName: string;
            lastName: string;
            email: string;
            picture?: string;
            avatar?: string;
        };
        access: 'view' | 'update';
    }>;
    contents: string[];
}

export interface CreateFolderDto {
    Name: string;
}

export interface ShareFolderDto {
    userIdToShareWith: string;
}

export interface InviteUserByEmailDto {
    email: string;
    access?: 'view' | 'update';
}

export const foldersApi = {
    // Search folders with pagination
    search: (keyword: string, page: number = 1, perPage: number = 10): Promise<Folder[]> =>
        axiosAuth.get(`/folder/search?keyword=${keyword}&page=${page}&perPage=${perPage}`).then((r) => r.data),

    // Get all folders
    getAll: (page: number = 1, perPage: number = 10): Promise<Folder[]> =>
        axiosAuth.get(`/folder/getAllFolder?page=${page}&perPage=${perPage}`).then((r) => r.data),

    // Create folder
    create: (data: CreateFolderDto): Promise<Folder> =>
        axiosAuth.post('/folder/AddFolder', data).then((r) => r.data),

    // Get folder by ID
    getById: (folderId: string): Promise<Folder> =>
        axiosAuth.get(`/folder/getbyidfolder/${folderId}`).then((r) => r.data),

    // Update folder
    update: (folderId: string, name: string): Promise<Folder> =>
        axiosAuth.patch(`/folder/${folderId}`, { Name: name }).then((r) => r.data),

    // Delete folder
    delete: (folderId: string): Promise<void> =>
        axiosAuth.delete(`/folder/${folderId}`).then(() => undefined),

    // Share folder with user
    share: (folderId: string, data: ShareFolderDto): Promise<void> =>
        axiosAuth.post(`/folder/${folderId}/share`, data).then(() => undefined),

    // Invite user by email
    inviteByEmail: (folderId: string, data: InviteUserByEmailDto): Promise<{ success: boolean; message: string }> =>
        axiosAuth.post(`/folder/${folderId}/invite-by-email`, data).then((r) => r.data),

    // Get shared folders
    getShared: (): Promise<Folder[]> =>
        axiosAuth.get('/folder/shared').then((r) => r.data),

    // Assign folder access
    assignAccess: (folderId: string, userId: string, access: string): Promise<void> =>
        axiosAuth.patch(`/folder/assign-access/${folderId}`, { userId, access }).then(() => undefined),

    // Get user access level
    getAccessLevel: (folderId: string): Promise<string> =>
        axiosAuth.get(`/folder/access-level/${folderId}`).then((r) => r.data),

    // Ignore access
    ignoreAccess: (folderId: string, userId: string): Promise<void> =>
        axiosAuth.delete(`/folder/${folderId}/ignore-access/${userId}`).then(() => undefined),

    // Toggle folder access
    toggleAccess: (folderId: string, newAccess?: string): Promise<void> =>
        axiosAuth.patch(`/folder/toggle-access/${folderId}`, newAccess ? { access: newAccess } : {}).then(() => undefined),

    // Get chart data
    getChartData: (): Promise<any> =>
        axiosAuth.get('/folder/folder-creation-data').then((r) => r.data),

    // Get shared folder count
    getSharedCount: (): Promise<number> =>
        axiosAuth.get('/folder/shared/count').then((r) => r.data),

    // Get shared users
    getSharedUsers: (): Promise<any[]> =>
        axiosAuth.get('/folder/shared-users').then((r) => r.data),
};

