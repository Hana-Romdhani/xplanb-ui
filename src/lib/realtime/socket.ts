/**
 * Socket Client Wrapper
 * 
 * Wrapper around socket.io-client for real-time co-editing
 * Handles JWT authentication, automatic reconnection, and events
 */

import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';

export interface ConnectedUser {
    id: string;
    name: string;
    color: string;
    socketId?: string;
    avatar?: string;
    cursor?: {
        x: number;
        y: number;
        blockId?: string;
    };
    lastSeen?: Date;
}

export interface SocketEvents {
    // Emitted events
    join_document: (data: { documentId: string }) => void;
    leave_document: (data: { documentId: string }) => void;
    content_update: (data: {
        documentId: string;
        content: any;
        blockId?: string;
        operation?: 'insert' | 'update' | 'delete';
    }) => void;
    cursor_update: (data: {
        documentId: string;
        cursor: {
            x: number;
            y: number;
            blockId?: string;
            selection?: {
                start: number;
                end: number;
            };
        };
        user: string;
    }) => void;
    save_snapshot: (data: {
        documentId: string;
        content: any;
        description?: string;
    }) => void;
    get_presence: (data: { documentId: string }) => void;

    // Received events
    document_joined: (data: {
        documentId: string;
        content: any;
        users: ConnectedUser[];
    }) => void;
    user_joined: (data: {
        userId: string;
        documentId: string;
        users: ConnectedUser[];
    }) => void;
    user_left: (data: {
        userId: string;
        documentId: string;
    }) => void;
    content_updated: (data: {
        documentId: string;
        content: any;
        blockId?: string;
        operation?: string;
        userId: string;
    }) => void;
    cursor_updated: (data: {
        documentId: string;
        userId: string;
        cursor: {
            x: number;
            y: number;
            blockId?: string;
        };
    }) => void;
    presence_update: (data: {
        documentId: string;
        users: ConnectedUser[];
    }) => void;
    snapshot_saved: (data: {
        documentId: string;
        timestamp: Date;
    }) => void;
    error: (data: { message: string }) => void;
}

class SocketManager {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    /**
     * Connect to a document
     */
    connectToDocument(_documentId: string, token: string): Promise<Socket> {
        return new Promise((resolve, reject) => {
            try {
                // Close existing connection if it exists
                if (this.socket) {
                    console.log('🔌 SocketManager: Disconnecting existing socket');
                    this.socket.disconnect();
                    this.socket = null;
                }

                // Create new connection
                console.log('🔌 SocketManager: Creating new socket connection');
                const wsUrl = API_URL.replace('/api', '').replace('http', 'ws');
                this.socket = io(`${wsUrl}/ws/docs`, {
                    auth: {
                        token,
                    },
                    query: {
                        token,
                    },
                    transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
                    timeout: 30000, // Increased timeout
                    forceNew: true, // Force new connection
                    reconnection: true,
                    reconnectionDelay: 2000,
                    reconnectionAttempts: 5,
                });

                // Handle connection events
                this.socket.on('connect', () => {
                    console.log('✅ SocketManager: Socket connected');
                    this.reconnectAttempts = 0;
                    resolve(this.socket!);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ SocketManager: Socket connection error:', error);
                    reject(error);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('⚠️ SocketManager: Socket disconnected:', reason);
                    if (reason === 'io server disconnect') {
                        // Server closed the connection, don't try to reconnect
                        return;
                    }
                    this.handleReconnect();
                });

                // Handle errors
                this.socket.on('error', (error) => {
                    console.error('❌ SocketManager: Socket error:', error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle automatic reconnection
     */
    private handleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                if (this.socket) {
                    this.socket.connect();
                }
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    /**
     * Join a document
     */
    joinDocument(documentId: string): void {
        if (this.socket) {
            this.socket.emit('join_document', { documentId });
        }
    }

    /**
     * Leave a document
     */
    leaveDocument(documentId: string): void {
        if (this.socket) {
            this.socket.emit('leave_document', { documentId });
        }
    }

    /**
     * Update content
     */
    updateContent(
        documentId: string,
        content: any,
        blockId?: string,
        operation?: 'insert' | 'update' | 'delete',
    ): void {
        if (this.socket) {
            this.socket.emit('content_update', {
                documentId,
                content,
                blockId,
                operation,
            });
        }
    }

    /**
     * Update cursor position
     */
    updateCursor(
        documentId: string,
        cursor: {
            x: number;
            y: number;
            blockId?: string;
            selection?: {
                start: number;
                end: number;
            };
        },
        userId: string,
    ): void {
        if (this.socket && this.socket.connected) {
            console.log('✅ SocketManager: Sending cursor update for user:', userId, 'to document:', documentId);
            this.socket.emit('cursor_update', {
                documentId,
                cursor,
                user: userId,
            });
        } else {
            console.log('⚠️ SocketManager: No socket connection or not connected, cannot send cursor update');
        }
    }

    /**
     * Save a snapshot
     */
    saveSnapshot(documentId: string, content?: any, description?: string): void {
        if (this.socket) {
            this.socket.emit('save_snapshot', {
                documentId,
                content: content || {},
                description,
            });
        }
    }

    /**
     * Request user presence
     */
    getPresence(documentId: string): void {
        if (this.socket) {
            this.socket.emit('get_presence', { documentId });
        }
    }

    /**
     * Listen to an event
     */
    on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
        if (this.socket) {
            this.socket.on(event as string, callback);
        }
    }

    /**
     * Stop listening to an event
     */
    off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
        if (this.socket) {
            this.socket.off(event as string, callback);
        }
    }

    /**
     * Disconnect the socket
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Check if socket is connected
     */
    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * Get socket instance
     */
    getSocket(): Socket | null {
        return this.socket;
    }
}

// Singleton instance
export const socketManager = new SocketManager();

// React hook to use the socket
export const useSocket = () => {
    return socketManager;
};

