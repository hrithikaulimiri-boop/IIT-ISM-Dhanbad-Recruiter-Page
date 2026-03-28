import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api",
  headers: {
    Accept: "application/json",
  },
});
