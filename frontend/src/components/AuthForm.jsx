import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load sign-in provider"));
    document.head.appendChild(script);
  });
}

function allowedOrigins(baseUrl) {
  const origins = new Set([window.location.origin, "http://localhost:8000"]);
  const trimmed = baseUrl?.replace(/\/+$/, "");
  if (trimmed) {
    try {
      origins.add(new URL(trimmed).origin);
    } catch {}
  }
  return origins;
}

export default function AuthForm({
  mode = "signin",
  onAuthenticated,
  client,
  baseUrl = "",
  page = false,
}) {
  const googleTokenClient = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState({
    google_client_id: null,
    github_client_id: null,
  });

  useEffect(() => {
    let cancelled = false;
    client("/api/v1/auth/config", { auth: false })
      .then((cfg) => {
        if (!cancelled) setConfig(cfg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (!config.google_client_id) return;
    let cancelled = false;
    (async () => {
      try {
        await loadScript(GIS_SRC);
        if (cancelled || !window.google?.accounts?.oauth2) return;
        googleTokenClient.current = window.google.accounts.oauth2.initTokenClient({
          client_id: config.google_client_id,
          scope: "openid email profile",
          callback: async (response) => {
            if (response.error) {
              setError(`Google sign-in failed: ${response.error}`);
              return;
            }
            setBusy(true);
            setError("");
            try {
              onAuthenticated(
                await client(
                  `/api/v1/auth/google?access_token=${encodeURIComponent(response.access_token)}`,
                  { method: "POST", auth: false },
                ),
              );
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          },
        });
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, config.google_client_id, onAuthenticated]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path =
        mode === "signin" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body =
        mode === "signin"
          ? { email, password }
          : { email, password, name: name || undefined };
      onAuthenticated(
        await client(path, { method: "POST", body, auth: false }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const googleOk = config.google_client_id || config.google_configured;
  const githubOk = config.github_client_id || config.github_configured;

  const signInWithGoogle = () => {
    if (!googleOk) return setError("Google sign-in is not configured on the server.");
    if (!googleTokenClient.current)
      return setError("Google sign-in is still loading. Try again in a moment.");
    setError("");
    googleTokenClient.current.requestAccessToken({ prompt: "consent" });
  };

  const signInWithGithub = async () => {
    if (!githubOk) return setError("GitHub sign-in is not configured on the server.");
    setBusy(true);
    setError("");
    try {
      const { url } = await client("/api/v1/auth/github/start", { auth: false });
      const popup = window.open(
        url,
        "relog-github-oauth",
        "width=520,height=720,menubar=no,toolbar=no",
      );
      if (!popup) throw new Error("Popup blocked. Allow popups for this site and retry.");

      await new Promise((resolve, reject) => {
        const origins = allowedOrigins(baseUrl);
        let settled = false;
        const onMessage = (event) => {
          if (!origins.has(event.origin)) return;
          const data = event.data;
          if (data?.type !== "relog-oauth" || data.provider !== "github") return;
          if (data.payload?.access_token) finish(() => resolve(data.payload));
          else finish(() => reject(new Error("GitHub sign-in did not return a session.")));
        };
        const cleanup = () => {
          window.clearInterval(timer);
          window.removeEventListener("message", onMessage);
          if (!popup.closed) popup.close();
        };
        const finish = (next) => {
          if (settled) return;
          settled = true;
          cleanup();
          next();
        };
        const timer = window.setInterval(() => {
          if (popup.closed) finish(() => reject(new Error("GitHub sign-in was cancelled.")));
        }, 500);
        window.addEventListener("message", onMessage);
      }).then(onAuthenticated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inner = (
    <>
      <p className="eyebrow">ACCOUNT</p>
      <h2>{mode === "signin" ? "Sign in" : "Create account"}</h2>
      <p className="muted">
        Save reports to your workspace. Email/password or continue with Google or GitHub.
      </p>

      <div className="oauth-row">
        <button
          type="button"
          className="oauth-btn github"
          disabled={busy || !githubOk}
          onClick={signInWithGithub}
        >
          Continue with GitHub
        </button>
        <button
          type="button"
          className="oauth-btn google-fallback"
          disabled={busy || !googleOk}
          onClick={signInWithGoogle}
        >
          Continue with Google
        </button>
      </div>

      <p className="oauth-divider">or use email</p>

      <form onSubmit={submit}>
        {mode === "register" && (
          <label>
            Name <small>optional</small>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              autoComplete="name"
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary submit" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {page && (
        <p className="auth-switch">
          {mode === "signin" ? (
            <>
              No account? <Link to="/register">Register</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login">Sign in</Link>
            </>
          )}
        </p>
      )}
    </>
  );

  if (page) {
    return (
      <div className="auth-page">
        <Link to="/" className="auth-page-back">
          ← Back to home
        </Link>
        <section className="dialog auth-dialog auth-page-card">{inner}</section>
      </div>
    );
  }

  return <section className="dialog auth-dialog">{inner}</section>;
}
