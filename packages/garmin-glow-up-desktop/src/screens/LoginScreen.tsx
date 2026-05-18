import { type FormEvent, useEffect, useRef, useState } from "react";
import { TopBar } from "../components/TopBar";
import { useInvalidateAuthStatus } from "../hooks/useAuthStatus";
import { useSyncStore } from "../hooks/useSyncStatus";
import { api, ApiError } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mfaRequired = useSyncStore((s) => s.mfaRequired);
  const setMfaRequired = useSyncStore((s) => s.setMfaRequired);
  const invalidateAuth = useInvalidateAuthStatus();
  const qc = useQueryClient();
  const mfaRef = useRef<HTMLInputElement>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  useEffect(() => {
    if (mfaRequired) mfaRef.current?.focus();
  }, [mfaRequired]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
      });
      setMfaRequired(false);
      invalidateAuth();
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Connexion échouée";
      setError(msg);
      setLoading(false);
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMfaSubmitting(true);
    try {
      await api("/auth/mfa", {
        method: "POST",
        body: JSON.stringify({ code: mfaCode }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Code invalide";
      setError(msg);
      setMfaSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Connexion"]} />
      <div className="flex-1 flex items-center justify-center">
        <div
          style={{
            width: 360,
            padding: "32px 28px",
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--fg-0)",
              }}
            >
              {mfaRequired ? "Code de confirmation" : "Connexion Garmin"}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--fg-2)" }}>
              {mfaRequired
                ? "Un code a été envoyé à votre adresse e-mail Garmin."
                : "Entrez vos identifiants Garmin Connect."}
            </p>
          </div>

          {mfaRequired ? (
            <form onSubmit={handleMfa} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input
                ref={mfaRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                required
                style={inputStyle}
                autoComplete="one-time-code"
              />
              {error && <p style={errorStyle}>{error}</p>}
              <button type="submit" disabled={mfaSubmitting || mfaCode.length < 4} style={btnStyle(mfaSubmitting)}>
                {mfaSubmitting ? "Vérification…" : "Confirmer"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={labelStyle}>Adresse e-mail</label>
                <input
                  type="email"
                  placeholder="prenom.nom@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={labelStyle}>Mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={inputStyle}
                  autoComplete="current-password"
                />
              </div>
              {error && <p style={errorStyle}>{error}</p>}
              <button type="submit" disabled={loading} style={btnStyle(loading)}>
                {loading ? "Connexion…" : "Se connecter"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 14,
  color: "var(--fg-0)",
  background: "var(--bg-0)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--fg-2)",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "var(--red, #ef4444)",
};

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 0",
    fontSize: 14,
    fontWeight: 550,
    fontFamily: "inherit",
    color: "var(--accent-ink)",
    background: disabled ? "var(--bg-2)" : "var(--accent)",
    border: "none",
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "opacity 0.15s",
  };
}
