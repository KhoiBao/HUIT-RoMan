import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.toString() || "http://localhost:5056";

export const TOKEN_KEY = "huit-roman-token";
export const USER_KEY = "huit-roman-user";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
