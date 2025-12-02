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

export interface Comment {
    _id: string;
    content: string;
    createdAt: string;
    user: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    document: string;
}

export interface CreateCommentDto {
    content: string;
    document: string;
}

export const commentsApi = {
    // Get all comments for a document
    getByDocument: (documentId: string): Promise<Comment[]> =>
        axiosAuth.get(`/comments/document/${documentId}`).then((r) => r.data),

    // Create a new comment
    create: (data: CreateCommentDto): Promise<Comment> =>
        axiosAuth.post('/comments', data).then((r) => r.data),

    // Update a comment
    update: (id: string, content: string): Promise<Comment> =>
        axiosAuth.put(`/comments/${id}`, { content }).then((r) => r.data),

    // Delete a comment
    delete: (id: string): Promise<void> =>
        axiosAuth.delete(`/comments/${id}`).then(() => undefined),

    // Get a single comment
    getById: (id: string): Promise<Comment> =>
        axiosAuth.get(`/comments/${id}`).then((r) => r.data),
};


