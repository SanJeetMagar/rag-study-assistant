import React, {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Link} from "react-router-dom";
import {AlertCircle, ListChecks, Loader2, Plus, RotateCw, Trash2} from "lucide-react";
import {Button} from "./Button";
import {ErrorBanner} from "./ErrorBanner";
import {errorMessage, quizzes} from "../services/api";
import type {Quiz} from "../types";

/**
 * The quizzes belonging to one document.
 *
 * Only a teacher can create one: generation costs an API call, so a button
 * every student could press would spend the course's quota.
 */
export const DocumentQuizzes: React.FC<{
  documentId: number;
  documentTitle: string;
  canManage: boolean;
}> = ({documentId, documentTitle, canManage}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const {data: list = []} = useQuery({
    queryKey: ["quizzes", documentId],
    queryFn: () => quizzes.listForDocument(documentId),
    // Questions are written in a background thread; poll until they settle.
    refetchInterval: (query) => {
      const items = query.state.data as Quiz[] | undefined;
      return items?.some((q) => q.status === "pending" || q.status === "generating")
        ? 2000
        : false;
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({queryKey: ["quizzes", documentId]});

  const create = useMutation({
    mutationFn: () =>
      quizzes.create(documentId, `${documentTitle} — quiz ${list.length + 1}`),
    onSuccess: () => {
      refresh();
      setError("");
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const regenerate = useMutation({
    mutationFn: quizzes.regenerate,
    onSuccess: refresh,
    onError: (err) => setError(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: quizzes.remove,
    onSuccess: refresh,
    onError: (err) => setError(errorMessage(err)),
  });

  if (list.length === 0 && !canManage) return null;

  return (
    <div className="mt-3 pt-3 border-t border-amber-200/70">
      <div className="flex items-center justify-between gap-3">
        <span className="t-micro">Quizzes</span>
        {canManage && (
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="inline-flex items-center gap-1 t-meta text-rose-600 hover:underline disabled:opacity-50"
          >
            <Plus size={12} />
            {create.isPending ? "Creating…" : "New quiz"}
          </button>
        )}
      </div>

      <ErrorBanner message={error} className="mt-2" />

      {list.length === 0 ? (
        <p className="t-meta mt-1.5">
          None yet. Generate one and the questions are written from this document's
          own passages.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {list.map((quiz) => {
            const working = quiz.status === "pending" || quiz.status === "generating";
            return (
              <li
                key={quiz.id}
                className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/40 px-3 py-2"
              >
                <ListChecks size={14} className="text-rose-500 shrink-0" />

                {working ? (
                  <span className="flex items-center gap-1.5 t-body text-slate-500">
                    <Loader2 size={12} className="animate-spin" />
                    Writing questions…
                  </span>
                ) : quiz.status === "error" ? (
                  <span
                    className="flex items-center gap-1.5 t-body text-red-700 truncate"
                    title={quiz.error_message}
                  >
                    <AlertCircle size={12} />
                    {quiz.error_message || "Generation failed"}
                  </span>
                ) : (
                  <Link
                    to={`/quizzes/${quiz.id}`}
                    className="t-body text-slate-800 hover:text-rose-700 truncate"
                  >
                    {quiz.title}
                    <span className="t-meta ml-2">{quiz.question_count} questions</span>
                  </Link>
                )}

                {quiz.best_score !== null && (
                  <span
                    className={`ml-auto t-meta font-medium ${
                      quiz.best_score >= 60 ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    best {quiz.best_score}%
                  </span>
                )}

                {canManage && (
                  <span className={`flex items-center gap-0.5 ${quiz.best_score === null ? "ml-auto" : ""}`}>
                    {quiz.status === "error" && (
                      <button
                        onClick={() => regenerate.mutate(quiz.id)}
                        aria-label="Try again"
                        className="p-1.5 rounded-md text-zinc-400 hover:text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        <RotateCw size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => remove.mutate(quiz.id)}
                      aria-label={`Delete ${quiz.title}`}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
