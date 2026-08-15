import React, {useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {BookOpen, LayoutDashboard, LogOut, Menu, Settings, X} from "lucide-react";
import {useAuth} from "../context/AuthContext";

const NAV = [
  {to: "/dashboard", label: "Courses", icon: LayoutDashboard},
  {to: "/settings", label: "Settings", icon: Settings},
];

export const DashboardLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {user, logout} = useAuth();
  const navigate = useNavigate();
  const {pathname} = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", {replace: true});
  };

  const nav = (
    <nav className="space-y-1">
      {NAV.map(({to, label, icon: Icon}) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-amber-100 text-amber-900"
                : "text-zinc-600 hover:bg-amber-50 hover:text-zinc-900"
            }`}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const identity = user && (
    <div className="border-t border-amber-200 pt-3 mt-3">
      <p className="px-3 text-sm font-medium text-slate-900 truncate">{user.username}</p>
      <p className="px-3 text-xs text-slate-500 truncate">{user.email}</p>
      <span className="mx-3 mt-1.5 inline-block text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
        {user.role}
      </span>
      <button
        onClick={handleLogout}
        className="mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut size={17} />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-amber-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-amber-200 bg-white/60 p-4">
        <Link to="/dashboard" className="flex items-center gap-2 px-1 mb-6">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-600 text-amber-50">
            <BookOpen size={17} />
          </span>
          <span className="font-display text-lg text-slate-900">Study Assistant</span>
        </Link>
        {nav}
        <div className="mt-auto">{identity}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-slate-900/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-white p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <span className="font-display text-lg text-slate-900">Study Assistant</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            <div className="mt-auto">{identity}</div>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-amber-200 bg-white/60">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="p-1.5 -ml-1 rounded-lg text-zinc-600 hover:bg-zinc-100"
          >
            <Menu size={20} />
          </button>
          <span className="font-display text-lg text-slate-900">Study Assistant</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
