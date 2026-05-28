// src/pages/DocumentManagerPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import PDFUploader from '../components/PDFUploader';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * DocumentManagerPage Component
 * Allows teachers to select a course, view its uploaded PDFs,
 * track background processing status via polling, and delete documents.
 */
export default function DocumentManagerPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Deletion Modal State
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keep a reference to the active polling interval
  const pollingIntervalRef = useRef(null);

  // Fetch all courses taught by the teacher
  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoadingCourses(true);
        const data = await api.getCourses();
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourseId(data[0].id.toString());
        }
      } catch (err) {
        setErrorMessage('Failed to load courses. Please refresh the page.');
      } finally {
        setIsLoadingCourses(false);
      }
    }
    fetchCourses();
  }, []);

  // Fetch documents for the selected course
  const fetchDocuments = useCallback(async (courseId) => {
    if (!courseId) return;
    try {
      setIsLoadingDocs(true);
      const data = await api.getDocuments(courseId);
      setDocuments(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage('Failed to fetch course documents.');
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // Watch selected course updates
  useEffect(() => {
    if (selectedCourseId) {
      fetchDocuments(selectedCourseId);
      setCurrentPage(1);
    }
  }, [selectedCourseId, fetchDocuments]);

  // Polling logic for handling "pending" and "processing" document states
  const checkProcessingStatus = useCallback(async () => {
    if (!selectedCourseId) return;
    try {
      const data = await api.getDocuments(selectedCourseId);
      setDocuments(data);
      
      // Stop polling if no documents are in an intermediate state
      const isStillProcessing = data.some(
        (doc) => doc.status === 'processing' || doc.status === 'pending'
      );
      if (!isStillProcessing && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } catch (err) {
      // Fail silently during background polling to protect UX
    }
  }, [selectedCourseId]);

  // Manage setup/teardown of polling interval based on current documents list
  useEffect(() => {
    const hasProcessingDocs = documents.some(
      (doc) => doc.status === 'processing' || doc.status === 'pending'
    );

    if (hasProcessingDocs && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(checkProcessingStatus, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [documents, checkProcessingStatus]);

  // Handle course dropdown changes
  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
  };

  // Callback triggered when a PDF finishes uploading
  const handleUploadSuccess = () => {
    fetchDocuments(selectedCourseId);
  };

  // Open confirmation dialog for document deletion
  const triggerDeleteConfirm = (doc) => {
    setDocToDelete(doc);
  };

  // Perform document deletion
  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteDocument(docToDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      setErrorMessage('Failed to delete the document. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine pagination bounds
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocs = documents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(documents.length / itemsPerPage);

  const selectedCourse = courses.find((c) => c.id.toString() === selectedCourseId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--accent)] uppercase block mb-2">
          Administration
        </span>
        <h1 className="font-serif text-4xl font-bold text-[var(--ink)] tracking-tight">
          Document Manager
        </h1>
        <p className="text-sm text-[var(--ink-3)] mt-2">
          Upload and organize your course syllabi, past exams, or reference PDFs. The backend processes text into chunks and vector embeddings.
        </p>
      </div>

      {/* Global error feedback */}
      {errorMessage && (
        <div className="p-4 bg-[var(--warn-light)] border border-[var(--border)] rounded-lg text-sm text-[var(--warn)] flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>{errorMessage}</div>
        </div>
      )}

      {isLoadingCourses ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner label="Loading course structure..." />
        </div>
      ) : courses.length === 0 ? (
        <div className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--paper-2)] p-12 text-center max-w-lg mx-auto">
          <svg className="w-12 h-12 text-[var(--ink-4)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="font-serif text-lg font-semibold text-[var(--ink)] mb-2">No Active Courses</h3>
          <p className="text-sm text-[var(--ink-3)] mb-6">
            You must create a course before you can manage and upload reference materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Selector & Uploader */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-4">
              <label htmlFor="course-select" className="font-mono text-[10px] tracking-[0.14em] text-[var(--ink-3)] uppercase block">
                Select Course Scope
              </label>
              <select
                id="course-select"
                className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--ink)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                value={selectedCourseId}
                onChange={handleCourseChange}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} — {course.title}
                  </option>
                ))}
              </select>

              {selectedCourse && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="font-mono text-[9px] text-[var(--ink-4)] uppercase tracking-widest block">Course Code</span>
                  <span className="font-mono text-xs text-[var(--accent)] font-semibold select-all block mt-0.5">
                    {selectedCourse.course_code}
                  </span>
                </div>
              )}
            </div>

            {selectedCourseId && (
              <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-4">
                <h3 className="font-serif text-base font-semibold text-[var(--ink)]">
                  Add Material
                </h3>
                <PDFUploader
                  courseId={selectedCourseId}
                  onUploadSuccess={handleUploadSuccess}
                />
              </div>
            )}
          </div>

          {/* Right Column: Documents Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
              <div className="p-6 border-b border-[var(--border)]">
                <h3 className="font-serif text-lg font-semibold text-[var(--ink)]">
                  Documents List
                </h3>
                <p className="text-xs text-[var(--ink-3)] mt-1">
                  Click delete to permanently wipe files and their associated database text fragments.
                </p>
              </div>

              {isLoadingDocs ? (
                <div className="p-12 flex justify-center">
                  <LoadingSpinner label="Fetching materials..." />
                </div>
              ) : documents.length === 0 ? (
                <div className="p-12 text-center text-[var(--ink-3)] text-sm space-y-2">
                  <svg className="w-10 h-10 text-[var(--ink-4)] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <p>No documents uploaded yet. Upload a PDF to start.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-[var(--paper-3)] border-b border-[var(--border)] font-mono text-[10px] text-[var(--ink-3)] uppercase tracking-wider">
                          <th className="py-3 px-6">File Name</th>
                          <th className="py-3 px-6">Status</th>
                          <th className="py-3 px-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {currentDocs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-[var(--paper-3)] transition-colors">
                            <td className="py-4 px-6 max-w-xs md:max-w-sm">
                              <div className="flex items-center gap-3">
                                <svg className="w-6 h-6 shrink-0 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <div className="truncate">
                                  <div className="font-semibold text-[var(--ink)] truncate" title={doc.title || doc.file_name}>
                                    {doc.title || doc.file_name}
                                  </div>
                                  <div className="text-xs text-[var(--ink-4)] font-mono uppercase mt-0.5">
                                    Size: {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap">
                              <StatusBadge status={doc.status} />
                              {(doc.status === 'processing' || doc.status === 'pending') && (
                                <span className="inline-block animate-pulse text-[var(--accent)] text-xs ml-2 font-mono">
                                  polling...
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <button
                                onClick={() => triggerDeleteConfirm(doc)}
                                className="text-[var(--ink-3)] hover:text-red-600 transition-colors p-1"
                                title="Delete Document"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="p-4 flex items-center justify-between border-t border-[var(--border)] bg-[var(--paper-2)]">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-xs font-semibold border border-[var(--border)] rounded bg-[var(--paper)] text-[var(--ink-2)] disabled:opacity-50 transition-colors hover:bg-[var(--paper-3)]"
                      >
                        Prev
                      </button>
                      <span className="font-mono text-xs text-[var(--ink-3)]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-xs font-semibold border border-[var(--border)] rounded bg-[var(--paper)] text-[var(--ink-2)] disabled:opacity-50 transition-colors hover:bg-[var(--paper-3)]"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--paper)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] max-w-md w-full p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[var(--ink)]">
                Confirm Deletion
              </h3>
              <p className="text-sm text-[var(--ink-2)]">
                Are you sure you want to delete <strong className="text-red-700">{docToDelete.title || docToDelete.file_name}</strong>? This action will permanently remove all embedded vectors and text chunks. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold border border-[var(--border)] rounded-[var(--radius)] text-[var(--ink-2)] hover:bg-[var(--paper-3)] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDoc}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold rounded-[var(--radius)] text-white bg-red-700 hover:bg-red-800 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <LoadingSpinner label="" /> : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}