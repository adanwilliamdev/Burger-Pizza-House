import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import { useTheme } from '../hooks/ThemeContext';
import {
  LayoutDashboard,
  Pizza,
  ClipboardList,
  Package,
  LogOut,
  User,
  Home,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Pizza, label: 'Produtos' },
  { to: '/orders', icon: ClipboardList, label: 'Pedidos' },
  { to: '/ingredients', icon: Package, label: 'Estoque' },
];

export const Layout: React.FC = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('bph-sidebar-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('bph-sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Atalhos de teclado: Ctrl/Cmd+K busca, Ctrl/Cmd+N novo produto, Ctrl/Cmd+P novo pedido
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        navigate('/products');
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        navigate('/orders');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentPage = navItems.find((item) => location.pathname.startsWith(item.to));

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface dark:bg-gray-900 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
          <Home className="w-7 h-7 text-white" />
        </div>
        <p className="text-caption">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface dark:bg-gray-900 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-sidebar text-white flex flex-col transition-all duration-200 ease-in-out
        `}
      >
        <div className="p-4 flex items-center justify-between h-18 border-b border-white/10">
          <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <Home className="w-7 h-7 text-primary shrink-0" />
            {!collapsed && (
              <h1 className="text-lg font-bold whitespace-nowrap">
                <span className="text-primary">Burger & Pizza House</span>
              </h1>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map(({ to, icon: Icon, label }) => (
            <div key={to} className="relative group">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors duration-200 text-sm font-medium
                   ${collapsed ? 'lg:justify-center' : ''}
                   ${isActive
                      ? 'bg-sidebar-active text-white'
                      : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'}`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
              {/* Tooltip quando recolhida */}
              {collapsed && (
                <span className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap
                                  bg-gray-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-soft-lg z-50">
                  {label}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-xl text-gray-400
                       hover:text-white hover:bg-sidebar-hover transition-colors duration-200"
          >
            {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-18 shrink-0 bg-card dark:bg-gray-800 border-b border-line dark:border-gray-700 flex items-center gap-3 px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-icon lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Pesquisar... (Ctrl+K)"
              className="w-full pl-10 pr-3 py-2 bg-surface dark:bg-gray-900 border border-line dark:border-gray-700 rounded-2xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200"
            />
          </div>

          <div className="flex-1" />

          {/* Notificações */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen((o) => !o); setUserMenuOpen(false); }}
              className="btn-icon relative"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-card dark:bg-gray-800 dark:border dark:border-gray-700 rounded-2xl shadow-soft-lg p-4 z-50">
                <p className="text-card-title mb-1">Notificações</p>
                <p className="text-caption">Nenhuma notificação nova por aqui.</p>
              </div>
            )}
          </div>

          {/* Dark mode */}
          <button onClick={toggle} className="btn-icon" aria-label="Alternar tema">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Usuário */}
          <div className="relative">
            <button
              onClick={() => { setUserMenuOpen((o) => !o); setNotifOpen(false); }}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold leading-tight">{user?.name || 'Usuário'}</p>
                <p className="text-caption leading-tight">{user?.role || 'OPERATOR'}</p>
              </div>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card dark:bg-gray-800 dark:border dark:border-gray-700 rounded-2xl shadow-soft-lg py-2 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page title bar (contextual) */}
        {currentPage && (
          <div className="lg:hidden px-4 pt-3 text-xs font-semibold text-muted uppercase tracking-wide">
            {currentPage.label}
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
