import React, {useRef, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Link, useNavigate, useParams} from "react-router-dom";
import {
  Copy,
  Eye,
  FileText,
  LogOut,
  MessageSquare,
  Pencil,
  RotateCw,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import {Button} from "../components/Button";
import {ConfirmDialog} from "../components/ConfirmDialog";
import {DocumentQuizzes} from "../components/DocumentQuizzes";
import {EmptyState} from "../components/EmptyState";
import {ErrorBanner} from "../components/ErrorBanner";
import {Input} from "../components/Input";
import {Modal} from "../components/Modal";
import {PageHeader} from "../components/PageHeader";
import {StatusBadge} from "../components/StatusBadge";
import {courses, documents, errorMessage} from "../services/api";
import type {StudyDocument} from "../types";

export const CourseDetailPage: React.FC = () => {
  const {courseId} = useParams();
  const id = Number(courseId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({title: "", description: ""});
  const [renaming, setRenaming] = useState<StudyDocument | null>(null);
  const [renameTo, setRenameTo] = useState("");
  const [deletingDoc, setDeletingDoc] = useState<StudyDocument | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [leaving, setLeaving] = useState(false);

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
      return list?.some((d) => d.status === "pending" || d.status === "processing")
        ? 2000
        : false;
    },
  });

  const refreshDocs = () => queryClient.invalidateQueries({queryKey: ["documents", id]});
  const refreshCourse = () => {
    queryClient.invalidateQueries({queryKey: ["course", id]});
    queryClient.invalidateQueries({queryKey: ["courses"]});
  };
  const fail = (err: unknown) => setError(errorMessage(err));

  const upload = useMutation({
    mutationFn: (file: File) =>
      documents.upload(id, file.name.replace(/\.pdf$/i, ""), file),
    onSuccess: () => {
      refreshDocs();
      setError("");
    },
    onError: fail,
  });

  const rename = useMutation({
    mutationFn: () => documents.rename(renaming!.id, renameTo.trim()),
    onSuccess: () => {
      refreshDocs();
      setRenaming(null);
    },
    onError: fail,
  });

  const removeDoc = useMutation({
    mutationFn: () => documents.remove(deletingDoc!.id),
    onSuccess: () => {
      refreshDocs();
      setDeletingDoc(null);
    },
    onError: fail,
  });

  const reprocess = useMutation({
    mutationFn: documents.reprocess,
    onSuccess: refreshDocs,
    onError: fail,
  });

  const saveCourse = useMutation({
    mutationFn: () => courses.update(id, draft),
    onSuccess: () => {
      refreshCourse();
      setEditing(false);
    },
    onError: fail,
  });

  const removeCourse = useMutation({
    mutationFn: () => courses.remove(id),
    onSuccess: () => {
      refreshCourse();
      navigate("/dashboard", {replace: true});
    },
    onError: fail,
  });

  const leaveCourse = useMutation({
    mutationFn: () => courses.leave(id),
    onSuccess: () => {
      refreshCourse();
      navigate("/dashboard", {replace: true});
    },
    onError: fail,
  });

  const isTeacher = course?.my_role === "teacher";
  const readyCount = docs.filter((d) => d.status === "ready").length;
  const totalPassages = docs.reduce((sum, d) => sum + d.total_chunks, 0);

  const copyCode = () => {
    if (!course) return;
    navigator.clipboard.writeText(course.course_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={course?.title ?? "Course"}
        description={
          <>
            {course?.description && <span className="block">{course.description}</span>}
            <span className="block t-meta mt-1">
              {readyCount === 0
                ? "Nothing to answer from yet."
                : `${readyCount} document${readyCount === 1 ? "" : "s"} ready — ${totalPassages} searchable passages.`}
            </span>
          </>
        }
        actions={
          <>
            <Link to={`/courses/${id}/chat`}>
              <Button variant="secondary" disabled={readyCount === 0}>
                <MessageSquare size={16} className="mr-1.5" />
                Ask a question
              </Button>
            </Link>

            {isTeacher ? (
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft({
                      title: course?.title ?? "",
                      description: course?.description ?? "",
                    });
                    setEditing(true);
                  }}
                  aria-label="Course settings"
                >
                  <Settings2 size={16} />
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setLeaving(true)}>
                <LogOut size={16} className="mr-1.5" />
                Leave
              </Button>
            )}
          </>
        }
      />

      {isTeacher && course && (
        <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-4 py-3">
          <span className="t-body text-slate-500">Students join with</span>
          <code className="font-mono font-semibold tracking-widest text-rose-700">
            {course.course_code}
          </code>
          <button
            onClick={copyCode}
            className="ml-auto inline-flex items-center gap-1.5 t-meta hover:text-slate-800 transition-colors"
          >
            <Copy size={13} />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      <ErrorBanner message={error} />

      {isLoading ? (
        <p className="t-body text-slate-500">Loading documents…</p>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No syllabus here yet"
          body={
            isTeacher
              ? "Upload a text-based PDF. It gets split into passages and indexed so students can ask about it."
              : "Your teacher hasn't uploaded the syllabus yet. Check back later."
          }
        />
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => {
            return (
              <li
                key={doc.id}
                className="bg-white border border-amber-200 rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  <FileText size={20} className="text-rose-600 mt-0.5 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="t-subtitle truncate">
                        {doc.title}
                      </span>
                      <StatusBadge status={doc.status} />
                    </div>

                    <p className="t-meta mt-1">
                      {doc.status === "ready"
                        ? `${doc.total_chunks} passages · uploaded by ${doc.uploaded_by_email}`
                        : doc.status === "error"
                          ? doc.error_message
                          : "Extracting text and building embeddings…"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link to={`/documents/${doc.id}`} aria-label={`Read ${doc.title}`}>
                      <button className="p-2 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                        <Eye size={16} />
                      </button>
                    </Link>

                    {isTeacher && (
                      <>
                        {doc.status === "error" && (
                          <button
                            onClick={() => reprocess.mutate(doc.id)}
                            aria-label="Try again"
                            className="p-2 rounded-md text-zinc-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            <RotateCw size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setRenaming(doc);
                            setRenameTo(doc.title);
                          }}
                          aria-label={`Rename ${doc.title}`}
                          className="p-2 rounded-md text-zinc-400 hover:text-slate-700 hover:bg-zinc-100 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingDoc(doc)}
                          aria-label={`Delete ${doc.title}`}
                          className="p-2 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Quizzes only make sense once the passages exist to write
                    questions from. */}
                {doc.status === "ready" && (
                  <DocumentQuizzes
                    documentId={doc.id}
                    documentTitle={doc.title}
                    canManage={isTeacher}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ------------------------------------------------------------ modals */}

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Course settings">
        <div className="space-y-4">
          <Input
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft({...draft, title: e.target.value})}
          />
          <Input
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft({...draft, description: e.target.value})}
          />
          <Button
            className="w-full"
            isLoading={saveCourse.isPending}
            disabled={!draft.title.trim()}
            onClick={() => saveCourse.mutate()}
          >
            Save changes
          </Button>
          <button
            onClick={() => {
              setEditing(false);
              setDeletingCourse(true);
            }}
            className="w-full t-body text-red-600 hover:underline"
          >
            Delete this course
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename document"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value)}
            autoFocus
          />
          <p className="t-meta">
            Only the label changes. The passages already indexed stay as they are.
          </p>
          <Button
            className="w-full"
            isLoading={rename.isPending}
            disabled={!renameTo.trim()}
            onClick={() => rename.mutate()}
          >
            Rename
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deletingDoc !== null}
        onClose={() => setDeletingDoc(null)}
        onConfirm={() => removeDoc.mutate()}
        title="Delete this document?"
        isPending={removeDoc.isPending}
        body={
          <>
            <strong>{deletingDoc?.title}</strong> and its{" "}
            {deletingDoc?.total_chunks ?? 0} indexed passages will be removed.
            Questions already answered keep their saved passages, but nothing new
            can be answered from this document.
          </>
        }
      />

      <ConfirmDialog
        isOpen={deletingCourse}
        onClose={() => setDeletingCourse(false)}
        onConfirm={() => removeCourse.mutate()}
        title="Delete this course?"
        confirmLabel="Delete course"
        isPending={removeCourse.isPending}
        body={
          <>
            <strong>{course?.title}</strong>, its {docs.length} document
            {docs.length === 1 ? "" : "s"}, every indexed passage and all chat
            history for it will be removed. Enrolled students lose access
            immediately.
          </>
        }
      />

      <ConfirmDialog
        isOpen={leaving}
        onClose={() => setLeaving(false)}
        onConfirm={() => leaveCourse.mutate()}
        title="Leave this course?"
        confirmLabel="Leave"
        isPending={leaveCourse.isPending}
        body={
          <>
            You will lose access to <strong>{course?.title}</strong> and its
            material. You can rejoin later with the course code.
          </>
        }
      />
    </div>
  );
};
