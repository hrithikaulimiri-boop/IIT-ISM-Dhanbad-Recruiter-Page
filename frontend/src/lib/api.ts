import axios from "axios";
import { getSession } from "next-auth/react";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api",
  headers: {
    Accept: "application/json",
  },
});

// Add a request interceptor to automatically add the Authorization header
api.interceptors.request.use(async (config) => {
  // Skip session check for auth routes to avoid overhead/potential loops
  if (config.url?.includes('/auth/')) {
    return config;
  }

  try {
    const session = await getSession();
    const token = (session as any)?.accessToken || (session as any)?.user?.accessToken || (session as any)?.token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("API Interceptor: No token found for request to", config.url);
      // Optional: You could redirect to login here if you want to be aggressive
    }
  } catch (err) {
    console.error("API Interceptor: Error getting session", err);
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});
