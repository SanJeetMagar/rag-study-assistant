
// src/pages/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCourses, getChatSessions, getCourseDetail, createChatSession, askQuestion, getSessionMessages } from '../services/api';
import MessageBubble from '../components/MessageBubble';
import LoadingSpinner from '../components/LoadingSpinner';
/**
ChatPage Component
Full-screen responsive chat workspace where student users engage
in natural language QA with uploaded syllabus materials.
*/
export default function ChatPage() {
const { sessionId } = useParams();
const navigate = useNavigate();
const location = useLocation();
const { user } = useAuth();
// Role Gate: Redirect teachers back to dashboard
useEffect(() => {
if (user && user.role !== 'student') {
navigate('/dashboard');
}
}, [user, navigate]);
// States
const [messages, setMessages] = useState([]);
const [sessions, setSessions] = useState([]);
const [currentSession, setCurrentSession] = useState(null);
const [course, setCourse] = useState(null);
const [inputValue, setInputValue] = useState('');
const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);
const [isLoadingChat, setIsLoadingChat] = useState(true);
const [isSending, setIsSending] = useState(false);
const [errorMessage, setErrorMessage] = useState('');
// Scroll anchor reference
const chatBottomRef = useRef(null);
// Extract optional courseId from Query parameters (e.g., ?course=5)
const queryParams = new URLSearchParams(location.search);
const courseIdParam = queryParams.get('course');
// Auto-scroll utility
const scrollToBottom = () => {
chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
};
useEffect(() => {
scrollToBottom();
}, [messages, isSending]);
// Load chat session history and active conversation details
useEffect(() => {
let activeCourseId = courseIdParam;
code
Code
async function initializeWorkspace() {
  try {
    setIsLoadingChat(true);
    setErrorMessage('');

    // 1. Fetch current conversation stream
    const msgRes = await getSessionMessages(sessionId);
    const fetchedMessages = msgRes.data || [];
    setMessages(fetchedMessages);

    // 2. Discover Parent Course configuration
    if (!activeCourseId) {
      // If courseId is not explicitly in URL params, check courses to find this active session
      const coursesRes = await getCourses();
      const userCourses = coursesRes.data || [];
      
      for (const c of userCourses) {
        const sessRes = await getChatSessions(c.id);
        const match = sessRes.data?.find(s => String(s.id) === String(sessionId));
        if (match) {
          activeCourseId = c.id;
          setCourse(c);
          setCurrentSession(match);
          break;
        }
      }
    } else {
      // Resolve course info directly if provided
      const courseRes = await getCourseDetail(activeCourseId);
      setCourse(courseRes.data);
      
      const sessRes = await getChatSessions(activeCourseId);
      const activeSess = sessRes.data?.find(s => String(s.id) === String(sessionId));
      if (activeSess) setCurrentSession(activeSess);
    }

    // 3. Populate sidebar list of historical workspaces for this specific course
    if (activeCourseId) {
      setIsLoadingSidebar(true);
      const sessListRes = await getChatSessions(activeCourseId);
      setSessions(sessListRes.data || []);
    }
  } catch (err) {
    setErrorMessage('Failed to configure workspace context correctly. Refresh the page.');
  } finally {
    setIsLoadingChat(false);
    setIsLoadingSidebar(false);
  }
}

if (sessionId && user) {
  initializeWorkspace();
}
}, [sessionId, user, courseIdParam]);
// Trigger quick new chat session in the active module
const handleStartNewSession = async () => {
if (!course) return;
try {
setIsLoadingSidebar(true);
const todayString = new Date().toLocaleDateString('np-NP', { month: 'short', day: 'numeric', year: 'numeric' });
const res = await createChatSession({
course_id: course.id,
title: `Discussion - ${todayString}`
});
// Redirect to the newly generated conversation environment
navigate(`/chat/${res.data.id}?course=${course.id}`);
} catch (err) {
setErrorMessage('Unable to initialize a new conversation workspace.');
} finally {
setIsLoadingSidebar(false);
}
};
// Dispatch natural language inquiry to Django backend
const handleSendMessage = async (e) => {
e.preventDefault();
if (!inputValue.trim() || isSending || !course) return;
code
Code
const userText = inputValue.trim();
setInputValue('');
setErrorMessage('');

// Append client message instantly to preserve UI fluidity
const temporaryUserMessage = {
  id: `temp-user-${Date.now()}`,
  sender: 'student',
  text: userText,
  created_at: new Date().toISOString()
};
setMessages(prev => [...prev, temporaryUserMessage]);

try {
  setIsSending(true);

  const response = await askQuestion({
    question: userText,
    course_id: course.id,
    session_id: sessionId
  });

  // Append real response containing the text and retrieved document source metadata
  const aiResponse = {
    id: `ai-${Date.now()}`,
    sender: 'ai',
    text: response.data.answer,
    chunks_used: response.data.chunks_used,
    created_at: new Date().toISOString()
  };
  
  setMessages(prev => [...prev, aiResponse]);
} catch (err) {
  setErrorMessage('Claude API was unable to synthesize an extraction answer. Verify document processing state.');
  // Remove temporary message on strict failure to preserve alignment
  setMessages(prev => prev.filter(m => m.id !== temporaryUserMessage.id));
  setInputValue(userText); // Restore input text
} finally {
  setIsSending(false);
}
};
return (
<div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--paper)]">
code
Code
{/* 1. Left Sidebar - Discussion Workspace Threads */}
  <aside className="w-80 border-r border-[var(--border)] bg-[var(--paper-2)] flex flex-col hidden md:flex">
    {/* Course Header Summary */}
    <div className="p-6 border-b border-[var(--border)] bg-[var(--paper-2)]">
      <Link 
        to={course ? `/courses/${course.id}` : '/dashboard'}
        className="font-['DM_Mono'] text-[9px] uppercase tracking-widest text-[var(--accent)] font-semibold hover:underline block mb-1"
      >
        ← Back to Course Module
      </Link>
      <h3 className="font-['Fraunces'] text-lg font-bold text-[var(--ink)] truncate">
        {course?.title || 'Academic Syllabus'}
      </h3>
      <p className="font-['DM_Mono'] text-[10px] text-[var(--ink-3)] uppercase tracking-wider mt-0.5">
        Code: {course?.course_code || '---'}
      </p>
    </div>

    {/* Action: Create New Session */}
    <div className="p-4 border-b border-[var(--border)]">
      <button
        onClick={handleStartNewSession}
        disabled={isLoadingSidebar}
        className="w-full py-2.5 px-4 rounded-[var(--radius)] text-white text-xs font-semibold font-['Plus_Jakarta_Sans'] cursor-pointer flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #d4620f 0%, var(--accent) 50%, #b8440a 100%)' }}
      >
        ✦ New Query Workspace
      </button>
    </div>

    {/* Historic Sessions Container */}
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--ink-4)] block mb-3">
        Inquiry Archives ({sessions.length})
      </span>

      {isLoadingSidebar ? (
        <div className="space-y-2">
          <div className="h-10 bg-[var(--paper-3)] rounded animate-pulse" />
          <div className="h-10 bg-[var(--paper-3)] rounded animate-pulse" />
          <div className="h-10 bg-[var(--paper-3)] rounded animate-pulse" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)] italic p-2 text-center">
          No conversations registered.
        </p>
      ) : (
        sessions.map((sess) => {
          const isActive = String(sess.id) === String(sessionId);
          return (
            <Link
              key={sess.id}
              to={`/chat/${sess.id}?course=${course?.id}`}
              className={`block p-3 rounded-[var(--radius)] text-xs font-['Plus_Jakarta_Sans'] transition-all ${
                isActive
                  ? 'bg-[var(--accent-4-light)] border border-[var(--accent-4)] border-opacity-35 text-[var(--accent-4)] font-semibold'
                  : 'border border-transparent text-[var(--ink-2)] hover:bg-[var(--paper-3)]'
              }`}
            >
              <div className="truncate">{sess.title || 'Untitled Workspace'}</div>
              <div className="text-[10px] opacity-65 font-normal mt-1">
                {new Date(sess.created_at || sess.id).toLocaleDateString('np-NP', { month: 'short', day: 'numeric' })}
              </div>
            </Link>
          );
        })
      )}
    </div>
  </aside>

  {/* 2. Main Center/Right Chat Panel */}
  <main className="flex-1 flex flex-col bg-[var(--paper)] h-full relative">
    {/* Active conversation context bar */}
    <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--paper-2)]">
      <div>
        <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--accent-4)] block font-semibold mb-0.5">
          Secure Syllabus RAG Environment
        </span>
        <h2 className="font-['Fraunces'] text-lg font-bold text-[var(--ink)]">
          {currentSession?.title || 'Interactive Academic Search Workspace'}
        </h2>
      </div>
      {/* Quick link on mobile to jump back to detail */}
      <Link
        to={course ? `/courses/${course.id}` : '/dashboard'}
        className="md:hidden text-xs text-[var(--accent)] font-semibold"
      >
        Exit Workspace
      </Link>
    </div>

    {/* Error Alert Bar */}
    {errorMessage && (
      <div className="p-4 bg-[var(--accent-light)] border-b border-[var(--accent)] border-opacity-20 flex justify-between items-center">
        <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink)]">{errorMessage}</p>
        <button 
          onClick={() => setErrorMessage('')} 
          className="text-xs font-bold text-[var(--accent)] px-2"
        >
          Dismiss
        </button>
      </div>
    )}

    {/* Messages Stream Segment */}
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {isLoadingChat ? (
        <div className="space-y-6 py-12 max-w-3xl mx-auto">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-[var(--paper-3)] animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-[var(--paper-3)] rounded w-1/4 animate-pulse" />
              <div className="h-12 bg-[var(--paper-3)] rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-4 items-start justify-end">
            <div className="space-y-2 flex-1 max-w-lg">
              <div className="h-12 bg-[var(--paper-3)] rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--paper-3)] animate-pulse" />
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-24 max-w-md mx-auto space-y-4">
          <span className="text-3xl block">✦</span>
          <h3 className="font-['Fraunces'] text-xl font-bold text-[var(--ink)]">
            Ask your first question about this course material
          </h3>
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-[var(--ink-3)] leading-relaxed">
            Type an inquiry regarding course structures, marking schemas, exam scopes, or specific academic terms defined within the official syllabus.
          </p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6 pb-6">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Typing Indicator inside Chat Stream */}
          {isSending && (
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-md bg-[var(--accent-4)] bg-opacity-10 text-[var(--accent-4)] font-['DM_Mono'] text-xs font-bold flex items-center justify-center">
                AI
              </div>
              <div className="bg-[var(--paper-2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-2 max-w-xl shadow-sm">
                <span className="font-['DM_Mono'] text-[9px] uppercase tracking-wider text-[var(--accent-4)] block font-semibold">
                  Syllabus Processing Pipeline
                </span>
                <div className="flex items-center gap-1.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-4)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-4)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-4)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
      )}
    </div>

    {/* Message Input Footer Area */}
    <div className="p-4 md:p-6 border-t border-[var(--border)] bg-[var(--paper-2)]">
      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending || isLoadingChat}
            placeholder={
              isSending 
                ? "Consulting vector database index..." 
                : "Ask about specific syllabus components (e.g., grading distribution)..."
            }
            className="w-full pl-4 pr-32 py-3 bg-[var(--paper)] border border-[var(--border)] rounded-[var(--radius)] text-xs text-[var(--ink)] placeholder-[var(--ink-4)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-4)] focus:border-transparent transition-all disabled:opacity-60"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending || isLoadingChat}
              className="px-4 py-1.5 rounded-[var(--radius)] text-white text-xs font-semibold font-['Plus_Jakarta_Sans'] cursor-pointer transition-all disabled:opacity-45 disabled:cursor-not-allowed hover:shadow-sm"
              style={{ background: 'linear-gradient(135deg, #d4620f 0%, var(--accent) 50%, #b8440a 100%)' }}
            >
              Query API
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2.5 px-1 text-[10px] font-['DM_Mono'] text-[var(--ink-3)] uppercase tracking-wider">
          <span>Security Context: TU Protected Database</span>
          <span>Model: Claude API Engine</span>
        </div>
      </form>
    </div>
  </main>
</div>
);
}