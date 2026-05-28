
// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
/**
RegisterPage Component
Handles user account creation for Tribhuvan University RAG Study Assistant.
Provides intuitive, visual toggle between STUDENT and TEACHER roles,
with dynamic theme feedback matching the design system specifications.
*/
export default function RegisterPage() {
const navigate = useNavigate();
// Form states
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [role, setRole] = useState('student'); // Default role: student
// Error and UI states
const [errors, setErrors] = useState({});
const [serverError, setServerError] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
// Form validation logic on submit
const handleSubmit = async (e) => {
e.preventDefault();
setErrors({});
setServerError('');
code
Code
const newErrors = {};

// Fields validations
if (!username.trim()) {
  newErrors.username = 'Username is required';
} else if (username.trim().length < 3) {
  newErrors.username = 'Username must be at least 3 characters';
}

if (!email.trim()) {
  newErrors.email = 'Email address is required';
} else if (!/\S+@\S+\.\S+/.test(email)) {
  newErrors.email = 'Please provide a valid email address';
}

if (!password) {
  newErrors.password = 'Password is required';
} else if (password.length < 8) {
  newErrors.password = 'Password must be at least 8 characters';
}

if (password !== confirmPassword) {
  newErrors.confirmPassword = 'Passwords do not match';
}

if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors);
  return;
}

try {
  setIsSubmitting(true);
  await api.register({
    username: username.trim(),
    email: email.trim(),
    password,
    role,
  });

  setIsSuccess(true);
  // Wait briefly before redirecting to login so user can notice the success state
  setTimeout(() => {
    navigate('/login');
  }, 2000);
} catch (err) {
  if (err.response && err.response.data) {
    // Collect errors formatted from Django
    const data = err.response.data;
    if (typeof data === 'object') {
      const detailMessages = Object.entries(data)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`)
        .join(' ');
      setServerError(detailMessages || 'Registration failed. Please check inputs.');
    } else {
      setServerError(data.detail || 'An unexpected error occurred during signup.');
    }
  } else {
    setServerError('Network error. Unable to contact registration server.');
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
{/* Decorative border detail */}
<div className="absolute inset-0 pointer-events-none border-[12px] border-[var(--paper-3)] opacity-40 m-4" />
code
Code
<div className="w-full max-w-lg z-10">
    {/* Brand Header */}
    <div className="text-center mb-8">
      <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block mb-2">
        Tribhuvan University • Academic Signup
      </span>
      <h1 className="font-['Fraunces'] text-4xl font-bold text-[var(--ink)] leading-tight tracking-tight mb-2">
        Create Account
      </h1>
      <p className="font-['Plus_Jakarta_Sans'] text-[14px] text-[var(--ink-3)] max-w-sm mx-auto">
        Get instant contextual learning from authentic university curriculum structures.
      </p>
    </div>

    {/* Card Wrapper */}
    <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 md:p-10 shadow-sm transition-all duration-300">
      {isSuccess ? (
        <div className="text-center py-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-2-light)] flex items-center justify-center mx-auto">
            <span className="text-[var(--accent-2)] text-xl font-bold">✓</span>
          </div>
          <h3 className="font-['Fraunces'] text-2xl font-bold text-[var(--ink)]">
            Registration Complete!
          </h3>
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink-3)]">
            Your credentials have been recorded. Redirecting you to the portal login...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {serverError && (
            <div className="p-4 bg-[var(--accent-light)] border border-[var(--accent)] border-opacity-20 rounded-[var(--radius)] text-xs text-[var(--ink)] font-['Plus_Jakarta_Sans'] leading-normal">
              <strong>Error: </strong> {serverError}
            </div>
          )}

          {/* Role Selection Tabs */}
          <div>
            <label className="block font-['DM_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)] mb-3 font-medium">
              Select Portal Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Student Button Option */}
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex flex-col items-start p-4 rounded-[var(--radius)] border transition-all text-left cursor-pointer ${
                  role === 'student'
                    ? 'bg-[var(--accent-2-light)] border-[var(--accent-2)] border-opacity-50'
                    : 'bg-[var(--paper)] border-[var(--border)] hover:border-[var(--ink-4)]'
                }`}
              >
                <span className="font-['DM_Mono'] text-[9px] uppercase tracking-[0.12em] text-[var(--accent-2)] font-semibold mb-1">
                  Enrolled Student
                </span>
                <span className="font-['Fraunces'] text-sm font-bold text-[var(--ink)]">
                  Student Account
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)] mt-1 leading-normal">
                  Enroll in classes, run AI chat queries, and review syllabus chunks.
                </span>
              </button>

              {/* Teacher Button Option */}
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex flex-col items-start p-4 rounded-[var(--radius)] border transition-all text-left cursor-pointer ${
                  role === 'teacher'
                    ? 'bg-[var(--accent-3-light)] border-[var(--accent-3)] border-opacity-50'
                    : 'bg-[var(--paper)] border-[var(--border)] hover:border-[var(--ink-4)]'
                }`}
              >
                <span className="font-['DM_Mono'] text-[9px] uppercase tracking-[0.12em] text-[var(--accent-3)] font-semibold mb-1">
                  Faculty / Teacher
                </span>
                <span className="font-['Fraunces'] text-sm font-bold text-[var(--ink)]">
                  Syllabus Manager
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)] mt-1 leading-normal">
                  Upload curriculum PDFs, trigger chunk pipelines, monitor enrollments.
                </span>
              </button>
            </div>
          </div>

          {/* Basic input fields grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block font-['DM_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)] mb-2">
                Portal Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., ramesh_tu"
                className={`w-full px-4 py-2.5 bg-[var(--paper)] border ${
                  errors.username ? 'border-red-500' : 'border-[var(--border)]'
                } rounded-[var(--radius)] font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder-[var(--ink-4)]`}
                disabled={isSubmitting}
              />
              {errors.username && (
                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-red-600 font-medium">{errors.username}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block font-['DM_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)] mb-2">
                Official Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., user@tu.edu.np"
                className={`w-full px-4 py-2.5 bg-[var(--paper)] border ${
                  errors.email ? 'border-red-500' : 'border-[var(--border)]'
                } rounded-[var(--radius)] font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder-[var(--ink-4)]`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-red-600 font-medium">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label htmlFor="password" className="block font-['DM_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)] mb-2">
                Security Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={`w-full px-4 py-2.5 bg-[var(--paper)] border ${
                  errors.password ? 'border-red-500' : 'border-[var(--border)]'
                } rounded-[var(--radius)] font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder-[var(--ink-4)]`}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-red-600 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block font-['DM_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)] mb-2">
                Verify Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className={`w-full px-4 py-2.5 bg-[var(--paper)] border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-[var(--border)]'
                } rounded-[var(--radius)] font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder-[var(--ink-4)]`}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-red-600 font-medium">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-[var(--radius)] text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
            style={{
              background: 'linear-gradient(135deg, #d4620f 0%, var(--accent) 50%, #b8440a 100%)'
            }}
          >
            {isSubmitting ? 'Registering Account...' : 'Generate New Account Profile'}
          </button>
        </form>
      )}
    </div>

    {/* Bottom Switch page anchor */}
    <p className="text-center mt-6 font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)]">
      Already registered on this portal?{' '}
      <Link 
        to="/login" 
        className="text-[var(--accent)] font-semibold hover:underline transition-all duration-150"
      >
        Access account workspace →
      </Link>
    </p>
  </div>
</div>
);
}