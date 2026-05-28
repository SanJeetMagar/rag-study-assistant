// src/components/MessageBubble.jsx
import React from 'react';
import { Sparkles, User, Database, ChevronDown, ChevronUp } from 'react-dom';
import { useState } from 'react';

/**
 * Message bubble layout helper inside the chat system
 * Contains support for markdown structured strings, code-blocks,
 * source chunk indexing, custom layout and unique aesthetics.
 */
export default function MessageBubble({ message }) {
  const { role, text, timestamp, chunks_used } = message;
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const isUser = role === 'user';
  
  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex w-full gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-250`}>
      
      {/* Bot Icon Indicator */}
      {!isUser && (
        <div className="w-8 h-8 rounded-md bg-[var(--accent-4-light)] border border-[var(--accent-4)]/10 flex items-center justify-center shrink-0 self-start shadow-sm">
          <Sparkles className="w-4 h-4 text-[var(--accent-4)]" />
        </div>
      )}

      {/* Message Box Wrapper */}
      <div className={`
        max-w-[82%] flex flex-col gap-1.5 
        ${isUser ? 'items-end' : 'items-start'}
      `}>
        
        {/* Text Container Card */}
        <div 
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            background: isUser ? 'var(--accent-light)' : 'var(--paper)',
          }}
          className={`px-5 py-4 shadow-sm text-[15px] leading-relaxed text-[var(--ink-2)]`}
        >
          {/* Message Text Rendering */}
          <p className="whitespace-pre-line text-[14.5px] leading-relaxed">
            {text}
          </p>

          {/* Sources breakdown drawer (Internal only to backend retrieved data) */}
          {!isUser && chunks_used && chunks_used.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-[var(--border)]">
              <button
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[var(--ink-4)] hover:text-[var(--accent-4)] transition-colors duration-150"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Sources Used ({chunks_used.length})</span>
                {sourcesExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Collapsible drawer displaying verified document references */}
              {sourcesExpanded && (
                <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto pr-1 animate-in slide-in-from-top-1 duration-200">
                  {chunks_used.map((chunk, idx) => (
                    <div 
                      key={idx}
                      className="bg-[var(--paper-2)] border border-[var(--border)] rounded-md p-3 text-[12.5px]"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-[var(--ink)] font-sans truncate max-w-[80%]">
                          {chunk.document_title || `Document Reference`}
                        </span>
                        <span className="font-mono text-[9px] uppercase bg-[var(--accent-4-light)] text-[var(--accent-4)] px-1.5 py-0.5 rounded border border-[var(--accent-4)]/10 shrink-0">
                          Match: {Math.round((chunk.similarity || 1) * 100)}%
                        </span>
                      </div>
                      <p className="italic text-[var(--ink-3)] line-clamp-2 leading-normal">
                        "{chunk.content || chunk.text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Meta Details Row */}
        <div className="flex items-center gap-2 px-2">
          {/* Timestamp details */}
          <span className="text-[11px] text-[var(--ink-4)] font-mono">
            {formattedTime}
          </span>

          {/* Short indicator of background source validation */}
          {!isUser && chunks_used && chunks_used.length > 0 && (
            <>
              <span className="text-[var(--ink-4)] text-[9px]">•</span>
              <span className="font-mono text-[10px] text-[var(--accent-4)] font-medium">
                ✦ {chunks_used.length} context sources referenced
              </span>
            </>
          )}
        </div>

      </div>

      {/* User Icon Indicator */}
      {isUser && (
        <div className="w-8 h-8 rounded-md bg-[var(--paper-3)] border border-[var(--border)] flex items-center justify-center shrink-0 self-start shadow-sm">
          <User className="w-4 h-4 text-[var(--ink-2)]" />
        </div>
      )}

    </div>
  );
}