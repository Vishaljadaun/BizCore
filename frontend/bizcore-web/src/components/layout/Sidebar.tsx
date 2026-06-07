import { useLayoutStore }               from '../../store/layoutStore';
import { useAuthStore }                 from '../../store/authStore';
import { navigation, vendorNavigation } from '../../config/navigation';
import { UserRole }                     from '../../types';
import NavItemComponent                 from './NavItem';

const Sidebar = () => {
  const { isSidebarOpen, isMobileSidebarOpen, closeMobileSidebar } =
    useLayoutStore();
  const { user } = useAuthStore();

  const navItems =
    user?.role === UserRole.Vendor ? vendorNavigation : navigation;

  return (
    <>
      {/* ── Mobile Overlay ──────────────────────────────────────────── */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* ── Sidebar Panel ───────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full flex flex-col z-30
        transition-all duration-300 ease-in-out

        bg-white border-r border-gray-200
        dark:bg-slate-900 dark:border-slate-700/60

        ${isSidebarOpen ? 'w-64' : 'w-16'}

        lg:relative lg:translate-x-0

        ${isMobileSidebarOpen
          ? 'translate-x-0'
          : '-translate-x-full lg:translate-x-0'
        }
      `}>

        {/* ── Logo / Brand ──────────────────────────────────────────── */}
        <div className={`
          flex items-center flex-shrink-0
          transition-all duration-300
          border-b border-gray-100 dark:border-slate-700/60
          ${isSidebarOpen ? 'px-4 py-4 gap-3' : 'px-2 py-4 justify-center'}
        `}>
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex
            items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">B</span>
          </div>

          {isSidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-sm leading-tight
                text-gray-900 dark:text-slate-100">
                BizCore
              </p>
              <p className="text-xs truncate max-w-[140px]
                text-gray-400 dark:text-slate-500">
                {user?.companyName}
              </p>
            </div>
          )}
        </div>

        {/* ── Navigation ────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.path}
              item={item}
              isCollapsed={!isSidebarOpen}
            />
          ))}
        </nav>

        {/* ── User Profile at Bottom ────────────────────────────────── */}
        <div className="flex-shrink-0 p-3
          border-t border-gray-100 dark:border-slate-700/60">
          <div className={`
            flex items-center gap-3 p-2 rounded-xl cursor-pointer
            transition-colors
            hover:bg-gray-50 dark:hover:bg-slate-800
            ${isSidebarOpen ? '' : 'justify-center'}
          `}>
            <div className="w-8 h-8 rounded-full bg-primary-600
              flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>

            {isSidebarOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-medium truncate
                  text-gray-900 dark:text-slate-100">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs truncate
                  text-gray-400 dark:text-slate-500">
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