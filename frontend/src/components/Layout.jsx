// src/components/Layout.jsx
import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import { 
  BookOpen, 
  LayoutDashboard, 
  PlusCircle, 
  MessageSquare, 
  FileText, 
  UserPlus,
  Menu, 
  X 
} from 'lucide-react';

/**
 * Main Shell Component
 * Provides responsive sidebar navigation tailored to user roles,
 * a global loading progress bar, and mobile hamburger drawer.
 */
export default function Layout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isTeacher = user?.role === 'teacher';

  // Navigation configurations based on RBAC spec
  const navigation = isTeacher
    ? [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Document Manager', href: '/documents', icon: FileText },
        { name: 'Create Course', href: '/courses/new', icon: PlusCircle },
      ]
    : [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Enroll in Course', href: '/enroll', icon: UserPlus },
        { name: 'My Chats', href: '/chats', icon: MessageSquare },
      ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col font-sans antialiased">
      {/* Top Accent Progress Bar (Fades out when route is settled) */}
      <div className="h-1 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent-4)] to-[var(--accent-3)]" />

      {/* Main Container */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Sidebar - Desktop */}
        <aside 
          style={{ background: 'linear-gradient(180deg, var(--paper-2) 0%, var(--paper-3) 100%)' }}
          className="hidden md:flex flex-col w-64 border-r border-[var(--border)] relative z-20 shrink-0"
        >
          {/* Brand/Identity Header */}
          <div className="p-8 border-b border-[var(--border)]">
            <Link to="/dashboard" className="group block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] block mb-1">
                Tribhuvan University
              </span>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors duration-150">
                TU RAG <span className="font-sans font-light text-lg">Study</span>
              </h1>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={() => `
                    flex items-center gap-3.5 px-4 py-3 rounded-[var(--radius)] text-[14px] font-medium transition-all duration-150 group
                    ${isActive 
                      ? 'bg-[var(--paper-4)] text-[var(--ink)] border-l-4 border-[var(--accent)] font-semibold' 
                      : 'text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]'
                    }
                  `}
                >
                  <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 duration-150 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-3)] group-hover:text-[var(--ink)]'}`} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer Info */}
          <div className="p-6 border-t border-[var(--border)] text-center">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-4)]">
              RAG Engine v1.0.0
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Backdrop */}
        {isMobileMenuOpen && (
          <div 
            onClick={closeMobileMenu}
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity duration-200"
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <aside 
          style={{ background: 'linear-gradient(180deg, var(--paper-2) 0%, var(--paper-3) 100%)' }}
          className={`
            md:hidden fixed inset-y-0 left-0 w-72 border-r border-[var(--border)] z-40 transform transition-transform duration-300 ease-in-out flex flex-col
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--accent)] block">
                Tribhuvan University
              </span>
              <h1 className="font-serif text-xl font-bold tracking-tight text-[var(--ink)]">
                TU RAG Study
              </h1>
            </div>
            <button 
              onClick={closeMobileMenu}
              className="p-1.5 rounded-md hover:bg-[var(--paper-4)] text-[var(--ink-2)]"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={closeMobileMenu}
                  className={`
                    flex items-center gap-3.5 px-4 py-3 rounded-[var(--radius)] text-[14px] font-medium transition-all duration-150
                    ${isActive 
                      ? 'bg-[var(--paper-4)] text-[var(--ink)] border-l-4 border-[var(--accent)] font-semibold' 
                      : 'text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]'
                    }
                  `}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'}`} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-6 border-t border-[var(--border)] text-center">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-4)]">
              RAG Engine v1.0.0
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
          
          {/* Dynamic Topbar Navigation */}
          <Navbar onMenuToggle={toggleMobileMenu} />

          {/* Core Screen Area */}
          <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto relative z-10">
            {children}
          </main>
        </div>

      </div>
    </div>
  );
}