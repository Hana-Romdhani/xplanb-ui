/**
 * Realtime Store (Zustand)
 * 
 * Store for managing real-time co-editing state
 * Manages connected users, cursors, and save state
 */

import { create } from 'zustand';

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

interface CursorData {
    x: number;
    y: number;
    blockId?: string;
    user: ConnectedUser;
    timestamp?: number;
    selection?: {
        start: number;
        end: number;
        text: string;
        startOffset: number;
        endOffset: number;
    };
}

interface RealtimeState {
    // Connection state
    isConnected: boolean;
    currentDocumentId: string | null;

    // Connected users
    connectedUsers: ConnectedUser[];

    // Cursors from other users
    cursors: Map<string, CursorData>;

    // Save state
    isSaving: boolean;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;

    // Actions
    setConnected: (connected: boolean) => void;
    setCurrentDocument: (documentId: string | null) => void;
    setConnectedUsers: (users: ConnectedUser[]) => void;
    addUser: (user: ConnectedUser) => void;
    removeUser: (userId: string) => void;
    updateUserCursor: (userId: string, cursor: {
        x: number;
        y: number;
        blockId?: string;
        timestamp?: number;
        selection?: {
            start: number;
            end: number;
            text: string;
            startOffset: number;
            endOffset: number;
        };
    }) => void;
    setSaving: (saving: boolean) => void;
    setLastSaved: (date: Date) => void;
    setHasUnsavedChanges: (hasChanges: boolean) => void;
    clearCursors: () => void;
    clearOldCursors: () => void;
    reset: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
    // Initial state
    isConnected: false,
    currentDocumentId: null,
    connectedUsers: [],
    cursors: new Map(),
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,

    // Actions
    setConnected: (connected) => set({ isConnected: connected }),

    setCurrentDocument: (documentId) => set({
        currentDocumentId: documentId,
        connectedUsers: [],
        cursors: new Map(),
    }),

    setConnectedUsers: (users) => set({
        connectedUsers: Array.isArray(users) ? users : []
    }),

    addUser: (user) => set((state) => {
        const users = Array.isArray(state.connectedUsers) ? state.connectedUsers : [];
        return {
            connectedUsers: [...users.filter(u => u.id !== user.id), user]
        };
    }),

    removeUser: (userId) => set((state) => {
        const newCursors = new Map(state.cursors);
        newCursors.delete(userId);

        const users = Array.isArray(state.connectedUsers) ? state.connectedUsers : [];
        return {
            connectedUsers: users.filter(u => u.id !== userId),
            cursors: newCursors,
        };
    }),

    updateUserCursor: (userId, cursor) => set((state) => {
        const users = Array.isArray(state.connectedUsers) ? state.connectedUsers : [];
        const user = users.find(u => u.id === userId);
        if (!user) {
            console.log('updateUserCursor: User not found:', userId);
            return state;
        }

        console.log('updateUserCursor: Updating cursor for user:', userId, cursor);
        const newCursors = new Map(state.cursors);
        newCursors.set(userId, { ...cursor, user, timestamp: cursor.timestamp || Date.now() });

        return { cursors: newCursors };
    }),

    // Clear old cursors that haven't been updated recently
    clearOldCursors: () => set((state) => {
        const now = Date.now();
        const newCursors = new Map();

        state.cursors.forEach((cursor, userId) => {
            // Keep cursors that are less than 5 seconds old
            if (cursor.timestamp && (now - cursor.timestamp) < 5000) {
                newCursors.set(userId, cursor);
            }
        });

        if (newCursors.size !== state.cursors.size) {
            console.log('Cleared old cursors, remaining:', newCursors.size);
            return { cursors: newCursors };
        }

        return state;
    }),

    setSaving: (saving) => set({ isSaving: saving }),

    setLastSaved: (date) => set({
        lastSaved: date,
        hasUnsavedChanges: false,
    }),

    setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

    clearCursors: () => set({ cursors: new Map() }),

    reset: () => set({
        isConnected: false,
        currentDocumentId: null,
        connectedUsers: [],
        cursors: new Map(),
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
    }),
}));

