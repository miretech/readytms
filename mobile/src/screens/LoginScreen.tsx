import { useState } from "react";
import { login, getMe, type MobileDriver } from "../api";

export function LoginScreen({ onLogin }: { onLogin: (driver: MobileDriver) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const { driver } = await getMe();
      if (!driver) {
        throw new Error(
          "This login is not linked to a driver record. Ask your dispatcher to add you as a driver.",
        );
      }
      onLogin(driver);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen center">
      <div className="logo">ReadyTMS</div>
      <div className="muted" style={{ marginBottom: 24 }}>
        Driver app
      </div>
      <form onSubmit={handleSubmit} className="form">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          required
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={submitting} className="primary">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
