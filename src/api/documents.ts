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

console.log('🔧 API Base URL:', baseURL);

axiosAuth.interceptors.request.use((config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface Document {
    _id: string;
    Title: string;
    folderId?: string;
    createdBy: string;
    lastEditedBy: string;
    createdDate: string;
    updatedDate: string;
    archived?: boolean;
    version?: number;
    contentType?: string[];
    sharedWith?: Array<string>;
    defaultAccess?: string;
    favoritedBy?: Array<string>;
}

export interface DocumentContent {
    _id: string;
    documentId: string;
    content: string;
    creationDate: string;
}

export interface CreateDocumentDto {
    Title: string;
    folderId: string; // Required: All documents must belong to a folder
    contentType?: string[];
}

export interface UpdateDocumentDto {
    Title?: string;
    contentType?: string[];
    folderId?: string;
}

export interface CreateContentDto {
    documentId: string;
    content: string;
}

export const documentsApi = {
    // Get all documents
    getAll: (): Promise<Document[]> =>
        axiosAuth.get('/Document').then((r) => r.data),

    // Get documents by folder ID
    getByFolderId: (folderId: string): Promise<Document[]> =>
        axiosAuth.get(`/Document/documents/${folderId}`).then((r) => r.data),

    // Get document by ID
    getById: (id: string): Promise<Document> => {
        console.log('🔍 Fetching document:', id);
        return axiosAuth.get(`/Document/${id}`)
            .then((r) => {
                console.log('✅ Document response:', r.data);
                return r.data;
            })
            .catch((err) => {
                console.error('❌ Document fetch error:', err);
                throw err;
            });
    },

    // Create document
    create: (data: CreateDocumentDto): Promise<Document> =>
        axiosAuth.post('/Document', data).then((r) => r.data),

    // Create document with folder ID
    createWithFolder: (folderId: string, data: CreateDocumentDto): Promise<Document> =>
        axiosAuth.post(`/Document/${folderId}`, data).then((r) => r.data),

    // Update document
    update: (id: string, data: UpdateDocumentDto): Promise<Document> =>
        axiosAuth.put(`/Document/${id}`, data).then((r) => r.data),

    // Delete document
    delete: (id: string): Promise<void> =>
        axiosAuth.delete(`/Document/${id}`).then(() => undefined),

    // Archive document
    archive: (id: string): Promise<Document> =>
        axiosAuth.put(`/Document/archive/${id}`, {}).then((r) => r.data),

    // Unarchive document
    unarchive: (id: string): Promise<Document> =>
        axiosAuth.post(`/Document/dearchive/${id}`, {}).then((r) => r.data),

    // Duplicate document
    duplicate: (id: string): Promise<Document> =>
        axiosAuth.post(`/Document/${id}/duplicate`, {}).then((r) => r.data),

    // Share document with user (only 'view' or 'edit' for documents)
    share: (documentId: string, userId: string, access: 'view' | 'edit' = 'view'): Promise<void> =>
        axiosAuth.post(`/Document/${documentId}/share`, { userId, access }).then(() => undefined),

    // Share document by email (only 'view' or 'edit' for documents)
    shareByEmail: (documentId: string, email: string, access: 'view' | 'edit' = 'view'): Promise<{ success: boolean; message: string }> =>
        axiosAuth.post(`/Document/${documentId}/share-email`, { email, access }).then((r) => r.data),

    // Get user's access level for a document
    getAccessLevel: (documentId: string): Promise<string> =>
        axiosAuth.get(`/Document/${documentId}/access`).then((r) => r.data),

    // Get shared users for a document
    getSharedUsers: (documentId: string): Promise<any[]> =>
        axiosAuth.get(`/Document/${documentId}/shared-users`).then((r) => r.data),

    // Remove user from document sharing
    unshare: (documentId: string, userId: string): Promise<void> =>
        axiosAuth.delete(`/Document/${documentId}/share/${userId}`).then(() => undefined),

    // Get document content
    getContent: (documentId: string): Promise<DocumentContent | null> => {
        console.log('🔍 Fetching content for document:', documentId);
        return axiosAuth.get(`/content/document/${documentId}`)
            .then((r) => {
                console.log('✅ Content response status:', r.status);
                console.log('✅ Content response data:', r.data);
                console.log('✅ Content response data type:', typeof r.data);
                console.log('✅ Content response data.content exists:', !!r.data?.content);
                console.log('✅ Content response data.content type:', typeof r.data?.content);

                if (!r.data) {
                    console.warn('⚠️ No data in response');
                    return null;
                }

                if (!r.data.content) {
                    console.warn('⚠️ No content field in response');
                    return null;
                }

                return r.data;
            })
            .catch((err) => {
                console.error('❌ Content fetch error:', err);
                console.error('❌ Error response:', err.response?.data);
                console.error('❌ Error status:', err.response?.status);
                // Return null if content doesn't exist (new document)
                if (err.response?.status === 404) {
                    console.log('ℹ️ Content not found (404) - document may be new');
                    return null;
                }
                return null;
            });
    },

    // Create/Update document content
    saveContent: (data: CreateContentDto): Promise<DocumentContent> =>
        axiosAuth.post('/content', data).then((r) => r.data),

    // Favorite a document
    favorite: (documentId: string): Promise<Document> =>
        axiosAuth.post(`/Document/${documentId}/favorite`, {}).then((r) => r.data),

    // Unfavorite a document
    unfavorite: (documentId: string): Promise<Document> =>
        axiosAuth.post(`/Document/${documentId}/unfavorite`, {}).then((r) => r.data),

    // Get favorite documents
    getFavorites: (): Promise<Document[]> =>
        axiosAuth.get('/Document/favorites').then((r) => r.data),

    // Export document as PDF
    exportPDF: async (documentId: string): Promise<Blob> => {
        const response = await axiosAuth.get(`/Document/${documentId}/export/pdf`, {
            responseType: 'blob',
        });
        return response.data;
    },
};

