const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API = BASE_URL;

export const token = () => localStorage.getItem("bachatgat_token");

export const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token()}`,
});

export const jsonHeaders = () => ({
  ...authHeaders(),
  "Content-Type": "application/json",
});
