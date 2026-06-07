import { create }   from 'zustand';
import { persist }  from 'zustand/middleware';

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      isDark: true,
      // default dark — kyunki login/register already dark hain

      toggle: () => {
        const newVal = !get().isDark;
        set({ isDark: newVal });
        document.documentElement.classList.toggle('dark', newVal);
        // 'dark' class html element pe toggle hoti hai
        // Tailwind darkMode: 'class' isko detect karta hai
      },
    }),
    {
      name: 'bizcore-theme',
      // localStorage mein save hoga
      // Page refresh ke baad bhi theme yaad rahegi
    }
  )
);