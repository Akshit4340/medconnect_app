import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'medconnect_access_token';
const REFRESH_TOKEN_KEY = 'medconnect_refresh_token';

// ─── Token helpers ────────────────────────────────────────────────────────────

export const tokenStorage = {
  getAccess: () => Cookies.get(ACCESS_TOKEN_KEY),
  getRefresh: () => Cookies.get(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, {
      expires: 1 / 96, // 15 minutes
      sameSite: 'strict',
    });
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
      expires: 7, // 7 days
      sameSite: 'strict',
    });
  },
  clearTokens: () => {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  },
};

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ─── Request interceptor — attach access token ────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — auto refresh on 401 ──────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefresh();

      if (!refreshToken) {
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
        );

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        tokenStorage.setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
