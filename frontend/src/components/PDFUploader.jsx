// src/components/PDFUploader.jsx
import React, { useState, useRef } from 'react';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import StatusBadge from './StatusBadge';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  RefreshCw 
} from 'lucide-react';

/**
 * PDF Material Loader Component
 * Manages full lifecycle from initial drag-drop actions and upload operations
 * over to real-time status-monitoring polling of processing cycles.
 */
export default function PDFUploader({ courseId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | validation | uploading | processing | ready | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [processedDoc, setProcessedDoc] = useState(null);
  
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Clear polling setup
  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Perform PDF criteria verification
  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;
    
    // Validate File Type
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setErrorMsg('Invalid file type. Only PDF documents are processed.');
      setStatus('error');
      return false;
    }

    // Validate size limit (20MB)
    const maxSizeInBytes = 20 * 1024 * 1024;
    if (selectedFile.size > maxSizeInBytes) {
      setErrorMsg('File capacity exceeded. Maximum size permitted is 20MB.');
      setStatus('error');
      return false;
    }

    setErrorMsg('');
    return true;
  };

  // Drag listeners
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const isValid = validateFile(droppedFile);
      if (isValid) {
        setFile(droppedFile);
        setStatus('idle');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const isValid = validateFile(selectedFile);
      if (isValid) {
        setFile(selectedFile);
        setStatus('idle');
      }
    }
  };

  const selectFileManual = () => {
    fileInputRef.current.click();
  };

  const handleCancelFile = () => {
    clearPolling();
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setErrorMsg('');
    setProcessedDoc(null);
  };

  // Poll database status check
  const startStatusPolling = (docId) => {
    setStatus('processing');
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/api/documents/${docId}/`);
        const document = response.data;

        if (document.status === 'ready') {
          clearPolling();
          setStatus('ready');
          setProcessedDoc(document);
          if (onUploadSuccess) {
            onUploadSuccess(document);
          }
        } else if (document.status === 'error') {
          clearPolling();
          setStatus('error');
          setErrorMsg(document.error_message || 'An error occurred during embedding conversion processing.');
        }
      } catch (err) {
        // Polling failure, retry next cycle or fail after excessive attempts
        console.error('Document processing poll failure', err);
      }
    }, 3000); // 3-second cycle poll
  };

  // Initiate Document upload transaction
  const handleUploadSubmit = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace('.pdf', ''));
    formData.append('course_id', courseId);

    try {
      const response = await api.post('/api/documents/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      const document = response.data;
      // Start polling monitoring once upload finishes successfully
      startStatusPolling(document.id);
    } catch (err) {
      clearPolling();
      setStatus('error');
      setErrorMsg(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        'Upload transfer transaction failed. Please try again.'
      );
    }
  };

  return (
    <div className="w-full">
      
      {/* Primary Drop Field container */}
      {status === 'idle' && !file && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={selectFileManual}
          className={`
            border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center cursor-pointer transition-all duration-200
            ${dragActive 
              ? 'border-[var(--accent)] bg-[var(--accent-light)] scale-[0.99]' 
              : 'border-[var(--border)] bg-[var(--paper-2)] hover:border-[var(--accent-4)]/40 hover:bg-[var(--paper-3)]'
            }
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-[var(--paper)] rounded-lg border border-[var(--border)] shadow-sm text-[var(--accent)]">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="font-serif font-semibold text-lg text-[var(--ink)]">
                Upload Syllabus Materials
              </p>
              <p className="text-xs text-[var(--ink-3)] mt-1 font-sans">
                Drag and drop your PDF here, or <span className="text-[var(--accent)] underline font-medium">browse local files</span>
              </p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-4)] mt-2">
              Limit: PDF up to 20MB
            </span>
          </div>
        </div>
      )}

      {/* Selected File State Pending Action */}
      {status === 'idle' && file && (
        <div className="border border-[var(--border)] bg-[var(--paper-2)] rounded-[var(--radius-lg)] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[var(--paper)] border border-[var(--border)] rounded-md text-[var(--accent)] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-[var(--ink)] text-sm truncate max-w-[240px] md:max-w-md">
                {file.name}
              </p>
              <p className="text-xs text-[var(--ink-3)] font-mono">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={handleCancelFile}
              className="flex-1 sm:flex-none px-3.5 py-2 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--paper-3)] text-[var(--ink-2)] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadSubmit}
              style={{ background: 'linear-gradient(135deg, #d4620f 0%, var(--accent) 50%, #b8440a 100%)' }}
              className="flex-1 sm:flex-none px-4 py-2 text-xs text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            >
              Upload Material
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress Status View */}
      {status === 'uploading' && (
        <div className="border border-[var(--border)] bg-[var(--paper-2)] rounded-[var(--radius-lg)] p-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <LoadingSpinner size="sm" />
              <span className="text-sm font-medium text-[var(--ink-2)]">Uploading document to server...</span>
            </div>
            <span className="font-mono text-xs font-semibold text-[var(--accent)]">{progress}%</span>
          </div>
          <div className="w-full bg-[var(--paper-3)] h-2 rounded-full overflow-hidden">
            <div 
              style={{ width: `${progress}%` }}
              className="h-full bg-[var(--accent)] transition-all duration-200 ease-out"
            />
          </div>
        </div>
      )}

      {/* Embedding Chunk Extraction Polling Process status block */}
      {status === 'processing' && (
        <div className="border border-[var(--border)] bg-[var(--paper-2)] rounded-[var(--radius-lg)] p-6 text-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="md" label="Processing PDF content..." />
            <div className="max-w-sm">
              <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                Extracting course texts and generating semantic vectorized embeddings into PostgreSQL database...
              </p>
              <p className="text-xs text-[var(--ink-4)] font-mono mt-1.5 animate-pulse">
                Please wait. Do not close this panel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completed Success State View */}
      {status === 'ready' && (
        <div className="border border-[var(--accent-2)]/30 bg-[var(--accent-2-light)] rounded-[var(--radius-lg)] p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white rounded-md border border-[var(--accent-2)]/20 text-[var(--accent-2)] shrink-0 shadow-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-serif font-bold text-base text-[var(--ink)]">
                Document Indexed Successfully
              </h4>
              <p className="text-xs font-mono text-[var(--accent-2)] uppercase tracking-wider mt-0.5 mb-2">
                Syllabus material is complete and live
              </p>
              
              <div className="bg-white/60 border border-[var(--border)] rounded-md p-3 text-sm text-[var(--ink-2)] mb-4 max-w-md truncate">
                <span className="font-semibold block truncate">Title: {processedDoc?.title || file?.name}</span>
                {processedDoc?.chunks_count && (
                  <span className="text-xs text-[var(--ink-3)] font-mono block mt-0.5">
                    → Processed into {processedDoc.chunks_count} isolated learning embeddings.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelFile}
                  className="px-3.5 py-1.5 text-xs bg-white border border-[var(--border)] hover:bg-[var(--paper-2)] text-[var(--ink-2)] rounded-md font-medium transition-colors"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problematic Failure Error boundary block */}
      {status === 'error' && (
        <div className="border border-[var(--accent)]/30 bg-[var(--accent-light)] rounded-[var(--radius-lg)] p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white rounded-md border border-[var(--accent)]/20 text-[var(--accent)] shrink-0 shadow-sm">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-serif font-bold text-base text-[var(--ink)]">
                Ingestion Failed
              </h4>
              <p className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider mt-0.5 mb-2">
                Process interrupted
              </p>
              <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-4">
                {errorMsg || 'An unexpected server transaction failure has prevented parsing.'}
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelFile}
                  className="px-3.5 py-1.5 text-xs bg-white border border-[var(--border)] hover:bg-[var(--paper-2)] text-[var(--ink-2)] rounded-md font-medium transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}