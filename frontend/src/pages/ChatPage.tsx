import React, {useEffect, useRef, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useParams} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {FileText, Plus, Send, Sparkles} from "lucide-react";
import {Button} from "../components/Button";
import {chat, courses, errorMessage} from "../services/api";
import type {Citation, Message} from "../types";

/** Cosine distance -> a label a student (and a defense committee) can read. */
function matchQuality(distance: number) {
  if (distance < 0.35) return {label: "strong match", className: "text-emerald-700"};
  if (distance < 0.55) return {label: "good match", className: "text-amber-700"};
  return {label: "weak match", className: "text-zinc-500"};
}

const Citations: React.FC<{citations: Citation[]}> = ({citations}) => {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-amber-200/70">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1.5">
        Answered from
      </p>
      <ul className="space-y-1">
        {citations.map((citation) => {
          const quality = matchQuality(citation.distance);
          return (
            <li
              key={citation.chunk_id}
              className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600"
            >
              <FileText size={12} className="text-rose-500 shrink-0" />
              <span className="font-medium">{citation.document_title}</span>
              {citation.page_number && <span>page {citation.page_number}</span>}
              <span className={quality.className}>
                {quality.label} (distance {citation.distance.toFixed(3)})
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const Bubble: React.FC<{message: Message}> = ({message}) => {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isAssistant
            ? "bg-white border border-amber-200 text-slate-800"
            : "bg-rose-600 text-amber-50"
        }`}
      >
        {isAssistant ? (
          <>
            <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:mt-2 prose-headings:mb-1 prose-li:my-0.5">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            <Citations citations={message.citations ?? []} />
          </>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
};

export const ChatPage: React.FC = () => {
  const {courseId} = useParams();
  const id = Number(courseId);
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {data: course} = useQuery({
    queryKey: ["course", id],
    queryFn: () => courses.get(id),
    enabled: Number.isFinite(id),
  });

  const {data: sessions = []} = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => chat.sessions(id),
    enabled: Number.isFinite(id),
  });

  const {data: messages = []} = useQuery({
    queryKey: ["messages", sessionId],
    queryFn: () => chat.messages(sessionId!),
    enabled: sessionId !== null,
  });

  const ask = useMutation({
    mutationFn: (question: string) => chat.ask(question, id, sessionId),
    onSuccess: (data) => {
      setSessionId(data.session_id);
      queryClient.invalidateQueries({queryKey: ["messages", data.session_id]});
      queryClient.invalidateQueries({queryKey: ["sessions", id]});
      setError("");
    },
    onError: (err) => setError(errorMessage(err, "The assistant could not answer.")),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, ask.isPending]);

  const send = () => {
    const question = input.trim();
    if (!question || ask.isPending) return;
    setInput("");
    ask.mutate(question);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-9rem)]">
      <aside className="hidden lg:flex flex-col w-64 shrink-0">
        <Button
          variant="outline"
          className="w-full mb-3"
          onClick={() => setSessionId(null)}
        >
          <Plus size={16} className="mr-1.5" />
          New chat
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setSessionId(session.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                sessionId === session.id
                  ? "bg-amber-100 text-amber-900 font-medium"
                  : "text-slate-600 hover:bg-amber-50"
              }`}
            >
              {session.title}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        <header className="pb-3 border-b border-amber-200">
          <h1 className="font-display text-xl text-slate-900">
            {course?.title ?? "Study assistant"}
          </h1>
          <p className="text-xs text-slate-500">
            Answers come only from this course's uploaded syllabus.
          </p>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.length === 0 && !ask.isPending && (
            <div className="text-center py-16">
              <Sparkles size={28} className="mx-auto text-amber-400 mb-3" />
              <p className="font-medium text-slate-900">Ask about your syllabus</p>
              <p className="text-sm text-slate-500 mt-1">
                Try "Explain the OSI model" or "What is covered in Unit 3?"
              </p>
            </div>
          )}

          {messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}

          {ask.isPending && (
            <div className="flex justify-start">
              <div className="bg-white border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-slate-500 text-sm">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" />
                <span
                  className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce"
                  style={{animationDelay: "0.15s"}}
                />
                <span
                  className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce"
                  style={{animationDelay: "0.3s"}}
                />
                Searching your syllabus…
              </div>
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-3 border-t border-amber-200">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask a question about your syllabus…"
            autoFocus
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-slate-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
          <Button onClick={send} disabled={!input.trim()} isLoading={ask.isPending}>
            <Send size={16} />
          </Button>
        </div>
      </section>
    </div>
  );
};
