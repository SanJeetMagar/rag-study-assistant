import React from "react";
import {Link} from "react-router-dom";
import {BookOpen, FileSearch, MessageSquareQuote, ShieldCheck} from "lucide-react";
import {Button} from "../components/Button";

const FEATURES = [
  {
    icon: FileSearch,
    title: "Grounded in your syllabus",
    body: "Teachers upload the course PDF. It is split into passages and indexed for meaning, not just keywords.",
  },
  {
    icon: MessageSquareQuote,
    title: "Answers you can trace",
    body: "Every answer lists the passages it came from, with the page number and how close the match was.",
  },
  {
    icon: ShieldCheck,
    title: "It says when it doesn't know",
    body: "Ask something outside the syllabus and the assistant says so instead of inventing an answer.",
  },
];

export const LandingPage: React.FC = () => (
  <div className="min-h-screen bg-amber-50">
    <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-600 text-amber-50">
          <BookOpen size={17} />
        </span>
        <span className="font-display text-lg text-slate-900">Study Assistant</span>
      </span>
      <div className="flex gap-2">
        <Link to="/login">
          <Button variant="ghost">Sign in</Button>
        </Link>
        <Link to="/register">
          <Button>Get started</Button>
        </Link>
      </div>
    </header>

    <main className="max-w-5xl mx-auto px-6">
      <section className="py-16 sm:py-24 text-center">
        <h1 className="font-display text-4xl sm:text-6xl text-slate-900 leading-tight">
          Ask your syllabus
          <br />
          anything.
        </h1>
        <p className="text-lg text-slate-600 mt-5 max-w-2xl mx-auto">
          A study assistant that answers only from the course material your teacher
          uploaded — so what you revise is what you'll be examined on.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Link to="/register">
            <Button size="lg">Create an account</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              I already have one
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3 pb-24">
        {FEATURES.map(({icon: Icon, title, body}) => (
          <div key={title} className="bg-white border border-amber-200 rounded-2xl p-5">
            <Icon size={22} className="text-rose-600 mb-3" />
            <h2 className="font-display text-lg text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{body}</p>
          </div>
        ))}
      </section>
    </main>
  </div>
);
