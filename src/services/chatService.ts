import { io, Socket } from 'socket.io-client';
import { API_URL, ACCESS_TOKEN_KEY } from '../lib/config';
import { chatApi, Message, Conversation } from '../api/chat';

export interface ChatEventCallbacks {
    onMessage?: (message: Message) => void;
    onMessagesRead?: (data: { conversationId: string; userId: string }) => void;
    onUserOnline?: (data: { userId: string }) => void;
    onUserOffline?: (data: { userId: string }) => void;
    onOnlineUsers?: (data: { userIds: string[] }) => void;
    onError?: (error: { message: string }) => void;
    onConversationJoined?: (data: { conversationId: string }) => void;
}

class ChatService {
    private socket: Socket | null = null;
    private isConnected: boolean = false;
    private callbacks: ChatEventCallbacks = {};
    private currentConversationId: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    /**
     * Get authentication token
     */
    private getToken(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        const token = this.getToken();
        if (!token) {
            console.error('❌ ChatService: No authentication token found');
            return;
        }

        if (this.socket && this.isConnected) {
            console.log('✅ ChatService: Already connected');
            return;
        }

        // Disconnect existing socket if any
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        const backendUrl = API_URL.replace('/api', '');
        const wsUrl = backendUrl.replace('http', 'ws');
        const socketUrl = `${wsUrl}/ws/chat`;

        console.log('🔌 ChatService: Connecting to WebSocket:', socketUrl);

        this.socket = io(socketUrl, {
            auth: { token },
            query: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: this.maxReconnectAttempts,
            timeout: 30000,
            forceNew: true,
        });

        this.setupEventHandlers();
    }

    /**
     * Setup socket event handlers
     */
    private setupEventHandlers() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('✅ ChatService: Connected to chat server');

            // Rejoin conversation if there was one
            if (this.currentConversationId) {
                this.joinConversation(this.currentConversationId);
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            console.log('⚠️ ChatService: Disconnected from server:', reason);

            // Attempt reconnection if not intentional
            if (reason !== 'io client disconnect') {
                this.reconnectAttempts++;
                if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                    console.log(`🔄 ChatService: Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                }
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ ChatService: Connection error:', error);
            this.callbacks.onError?.(error);
        });

        this.socket.on('conversation_joined', (data) => {
            console.log('✅ ChatService: Joined conversation:', data.conversationId);
            this.callbacks.onConversationJoined?.(data);
        });

        this.socket.on('new_message', (message: Message) => {
            console.log('📨 ChatService: New message received:', message);
            this.callbacks.onMessage?.(message);
        });

        this.socket.on('messages_read', (data) => {
            this.callbacks.onMessagesRead?.(data);
        });

        this.socket.on('user_online', (data) => {
            this.callbacks.onUserOnline?.(data);
        });

        this.socket.on('user_offline', (data) => {
            this.callbacks.onUserOffline?.(data);
        });

        this.socket.on('online_users', (data) => {
            this.callbacks.onOnlineUsers?.(data);
        });

        this.socket.on('error', (error) => {
            console.error('❌ ChatService: Error:', error);
            this.callbacks.onError?.(error);
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.socket) {
            if (this.currentConversationId) {
                this.leaveConversation(this.currentConversationId);
            }
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.currentConversationId = null;
            console.log('🔌 ChatService: Disconnected');
        }
    }

    /**
     * Join a conversation room
     */
    joinConversation(conversationId: string) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ ChatService: Not connected, cannot join conversation');
            return;
        }

        this.currentConversationId = conversationId;
        this.socket.emit('join_conversation', { conversationId });
        console.log(`📥 ChatService: Joining conversation ${conversationId}`);
    }

    /**
     * Leave a conversation room
     */
    leaveConversation(conversationId: string) {
        if (!this.socket || !this.isConnected) {
            return;
        }

        if (this.currentConversationId === conversationId) {
            this.currentConversationId = null;
        }

        this.socket.emit('leave_conversation', { conversationId });
        console.log(`📤 ChatService: Left conversation ${conversationId}`);
    }

    /**
     * Send a message
     */
    sendMessage(conversationId: string, content: string, type: string = 'text', metadata?: any) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ ChatService: Not connected, sending via REST API');
            // Fallback to REST API
            return chatApi.sendMessage({ conversationId, content, type, metadata });
        }

        this.socket.emit('send_message', { conversationId, content, type, metadata });
        console.log(`📤 ChatService: Sending message to conversation ${conversationId}`);
    }

    /**
     * Mark messages as read
     */
    markAsRead(conversationId: string) {
        if (!this.socket || !this.isConnected) {
            // Fallback to REST API
            return chatApi.markAsRead(conversationId);
        }

        this.socket.emit('mark_read', { conversationId });
    }

    /**
     * Get online users for a conversation
     */
    getOnlineUsers(conversationId: string) {
        if (!this.socket || !this.isConnected) {
            return;
        }

        this.socket.emit('get_online_users', { conversationId });
    }

    /**
     * Set event callbacks
     */
    on(callbacks: ChatEventCallbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Remove event callbacks
     */
    off() {
        this.callbacks = {};
    }

    /**
     * Check if connected
     */
    get connected(): boolean {
        return this.isConnected;
    }
}

// Export singleton instance
export const chatService = new ChatService();

