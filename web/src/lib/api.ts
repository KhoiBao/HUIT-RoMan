import axios from "axios";

// Khi chạy qua Cloudflare Tunnel (HTTPS) hoặc từ máy khác, bắt buộc dùng relative path ""
// để đi qua Vite proxy, tránh lỗi Mixed Content (HTTPS -> HTTP) và lỗi Network Error.
const isHttpLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  window.location.protocol === "http:";

export const API_BASE_URL = isHttpLocal
  ? (import.meta.env.VITE_API_URL?.toString() || "")
  : "";

export const TOKEN_KEY = "huit-roman-token";
export const USER_KEY = "huit-roman-user";

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
