import { api } from '../lib/api';

export interface Message {
    _id: string;
    conversationId: string;
    senderId: string | {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        picture?: string;
    };
    content: string;
    read: boolean;
    readAt?: Date;
    type?: string;
    metadata?: any;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Conversation {
    _id: string;
    type: 'direct' | 'group';
    participants: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        picture?: string;
    }>;
    name?: string;
    lastMessage?: Message;
    lastActivity: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface CreateMessageDto {
    conversationId: string;
    content: string;
    type?: string;
    metadata?: any;
}

export interface CreateConversationDto {
    participantIds: string[];
    type?: 'direct' | 'group';
    name?: string;
}

export const chatApi = {
    // Get all conversations for the current user
    getConversations: async (): Promise<Conversation[]> => {
        const response = await api.get('/chat/conversations');
        return response.data;
    },

    // Get a specific conversation
    getConversation: async (conversationId: string): Promise<Conversation> => {
        const response = await api.get(`/chat/conversations/${conversationId}`);
        return response.data;
    },

    // Get messages for a conversation
    getMessages: async (conversationId: string, limit: number = 50, skip: number = 0): Promise<Message[]> => {
        const response = await api.get(`/chat/conversations/${conversationId}/messages`, {
            params: { limit, skip },
        });
        return response.data;
    },

    // Create a new conversation
    createConversation: async (data: CreateConversationDto): Promise<Conversation> => {
        const response = await api.post('/chat/conversations', data);
        return response.data;
    },

    // Send a message (REST fallback)
    sendMessage: async (data: CreateMessageDto): Promise<Message> => {
        const response = await api.post('/chat/messages', data);
        return response.data;
    },

    // Get unread counts for all conversations
    getUnreadCount: async (): Promise<Record<string, number>> => {
        const response = await api.get('/chat/unread');
        return response.data;
    },

    // Mark conversation as read
    markAsRead: async (conversationId: string): Promise<void> => {
        await api.post(`/chat/conversations/${conversationId}/read`);
    },

    // Get users with whom the current user shares at least one folder
    getSharedUsers: async (): Promise<Array<{ _id: string, firstName: string, lastName: string, email: string, picture?: string }>> => {
        const response = await api.get('/folder/shared-users');
        return response.data;
    },
};

