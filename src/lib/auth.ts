import { api } from "./api";
import { ACCESS_TOKEN_KEY } from "./config";

const storage = {
    get: (k: string) => localStorage.getItem(k),
    set: (k: string, v: string) => localStorage.setItem(k, v),
    del: (k: string) => localStorage.removeItem(k),
};

export async function login(payload: { email: string; password: string }) {
    const { data } = await api.post("/auth/login", payload);
    // Backend returns: { token: { expiresIn, token: "..." }, data: user }
    const tokenObject = data?.token;
    const tokenString = tokenObject?.token || tokenObject?.accessToken;

    // Store the actual token string
    if (tokenString) {
        storage.set(ACCESS_TOKEN_KEY, tokenString);
    }

    return data;
}

export function logout() {
    storage.del(ACCESS_TOKEN_KEY);
}

export function isAuthed() {
    return !!storage.get(ACCESS_TOKEN_KEY);
}

export async function forgotPassword(email: string) {
    const { data } = await api.post("/auth/forgetPassword", { email });
    return data;
}

export async function resetPassword(token: string, password: string, confirmNewPassword: string) {
    const { data } = await api.post("/auth/resetPassword", { token, password, confirmNewPassword });
    return data;
}

