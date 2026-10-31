const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

const apiUrl =
    configuredApiUrl || "https://wingoo-backend.onrender.com";

export const API_BASE_URL = (
    /^https?:\/\//i.test(apiUrl)
        ? apiUrl
        : `https://${apiUrl}`
).replace(/\/+$/, "");

