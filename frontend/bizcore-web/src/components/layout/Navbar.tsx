import { useState, useRef, useEffect } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { useAuthStore }                 from '../../store/authStore';
import { useLayoutStore }               from '../../store/layoutStore';
import { useThemeStore }                from '../../store/themeStore';
import { authApi }                      from '../../api/authApi';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, refreshToken }    = useAuthStore();
  const { toggleSidebar, toggleMobileSidebar } = useLayoutStore();
  const { isDark, toggle: toggleTheme }   = useThemeStore();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut,  setIsLoggingOut]  = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  // ── Close dropdown when clicking outside ──────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // API fail hone pe bhi logout karo locally
    } finally {
      logout();
      navigate('/login');
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="
      h-16 flex items-center justify-between px-4 lg:px-6
      flex-shrink-0 z-10 sticky top-0
      bg-white   border-b border-gray-200
      dark:bg-slate-900 dark:border-slate-700/60
      transition-colors duration-200
    ">

      {/* ── Left — Sidebar toggles + title ────────────────────────────── */}
      <div className="flex items-center gap-4">

        {/* Desktop sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center
            w-9 h-9 rounded-xl transition-colors
            text-gray-500 hover:text-gray-700 hover:bg-gray-100
            dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
        >
          ☰
        </button>

        {/* Mobile sidebar toggle */}
        <button
          onClick={toggleMobileSidebar}
          className="flex lg:hidden items-center justify-center
            w-9 h-9 rounded-xl transition-colors
            text-gray-500 hover:bg-gray-100
            dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ☰
        </button>

        <div className="hidden sm:block">
          <h2 className="font-semibold text-sm
            text-gray-900 dark:text-slate-100">
            BizCore Platform
          </h2>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {user?.companyName}
          </p>
        </div>
      </div>

      {/* ── Right — Theme toggle + Notifications + Profile ────────────── */}
      <div className="flex items-center gap-2">

        {/* ── Theme Toggle Button ── */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="
            w-9 h-9 rounded-xl flex items-center justify-center
            transition-all duration-200
            text-gray-500 hover:text-gray-700 hover:bg-gray-100
            dark:text-slate-400 dark:hover:text-yellow-400 dark:hover:bg-slate-800
            border border-transparent
            dark:border-slate-700/50
          "
        >
          {isDark ? (
            // Sun icon — click karo light mode ke liye
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1"  y1="12" x2="3"  y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            // Moon icon — click karo dark mode ke liye
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-xl
          flex items-center justify-center transition-colors
          text-gray-500 hover:bg-gray-100
          dark:text-slate-400 dark:hover:bg-slate-800">
          🔔
          <span className="absolute top-1.5 right-1.5
            w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl
              transition-colors hover:bg-gray-100
              dark:hover:bg-slate-800"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600
              flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>

            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-tight
                text-gray-900 dark:text-slate-100">
                {user?.firstName}
              </p>
              <p className="text-xs leading-tight
                text-gray-400 dark:text-slate-500">
                {user?.role}
              </p>
            </div>

            <span className={`
              text-xs transition-transform duration-200
              text-gray-400 dark:text-slate-500
              ${isProfileOpen ? 'rotate-180' : 'rotate-0'}
            `}>
              ▼
            </span>
          </button>

          {/* Dropdown menu */}
          {isProfileOpen && (
            <div className="
              absolute right-0 top-full mt-2
              w-56 rounded-2xl shadow-lg border py-2 z-50 animate-fade-in
              bg-white border-gray-100
              dark:bg-slate-800 dark:border-slate-700
            ">
              {/* User info */}
              <div className="px-4 py-3 border-b
                border-gray-100 dark:border-slate-700">
                <p className="text-sm font-semibold
                  text-gray-900 dark:text-slate-100">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs mt-0.5 truncate
                  text-gray-500 dark:text-slate-400">
                  {user?.email}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5
                  bg-primary-100 text-primary-700
                  dark:bg-primary-900/40 dark:text-primary-400
                  text-xs rounded-full font-medium">
                  {user?.role}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <DropdownItem icon="👤" label="My Profile"
                  onClick={() => { navigate('/profile'); setIsProfileOpen(false); }} />
                <DropdownItem icon="⚙️" label="Settings"
                  onClick={() => { navigate('/settings'); setIsProfileOpen(false); }} />
                <DropdownItem icon="🔒" label="Change Password"
                  onClick={() => { navigate('/change-password'); setIsProfileOpen(false); }} />
              </div>

              {/* Logout */}
              <div className="border-t pt-1 mt-1
                border-gray-100 dark:border-slate-700">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                    text-sm text-left transition-colors disabled:opacity-50
                    text-red-600 hover:bg-red-50
                    dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <span>🚪</span>
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// ── DropdownItem ──────────────────────────────────────────────────────────
const DropdownItem = ({
  icon, label, onClick,
}: {
  icon: string; label: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5
      text-sm text-left transition-colors
      text-gray-700 hover:bg-gray-50
      dark:text-slate-300 dark:hover:bg-slate-700/50"
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

export default Navbar;