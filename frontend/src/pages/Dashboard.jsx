import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCourses, getChatSessions, createCourse } from '../services/api';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
/**
Dashboard Component
A highly tailored workspace hub representing Tribhuvan University course profiles.
Features separate, context-rich dashboards for TEACHERS and STUDENTS.
*/
export default function Dashboard() {
const { user, isTeacher, isStudent } = useAuth();
const [courses, setCourses] = useState([]);
const [recentSessions, setRecentSessions] = useState([]);
const [isLoading, setIsLoading] = useState(true);
// Teacher-specific state for course creation form
const [showCreateForm, setShowCreateForm] = useState(false);
const [newTitle, setNewTitle] = useState('');
const [newCode, setNewCode] = useState('');
const [newDesc, setNewDesc] = useState('');
const [formErrors, setFormErrors] = useState({});
const [isSubmitting, setIsSubmitting] = useState(false);
// Fetch initial dashboard contents based on user role
useEffect(() => {
async function loadDashboardData() {
try {
setIsLoading(true);
const coursesResponse = await getCourses();
setCourses(coursesResponse.data || []);
code
Code
// If user is a student, we also pull their recent chat sessions to show on dashboard
    if (isStudent) {
      // Fetch sessions for their primary course, or iterate to gather recent ones
      const sessionsList = [];
      if (coursesResponse.data && coursesResponse.data.length > 0) {
        for (const course of coursesResponse.data.slice(0, 3)) {
          const res = await getChatSessions(course.id);
          if (res.data) {
            // Annotate session with course info
            const annotated = res.data.map(s => ({ ...s, courseName: course.title }));
            sessionsList.push(...annotated);
          }
        }
      }
      // Sort chronologically and keep top 4
      sessionsList.sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));
      setRecentSessions(sessionsList.slice(0, 4));
    }
  } catch (err) {
    // Interceptor handles main failures; local state gracefully handles silent fallback
  } finally {
    setIsLoading(false);
  }
}
if (user) {
  loadDashboardData();
}
}, [user]);
// Handle course creation (Teacher access only)
const handleCreateCourse = async (e) => {
e.preventDefault();
setFormErrors({});
code
Code
const errors = {};
if (!newTitle.trim()) errors.title = 'Course title is required';
if (!newCode.trim()) errors.code = 'A unique Course Code is required (e.g., CSC-301)';
if (!newDesc.trim()) errors.description = 'Provide a brief summary of the curriculum syllabus';

if (Object.keys(errors).length > 0) {
  setFormErrors(errors);
  return;
}

try {
  setIsSubmitting(true);
const res = await createCourse({
    title: newTitle.trim(),
    course_code: newCode.trim().toUpperCase(),
    description: newDesc.trim()
  });

  // Update state with newly created course card
  setCourses(prev => [res.data, ...prev]);
  
  // Reset form variables
  setNewTitle('');
  setNewCode('');
  setNewDesc('');
  setShowCreateForm(false);
} catch (err) {
  if (err.response && err.response.data) {
    setFormErrors({ server: err.response.data.detail || 'Failed to create course. Ensure code is unique.' });
  } else {
    setFormErrors({ server: 'Unable to communicate with the academic service.' });
  }
} finally {
  setIsSubmitting(false);
}
};
if (isLoading) {
return (
<div className="space-y-8 p-8 max-w-7xl mx-auto">
{/* Shimmer layout matching custom hierarchy */}
<div className="h-10 bg-[var(--paper-3)] rounded w-1/4 animate-pulse" />
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="h-32 bg-[var(--paper-3)] rounded-[var(--radius-lg)] animate-pulse" />
<div className="h-32 bg-[var(--paper-3)] rounded-[var(--radius-lg)] animate-pulse" />
<div className="h-32 bg-[var(--paper-3)] rounded-[var(--radius-lg)] animate-pulse" />
</div>
<div className="h-6 bg-[var(--paper-3)] rounded w-1/6 animate-pulse mt-12" />
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
<div className="h-48 bg-[var(--paper-3)] rounded-[var(--radius-lg)] animate-pulse" />
<div className="h-48 bg-[var(--paper-3)] rounded-[var(--radius-lg)] animate-pulse" />
<div className="h-48 bg-[var(--paper-3)] rounded-[var(--radius-lg)] animate-pulse" />
</div>
</div>
);
}
return (
<div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen">
code
Code
{/* Page Header Area with Page header gradient design system token */}
  <div 
    className="p-8 md:p-10 rounded-[var(--radius-lg)] text-white relative overflow-hidden"
    style={{ background: 'linear-gradient(135deg, #0f0e0c 0%, #2a1f14 100%)' }}
  >
    <div className="absolute inset-0 border-[2px] border-[var(--accent)] border-opacity-10 rounded-[var(--radius-lg)] m-2 pointer-events-none" />
    <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block mb-2">
      Tribhuvan University Portal Workspace
    </span>
    <h1 className="font-['Fraunces'] text-4xl font-bold tracking-tight mb-2">
      Namaste, {user?.username}
    </h1>
    <p className="font-['Plus_Jakarta_Sans'] text-sm text-[var(--paper-4)] max-w-2xl leading-relaxed">
      {isTeacher 
        ? 'Access your course syllabi documents, evaluate active extraction chunks, and distribute secure enrollment credentials to your student cohorts.'
        : 'Enroll in designated TU university modules, navigate dense syllabus volumes, and resolve deep conceptual queries instantly through localized source extraction.'
      }
    </p>
  </div>

  {/* Role-Based Numerical Statistics Strip */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 flex flex-col justify-between">
      <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-3)]">Active Modules</span>
      <span className="font-['Fraunces'] text-3xl font-bold text-[var(--ink)] mt-2">{courses.length}</span>
      <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)] mt-1">Syllabus segments initialized in repository</p>
    </div>

    {isTeacher ? (
      <>
        <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 flex flex-col justify-between">
          <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--accent-3)] font-semibold">Verification Keys</span>
          <span className="font-['Fraunces'] text-3xl font-bold text-[var(--ink)] mt-2">
            {courses.filter(c => c.course_code).length}
          </span>
          <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)] mt-1">Active class enrollment codes ready for distribution</p>
        </div>
        <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 flex flex-col justify-between">
          <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-3)]">System Platform role</span>
          <span className="font-['Fraunces'] text-lg font-semibold text-[var(--accent-3)] mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-3)]" />
            Faculty Syllabus Manager
          </span>
          <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)] mt-2">Authority to ingest courseware PDFs & trigger chunk engines</p>
        </div>
      </>
    ) : (
      <>
        <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 flex flex-col justify-between">
          <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--accent-2)] font-semibold">Active Inquiries</span>
          <span className="font-['Fraunces'] text-3xl font-bold text-[var(--ink)] mt-2">{recentSessions.length}</span>
          <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)] mt-1">Total workspace chat sessions recorded</p>
        </div>
        <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 flex flex-col justify-between">
          <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-3)]">System Platform role</span>
          <span className="font-['Fraunces'] text-lg font-semibold text-[var(--accent-2)] mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-2)]" />
            Verified Course Student
          </span>
          <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)] mt-2">Authority to run natural language chats over syllabus documents</p>
        </div>
      </>
    )}
  </div>

  {/* Main Core Section */}
  <div className="space-y-6">
    <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
      <div>
        <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block">
          Curriculum Registrations
        </span>
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[var(--ink)]">
          {isTeacher ? 'My Managed Courses' : 'My Enrolled Courses'}
        </h2>
      </div>

      {/* Quick Action Switches */}
      {isTeacher ? (
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="py-2.5 px-5 bg-[var(--accent-light)] border border-[var(--accent)] border-opacity-30 rounded-[var(--radius)] text-[var(--accent)] font-['Plus_Jakarta_Sans'] text-xs font-semibold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
        >
          {showCreateForm ? 'Close Workspace Wizard' : '✦ Add New Course Profile'}
        </button>
      ) : (
        <Link
          to="/enroll"
          className="py-2.5 px-5 bg-[var(--accent-2-light)] border border-[var(--accent-2)] border-opacity-30 rounded-[var(--radius)] text-[var(--accent-2)] font-['Plus_Jakarta_Sans'] text-xs font-semibold hover:bg-[var(--accent-2)] hover:text-white transition-all"
        >
          ✦ Enroll in Class with Code
        </Link>
      )}
    </div>

    {/* Teacher Inline Course Creation Panel */}
    {showCreateForm && isTeacher && (
      <div className="bg-[var(--paper-2)] border-[2px] border-[var(--accent)] border-opacity-30 rounded-[var(--radius-lg)] p-6 space-y-4">
        <h3 className="font-['Fraunces'] text-lg font-bold text-[var(--ink)]">
          Initialize New Academic Syllabus Module
        </h3>
        <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)]">
          Setup a structural module key. Once saved, you can immediately begin uploading official course PDFs.
        </p>

        <form onSubmit={handleCreateCourse} className="space-y-4">
          {formErrors.server && (
            <p className="p-3 bg-[var(--accent-light)] text-xs text-[var(--accent)] rounded-[var(--radius)] font-['Plus_Jakarta_Sans']">
              {formErrors.server}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-2)] mb-1.5">
                Course Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Advanced Software Engineering"
                className="w-full px-4 py-2 bg-[var(--paper)] border border-[var(--border)] rounded-[var(--radius)] text-xs focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
              />
              {formErrors.title && <p className="text-[11px] text-red-600 mt-1">{formErrors.title}</p>}
            </div>

            <div>
              <label className="block font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-2)] mb-1.5">
                Course Code (Syllabus Key)
              </label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g., CSC-351"
                className="w-full px-4 py-2 bg-[var(--paper)] border border-[var(--border)] rounded-[var(--radius)] text-xs focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
              />
              {formErrors.code && <p className="text-[11px] text-red-600 mt-1">{formErrors.code}</p>}
            </div>

            <div>
              <label className="block font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-2)] mb-1.5">
                Description Abstract
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g., Syllabus, reading lists, and structural targets"
                className="w-full px-4 py-2 bg-[var(--paper)] border border-[var(--border)] rounded-[var(--radius)] text-xs focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
              />
              {formErrors.description && <p className="text-[11px] text-red-600 mt-1">{formErrors.description}</p>}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-[var(--paper-3)] text-[var(--ink-2)] text-xs rounded-[var(--radius)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[#b8440a] text-white text-xs font-semibold rounded-[var(--radius)] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Module...' : 'Save Syllabus Module'}
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Empty States Handling */}
    {courses.length === 0 ? (
      <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center max-w-2xl mx-auto space-y-4">
        <span className="text-4xl block">❧</span>
        <h3 className="font-['Fraunces'] text-xl font-bold text-[var(--ink)]">
          No Curriculum Modules Found
        </h3>
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink-3)] leading-relaxed">
          {isTeacher
            ? "You haven't initialized any course modules yet. Once you register a syllabus profile, you can upload core readings and syllabi PDFs."
            : "You haven't enrolled in any active class profiles yet. Grab your professor's course enrollment key code to begin structural AI exploration."
          }
        </p>
        {isTeacher ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-2 inline-flex items-center gap-1 text-[var(--accent)] text-sm font-semibold hover:underline cursor-pointer"
          >
            Create your first course module →
          </button>
        ) : (
          <Link
            to="/enroll"
            className="mt-2 inline-flex items-center gap-1 text-[var(--accent-2)] text-sm font-semibold hover:underline"
          >
            Enter class enrollment code →
          </Link>
        )}
      </div>
    ) : (
      /* Grid of Available CourseCards */
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => (
          <Link to={`/courses/${course.id}`} key={course.id} className="group block focus:outline-none">
            <CourseCard course={course} />
          </Link>
        ))}
      </div>
    )}
  </div>

  {/* Student Recent Conversations Section */}
  {!isTeacher && recentSessions.length > 0 && (
    <div className="pt-6 border-t border-[var(--border)] space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block">
            Continuous Studies
          </span>
          <h2 className="font-['Fraunces'] text-xl font-bold text-[var(--ink)]">
            Recent Inquiry Workspaces
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recentSessions.map((session) => (
          <Link
            to={`/chat/${session.id}`}
            key={session.id}
            className="p-5 bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius)] hover:border-[var(--accent-4)] hover:bg-[var(--accent-4-light)] hover:bg-opacity-20 transition-all flex justify-between items-center group"
          >
            <div className="space-y-1">
              <span className="font-['DM_Mono'] text-[9px] uppercase text-[var(--accent-4)] font-semibold block">
                {session.courseName || 'Curriculum Syllabus Module'}
              </span>
              <h4 className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--accent-4)] transition-colors">
                {session.title || 'Untitled Session'}
              </h4>
              <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)]">
                Inquired on: {new Date(session.created_at || session.id).toLocaleDateString('np-NP', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <span className="text-[var(--border)] group-hover:text-[var(--accent-4)] text-lg transition-colors">→</span>
          </Link>
        ))}
      </div>
    </div>
  )}
</div>
);
}