import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, Boxes, ArrowLeftRight, Receipt,
  FileText, Users, Truck, ShoppingCart, BarChart2, TrendingUp,
  DollarSign, Settings, LogOut, Menu, X, Search,
} from 'lucide-react';
import { LocationSwitcher } from '../components/LocationSwitcher';
import { useAuthStore } from '../stores/authStore';
import { CommandPaletteModal } from '../components/CommandPaletteModal';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    group: 'Catalog',
    items: [
      { label: 'Products', to: '/products', icon: Package },
      { label: 'Categories', to: '/categories', icon: Tags },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { label: 'Stock Levels', to: '/inventory', icon: Boxes },
      { label: 'Transfers', to: '/inventory/transfers', icon: ArrowLeftRight },
    ],
  },
  {
    group: 'Billing',
    items: [
      { label: 'POS', to: '/pos', icon: ShoppingCart },
      { label: 'Invoices', to: '/invoices', icon: Receipt },
    ],
  },
  {
    group: 'CRM',
    items: [
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Suppliers', to: '/suppliers', icon: Truck },
      { label: 'Purchase Orders', to: '/purchase-orders', icon: FileText },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Sales', to: '/reports/sales', icon: BarChart2 },
      { label: 'Stock Valuation', to: '/reports/stock-valuation', icon: Boxes },
      { label: 'Top Products', to: '/reports/top-products', icon: TrendingUp },
      { label: 'Tax Summary', to: '/reports/tax-summary', icon: DollarSign },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Locations', to: '/admin/locations', icon: Settings },
      { label: 'Users & Roles', to: '/admin/users', icon: Users },
      { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],
  },
];

const Sidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user, logout, initials } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-paper-alt border-r-2 border-line w-60">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-4 border-b-2 border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-cherry flex items-center justify-center relative">
            <div className="absolute inset-[7px] border-2 border-paper rounded-full" />
          </div>
          <span className="font-bold text-lg tracking-tight">Vikreta</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.group && (
              <p className="px-3 mb-1 text-[10px] font-bold text-ink-soft uppercase tracking-widest">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={15} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t-2 border-line">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-plum flex items-center justify-center text-white text-xs font-mono font-bold flex-shrink-0">
            {initials()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-ink-soft truncate">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost p-1 text-ink-soft hover:text-cherry">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const navigate = useNavigate();

  // ── Global Navigation Shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K: Open Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Alt + Number: Direct section navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          navigate('/pos');
        } else if (e.key === '2') {
          e.preventDefault();
          navigate('/products');
        } else if (e.key === '3') {
          e.preventDefault();
          navigate('/inventory');
        } else if (e.key === '4') {
          e.preventDefault();
          navigate('/invoices');
        } else if (e.key === '5') {
          e.preventDefault();
          navigate('/reports/sales');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3.5 bg-paper border-b-2 border-ink flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden btn-ghost p-1.5"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <LocationSwitcher />
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Command Palette Launcher */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-line bg-paper-alt hover:border-ink cursor-pointer text-ink-soft hover:text-ink transition-colors w-60 text-left"
              title="Global Quick Jump & Command Palette (Ctrl + K)"
            >
              <Search size={14} className="text-ink-soft flex-shrink-0" />
              <span className="text-xs flex-1 truncate">Search or jump to…</span>
              <kbd className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-line text-ink">
                Ctrl K
              </kbd>
            </button>

            <div className="w-9 h-9 rounded-full bg-plum flex items-center justify-center text-white text-xs font-mono font-bold">
              {useAuthStore.getState().initials()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};
