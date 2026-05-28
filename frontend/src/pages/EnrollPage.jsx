// src/pages/EnrollPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * EnrollPage Component
 * Allows Tribhuvan University students to enroll in course syllabus spaces 
 * using a unique 6-character/alphanumeric code shared by their teacher.
 */
export default function EnrollPage() {
  const navigate = useNavigate();
  const [courseCode, setCourseCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successCourse, setSuccessCourse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic Client-side Validation
    const trimmedCode = courseCode.trim();
    if (!trimmedCode) {
      setErrorMessage('Please enter a valid course code.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Step 1: Scan all course IDs to see which one matches this code, since backend requires course ID for enrollment.
      const allCourses = await api.getCourses();
      const matchedCourse = allCourses.find(
        (c) => c.course_code.toUpperCase() === trimmedCode.toUpperCase()
      );

      if (!matchedCourse) {
        throw new Error('Course code not found or invalid.');
      }

      // Step 2: Call enrollment endpoint
      await api.enrollInCourse(matchedCourse.id, trimmedCode);
      
      setSuccessCourse(matchedCourse);
      
      // Redirect to Dashboard after 2.5 seconds to display progress
      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);

    } catch (err) {
      const serverMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
      setErrorMessage(serverMessage || 'Failed to enroll in course. Double check your code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[radial-gradient(ellipse_at_30%_20%,rgba(200,81,10,0.04)_0%,transparent_60%),radial-gradient(ellipse_at_70%_80%,rgba(26,61,107,0.03)_0%,transparent_60%)]">
      <div className="max-w-md w-full bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-6">
        
        {/* Decorative Badge */}
        <div className="text-center">
          <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--accent)] uppercase block mb-3">
            Syllabus Assistant
          </span>
          <h1 className="font-serif text-3xl font-bold text-[var(--ink)] tracking-tight">
            Enroll in a Course
          </h1>
          <p className="text-sm text-[var(--ink-3)] mt-2">
            Enter the enrollment code provided by your instructor to begin interrogating your course syllabi.
          </p>
        </div>

        {/* Success Visual */}
        {successCourse ? (
          <div className="p-6 bg-[var(--accent-2-light)] border border-[var(--accent-2)]/20 rounded-[var(--radius)] text-center space-y-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-[var(--accent-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[var(--ink)]">
                Successfully Enrolled!
              </h3>
              <p className="text-sm text-[var(--ink-2)]">
                You are now active in <strong className="text-[var(--accent-3)]">{successCourse.title}</strong>.
              </p>
              <p className="text-xs text-[var(--ink-4)] italic pt-1">
                Redirecting you to your dashboard...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="course_code" className="font-mono text-[10px] tracking-[0.14em] text-[var(--ink-3)] uppercase block">
                Enrollment Code
              </label>
              <input
                id="course_code"
                type="text"
                placeholder="e.g. TU-CS401"
                required
                disabled={isSubmitting}
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className={`w-full bg-[var(--paper)] border ${
                  errorMessage ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)]'
                } rounded-[var(--radius)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:ring-2 transition-all font-mono uppercase text-center tracking-widest`}
              />
              {errorMessage && (
                <div className="text-xs text-red-600 mt-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !courseCode.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 font-sans text-sm font-semibold rounded-[var(--radius)] text-white bg-gradient-to-r from-[#d4620f] via-[#c8510a] to-[#b8440a] hover:opacity-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <LoadingSpinner label="Locating Syllabus..." />
              ) : (
                <>
                  <span>Join Class Syllabus Space</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* Security & System Info Footer */}
        <div className="pt-4 border-t border-[var(--border)] flex items-start gap-3">
          <svg className="w-5 h-5 text-[var(--ink-4)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-[var(--ink-3)] leading-relaxed">
            Tribhuvan University RAG Platform. Code registration enforces strict isolated RBAC access. AI operations are limited specifically to authorized course PDF artifacts.
          </p>
        </div>

      </div>
    </div>
  );
}