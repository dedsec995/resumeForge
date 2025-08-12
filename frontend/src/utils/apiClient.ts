import axios from 'axios';
import { auth } from '../firebase-config';

const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://resumeforge.thatinsaneguy.com/api'  
    : 'http://localhost:8002', 
  timeout: 10000,
});

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

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authorization error - token may be expired');
    }
    return Promise.reject(error);
  }
);

export const questionsAPI = {
  addQuestion: async (sessionId: string, question: string) => {
    const response = await apiClient.post(`/sessions/${sessionId}/questions`, {
      question
    });
    return response.data;
  },

  getQuestions: async (sessionId: string) => {
    const response = await apiClient.get(`/sessions/${sessionId}/questions`);
    return response.data;
  },

  answerQuestion: async (sessionId: string, questionId: string, answer: string) => {
    const response = await apiClient.post(`/sessions/${sessionId}/questions/${questionId}/answer`, {
      answer
    });
    return response.data;
  }
};

export const addressAPI = {
  findAddresses: async (location: string) => {
    const response = await apiClient.post('/api/find-addresses', {
      location
    });
    return response.data;
  }
};

export default apiClient;