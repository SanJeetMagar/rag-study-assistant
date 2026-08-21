import React, {useState} from "react";
import {useMutation, useQuery} from "@tanstack/react-query";
import {Link, useParams} from "react-router-dom";
import {ArrowLeft, Check, FileText, Loader2, RotateCw, X} from "lucide-react";
import {Button} from "../components/Button";
import {ErrorBanner} from "../components/ErrorBanner";
import {PageHeader} from "../components/PageHeader";
import {errorMessage, quizzes} from "../services/api";
import type {MarkedAnswer, QuizAttempt, TakingQuestion} from "../types";

/** Answers held while taking, keyed by question id. */
type Draft = Record<number, {selected_index?: number; text_answer?: string}>;

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

// -------------------------------------------------------------------- taking

const TakingCard: React.FC<{
  question: TakingQuestion;
  index: number;
  draft: Draft;
  onChange: (next: Draft) => void;
}> = ({question, index, draft, onChange}) => {
  const current = draft[question.id] ?? {};

  return (
    <li className="bg-white border border-amber-200 rounded-xl p-5">
      <div className="flex gap-3">
        <span className="t-numeric shrink-0 mt-1">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <p className="t-subtitle">{question.text}</p>

          {question.kind === "mcq" ? (
            <div className="mt-3 space-y-2">
              {question.options.map((option, i) => {
                const chosen = current.selected_index === i;
                return (
                  <label
                    key={i}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      chosen
                        ? "border-rose-500 bg-rose-50"
                        : "border-zinc-200 hover:border-amber-300 hover:bg-amber-50/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      checked={chosen}
                      onChange={() =>
                        onChange({...draft, [question.id]: {selected_index: i}})
                      }
                      className="sr-only"
                    />
                    <span
                      className={`shrink-0 w-5 h-5 rounded-full grid place-items-center text-[11px] font-semibold ${
                        chosen ? "bg-rose-600 text-amber-50" : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {OPTION_LETTERS[i]}
                    </span>
                    <span className="t-body">{option}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea
              value={current.text_answer ?? ""}
              onChange={(e) =>
                onChange({...draft, [question.id]: {text_answer: e.target.value}})
              }
              rows={3}
              placeholder="Answer in your own words…"
              className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 t-body focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          )}
        </div>
      </div>
    </li>
  );
};

// -------------------------------------------------------------------- review

const ReviewCard: React.FC<{answer: MarkedAnswer; index: number}> = ({answer, index}) => {
  const {question} = answer;

  return (
    <li
      className={`bg-white border rounded-xl p-5 ${
        answer.is_correct ? "border-emerald-200" : "border-red-200"
      }`}
    >
      <div className="flex gap-3">
        <span
          className={`shrink-0 w-6 h-6 rounded-full grid place-items-center ${
            answer.is_correct
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {answer.is_correct ? <Check size={14} /> : <X size={14} />}
        </span>

        <div className="flex-1 min-w-0">
          <p className="t-subtitle">
            <span className="t-numeric mr-1">{index + 1}.</span>
            {question.text}
          </p>

          {question.kind === "mcq" ? (
            <div className="mt-3 space-y-1.5">
              {question.options.map((option, i) => {
                const isKey = question.correct_index === i;
                const isPicked = answer.selected_index === i;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                      isKey
                        ? "border-emerald-300 bg-emerald-50"
                        : isPicked
                          ? "border-red-300 bg-red-50"
                          : "border-zinc-200"
                    }`}
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 grid place-items-center text-[11px] font-semibold">
                      {OPTION_LETTERS[i]}
                    </span>
                    <span className="t-body flex-1">{option}</span>
                    {isKey && <span className="t-meta text-emerald-700">correct</span>}
                    {isPicked && !isKey && (
                      <span className="t-meta text-red-700">you chose this</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-zinc-200 px-3 py-2">
                <p className="t-micro mb-1">Your answer</p>
                <p className="t-body">{answer.text_answer || <em>No answer given.</em>}</p>
              </div>
              {answer.feedback && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                  <p className="t-micro mb-1">Marked by the assistant</p>
                  <p className="t-body">{answer.feedback}</p>
                </div>
              )}
            </div>
          )}

          {question.explanation && (
            <p className="t-body mt-3 text-slate-600">
              <span className="t-micro mr-1.5">Why</span>
              {question.explanation}
            </p>
          )}

          {question.source_page && question.source_document_id && (
            <Link
              to={`/documents/${question.source_document_id}?page=${question.source_page}`}
              className="inline-flex items-center gap-1.5 mt-2 t-meta text-rose-600 hover:underline"
            >
              <FileText size={12} />
              Read page {question.source_page} in the syllabus
            </Link>
          )}
        </div>
      </div>
    </li>
  );
};

// ---------------------------------------------------------------------- page

export const QuizPage: React.FC = () => {
  const {quizId} = useParams();
  const id = Number(quizId);

  const [draft, setDraft] = useState<Draft>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [error, setError] = useState("");

  const {data: quiz, isLoading} = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => quizzes.get(id),
    enabled: Number.isFinite(id),
    // Questions are written by the model in a background thread, so poll
    // until they exist — same shape as document ingestion.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "generating" ? 2000 : false;
    },
  });

  const submit = useMutation({
    mutationFn: () =>
      quizzes.submit(
        id,
        (quiz?.questions ?? []).map((q) => ({
          question_id: q.id,
          selected_index: draft[q.id]?.selected_index ?? null,
          text_answer: draft[q.id]?.text_answer ?? "",
        })),
      ),
    onSuccess: (attempt) => {
      setResult(attempt);
      setError("");
      window.scrollTo({top: 0, behavior: "smooth"});
    },
    onError: (err) => setError(errorMessage(err, "Could not mark this attempt.")),
  });

  if (isLoading) return <p className="t-body text-slate-500">Loading quiz…</p>;
  if (!quiz) return <p className="t-body text-slate-500">Quiz not found.</p>;

  if (quiz.status === "pending" || quiz.status === "generating") {
    return (
      <div className="max-w-2xl">
        <PageHeader title={quiz.title} description={quiz.document_title} />
        <div className="mt-8 flex items-center gap-3 t-body text-slate-500">
          <Loader2 size={18} className="animate-spin text-rose-500" />
          Writing questions from the syllabus…
        </div>
      </div>
    );
  }

  if (quiz.status === "error") {
    return (
      <div className="max-w-2xl">
        <PageHeader title={quiz.title} description={quiz.document_title} />
        <ErrorBanner message={quiz.error_message} className="mt-6" />
      </div>
    );
  }

  const answered = Object.keys(draft).length;
  const total = quiz.questions.length;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={quiz.title}
        description={
          result
            ? `You scored ${result.score} of ${result.total}.`
            : `${total} questions from ${quiz.document_title}. Answers come from the syllabus.`
        }
        actions={
          <Link to={`/documents/${quiz.document}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft size={15} className="mr-1.5" />
              Back
            </Button>
          </Link>
        }
      />

      {result && (
        <div
          className={`rounded-2xl border p-5 ${
            result.percentage >= 60
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-amber-200 bg-amber-50/60"
          }`}
        >
          <p className="t-display">{result.percentage}%</p>
          <p className="t-body mt-1">
            {result.score} of {result.total} correct. Each question below shows the
            answer and where in the syllabus it came from.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setResult(null);
              setDraft({});
            }}
          >
            <RotateCw size={14} className="mr-1.5" />
            Try again
          </Button>
        </div>
      )}

      <ErrorBanner message={error} />

      <ul className="space-y-3">
        {result
          ? result.answers.map((answer, i) => (
              <ReviewCard key={answer.id} answer={answer} index={i} />
            ))
          : quiz.questions.map((question, i) => (
              <TakingCard
                key={question.id}
                question={question}
                index={i}
                draft={draft}
                onChange={setDraft}
              />
            ))}
      </ul>

      {!result && (
        <div className="flex items-center gap-4 sticky bottom-4 bg-amber-50/90 backdrop-blur border border-amber-200 rounded-xl px-4 py-3">
          <span className="t-meta">
            {answered} of {total} answered
          </span>
          <Button
            className="ml-auto"
            isLoading={submit.isPending}
            onClick={() => submit.mutate()}
          >
            Submit answers
          </Button>
        </div>
      )}
    </div>
  );
};
