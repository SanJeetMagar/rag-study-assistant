import React from "react";
import {useAuth} from "../context/AuthContext";

const Row: React.FC<{label: string; value: React.ReactNode}> = ({label, value}) => (
  <div className="flex items-center justify-between py-3 border-b border-amber-200 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-900">{value}</span>
  </div>
);

export const SettingsPage: React.FC = () => {
  const {user} = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Your account details.</p>
      </header>

      <section className="bg-white border border-amber-200 rounded-2xl p-5">
        <h2 className="font-display text-lg text-slate-900 mb-2">Account</h2>
        <Row label="Username" value={user.username} />
        <Row label="Email" value={user.email} />
        <Row
          label="Role"
          value={
            <span className="text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
              {user.role}
            </span>
          }
        />
      </section>

      <section className="bg-white border border-amber-200 rounded-2xl p-5">
        <h2 className="font-display text-lg text-slate-900 mb-2">How answers work</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Every uploaded PDF is split into overlapping ~300-word chunks. Each chunk is
          converted into a 384-dimension vector and stored in PostgreSQL with pgvector.
          When you ask a question, it is converted into a vector too, and the four
          closest chunks by cosine distance are retrieved and sent to the language model
          as the only source it may answer from. Each answer lists the chunks it used
          and how close the match was.
        </p>
      </section>
    </div>
  );
};
