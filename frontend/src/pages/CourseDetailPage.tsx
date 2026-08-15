import React, {useRef, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Link, useParams} from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Trash2,
  Upload,
} from "lucide-react";
import {Button} from "../components/Button";
import {courses, documents, errorMessage} from "../services/api";
import type {DocumentStatus, StudyDocument} from "../types";

const STATUS_STYLES: Record<
  DocumentStatus,
  {label: string; className: string; icon: React.ReactNode}
> = {
  pending: {
    label: "Queued",
    className: "bg-zinc-100 text-zinc-600",
    icon: <Clock size={13} />,
  },
  processing: {
    label: "Processing",
    className: "bg-amber-100 text-amber-800",
    icon: <Loader2 size={13} className="animate-spin" />,
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-100 text-emerald-800",
    icon: <CheckCircle2 size={13} />,
  },
  error: {
    label: "Failed",
    className: "bg-red-100 text-red-700",
    icon: <AlertCircle size={13} />,
  },
};

export const CourseDetailPage: React.FC = () => {
  const {courseId} = useParams();
  const id = Number(courseId);
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const {data: course} = useQuery({
    queryKey: ["course", id],
    queryFn: () => courses.get(id),
    enabled: Number.isFinite(id),
  });

  const {data: docs = [], isLoading} = useQuery({
    queryKey: ["documents", id],
    queryFn: () => documents.listForCourse(id),
    enabled: Number.isFinite(id),
    // Ingestion runs in a background thread on the server, so poll while any
    // document is still working and stop once everything settles.
    refetchInterval: (query) => {
      const list = query.state.data as StudyDocument[] | undefined;
      const working = list?.some(
        (d) => d.status === "pending" || d.status === "processing",
      );
      return working ? 2000 : false;
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: ["documents", id]});

  const upload = useMutation({
    mutationFn: (file: File) =>
      documents.upload(id, file.name.replace(/\.pdf$/i, ""), file),
    onSuccess: () => {
      invalidate();
      setError("");
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: documents.remove,
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
  });

  const reprocess = useMutation({
    mutationFn: documents.reprocess,
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
  });

  const isTeacher = course?.my_role === "teacher";
  const readyCount = docs.filter((d) => d.status === "ready").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-900">
            {course?.title ?? "Course"}
          </h1>
          <p className="text-slate-500 mt-1">
            {readyCount} document{readyCount === 1 ? "" : "s"} ready to answer questions
            {isTeacher && course && (
              <>
                {" · share code "}
                <code className="font-mono font-semibold text-rose-700">
                  {course.course_code}
                </code>
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Link to={`/courses/${id}/chat`}>
            <Button variant="secondary" disabled={readyCount === 0}>
              <MessageSquare size={16} className="mr-1.5" />
              Ask a question
            </Button>
          </Link>
          {isTeacher && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                  e.target.value = "";
                }}
              />
              <Button
                onClick={() => fileInput.current?.click()}
                isLoading={upload.isPending}
              >
                <Upload size={16} className="mr-1.5" />
                Upload PDF
              </Button>
            </>
          )}
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-slate-500">Loading documents…</p>
      ) : docs.length === 0 ? (
        <div className="text-center border border-dashed border-amber-300 rounded-2xl py-16 px-6 bg-white/60">
          <FileText size={32} className="mx-auto text-amber-400 mb-3" />
          <p className="font-medium text-slate-900">No syllabus uploaded yet</p>
          <p className="text-slate-500 text-sm mt-1">
            {isTeacher
              ? "Upload a text-based PDF to make it searchable."
              : "Your teacher hasn't uploaded the syllabus yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => {
            const badge = STATUS_STYLES[doc.status];
            return (
              <li
                key={doc.id}
                className="bg-white border border-amber-200 rounded-xl p-4 flex items-start gap-4"
              >
                <FileText size={20} className="text-rose-600 mt-0.5 shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900 truncate">
                      {doc.title}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${badge.className}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {doc.status === "ready"
                      ? `${doc.total_chunks} searchable chunks`
                      : doc.status === "error"
                        ? doc.error_message
                        : "Extracting text and building embeddings…"}
                  </p>
                </div>

                {isTeacher && (
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.status === "error" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reprocess.mutate(doc.id)}
                      >
                        Retry
                      </Button>
                    )}
                    <button
                      onClick={() => remove.mutate(doc.id)}
                      aria-label={`Delete ${doc.title}`}
                      className="p-2 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
