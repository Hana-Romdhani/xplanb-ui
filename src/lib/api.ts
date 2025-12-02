import axios from "axios";
import { API_URL, ACCESS_TOKEN_KEY } from "./config";

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: false,
    timeout: 10000, // 10 second timeout
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const requestUrl: string = error.config?.url ?? "";
            const isAuthRequest = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/forgetPassword");

            if (!isAuthRequest) {
                console.error("Unauthorized - redirecting to login");
                localStorage.removeItem(ACCESS_TOKEN_KEY);

                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            }
        }
        return Promise.reject(error);
    }
);

