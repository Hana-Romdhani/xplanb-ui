import { io, Socket } from 'socket.io-client';
import { API_URL, ACCESS_TOKEN_KEY } from '../lib/config';

export interface MeetingParticipant {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    picture?: string;
    isConnected: boolean;
}

export interface MeetingMessage {
    id: string;
    meetingRoomId: string;
    userId: string;
    content: string;
    createdAt: string;
    user: {
        _id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        avatar?: string;
        picture?: string;
    };
}

export interface MeetingStatePayload {
    meeting: {
        _id: string;
        title: string;
        meetingRoomId: string;
        startTime?: string;
        status?: string;
        createdBy?: any;
        description?: string;
    };
    participants: MeetingParticipant[];
    messages: MeetingMessage[];
}

export interface MeetingEventCallbacks {
    onConnected?: () => void;
    onDisconnected?: (reason: string) => void;
    onError?: (error: { message: string }) => void;
    onMeetingState?: (payload: MeetingStatePayload) => void;
    onParticipantJoined?: (data: { participant: MeetingParticipant }) => void;
    onParticipantLeft?: (data: { participantId: string }) => void;
    onMeetingMessage?: (message: MeetingMessage) => void;
}

class MeetingService {
    private socket: Socket | null = null;
    private isConnected = false;
    private currentRoomId: string | null = null;
    private callbacks: MeetingEventCallbacks = {};

    private getToken(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    connect() {
        const token = this.getToken();
        if (!token) {
            console.error('❌ MeetingService: No authentication token found');
            return;
        }

        if (this.socket && this.isConnected) {
            return;
        }

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        const backendUrl = API_URL.replace('/api', '');
        const wsUrl = backendUrl.replace('http', 'ws');
        const socketUrl = `${wsUrl}/ws/meetings`;

        this.socket = io(socketUrl, {
            auth: { token },
            query: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 5,
            timeout: 30000,
            forceNew: true,
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.callbacks.onConnected?.();

            if (this.currentRoomId) {
                this.joinMeeting(this.currentRoomId);
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            this.callbacks.onDisconnected?.(reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ MeetingService: Connection error:', error);
            this.callbacks.onError?.(error);
        });

        this.socket.on('error', (error) => {
            console.error('❌ MeetingService error event:', error);
            this.callbacks.onError?.(error);
        });

        this.socket.on('meeting_state', (payload: MeetingStatePayload) => {
            this.callbacks.onMeetingState?.(payload);
        });

        this.socket.on('participant_joined', (data: { participant: MeetingParticipant }) => {
            this.callbacks.onParticipantJoined?.(data);
        });

        this.socket.on('participant_left', (data: { participantId: string }) => {
            this.callbacks.onParticipantLeft?.(data);
        });

        this.socket.on('meeting_message', (message: MeetingMessage) => {
            this.callbacks.onMeetingMessage?.(message);
        });
    }

    disconnect() {
        if (this.socket) {
            if (this.currentRoomId) {
                this.leaveMeeting(this.currentRoomId);
            }
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.currentRoomId = null;
        }
    }

    joinMeeting(meetingRoomId: string) {
        if (!meetingRoomId) return;

        if (!this.socket || !this.isConnected) {
            this.connect();
        }

        this.currentRoomId = meetingRoomId;

        if (!this.socket || !this.isConnected) {
            return;
        }

        this.socket.emit('join_meeting', { meetingRoomId });
    }

    leaveMeeting(meetingRoomId: string) {
        if (!this.socket || !this.isConnected) {
            return;
        }

        if (this.currentRoomId === meetingRoomId) {
            this.currentRoomId = null;
        }

        this.socket.emit('leave_meeting', { meetingRoomId });
    }

    sendMessage(meetingRoomId: string, content: string) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ MeetingService: Not connected, cannot send message');
            return;
        }

        this.socket.emit('send_message', { meetingRoomId, content });
    }

    on(callbacks: MeetingEventCallbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    off() {
        this.callbacks = {};
    }

    get connected(): boolean {
        return this.isConnected;
    }
}

export const meetingService = new MeetingService();

