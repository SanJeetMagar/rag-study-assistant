import React, {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {BookOpen, GraduationCap, Presentation} from "lucide-react";
import {Button} from "../components/Button";
import {Input} from "../components/Input";
import {useAuth} from "../context/AuthContext";
import {errorMessage} from "../services/api";
import type {Role} from "../types";

const ROLES: {value: Role; label: string; blurb: string; icon: React.ReactNode}[] = [
  {
    value: "student",
    label: "Student",
    blurb: "Join courses and ask questions",
    icon: <GraduationCap size={18} />,
  },
  {
    value: "teacher",
    label: "Teacher",
    blurb: "Create courses and upload syllabi",
    icon: <Presentation size={18} />,
  },
];

export const RegisterPage: React.FC = () => {
  const {register} = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({username: "", email: "", password: ""});
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({...form, [field]: e.target.value});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({...form, role});
      navigate("/dashboard", {replace: true});
    } catch (err) {
      setError(errorMessage(err, "Could not create the account."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-amber-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-600 text-amber-50 mb-4">
            <BookOpen size={24} />
          </div>
          <h1 className="font-display text-3xl text-slate-900">Create your account</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <div>
            <span className="block text-sm font-medium text-amber-900 mb-2">I am a</span>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  aria-pressed={role === option.value}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    role === option.value
                      ? "border-rose-500 bg-rose-50"
                      : "border-zinc-200 hover:border-amber-300"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    {option.icon}
                    {option.label}
                  </span>
                  <span className="block text-xs text-slate-500 mt-1">{option.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Username"
            value={form.username}
            onChange={update("username")}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="you@tu.edu.np"
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={update("password")}
            required
          />

          {error && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <Button type="submit" isLoading={busy} className="w-full" size="lg">
            Create account
          </Button>

          <p className="text-sm text-center text-slate-500">
            Already registered?{" "}
            <Link to="/login" className="text-rose-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
