import { useState } from "react";

export default function AuthScreen({ onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isLogin) await onLogin(email.trim(), password);
      else await onSignup(email.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
      <p className="auth-subtitle">
        {isLogin
          ? "Sign in to see your carb history."
          : "Sign up to save your carbs and track them by day."}
      </p>

      <form onSubmit={handleSubmit} className="field-group">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Please wait…" : isLogin ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <button
        type="button"
        className="auth-switch"
        onClick={() => {
          setMode(isLogin ? "signup" : "login");
          setError(null);
        }}
      >
        {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
