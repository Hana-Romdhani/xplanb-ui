/**
 * Yjs Client for Real-Time Collaboration
 * 
 * Connects to the backend Socket.IO server and synchronizes Yjs documents
 * Handles real-time updates, offline persistence, and automatic reconnection
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';

interface YjsClientOptions {
    documentId: string;
    token: string;
    userId?: string;
    onSync?: () => void;
    onUpdate?: () => void;
    onError?: (error: Error) => void;
    onCursorUpdate?: (userId: string, cursor: {
        x: number;
        y: number;
        blockId?: string;
        selection?: {
            start: number;
            end: number;
            text: string;
            startOffset: number;
            endOffset: number;
        };
    }) => void;
    onFormattingUpdate?: (userId: string, formatting: {
        type: 'bold' | 'italic' | 'underline' | 'color' | 'fontSize' | 'alignment';
        value: any;
        timestamp: number;
    }) => void;
    onPresenceUpdate?: (users: any[]) => void;
    onUserLeft?: (userId: string) => void;
}

export class YjsClient {
    private ydoc: Y.Doc;
    private socket: Socket | null = null;
    private persistence: IndexeddbPersistence | null = null;
    private documentId: string;
    private userId: string;
    public isConnected = false;
    public isSynced = false;
    private updateHandler: ((update: Uint8Array, origin: any) => void) | null = null;

    constructor(options: YjsClientOptions) {
        this.documentId = options.documentId;
        this.userId = options.userId || 'anonymous';
        this.ydoc = new Y.Doc();

        // Set up IndexedDB persistence for offline support
        this.persistence = new IndexeddbPersistence(options.documentId, this.ydoc);

        this.persistence.on('synced', () => {
            console.log('✅ YjsClient: IndexedDB persistence synced');
        });

        // Connect to Socket.IO server
        this.connectToServer(options.token, options);
    }

    private connectToServer(token: string, options: YjsClientOptions): void {
        const backendUrl = API_URL.replace('/api', '');

        // Disconnect existing socket if any
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        const wsUrl = backendUrl.replace('http', 'ws');
        console.log('🔌 Connecting to WebSocket:', `${wsUrl}/ws/docs`);
        this.socket = io(`${wsUrl}/ws/docs`, {
            auth: { token },
            query: { token },
            transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 5,
            timeout: 30000, // Increased timeout
            forceNew: true, // Force new connection to avoid conflicts
        });

        // Handle connection
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('✅ YjsClient: Connected to server');

            // Join the document room
            this.socket?.emit('join_document', { documentId: this.documentId });
        });

        // Handle disconnection
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            this.isSynced = false;
            console.log('⚠️ YjsClient: Disconnected from server:', reason);
        });

        // Handle connection error
        this.socket.on('connect_error', (error) => {
            console.error('❌ YjsClient: Connection error:', error);
            options.onError?.(error);
        });

        this.socket.on('document_joined', () => {
            console.log('✅ YjsClient: Joined document successfully');
        });

        // Handle initial Yjs sync
        this.socket.on('yjs_sync', (stateVector: number[]) => {
            try {
                const update = new Uint8Array(stateVector);
                // Only apply if there's actual content
                if (update.length > 0) {
                    Y.applyUpdate(this.ydoc, update, 'server');
                    console.log('✅ YjsClient: Applied initial state from server');
                }
                this.isSynced = true;
                options.onSync?.();
            } catch (error) {
                console.error('❌ YjsClient: Error applying initial Yjs state:', error);
            }
        });

        // Handle Yjs updates from other users
        this.socket.on('yjs_update', (data: { documentId: string; update: number[]; timestamp?: number }) => {
            if (data.documentId === this.documentId) {
                try {
                    const update = new Uint8Array(data.update);

                    // Only apply updates after initial sync
                    if (this.isSynced) {
                        // Get current content to check if it's empty
                        const ytext = this.ydoc.getText('editor');
                        const currentContent = ytext.toString();

                        Y.applyUpdate(this.ydoc, update, 'remote');
                        options.onUpdate?.();

                        const newContent = ytext.toString();
                        console.log(`✅ YjsClient: Applied remote update (${data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'no timestamp'})`);

                        // Log if content changed significantly
                        if (currentContent !== newContent) {
                            console.log(`📝 Content changed: ${currentContent.length} -> ${newContent.length} chars`);
                        }
                    } else {
                        console.log('⚠️ YjsClient: Ignoring update - not synced yet');
                    }
                } catch (error) {
                    console.error('❌ YjsClient: Error applying remote Yjs update:', error);
                    // Don't disconnect, just log the error
                }
            }
        });

        // Handle cursor updates from other users
        this.socket.on('cursor_updated', (data: {
            userId: string;
            cursor: {
                x: number;
                y: number;
                blockId?: string;
                selection?: {
                    start: number;
                    end: number;
                    text: string;
                    startOffset: number;
                    endOffset: number;
                };
            };
        }) => {
            if (data.userId !== this.userId) {
                console.log('✅ YjsClient: Received cursor update from user:', data.userId);
                options.onCursorUpdate?.(data.userId, data.cursor);
            }
        });

        // Handle formatting updates
        this.socket.on('formatting_updated', (data: {
            userId: string;
            formatting: {
                type: 'bold' | 'italic' | 'underline' | 'color' | 'fontSize' | 'alignment';
                value: any;
                timestamp: number;
            };
        }) => {
            if (data.userId !== this.userId) {
                console.log('✅ YjsClient: Received formatting update from user:', data.userId);
                options.onFormattingUpdate?.(data.userId, data.formatting);
            }
        });

        // Handle presence updates
        this.socket.on('presence_update', (data: { users: any[] }) => {
            console.log('✅ YjsClient: Presence update:', data.users);
            options.onPresenceUpdate?.(data.users);
        });

        // Handle user leaving
        this.socket.on('user_left', (data: { userId: string }) => {
            console.log('⚠️ YjsClient: User left:', data.userId);
            options.onUserLeft?.(data.userId);
        });

        // Handle direct content updates (for Editor.js)
        this.socket.on('content_updated', (data: {
            documentId: string;
            content: any;
            userId: string;
        }) => {
            if (data.documentId === this.documentId && data.userId !== this.userId) {
                console.log('✅ YjsClient: Received content update from remote user');
                // Store content in Y.Map for access
                const contentMap = this.ydoc.getMap('content');
                contentMap.set('data', JSON.stringify(data.content));
                contentMap.set('timestamp', Date.now());

                // Trigger onUpdate with the content
                options.onUpdate?.(data.content);
            }
        });

        // Listen for local changes and send to server
        this.updateHandler = (update: Uint8Array, origin: any) => {
            // Only send updates that originated locally (not from server)
            if (origin !== 'server' && origin !== 'remote' && origin !== this.socket && this.isConnected && this.isSynced) {
                console.log('📤 YjsClient: Sending local update to server');
                this.socket?.emit('yjs_update', {
                    documentId: this.documentId,
                    update: Array.from(update),
                    timestamp: Date.now(),
                });
            }
        };

        this.ydoc.on('update', this.updateHandler);

        // Also listen for Y.Map changes (for document content)
        const contentMap = this.ydoc.getMap('content');
        contentMap.observe((event) => {
            console.log('📝 Y.Map content changed');

            // If this is a remote change (not from our own local update), trigger callback
            // This will apply changes from other users
            if (event.transaction.origin !== 'local') {
                console.log('🔄 Remote content changed, notifying editor');
                options.onUpdate?.();
            }
        });

        // Also listen for Y.Text changes
        const ytext = this.ydoc.getText('editor');
        ytext.observe((event) => {
            console.log('📝 Y.Text changed:', event.changes);
            // Trigger callbacks when text changes (from remote)
            if (event.transaction.origin !== 'local') {
                options.onUpdate?.();
            }
        });
    }

    /**
     * Get the Yjs document
     */
    getDocument(): Y.Doc {
        return this.ydoc;
    }

    /**
     * Get text content
     */
    getText(key: string = 'editor'): Y.Text {
        return this.ydoc.getText(key);
    }

    /**
     * Update cursor position
     */
    updateCursor(cursor: {
        x: number;
        y: number;
        blockId?: string;
        selection?: {
            start: number;
            end: number;
            text: string;
            startOffset: number;
            endOffset: number;
        };
    }): void {
        if (this.socket && this.isConnected) {
            this.socket.emit('cursor_update', {
                documentId: this.documentId,
                userId: this.userId,
                cursor,
            });
        }
    }

    /**
     * Update formatting
     */
    updateFormatting(formatting: {
        type: 'bold' | 'italic' | 'underline' | 'color' | 'fontSize' | 'alignment';
        value: any;
    }): void {
        if (this.socket && this.isConnected) {
            this.socket.emit('formatting_update', {
                documentId: this.documentId,
                userId: this.userId,
                formatting: {
                    ...formatting,
                    timestamp: Date.now(),
                },
            });
        }
    }

    /**
     * Request presence information
     */
    getPresence(): void {
        if (this.socket && this.isConnected) {
            this.socket.emit('get_presence', {
                documentId: this.documentId,
            });
        }
    }

    /**
     * Disconnect and cleanup
     */
    disconnect(): void {
        console.log('🔌 YjsClient: Disconnecting...');

        if (this.updateHandler) {
            this.ydoc.off('update', this.updateHandler);
            this.updateHandler = null;
        }

        if (this.socket) {
            this.socket.emit('leave_document', { documentId: this.documentId });
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.persistence) {
            this.persistence.destroy();
            this.persistence = null;
        }

        this.isConnected = false;
        this.isSynced = false;
    }

    /**
     * Check if connected and synced
     */
    isReady(): boolean {
        return this.isConnected && this.isSynced;
    }

    /**
     * Get socket instance for direct emits
     */
    getSocket(): Socket | null {
        return this.socket;
    }
}

