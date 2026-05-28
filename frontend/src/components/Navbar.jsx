// src/components/Navbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, ChevronDown, User, Shield } from 'lucide-react';

/**
 * Top Navbar component
 * Renders user meta context, access-control identifiers,
 * responsive triggers, and the explicit profile dropdown action.
 */
export default function Navbar({ onMenuToggle }) {
  const { user, logout, isTeacher } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--paper)] px-6 md:px-10 flex items-center justify-between shrink-0 relative z-30">
      
      {/* Left side actions */}
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--paper-3)] text-[var(--ink-2)] transition-colors duration-150"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Dynamic Greeting */}
        <div className="hidden sm:block">
          <span className="text-xs text-[var(--ink-3)] font-medium">Welcome back,</span>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-2)] ml-1">
            {user.username}
          </span>
        </div>
      </div>

      {/* Right side Profile & Context Badge block */}
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        
        {/* Role Access Tag */}
        <div className={`
          hidden xs:flex items-center gap-1.5 px-3 py-1 rounded-[4px] border font-mono text-[9px] uppercase tracking-wider font-semibold
          ${isTeacher 
            ? 'bg-[var(--accent-3-light)] text-[var(--accent-3)] border-[var(--accent-3)]/20' 
            : 'bg-[var(--accent-2-light)] text-[var(--accent-2)] border-[var(--accent-2)]/20'
          }
        `}>
          <Shield className="w-2.5 h-2.5 shrink-0" />
          {user.role}
        </div>

        {/* User Interactive Menu Trigger */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--paper-2)] border border-transparent hover:border-[var(--border)] transition-all duration-150"
        >
          {/* Avatar Graphic with initial character */}
          <div className={`
            w-8 h-8 rounded-md flex items-center justify-center font-serif font-bold text-sm text-white select-none
            ${isTeacher ? 'bg-[var(--accent-3)]' : 'bg-[var(--accent-2)]'}
          `}>
            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          
          <div className="hidden md:flex flex-col items-start text-left leading-tight">
            <span className="text-[13px] font-semibold text-[var(--ink-2)]">{user.username}</span>
            <span className="text-[11px] text-[var(--ink-3)] break-all max-w-[120px] truncate">{user.email}</span>
          </div>

          <ChevronDown className={`w-3.5 h-3.5 text-[var(--ink-3)] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Card */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius)] shadow-[0_8px_24px_rgba(0,0,0,0.10)] py-2 z-50 transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-2 border-b border-[var(--border)]">
              <span className="font-mono text-[9px] text-[var(--ink-4)] uppercase tracking-widest block">Logged in as</span>
              <p className="font-semibold text-sm text-[var(--ink)] truncate">{user.username}</p>
              <p className="text-xs text-[var(--ink-3)] truncate">{user.email}</p>
            </div>
            
            <div className="px-4 py-1.5 xs:hidden">
              <span className={`inline-block font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                isTeacher ? 'bg-[var(--accent-3-light)] text-[var(--accent-3)] border-[var(--accent-3)]/20' : 'bg-[var(--accent-2-light)] text-[var(--accent-2)] border-[var(--accent-2)]/20'
              }`}>
                Role: {user.role}
              </span>
            </div>

            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--accent)] flex items-center gap-3.5 transition-colors duration-150"
            >
              <LogOut className="w-4 h-4 text-[var(--ink-3)] hover:text-[var(--accent)] shrink-0" />
              Sign Out
            </button>
          </div>
        )}

      </div>
    </header>
  );
}