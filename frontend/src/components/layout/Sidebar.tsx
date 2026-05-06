import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Bell,
  ClipboardList,
  BarChart3,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/dashboard/vehicles', label: 'Vehicles', Icon: Truck },
  { to: '/dashboard/alerts', label: 'Alerts', Icon: Bell },
  { to: '/dashboard/work-orders', label: 'Work Orders', Icon: ClipboardList },
  { to: '/dashboard/reports', label: 'Reports', Icon: BarChart3 },
] as const;

export function Sidebar() {
  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <h1 className="text-base font-bold tracking-wide text-white">
          FleetManager
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Fuel & Maintenance</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-600/25 hover:scale-[1.02] ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white bg-slate-800/50'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">MVP v1.0</p>
      </div>
    </aside>
  );
}
