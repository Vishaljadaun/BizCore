import { NavLink, useLocation } from 'react-router-dom';
import type { NavItem as NavItemType } from '../../config/navigation';
import { useLayoutStore }          from '../../store/layoutStore';
import { useAuthStore }            from '../../store/authStore';
import { UserRole }                from '../../types';

interface Props {
  item:        NavItemType;
  isCollapsed: boolean;  // Is the sidebar in icon-only mode?
  depth?:      number;   // Nesting level: 0 = top-level, 1 = child
}

const NavItemComponent = ({ item, isCollapsed, depth = 0 }: Props) => {
  const location = useLocation();
  // location.pathname = the current URL path e.g. "/hr/employees"
  // Used to determine which nav item is "active"

  const { expandedMenus, toggleExpandedMenu, closeMobileSidebar } =
    useLayoutStore();
  const { user } = useAuthStore();

  // Check if the current user has permission to see this nav item
  const hasAccess = item.roles.includes(user?.role as UserRole);
  if (!hasAccess) return null;
  // Returning null from a React component renders nothing
  // The item simply doesn't appear — no error, no placeholder

  const hasChildren = item.children && item.children.length > 0;
  const isExpanded  = expandedMenus.includes(item.path);

  // An item is "active" if:
  // - The current URL exactly matches its path, OR
  // - The current URL starts with its path (making parent active when child is active)
  // Example: on "/hr/employees", both "/hr/employees" and "/hr" are considered active
  const isActive =
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/');

  // ── COLLAPSED SIDEBAR (icon-only mode) ─────────────────────────────────
  if (isCollapsed && depth === 0) {
    return (
      <div className="relative group">
        {/* "group" class: when this element is hovered,
            descendants with "group-hover:" classes are affected
            We use this to show the tooltip on hover */}

        <NavLink
          to={hasChildren ? '#' : item.path}
          // If item has children, clicking it doesn't navigate
          // It would expand/collapse the sub-menu (when not collapsed)
          // In collapsed mode, clicking just navigates to parent path
          onClick={hasChildren ? undefined : closeMobileSidebar}
          className={`
            flex items-center justify-center
            w-10 h-10 rounded-xl mx-auto
            transition-all duration-200
            ${isActive
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
        >
          <span className="text-lg">{item.icon}</span>
        </NavLink>

        {/* Tooltip — visible on hover via group-hover */}
        <div className="
          absolute left-full top-1/2 -translate-y-1/2 ml-3
          bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5
          whitespace-nowrap pointer-events-none z-50
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
        ">
          {item.label}
          {/* Small triangle pointing left */}
          <div className="absolute right-full top-1/2 -translate-y-1/2
            border-4 border-transparent border-r-gray-900" />
        </div>
      </div>
    );
  }

  // ── PARENT ITEM WITH CHILDREN ───────────────────────────────────────────
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
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
        >
          <span className="text-base flex-shrink-0">{item.icon}</span>
          {/* flex-shrink-0 prevents the icon from shrinking */}

          <span className="flex-1 truncate">{item.label}</span>
          {/* flex-1 takes remaining space; truncate adds "..." if text overflows */}

          {item.badge && (
            <span className="bg-red-500 text-white text-xs
              rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {item.badge}
            </span>
          )}

          {/* Animated arrow: points down when collapsed, up when expanded */}
          <span className={`
            text-xs transition-transform duration-200
            ${isExpanded ? 'rotate-180' : 'rotate-0'}
          `}>
            ▼
          </span>
        </button>

        {/* Children container with smooth height animation */}
        <div className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}>
          {/* Why max-h instead of height?
              CSS cannot animate height: 0 → height: auto
              But it CAN animate max-height: 0 → max-height: 384px
              The actual content is shorter, so it appears to animate naturally */}

          <div className="mt-1 ml-4 pl-3 border-l-2 border-gray-100 space-y-0.5">
            {/* border-l creates a visual connection line between parent and children */}
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.path}
                item={child}
                isCollapsed={false}
                depth={depth + 1}
                // Recursive! NavItemComponent renders NavItemComponent
                // This handles unlimited nesting levels
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── SIMPLE ITEM (no children) ───────────────────────────────────────────
  return (
    <NavLink
      to={item.path}
      onClick={closeMobileSidebar}
      // Close mobile sidebar when navigating
      className={({ isActive: navLinkActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-sm font-medium transition-all duration-200
        ${depth > 0 ? 'pl-6' : ''}
        ${navLinkActive || isActive
          ? 'bg-primary-100 text-primary-700 font-semibold'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
      // NavLink provides isActive automatically based on current URL
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