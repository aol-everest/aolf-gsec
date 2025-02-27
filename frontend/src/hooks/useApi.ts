import axios from 'axios';
import { useMemo } from 'react';

export function useApi() {
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          window.location.href = '/';
        }
        if (error.response?.status === 403) {
          window.location.href = '/unauthorized';
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, []); // Empty dependency array since nothing changes

  return api;
} 