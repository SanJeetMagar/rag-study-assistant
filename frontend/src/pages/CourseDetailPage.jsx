
// src/pages/CourseDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCourseDetail, getDocuments, getChatSessions, createChatSession, deleteDocument, deleteCourse } from '../services/api';
import PDFUploader from '../components/PDFUploader';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
/**
CourseDetailPage Component
Renders high-fidelity, contextual syllabus configuration profiles.
Adapts to TEACHER role (pipeline control, documents, statistics)
and STUDENT role (active query archives, interactive sandbox launcher).
*/
export default function CourseDetailPage() {
const { id } = useParams();
const navigate = useNavigate();
const { user, isTeacher, isStudent } = useAuth();
// Core Data States
const [course, setCourse] = useState(null);
const [documents, setDocuments] = useState([]);
const [sessions, setSessions] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState('');
// UI Interactive States
const [isDeletingDocId, setIsDeletingDocId] = useState(null);
const [isDeletingCourse, setIsDeletingCourse] = useState(false);
const [isCreatingSession, setIsCreatingSession] = useState(false);
const [isCopied, setIsCopied] = useState(false);
// Load course properties, documents list, and past discussion threads
const loadCourseContext = async () => {
try {
setErrorMessage('');
const courseRes = await getCourseDetail(id);
setCourse(courseRes.data);
code
Code
const docsRes = await getDocuments(id);
  setDocuments(docsRes.data || []);

  if (isStudent) {
    const sessRes = await getChatSessions(id);
    setSessions(sessRes.data || []);
  }
} catch (err) {
  setErrorMessage('Unable to load syllabus module metadata details.');
} finally {
  setIsLoading(false);
}
};
useEffect(() => {
if (id && user) {
loadCourseContext();
}
}, [id, user]);
// Polling Pipeline Hook: Monitor status changes of documents that are 'processing' or 'pending'
useEffect(() => {
const hasActivePipeline = documents.some(
(doc) => doc.status === 'processing' || doc.status === 'pending'
);
code
Code
if (!hasActivePipeline) return;

// Establish polling interval of 3 seconds to fetch document lists
const interval = setInterval(async () => {
  try {
    const res = await getDocuments(id);
    setDocuments(res.data || []);
  } catch (err) {
    // Suppress polling errors to preserve visual persistence
  }
}, 3000);

return () => clearInterval(interval);
}, [documents, id]);
// Trigger clipboard copy action for student code allocation
const handleCopyCode = () => {
if (!course?.course_code) return;
navigator.clipboard.writeText(course.course_code);
setIsCopied(true);
setTimeout(() => setIsCopied(false), 2000);
};
// Launch fresh, localized Chat workspace environment (Student only)
const handleStartInquirySession = async () => {
try {
setIsCreatingSession(true);
const today = new Date().toLocaleDateString('np-NP', { month: 'short', day: 'numeric', year: 'numeric' });
code
Code
  const res = await createChatSession({
    course_id: id,
    title: `Discussion Workspace - ${today}`
  });

  // Redirect student instantly to live chat UI
  navigate(`/chat/${res.data.id}?course=${id}`);
} catch (err) {
  setErrorMessage('Could not initiate a secure chat session.');
} finally {
  setIsCreatingSession(false);
}
};
// Syllabus PDF upload hook trigger
const handleUploadSuccess = (uploadedDoc) => {
setDocuments((prev) => [uploadedDoc, ...prev]);
};
// Delete document action workflow
const handleDeleteDocument = async (docId) => {
try {
await deleteDocument(docId);
setDocuments((prev) => prev.filter((d) => d.id !== docId));
setIsDeletingDocId(null);
} catch (err) {
setErrorMessage('Failed to delete selected syllabus file.');
}
};
// Delete entire course module (Teacher only)
const handleDeleteCourse = async () => {
try {
await deleteCourse(id);
navigate('/dashboard');
} catch (err) {
setErrorMessage('Failed to delete entire course module.');
} finally {
setIsDeletingCourse(false);
}
};
if (isLoading) {
return (
<div className="space-y-8 p-8 max-w-5xl mx-auto">
<div className="h-6 bg-[var(--paper-3)] rounded w-1/12 animate-pulse" />
<div className="space-y-3">
<div className="h-10 bg-[var(--paper-3)] rounded w-1/3 animate-pulse" />
<div className="h-4 bg-[var(--paper-3)] rounded w-2/3 animate-pulse" />
</div>
<div className="h-72 bg-[var(--paper-3)] rounded-[var(--radius-lg)] animate-pulse" />
</div>
);
}
return (
<div className="p-8 max-w-5xl mx-auto space-y-10 min-h-screen">
code
Code
{/* Return to Dashboard Trigger */}
  <div>
    <Link 
      to="/dashboard" 
      className="font-['DM_Mono'] text-[10px] uppercase tracking-widest text-[var(--ink-3)] hover:text-[var(--accent)] font-semibold transition-all"
    >
      ← Return to Portal Workspace
    </Link>
  </div>

  {/* Global Local Workspace Error Bar */}
  {errorMessage && (
    <div className="p-4 bg-[var(--accent-light)] border border-[var(--accent)] border-opacity-20 rounded-[var(--radius)] flex items-start gap-3">
      <span className="text-[var(--accent)] font-bold text-lg leading-none mt-0.5">✦</span>
      <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink)] leading-normal">{errorMessage}</p>
    </div>
  )}

  {/* 1. Header Information Block */}
  <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-[var(--border)] pb-8">
    <div className="space-y-3">
      <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block">
        Academic Unit Specification
      </span>
      <h1 className="font-['Fraunces'] text-4xl font-bold text-[var(--ink)] tracking-tight">
        {course?.title}
      </h1>
      <p className="font-['Plus_Jakarta_Sans'] text-sm text-[var(--ink-2)] max-w-3xl leading-relaxed">
        {course?.description || 'No general description provided for this academic syllabus profile.'}
      </p>
    </div>

    {/* Action Widgets - Code Display & Delete Modules */}
    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[220px]">
      {isTeacher ? (
        <>
          {/* Copyable Course Code Display */}
          <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius)] p-4 space-y-1.5">
            <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-3)] block">
              Class Access Code
            </span>
            <div className="flex items-center justify-between gap-3">
              <span className="font-['DM_Mono'] text-sm font-bold text-[var(--accent)] tracking-wider">
                {course?.course_code}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-[var(--accent-light)] border border-[var(--accent)] border-opacity-25 rounded text-[10px] text-[var(--accent)] font-semibold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
              >
                {isCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Delete Course Button */}
          <button
            onClick={() => setIsDeletingCourse(true)}
            className="py-2 px-3 text-red-600 hover:text-red-800 text-[11px] font-['DM_Mono'] uppercase tracking-wider text-center cursor-pointer transition-all border border-transparent hover:border-red-200 hover:bg-red-50 rounded"
          >
            ❧ Discard Syllabus Module
          </button>
        </>
      ) : (
        /* Student stats column block */
        <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-2">
          <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-3)] block">
            Module Profile Status
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-2)]" />
            <span className="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[var(--ink)]">
              Enrolled & Active
            </span>
          </div>
        </div>
      )}
    </div>
  </div>

  {/* 2. Interactive Role Divisions */}
  {isTeacher ? (
    /* TEACHER COMPONENT LAYOUT: PDF Uploaders & Pipeline Document List */
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      
      {/* Left panel: Live Syllabus File Pipeline Upload Form */}
      <div className="lg:col-span-1 space-y-6">
        <div className="space-y-2">
          <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block">
            Resource Ingestion
          </span>
          <h3 className="font-['Fraunces'] text-xl font-bold text-[var(--ink)]">
            Upload New Readings
          </h3>
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)] leading-relaxed">
            Add authentic TU curriculum documents in PDF format. Raw text will be tokenized, broken down into semantic vectors, and stored to fuel the context engine.
          </p>
        </div>

        {/* Custom PDF Drag and Drop component */}
        <PDFUploader courseId={id} onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Right panel: Table displaying active files and status pipelines */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-1">
          <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block">
            Active Corpus Library
          </span>
          <h3 className="font-['Fraunces'] text-xl font-bold text-[var(--ink)]">
            Syllabus Source Documents ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center space-y-3">
            <span className="text-3xl block">❧</span>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)] leading-relaxed max-w-sm mx-auto">
              No syllabus documents have been linked to this course yet. Use the PDF uploader container on the left to initialize documents.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--paper-3)] border-b border-[var(--border)]">
                  <th className="p-4 font-['DM_Mono'] text-[10px] uppercase tracking-wider text-[var(--ink-3)]">Document File Name</th>
                  <th className="p-4 font-['DM_Mono'] text-[10px] uppercase tracking-wider text-[var(--ink-3)]">Status Badge</th>
                  <th className="p-4 font-['DM_Mono'] text-[10px] uppercase tracking-wider text-[var(--ink-3)] text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[var(--paper-3)] transition-colors">
                    <td className="p-4 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[var(--ink)] max-w-xs truncate">
                      {doc.title || doc.file_name || 'Untitled Core PDF'}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="p-4 text-right">
                      {isDeletingDocId === doc.id ? (
                        <div className="flex gap-2 justify-end items-center">
                          <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--accent)] font-semibold">Confirm?</span>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[10px] hover:bg-red-700 cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setIsDeletingDocId(null)}
                            className="px-2 py-1 bg-[var(--paper-4)] text-[var(--ink-2)] rounded text-[10px] cursor-pointer"
                          >
                            Stop
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsDeletingDocId(doc.id)}
                          className="font-['DM_Mono'] text-[10px] text-red-600 uppercase tracking-wider hover:underline hover:text-red-700 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  ) : (
    /* STUDENT COMPONENT LAYOUT: AI Sandboxes and past conversation logs */
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      
      {/* Left panel: Large Call-to-Action to boot a new discussion sandbox */}
      <div className="lg:col-span-1">
        <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-6">
          <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--accent-4)] font-bold block">
            ✦ Assistant Interactive Terminal
          </span>
          <h3 className="font-['Fraunces'] text-2xl font-bold text-[var(--ink)]">
            Query Syllabus
          </h3>
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)] leading-relaxed">
            Connect directly with our semantic workspace. Chat outputs are verified through localized mathematical references derived entirely from authenticated TU syllabus content.
          </p>

          <button
            onClick={handleStartInquirySession}
            disabled={isCreatingSession}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #d4620f 0%, var(--accent) 50%, #b8440a 100%)' }}
          >
            {isCreatingSession ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Spinning workspace...</span>
              </>
            ) : (
              <span>Launch Study Workspace</span>
            )}
          </button>
        </div>
      </div>

      {/* Right panel: Archive lists of past discussions in this specific course */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-1">
          <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold block">
            Conversational Logs
          </span>
          <h3 className="font-['Fraunces'] text-xl font-bold text-[var(--ink)]">
            My Discussion History
          </h3>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center space-y-3">
            <span className="text-3xl block">❧</span>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)] leading-relaxed max-w-sm mx-auto">
              You have not launched any study discussions within this syllabus profile yet. Use the dashboard panel on the left to initiate your first RAG inquiry.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((sess) => (
              <Link
                key={sess.id}
                to={`/chat/${sess.id}?course=${id}`}
                className="p-5 bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius)] hover:border-[var(--accent-4)] hover:bg-[var(--accent-4-light)] hover:bg-opacity-15 transition-all flex justify-between items-center group block"
              >
                <div>
                  <h4 className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--accent-4)] transition-all">
                    {sess.title || 'Untitled Discussion'}
                  </h4>
                  <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[var(--ink-3)] mt-1">
                    Inaugurated: {new Date(sess.created_at || sess.id).toLocaleDateString('np-NP', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-[var(--border)] group-hover:text-[var(--accent-4)] transition-colors text-lg">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )}

  {/* Confirmation Overlay Modal: Destroying Entire Course Module */}
  {isDeletingCourse && (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--paper-2)] border border-[var(--border)] max-w-md w-full rounded-[var(--radius-lg)] p-8 space-y-6 shadow-xl">
        <h3 className="font-['Fraunces'] text-xl font-bold text-[var(--ink)]">
          Discard Syllabus Module?
        </h3>
        <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)] leading-relaxed">
          This action is fully destructive. All underlying documents, parsed embeddings, chunk data, and student chat history records affiliated with this course identifier will be purged from the central database.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setIsDeletingCourse(false)}
            className="px-4 py-2 bg-[var(--paper-3)] text-[var(--ink-2)] text-xs rounded-[var(--radius)] cursor-pointer"
          >
            No, Preserve Module
          </button>
          <button
            onClick={handleDeleteCourse}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-[var(--radius)] cursor-pointer"
          >
            Purge Course System
          </button>
        </div>
      </div>
    </div>
  )}

</div>
);
}