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

axiosAuth.interceptors.request.use((config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface Notification {
    _id: string;
    recipient: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    title: string;
    message: string;
    type: string;
    read: boolean;
    readAt?: string;
    eventId?: any;
    meetingId?: any;
    documentId?: any;
    folderId?: any;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

export const notificationsApi = {
    // Get all notifications
    getAll: (): Promise<Notification[]> =>
        axiosAuth.get('/notifications').then((r) => r.data),

    // Get unread notifications
    getUnread: (): Promise<Notification[]> =>
        axiosAuth.get('/notifications', { params: { read: 'false' } }).then((r) => r.data),

    // Get unread count
    getUnreadCount: (): Promise<number> =>
        axiosAuth.get('/notifications/unread/count').then((r) => r.data),

    // Mark notification as read
    markAsRead: (notificationId: string): Promise<void> =>
        axiosAuth.put(`/notifications/${notificationId}/read`).then(() => undefined),

    // Mark all as read
    markAllAsRead: (): Promise<void> =>
        axiosAuth.put('/notifications/mark-all-read').then(() => undefined),

    // Delete notification
    delete: (notificationId: string): Promise<void> =>
        axiosAuth.delete(`/notifications/${notificationId}`).then(() => undefined),
};

