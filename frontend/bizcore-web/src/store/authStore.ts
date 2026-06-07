import { create }  from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse } from '../types';

// Why Zustand instead of useState or Context?
// useState  = local state, only available in one component
// Context   = global but causes ALL children to re-render on any change
// Zustand   = global, only re-renders components that subscribe to changed values
//             Simple API, no Provider wrapper needed, built-in persistence

interface AuthState {
  // ── State (data stored in the store) ──────────────────────────────────────
  user:            User | null;     // null = not logged in
  accessToken:     string | null;   // JWT token sent with every API request
  refreshToken:    string | null;   // Used to get new access token silently
  isAuthenticated: boolean;         // Shorthand: user !== null

  // ── Actions (functions to modify state) ───────────────────────────────────
  login:        (data: AuthResponse) => void;
  logout:       () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  // persist middleware automatically saves state to localStorage
  // When page refreshes, state is restored from localStorage
  // Without persist: every page refresh = logged out
  persist(
    (set) => ({
      // Initial state — user not logged in
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,

      // Called after successful login or register
      login: (data: AuthResponse) => {
        set({
          user:            data.user,
          accessToken:     data.accessToken,
          refreshToken:    data.refreshToken,
          isAuthenticated: true,
        });
        // set() updates state and notifies all subscribed components
        // Only components using isAuthenticated will re-render when it changes
      },

      // Called on logout — clears everything
      logout: () => {
        set({
          user:            null,
          accessToken:     null,
          refreshToken:    null,
          isAuthenticated: false,
        });
        // persist middleware also clears localStorage automatically
      },

      // Called when access token is refreshed silently
      // We only update tokens, not the user object
      updateTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },
    }),
    {
      name: 'bizcore-auth',
      // Key used in localStorage: localStorage.getItem('bizcore-auth')

      // Only persist these fields — don't save functions to localStorage
      partialize: (state) => ({
        user:            state.user,
        accessToken:     state.accessToken,
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);