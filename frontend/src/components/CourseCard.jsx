// src/components/CourseCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';

/**
 * Reusable Course Display Card
 * Implements strict design system requirements: Fraunces typography for course title,
 * DM Mono for course code details, paper styling cards, and subtle hover shimmer effects.
 */
export default function CourseCard({ course, studentCount, status }) {
  const { id, title, description, course_code } = course;

  return (
    <Link
      to={`/courses/${id}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        background: 'var(--paper-2)',
      }}
      className="group relative block p-7 transition-all duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-[var(--accent)] overflow-hidden"
    >
      {/* Hover Background Shimmer Gradient effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, var(--paper-2) 0%, var(--accent-light) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between gap-5">
        {/* Metadata and Badge Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
              TU Course
            </span>
          </div>
          
          {/* Unique course system identifier code in monospace formatting */}
          <span className="font-mono text-[10px] font-semibold tracking-wider bg-[var(--paper-4)] text-[var(--ink-2)] px-2 py-0.5 rounded border border-[var(--border)]">
            {course_code}
          </span>
        </div>

        {/* Content Block */}
        <div>
          {/* Course Card Title - Fraunces Heading */}
          <h3 className="font-serif text-[20px] font-bold text-[var(--ink)] leading-tight mb-2 group-hover:text-[var(--accent)] transition-colors duration-200">
            {title}
          </h3>
          
          {/* Description Snippet */}
          <p className="text-[14px] text-[var(--ink-3)] line-clamp-2 leading-relaxed">
            {description || 'No course syllabus description provided.'}
          </p>
        </div>

        {/* Footer info row */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] text-xs text-[var(--ink-3)]">
          
          {/* Student enrollment context counter */}
          {studentCount !== undefined ? (
            <div className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-[var(--ink-4)]" />
              <span>{studentCount} Enrolled</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-4 h-4 text-[var(--ink-4)]" />
              <span>Syllabus material ready</span>
            </div>
          )}

          {/* Direct interaction vector */}
          <div className="flex items-center gap-0.5 font-medium text-[var(--accent)] group-hover:translate-x-1 transition-transform duration-200">
            <span>Explore</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}