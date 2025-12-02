// Templatereact/src/lib/config.ts
const E = import.meta.env as any;
// Read existing env names without renaming
export const API_URL =
    E.VITE_API_URL ?? E.REACT_APP_API_URL ?? E.API_URL ?? E.BASE_URL ?? "http://localhost:3000";
export const TOKEN_STORAGE =
    E.VITE_TOKEN_STORAGE ?? E.REACT_APP_TOKEN_STORAGE ?? "local";
export const ACCESS_TOKEN_KEY = "access_token"; // keep same key name

