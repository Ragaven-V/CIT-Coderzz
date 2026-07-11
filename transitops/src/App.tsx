import React, { useEffect, useState } from 'react';
import { api } from './api';
import { User, Role } from './types';

// Component Imports
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Trips from './components/Trips';
import Maintenance from './components/Maintenance';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import Settings from './components/Settings';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'danger';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsLoadingProfile] = useState(true);
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [contextRole, setContextRole] = useState<Role>(Role.FLEET_MANAGER);
  const [refreshSignal, setRefreshSignal] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast dispatch
  const showToast = (message: string, type: 'success' | 'warning' | 'danger' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Profile session fetch on reload
  useEffect(() => {
    const initProfile = async () => {
      const token = localStorage.getItem('transitops_token');
      if (token) {
        try {
          const data = await api.getProfile();
          setUser(data.user);
          setContextRole(data.user.role);
          showToast(`Welcome back to workspace, ${data.user.name}!`);
        } catch (error) {
          api.clearToken();
          setUser(null);
        }
      }
      setIsLoadingProfile(false);
    };

    initProfile();

    // Set initial theme
    const savedTheme = localStorage.getItem('transitops_theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setContextRole(loggedInUser.role);
    setActiveScreen('dashboard');
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    showToast('Signed out of TransitOps workspace.', 'warning');
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('transitops_theme', nextTheme);
    showToast(`Theme switched to ${nextTheme} mode.`);
  };

  // Helper trigger to update state between views (e.g. Completing a trip updates KPI reports)
  const triggerRefresh = () => {
    setRefreshSignal((prev) => prev + 1);
  };

  // RBAC permission checking matching PDF specs
  const hasViewPermission = (role: Role, screen: string): boolean => {
    const permissions: Record<Role, string[]> = {
      [Role.FLEET_MANAGER]: ['dashboard', 'vehicles', 'drivers', 'trips', 'maintenance', 'expenses', 'reports', 'settings'],
      [Role.DISPATCHER]: ['dashboard', 'vehicles', 'trips'],
      [Role.SAFETY_OFFICER]: ['dashboard', 'drivers', 'trips'],
      [Role.FINANCIAL_ANALYST]: ['dashboard', 'vehicles', 'expenses', 'reports'],
    };
    return permissions[role]?.includes(screen) || false;
  };

  // Switch context role dynamically (for demonstration & testing)
  const handleContextRoleChange = (newRole: Role) => {
    setContextRole(newRole);
    showToast(`Viewing workspace as ${newRole}. Permissions updated.`, 'warning');
    
    // Fallback to first allowed view if current is restricted
    if (!hasViewPermission(newRole, activeScreen)) {
      if (newRole === Role.DISPATCHER) setActiveScreen('trips');
      else if (newRole === Role.SAFETY_OFFICER) setActiveScreen('drivers');
      else setActiveScreen('dashboard');
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-slate-950 text-white flex-col gap-3 font-sans">
        <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Syncing Secure Workspace...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        {/* Toast Tray */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              <i className={`fas ${t.type === 'success' ? 'fa-check-circle' : t.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle'}`}></i>
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Define sidebar navigation options
  const sidebarItems = [
    { screen: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { screen: 'vehicles', label: 'Fleet', icon: 'fa-truck' },
    { screen: 'drivers', label: 'Drivers', icon: 'fa-id-card' },
    { screen: 'trips', label: 'Trip Dispatcher', icon: 'fa-route' },
    { screen: 'maintenance', label: 'Maintenance', icon: 'fa-tools' },
    { screen: 'expenses', label: 'Fuel & Expenses', icon: 'fa-wallet' },
    { screen: 'reports', label: 'Analytics', icon: 'fa-chart-line' },
    { screen: 'settings', label: 'Settings', icon: 'fa-cog' },
  ];

  // Render correct workspace screen component
  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <Dashboard
            currentRole={contextRole}
            showToast={showToast}
            onNavigate={setActiveScreen}
            triggerRefreshSignal={refreshSignal}
          />
        );
      case 'vehicles':
        return <Vehicles currentRole={contextRole} showToast={showToast} triggerRefreshSignal={triggerRefresh} />;
      case 'drivers':
        return <Drivers currentRole={contextRole} showToast={showToast} triggerRefreshSignal={triggerRefresh} />;
      case 'trips':
        return (
          <Trips
            currentRole={contextRole}
            showToast={showToast}
            triggerRefreshSignal={triggerRefresh}
            refreshSignal={refreshSignal}
          />
        );
      case 'maintenance':
        return (
          <Maintenance
            currentRole={contextRole}
            showToast={showToast}
            triggerRefreshSignal={triggerRefresh}
            refreshSignal={refreshSignal}
          />
        );
      case 'expenses':
        return (
          <Expenses
            currentRole={contextRole}
            showToast={showToast}
            triggerRefreshSignal={triggerRefresh}
            refreshSignal={refreshSignal}
          />
        );
      case 'reports':
        return <Reports showToast={showToast} refreshSignal={refreshSignal} />;
      case 'settings':
        return <Settings showToast={showToast} />;
      default:
        return <div className="text-slate-500 text-xs">Section under construction</div>;
    }
  };

  return (
    <div className="app-container flex w-full relative min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Sidebar */}
      <aside className="sidebar w-64 h-screen bg-slate-900 border-r border-slate-800 fixed left-0 top-0 flex flex-col p-6 z-100">
        <div className="brand flex items-center gap-3 pb-8">
          <div className="brand-logo w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-indigo-600/20 shadow-md">
            T
          </div>
          <div className="brand-name font-bold text-lg text-white font-heading">TransitOps</div>
        </div>

        <nav className="flex-1 overflow-y-auto pr-1">
          <ul className="nav-menu flex flex-col gap-1.5 list-none">
            {sidebarItems.map((item) => {
              const allowed = hasViewPermission(contextRole, item.screen);
              if (!allowed) return null;

              const active = activeScreen === item.screen;
              return (
                <li key={item.screen} className={`nav-item ${active ? 'active' : ''}`}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setActiveScreen(item.screen); }}
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-800/50 transition-all"
                  >
                    <i className={`fas ${item.icon} text-sm ${active ? 'text-white' : 'text-slate-500'}`}></i>
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User profile footer */}
        <div className="sidebar-footer pt-4 border-t border-slate-800 mt-auto">
          <div className="user-badge flex items-center gap-3">
            <div className="user-avatar w-10 h-10 bg-indigo-500/10 text-indigo-400 font-bold text-xs rounded-full flex items-center justify-center border border-indigo-500/20">
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info flex flex-col min-w-0">
              <span className="user-name text-xs font-bold text-white truncate">{user.name}</span>
              <span className="user-role text-[10px] text-slate-500 uppercase tracking-wider font-semibold truncate">{user.role}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="main-content flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="top-bar h-16 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 backdrop-blur-md z-40">
          <div className="view-title">
            <h1 className="text-base font-bold text-white tracking-tight uppercase tracking-wider text-xs text-indigo-400">
              {sidebarItems.find(item => item.screen === activeScreen)?.label || 'Workspace'}
            </h1>
          </div>

          <div className="top-bar-actions flex items-center gap-4">
            {/* RBAC Simulation Selector */}
            <div className="role-switcher-container flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full">
              <span className="role-switcher-label text-[9px] font-bold text-slate-500 tracking-wider">Test Role:</span>
              <select
                className="role-select bg-transparent text-white font-bold text-xs outline-none cursor-pointer border-none py-0.5"
                value={contextRole}
                onChange={(e) => handleContextRoleChange(e.target.value as Role)}
              >
                <option value={Role.FLEET_MANAGER}>Fleet Manager (Admin)</option>
                <option value={Role.DISPATCHER}>Dispatcher</option>
                <option value={Role.SAFETY_OFFICER}>Safety Officer</option>
                <option value={Role.FINANCIAL_ANALYST}>Financial Analyst</option>
              </select>
            </div>

            {/* Light/Dark Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle w-9 h-9 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-slate-800/40 hover:border-slate-700 transition-all cursor-pointer"
              title="Toggle theme mode"
            >
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="logout-btn w-9 h-9 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-950/40 transition-all cursor-pointer"
              title="Log out of platform"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        {/* View render workspace */}
        <div className="view-container p-8 flex-1">
          {renderActiveScreen()}
        </div>
      </main>

      {/* Floating toast notification tray */}
      <div className="toast-container fixed bottom-8 right-8 flex flex-col gap-3 z-[1000]">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type} flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg bg-slate-900 border-slate-800/80`}>
            <i className={`fas ${t.type === 'success' ? 'fa-check-circle text-emerald-400' : t.type === 'warning' ? 'fa-exclamation-triangle text-amber-400' : 'fa-times-circle text-red-400'}`}></i>
            <span className="text-slate-300 font-semibold text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
