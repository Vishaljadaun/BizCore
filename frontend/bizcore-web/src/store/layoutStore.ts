import { create } from 'zustand';

// This store manages the UI state of the app layout
// Sidebar open/closed, mobile menu, expanded nav items

interface LayoutState {
  isSidebarOpen:       boolean;  // Desktop: full (true) or icon-only (false)
  isMobileSidebarOpen: boolean;  // Mobile: visible (true) or hidden (false)
  expandedMenus:       string[]; // Which parent nav items are expanded

  toggleSidebar:       ()           => void;
  toggleMobileSidebar: ()           => void;
  closeMobileSidebar:  ()           => void;
  toggleExpandedMenu:  (path: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarOpen:       true,  // Sidebar open by default on desktop
  isMobileSidebarOpen: false, // Hidden by default on mobile
  expandedMenus:       [],    // No menus expanded by default

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  toggleMobileSidebar: () =>
    set((state) => ({
      isMobileSidebarOpen: !state.isMobileSidebarOpen,
    })),

  closeMobileSidebar: () =>
    set({ isMobileSidebarOpen: false }),

  toggleExpandedMenu: (path: string) =>
    set((state) => ({
      expandedMenus: state.expandedMenus.includes(path)
        ? state.expandedMenus.filter((p) => p !== path)
        // Already expanded → remove it (collapse)
        : [...state.expandedMenus, path],
        // Not expanded → add it (expand)
    })),
}));