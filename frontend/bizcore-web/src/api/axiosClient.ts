import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
//     ↑ type add karo — AxiosInstance and AxiosError are types only

// Why create a custom Axios instance?
// If we use axios.get() directly everywhere:
// → We'd attach the auth token manually in every single API call
// → We'd write token refresh logic in every component
// → Base URL would be hardcoded everywhere
//
// With one configured instance:
// → Token is attached automatically via interceptor
// → Token refresh happens automatically via interceptor
// → Base URL comes from environment variable
// → All 50+ future API calls benefit automatically

const axiosClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // import.meta.env = Vite's way to access environment variables
  // In dev:  reads from .env.development
  // In prod: reads from .env.production

  headers: {
    'Content-Type': 'application/json',
    // Tells .NET backend: "I'm sending JSON, please parse it as JSON"
  },

  timeout: 30000,
  // If server doesn't respond in 30 seconds, throw an error
  // Without this: user sees infinite loading spinner
});

// ── REQUEST INTERCEPTOR ────────────────────────────────────────────────────
// This function runs BEFORE every API call automatically
// Think of it as middleware that modifies the outgoing request

axiosClient.interceptors.request.use(
  (config) => {
    // Get the current token from Zustand store
    // We use getState() instead of the hook because:
    // - This is not a React component
    // - React hooks can only be used inside React components
    // - getState() gives us direct access to the store outside React

    // We import authStore here at the bottom to avoid circular imports
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      // "Bearer" is the standard prefix for JWT tokens
      // .NET's JWT middleware reads this header automatically
    }

    return config; // Return modified config — this is what gets sent
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR ───────────────────────────────────────────────────
// This function runs AFTER every API response
// Key feature: if token expired (401), silently refresh and retry

// These variables live outside the interceptor because
// multiple API calls might fail simultaneously
// We only want to refresh the token ONCE, not 5 times in parallel

let isRefreshing = false;
// Flag: "Is a token refresh currently in progress?"

let failedQueue: Array<{
  resolve: (token: string) => void;
  reject:  (error: unknown) => void;
}> = [];
// Queue: Holds API calls that failed while refresh was in progress
// When refresh completes, we retry all of them with the new token

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
      // Refresh failed → reject all queued requests
    } else {
      promise.resolve(token!);
      // Refresh succeeded → give new token to all queued requests
    }
  });
  failedQueue = []; // Clear the queue
};

axiosClient.interceptors.response.use(
  // Success response: just return it unchanged
  (response) => response,

  // Error response: check if we should refresh the token
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    // Only attempt refresh if:
    // 1. Status is 401 (Unauthorized = token expired)
    // 2. We haven't already tried refreshing for this request (_retry flag)
    // The _retry flag prevents infinite loops:
    // refresh → still 401 → refresh → still 401 → infinite
    if (error.response?.status === 401 && !originalRequest?._retry) {

      if (isRefreshing) {
        // A refresh is already happening
        // Put this request in the queue and wait
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          // When refresh completes, retry with new token
          originalRequest!.headers!.Authorization = `Bearer ${token}`;
          return axiosClient(originalRequest!);
        });
      }

      originalRequest!._retry = true; // Mark as retry attempt
      isRefreshing = true;

      const { refreshToken, updateTokens, logout } =
        useAuthStore.getState();

      if (!refreshToken) {
        // No refresh token available — user must log in again
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Use plain axios (not axiosClient) to avoid the interceptor loop
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          {
            accessToken: (originalRequest!.headers!.Authorization as string)
              ?.replace('Bearer ', '') || '',
            refreshToken,
          }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data;

        // Save new tokens to store (and localStorage via persist)
        updateTokens(newAccessToken, newRefreshToken);

        // Give new token to all queued requests
        processQueue(null, newAccessToken);

        // Retry the original request with new token
        originalRequest!.headers!.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest!);

      } catch (refreshError) {
        // Refresh also failed — session is truly expired
        processQueue(refreshError, null);
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false; // Always reset the flag
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

// Import at bottom to avoid circular dependency
// authStore imports types, types don't import authStore
// axiosClient imports authStore — putting import at top would cause issues
import { useAuthStore } from '../store/authStore';