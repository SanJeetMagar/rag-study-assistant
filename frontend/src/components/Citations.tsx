import React, {useState} from "react";
import {Link} from "react-router-dom";
import {ChevronDown, FileText} from "lucide-react";
import type {Citation} from "../types";

/** The cutoff in RETRIEVAL_MAX_DISTANCE. Anything beyond is discarded. */
const THRESHOLD = 0.7;

function quality(distance: number) {
  if (distance < 0.35) return {label: "very close", bar: "bg-emerald-500", text: "text-emerald-700"};
  if (distance < 0.5) return {label: "close", bar: "bg-teal-500", text: "text-teal-700"};
  if (distance < THRESHOLD) return {label: "related", bar: "bg-amber-500", text: "text-amber-700"};
  return {label: "distant", bar: "bg-zinc-400", text: "text-zinc-500"};
}

/**
 * One retrieved passage: where it came from, how close it was, and — when
 * expanded — the text itself.
 *
 * The bar is the useful part. It places each distance on the same 0–1 scale
 * with the 0.7 cutoff marked, so it is visible at a glance both how good a
 * match was and how much room was left before it would have been rejected.
 */
const Passage: React.FC<{citation: Citation; index: number}> = ({citation, index}) => {
  const [open, setOpen] = useState(false);
  const q = quality(citation.distance);
  const width = `${Math.min(citation.distance, 1) * 100}%`;

  return (
    <li className="rounded-lg border border-amber-200/80 bg-amber-50/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors"
      >
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400">#{index + 1}</span>
          <FileText size={12} className="text-rose-500 shrink-0 self-center" />
          <span className="text-xs font-medium text-slate-700">
            {citation.document_title}
          </span>
          {citation.page_number && (
            <Link
              to={`/documents/${citation.document_id}?page=${citation.page_number}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-rose-600 hover:underline"
            >
              page {citation.page_number}
            </Link>
          )}
          <span className={`text-xs ml-auto ${q.text}`}>{q.label}</span>
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>

        {/* Distance on a fixed 0–1 scale, with the cutoff marked. */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative flex-1 h-1.5 rounded-full bg-zinc-200/70">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${q.bar}`}
              style={{width}}
            />
            <div
              className="absolute inset-y-[-3px] w-px bg-zinc-500/60"
              style={{left: `${THRESHOLD * 100}%`}}
              title={`cutoff ${THRESHOLD}`}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">
            {citation.distance.toFixed(3)}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-amber-200/60">
          {citation.content ? (
            <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">
              {citation.content}
            </p>
          ) : (
            <p className="text-xs italic text-slate-400">
              This answer predates passage storage, so only the reference was kept.
            </p>
          )}
        </div>
      )}
    </li>
  );
};

export const Citations: React.FC<{citations: Citation[]; declined: boolean}> = ({
  citations,
  declined,
}) => {
  const [showAll, setShowAll] = useState(false);
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-amber-200/70">
      <button
        onClick={() => setShowAll(!showAll)}
        aria-expanded={showAll}
        className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 hover:text-slate-600 transition-colors"
      >
        {/* Calling these "answered from" beneath a refusal would claim the
            passages answered the question when they did not. */}
        {declined
          ? `${citations.length} closest passages — none answered this`
          : `Answered from ${citations.length} passage${citations.length === 1 ? "" : "s"}`}
        <ChevronDown
          size={12}
          className={`transition-transform ${showAll ? "rotate-180" : ""}`}
        />
      </button>

      {showAll && (
        <>
          <ul className="mt-2 space-y-1.5">
            {citations.map((citation, i) => (
              <Passage key={citation.chunk_id} citation={citation} index={i} />
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            Distance is how far the passage sits from your question in meaning —
            0 is identical, 1 unrelated. The mark at {THRESHOLD} is the cutoff;
            anything beyond it is discarded rather than answered from.
          </p>
        </>
      )}
    </div>
  );
};
