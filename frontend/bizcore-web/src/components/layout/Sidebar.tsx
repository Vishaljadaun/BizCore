import { useLayoutStore }                  from '../../store/layoutStore';
import { useAuthStore }                    from '../../store/authStore';
import { navigation, vendorNavigation }    from '../../config/navigation';
import { UserRole }                        from '../../types';
import NavItemComponent                    from './NavItem';

const Sidebar = () => {
  const { isSidebarOpen, isMobileSidebarOpen, closeMobileSidebar } =
    useLayoutStore();
  const { user } = useAuthStore();

  // Show vendor navigation for vendor users, main navigation for everyone else
  const navItems =
    user?.role === UserRole.Vendor ? vendorNavigation : navigation;

  return (
    <>
      {/* ── Mobile Overlay ──────────────────────────────────────────────── */}
      {/* Shown behind the sidebar on mobile — clicking it closes the sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          // inset-0 = position: fixed, top/right/bottom/left all = 0 → fullscreen
          // bg-black/50 = black with 50% opacity
          // z-20 = above content but below sidebar (z-30)
          // lg:hidden = only visible on small screens
          onClick={closeMobileSidebar}
        />
      )}

      {/* ── Sidebar Panel ────────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200
        flex flex-col z-30 transition-all duration-300 ease-in-out

        ${isSidebarOpen ? 'w-64' : 'w-16'}
        // Desktop: full width (256px) or collapsed (64px icon-only)

        lg:relative lg:translate-x-0
        // On large screens: sidebar is part of the flow (not floating)
        // Always visible — no transform needed

        ${isMobileSidebarOpen
          ? 'translate-x-0'
          : '-translate-x-full lg:translate-x-0'
        }
        // Mobile: slide in/out using CSS transform
        // -translate-x-full = completely off-screen to the left
        // translate-x-0 = in normal position (visible)
      `}>

        {/* ── Logo / Brand ─────────────────────────────────────────────── */}
        <div className={`
          flex items-center border-b border-gray-100 flex-shrink-0
          transition-all duration-300
          ${isSidebarOpen ? 'px-4 py-4 gap-3' : 'px-2 py-4 justify-center'}
        `}>
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex
            items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">B</span>
          </div>

          {/* Only show text when sidebar is expanded */}
          {isSidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-gray-900 text-sm leading-tight">
                BizCore
              </p>
              <p className="text-xs text-gray-400 truncate max-w-[140px]">
                {user?.companyName}
              </p>
            </div>
          )}
        </div>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {/* flex-1 = take remaining height */}
          {/* overflow-y-auto = scroll if there are too many nav items */}
          {navItems.map((item) => (
            <NavItemComponent
              key={item.path}
              item={item}
              isCollapsed={!isSidebarOpen}
            />
          ))}
        </nav>

        {/* ── User Profile at Bottom ───────────────────────────────────── */}
        <div className="border-t border-gray-100 flex-shrink-0 p-3">
          <div className={`
            flex items-center gap-3 p-2 rounded-xl
            hover:bg-gray-50 transition-colors cursor-pointer
            ${isSidebarOpen ? '' : 'justify-center'}
          `}>
            {/* Avatar with user initials */}
            <div className="w-8 h-8 rounded-full bg-primary-600
              flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
                {/* [0] gets first character. "John" → "J" */}
              </span>
            </div>

            {/* Name and role — only in expanded mode */}
            {isSidebarOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.role}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;