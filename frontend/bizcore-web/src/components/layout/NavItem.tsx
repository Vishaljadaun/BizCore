import { NavLink, useLocation } from 'react-router-dom';
import type { NavItem as NavItemType } from '../../config/navigation';
import { useLayoutStore }          from '../../store/layoutStore';
import { useAuthStore }            from '../../store/authStore';
import { UserRole }                from '../../types';

interface Props {
  item:        NavItemType;
  isCollapsed: boolean;
  depth?:      number;
}

const NavItemComponent = ({ item, isCollapsed, depth = 0 }: Props) => {
  const location = useLocation();
  const { expandedMenus, toggleExpandedMenu, closeMobileSidebar } =
    useLayoutStore();
  const { user } = useAuthStore();

  const hasAccess = item.roles.includes(user?.role as UserRole);
  if (!hasAccess) return null;

  const hasChildren = item.children && item.children.length > 0;
  const isExpanded  = expandedMenus.includes(item.path);
  const isActive    =
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/');

  // ── COLLAPSED (icon-only) ────────────────────────────────────────────
  if (isCollapsed && depth === 0) {
    return (
      <div className="relative group">
        <NavLink
          to={hasChildren ? '#' : item.path}
          onClick={hasChildren ? undefined : closeMobileSidebar}
          className={`
            flex items-center justify-center
            w-10 h-10 rounded-xl mx-auto transition-all duration-200
            ${isActive
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }
          `}
        >
          <span className="text-lg">{item.icon}</span>
        </NavLink>

        {/* Tooltip */}
        <div className="
          absolute left-full top-1/2 -translate-y-1/2 ml-3
          bg-gray-900 dark:bg-slate-700 text-white text-xs
          rounded-lg px-3 py-1.5 whitespace-nowrap
          pointer-events-none z-50
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
        ">
          {item.label}
          <div className="absolute right-full top-1/2 -translate-y-1/2
            border-4 border-transparent border-r-gray-900 dark:border-r-slate-700" />
        </div>
      </div>
    );
  }

  // ── PARENT WITH CHILDREN ─────────────────────────────────────────────
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => toggleExpandedMenu(item.path)}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-sm font-medium transition-all duration-200 text-left
            ${depth > 0 ? 'pl-8' : ''}
            ${isActive
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }
          `}
        >
          <span className="text-base flex-shrink-0">{item.icon}</span>
          <span className="flex-1 truncate">{item.label}</span>

          {item.badge && (
            <span className="bg-red-500 text-white text-xs
              rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {item.badge}
            </span>
          )}

          <span className={`
            text-xs transition-transform duration-200
            ${isExpanded ? 'rotate-180' : 'rotate-0'}
          `}>▼</span>
        </button>

        {/* Children */}
        <div className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className="mt-1 ml-4 pl-3 space-y-0.5
            border-l-2 border-gray-100 dark:border-slate-700">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.path}
                item={child}
                isCollapsed={false}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── SIMPLE ITEM ──────────────────────────────────────────────────────
  return (
    <NavLink
      to={item.path}
      onClick={closeMobileSidebar}
      className={({ isActive: navLinkActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-sm font-medium transition-all duration-200
        ${depth > 0 ? 'pl-6' : ''}
        ${navLinkActive || isActive
          ? 'bg-primary-100 text-primary-700 font-semibold dark:bg-primary-900/40 dark:text-primary-400'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }
      `}
    >
      <span className="text-base flex-shrink-0">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="bg-red-500 text-white text-xs
          rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
};

export default NavItemComponent;