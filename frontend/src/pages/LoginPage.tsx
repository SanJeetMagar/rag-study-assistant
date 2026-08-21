import React, {useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {BookOpen} from "lucide-react";
import {Button} from "../components/Button";
import {ErrorBanner} from "../components/ErrorBanner";
import {Input} from "../components/Input";
import {useAuth} from "../context/AuthContext";
import {errorMessage} from "../services/api";

export const LoginPage: React.FC = () => {
  const {login} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      const from = (location.state as {from?: string} | null)?.from;
      navigate(from ?? "/dashboard", {replace: true});
    } catch (err) {
      setError(errorMessage(err, "Could not sign in. Check your email and password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-amber-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-600 text-amber-50 mb-4">
            <BookOpen size={24} />
          </div>
          <h1 className="t-display">Welcome back</h1>
          <p className="t-body text-slate-500 mt-1">
            Sign in to ask questions about your syllabus.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@tu.edu.np"
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <ErrorBanner message={error} />

          <Button type="submit" isLoading={busy} className="w-full" size="lg">
            Sign in
          </Button>

          <p className="t-body text-center text-slate-500">
            No account yet?{" "}
            <Link to="/register" className="text-rose-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
