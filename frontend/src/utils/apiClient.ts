import axios from 'axios';
import { auth } from '../firebase-config';

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://resumeforge.thatinsaneguy.com/api'  // Production - use nginx proxy
    : 'http://localhost:8002', // Development
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      console.error('Authorization error - token may be expired');
      // You could dispatch a logout action here if needed
    }
    return Promise.reject(error);
  }
);

export default apiClient;