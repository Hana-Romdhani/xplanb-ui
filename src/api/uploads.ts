import axios from "axios";
import { API_URL, ACCESS_TOKEN_KEY } from "../lib/config";

// API URL without /api suffix since backend controllers are at root
const baseURL = API_URL.replace('/api', '');

const axiosAuth = axios.create({
    baseURL,
    // Don't set Content-Type header - let axios set it automatically for FormData
});

axiosAuth.interceptors.request.use((config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface UploadImageResponse {
    success: number;
    file?: {
        url: string;
        name: string;
        size: number;
    };
    message?: string;
}

export const uploadsApi = {
    // Upload an image file
    uploadImage: async (file: File): Promise<UploadImageResponse> => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await axiosAuth.post('/api/upload-image', formData);
            return response.data;
        } catch (error: any) {
            console.error('Image upload error:', error);
            throw new Error(error?.response?.data?.message || 'Failed to upload image');
        }
    },
};

