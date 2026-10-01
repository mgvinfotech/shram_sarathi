import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your machine's local IP when testing on physical device
// Previous URL:
// export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.srgloble2025.com';
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://shramsarathinetwork.com';

// Local IP:
//export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.2:8000';

export function getImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://') || path.startsWith('data:')) {
    return path;
  }
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore unavailable (web) — skip
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('auth_token');
      } catch {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err: any): string => {
  if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK' || !err.response) {
    return 'Backend server not reachable. Make sure it is running.';
  }
  const data = err.response?.data;
  if (data?.errors) {
    return Object.values(data.errors).flat().join('\n');
  }
  if (data?.message) {
    if (data.message === 'Unauthenticated.') {
      return 'लॉगिन सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें।';
    }
    return data.message;
  }

  const detail = data?.detail;
  if (!detail) {
    return err.message || 'Something went wrong';
  }
  if (typeof detail === 'string') {
    if (detail.toLowerCase().includes('not authenticated') || detail.toLowerCase().includes('unauthenticated')) {
      return 'लॉगिन सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें।';
    }
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || JSON.stringify(d)).join('\n');
  }
  if (typeof detail === 'object') {
    return detail.message || JSON.stringify(detail);
  }
  return String(detail);
};

