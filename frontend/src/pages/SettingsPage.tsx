import React from "react";
import {PageHeader} from "../components/PageHeader";
import {useAuth} from "../context/AuthContext";

const Row: React.FC<{label: string; value: React.ReactNode}> = ({label, value}) => (
  <div className="flex items-center justify-between py-3 border-b border-amber-200 last:border-0">
    <span className="t-body text-slate-500">{label}</span>
    <span className="t-body font-medium text-slate-900">{value}</span>
  </div>
);

export const SettingsPage: React.FC = () => {
  const {user} = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Your account details." />

      <section className="bg-white border border-amber-200 rounded-2xl p-5">
        <h2 className="t-title mb-3">Account</h2>
        <Row label="Username" value={user.username} />
        <Row label="Email" value={user.email} />
        <Row
          label="Role"
          value={
            <span className="t-micro px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
              {user.role}
            </span>
          }
        />
      </section>

      <section className="bg-white border border-amber-200 rounded-2xl p-5">
        <h2 className="t-title mb-3">How answers work</h2>
        <p className="t-body">
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
