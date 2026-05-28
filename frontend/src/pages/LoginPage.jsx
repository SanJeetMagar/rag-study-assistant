
// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
/**
LoginPage Component
Provides a highly polished, secure login interface featuring authentic
Tribhuvan University visual branding, role context, and strict form validation.
*/
export default function LoginPage() {
const { login } = useAuth();
const navigate = useNavigate();
// Form states
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [errors, setErrors] = useState({});
const [serverError, setServerError] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
// Form submission handler with client-side validation
const handleSubmit = async (e) => {
e.preventDefault();
setErrors({});
setServerError('');
code
Code
const newErrors = {};
if (!username.trim()) {
  newErrors.username = 'Username or email address is required';
}
if (!password) {
  newErrors.password = 'Password is required';
}

if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors);
  return;
}

try {
  setIsSubmitting(true);
  await login(username.trim(), password);
  // AuthContext handles token persistence and user redirect via state updates.
  // We navigate directly to the application dashboard upon successful login.
  navigate('/dashboard');
} catch (err) {
  if (err.response && err.response.data) {
    setServerError(err.response.data.detail || 'Invalid username or password credentials.');
  } else {
    setServerError('Unable to connect to the authentication server. Please check your internet connection.');
  }
} finally {
  setIsSubmitting(false);
}
};
return (
<div
className="min-h-screen w-full flex items-center justify-center px-4 py-12 relative overflow-hidden"
style={{
background: 'radial-gradient(ellipse at 30% 20%, rgba(200,81,10,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(26,61,107,0.05) 0%, transparent 60%), var(--paper)'
}}
>
{/* Decorative Traditional Border Detail */}
<div className="absolute inset-0 pointer-events-none border-[12px] border-[var(--paper-3)] opacity-40 m-4" />
code
Code
<div className="w-full max-w-md z-10">
    {/* Brand Header */}
    <div className="text-center mb-10">
      <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block mb-2">
        Tribhuvan University • Study Assistant Portal
      </span>
      <h1 className="font-['Fraunces'] text-4xl font-bold text-[var(--ink)] leading-tight tracking-tight mb-3">
        Welcome Back
      </h1>
      <p className="font-['Plus_Jakarta_Sans'] text-[14px] text-[var(--ink-3)] leading-relaxed max-w-sm mx-auto">
        Log in to access your course syllabi, processing pipelines, and AI-powered learning workspace.
      </p>
    </div>

    {/* Auth Card Container */}
    <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 md:p-10 shadow-sm relative transition-all duration-300 hover:border-[var(--ink-4)]">
      {serverError && (
        <div className="mb-6 p-4 bg-[var(--accent-light)] border border-[var(--accent)] border-opacity-20 rounded-[var(--radius)] flex items-start gap-3">
          <span className="text-[var(--accent)] font-bold text-lg leading-none mt-0.5">✦</span>
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink)] leading-normal">
            {serverError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username/Email Input */}
        <div>
          <label 
            htmlFor="username" 
            className="block font-['DM_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)] mb-2 font-medium"
          >
            Username or Email
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., ramesh.upadhyaya"
            className={`w-full px-4 py-3 bg-[var(--paper)] border ${
              errors.username ? 'border-red-500' : 'border-[var(--border)]'
            } rounded-[var(--radius)] font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent placeholder-[var(--ink-4)]`}
            disabled={isSubmitting}
          />
          {errors.username && (
            <p className="mt-1.5 font-['Plus_Jakarta_Sans'] text-xs text-red-600 font-medium">
              {errors.username}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label 
              htmlFor="password" 
              className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)] font-medium"
            >
              Password
            </label>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className={`w-full px-4 py-3 bg-[var(--paper)] border ${
              errors.password ? 'border-red-500' : 'border-[var(--border)]'
            } rounded-[var(--radius)] font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent placeholder-[var(--ink-4)]`}
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="mt-1.5 font-['Plus_Jakarta_Sans'] text-xs text-red-600 font-medium">
              {errors.password}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-[var(--radius)] text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          style={{
            background: 'linear-gradient(135deg, #d4620f 0%, var(--accent) 50%, #b8440a 100%)'
          }}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <span>Log In to Assistant</span>
          )}
        </button>
      </form>

      {/* Quick Info Block showing distinct role context */}
      <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap justify-center gap-4 text-[11px] font-['DM_Mono'] uppercase tracking-wider text-[var(--ink-3)] text-center">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-3)]"></span>
          Teachers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)]"></span>
          Students
        </span>
      </div>
    </div>

    {/* Footer Link */}
    <p className="text-center mt-6 font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)]">
      First time accessing the portal?{' '}
      <Link 
        to="/register" 
        className="text-[var(--accent)] font-semibold hover:underline transition-all duration-150"
      >
        Create an account →
      </Link>
    </p>
  </div>
</div>
);
}