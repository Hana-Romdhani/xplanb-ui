import axios from "axios";
import { API_URL, ACCESS_TOKEN_KEY } from "../lib/config";

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

export const openAiApi = {
    // Ask a question to the AI with optional document context
    askQuestion: (
        question: string,
        documentIds?: string[],
        folderIds?: string[]
    ): Promise<string> =>
        axiosAuth.post('/openai', {
            question,
            documentIds,
            folderIds
        }).then((r) => r.data),
};

