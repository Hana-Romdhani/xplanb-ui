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

export interface CreateMeetingDto {
    title: string;
    docId?: string;
    folderId?: string;
    participants: string[];
    startTime: Date;
    description?: string;
}

export interface UpdateMeetingDto {
    title?: string;
    endTime?: Date;
    transcript?: string;
    recordingUrl?: string;
    status?: "scheduled" | "in-progress" | "completed" | "cancelled";
    duration?: number;
}

export interface Meeting {
    _id: string;
    title: string;
    docId?: string;
    folderId?: string;
    participants: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    }>;
    startTime: string;
    endTime?: string;
    transcript?: string;
    recordingUrl?: string;
    createdBy: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    meetingRoomId?: string;
    status: "scheduled" | "in-progress" | "completed" | "cancelled";
    description?: string;
    duration?: number;
    createdAt: string;
    updatedAt: string;
}

export const meetingsApi = {
    startMeeting: (data: CreateMeetingDto): Promise<Meeting> =>
        axiosAuth.post("/meetings/start", data).then((r) => r.data),
    joinMeeting: (meetingRoomId: string): Promise<Meeting> =>
        axiosAuth.post("/meetings/join", { meetingRoomId }).then((r) => r.data),
    endMeeting: (meetingId: string, data: UpdateMeetingDto): Promise<Meeting> =>
        axiosAuth.post(`/meetings/end/${meetingId}`, data).then((r) => r.data),
    getMeetingByRoom: (meetingRoomId: string): Promise<Meeting> =>
        axiosAuth.get(`/meetings/room/${meetingRoomId}`).then((r) => r.data),
    getMeetingsByDocument: (docId: string): Promise<Meeting[]> =>
        axiosAuth.get(`/meetings/byDoc/${docId}`).then((r) => r.data),
    getMeetingsByFolder: (folderId: string): Promise<Meeting[]> =>
        axiosAuth.get(`/meetings/byFolder/${folderId}`).then((r) => r.data),
    updateMeetingTranscript: (meetingId: string, transcript: string): Promise<Meeting> =>
        axiosAuth.patch(`/meetings/${meetingId}/transcript`, { transcript }).then((r) => r.data),
    getMeetingById: (meetingId: string): Promise<Meeting> =>
        axiosAuth.get(`/meetings/${meetingId}`).then((r) => r.data),
    getUserMeetings: (userId: string, limit?: number): Promise<Meeting[]> =>
        axiosAuth.get(`/meetings/user/${userId}${limit ? `?limit=${limit}` : ""}`).then((r) => r.data),
    getUpcomingMeetings: (userId: string): Promise<Meeting[]> =>
        axiosAuth.get(`/meetings/upcoming/${userId}`).then((r) => r.data),
};


