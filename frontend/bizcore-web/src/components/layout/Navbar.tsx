import { useState, useRef, useEffect } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { useAuthStore }                 from '../../store/authStore';
import { useLayoutStore }               from '../../store/layoutStore';
import { authApi }                      from '../../api/authApi';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, refreshToken } = useAuthStore();
  const { toggleSidebar, toggleMobileSidebar } = useLayoutStore();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut,  setIsLoggingOut]  = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  // useRef creates a reference to a DOM element
  // We use it to detect clicks outside the dropdown
  // When user clicks anywhere outside profileRef's element → close dropdown

  // ── Close dropdown when clicking outside ────────────────────────────────
  useEffect(() => {
    // useEffect runs side effects (code that interacts outside React)
    // DOM event listeners are side effects

    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
        // .contains() checks if the clicked element is inside profileRef
        // If NOT inside → user clicked outside → close dropdown
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    // Attach listener to the entire document

    // Cleanup function: runs when component unmounts
    // IMPORTANT: always remove listeners to prevent memory leaks
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // [] = empty dependency array = run this effect only once (on mount)

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      if (refreshToken) {
        await authApi.logout(refreshToken);
        // Tell backend to revoke the refresh token
        // Even if this fails, we still log out on the frontend
      }
    } catch {
      // API call failed — still log out locally
      // Don't block logout because of network errors
    } finally {
      logout();
      // Clear Zustand store and localStorage
      navigate('/login');
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200
      flex items-center justify-between px-4 lg:px-6
      flex-shrink-0 z-10 sticky top-0">
      {/* sticky top-0 = stays at top when page scrolls */}
      {/* z-10 = appears above page content */}

      {/* ── Left side — Sidebar toggle + page title ─────────────────── */}
      <div className="flex items-center gap-4">

        {/* Desktop sidebar toggle (collapse/expand) */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center
            w-9 h-9 rounded-xl hover:bg-gray-100
            transition-colors text-gray-500 hover:text-gray-700"
          // hidden lg:flex = hidden on mobile, visible on large screens
        >
          ☰
        </button>

        {/* Mobile sidebar toggle (slide in/out) */}
        <button
          onClick={toggleMobileSidebar}
          className="flex lg:hidden items-center justify-center
            w-9 h-9 rounded-xl hover:bg-gray-100
            transition-colors text-gray-500"
          // flex lg:hidden = visible on mobile, hidden on large screens
        >
          ☰
        </button>

        <div className="hidden sm:block">
          <h2 className="font-semibold text-gray-900 text-sm">
            BizCore Platform
          </h2>
          <p className="text-xs text-gray-400">{user?.companyName}</p>
        </div>
      </div>

      {/* ── Right side — Notifications + Profile ────────────────────── */}
      <div className="flex items-center gap-2">

        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-xl
          hover:bg-gray-100 transition-colors
          flex items-center justify-center text-gray-500">
          🔔
          {/* Red dot badge */}
          <span className="absolute top-1.5 right-1.5
            w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          {/* ref={profileRef} attaches our ref to this div
              Now profileRef.current points to this DOM element
              We can check if clicks are inside or outside it */}

          {/* Profile button */}
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl
              hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary-600
              flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>

            {/* Name — visible on medium+ screens */}
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {user?.firstName}
              </p>
              <p className="text-xs text-gray-400 leading-tight">
                {user?.role}
              </p>
            </div>

            {/* Animated arrow */}
            <span className={`
              text-gray-400 text-xs transition-transform duration-200
              ${isProfileOpen ? 'rotate-180' : 'rotate-0'}
            `}>
              ▼
            </span>
          </button>

          {/* Dropdown menu */}
          {isProfileOpen && (
            <div className="
              absolute right-0 top-full mt-2
              w-56 bg-white rounded-2xl shadow-lg border border-gray-100
              py-2 z-50 animate-fade-in
            ">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {user?.email}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5
                  bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                  {user?.role}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <DropdownItem icon="👤" label="My Profile"
                  onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                />
                <DropdownItem icon="⚙️" label="Settings"
                  onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                />
                <DropdownItem icon="🔒" label="Change Password"
                  onClick={() => { navigate('/change-password'); setIsProfileOpen(false); }}
                />
              </div>

              {/* Logout */}
              <div className="border-t border-gray-100 pt-1 mt-1">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                    text-sm text-red-600 hover:bg-red-50
                    transition-colors disabled:opacity-50 text-left"
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

// Small reusable component — only used inside Navbar
const DropdownItem = ({
  icon,
  label,
  onClick,
}: {
  icon:    string;
  label:   string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5
      text-sm text-gray-700 hover:bg-gray-50
      transition-colors text-left"
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

export default Navbar;