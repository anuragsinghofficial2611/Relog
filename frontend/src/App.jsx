import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { api, defaultBaseUrl, loadAuth, logoutApi, saveAuth, subscribeEvents } from "./lib/api";
import ApiKeys from "./components/ApiKeys";
import { EmptyState, Report } from "./components/Reports";
const DEMO = `2026-09-05 15:40:02 INFO Starting database pool
2026-09-05 15:40:02 ERROR Database connection refused on 5432
Traceback (most recent call last):
  File "app/db.py", line 42, in connect
psycopg2.OperationalError: could not connect to server
2026-09-05 15:40:09 WARN ING retrying in 3s…`;
const settings = () => {
  try {
    return {
      url: defaultBaseUrl(),
      groqKey: "",
      ...JSON.parse(localStorage.getItem("relog-settings") || "{}"),
    };
  } catch {
    return { url: defaultBaseUrl(), groqKey: "" };
  }
};
const isAI = (s) => !s?.startsWith("Flagged because:");
export default function App() {
  const navigate = useNavigate();
  const root = useRef(null),
    [tab, setTab] = useState("overview"),
    [config, setConfig] = useState(settings),
    [draft, setDraft] = useState(config),
    [settingsOpen, setSettingsOpen] = useState(false),
    [auth, setAuth] = useState(loadAuth),
    [text, setText] = useState(""),
    [reports, setReports] = useState([]),
    [history, setHistory] = useState([]),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [last, setLast] = useState(null);
  const client = (p, o) =>
    api(p, o, { baseUrl: config.url, token: auth.accessToken });
  const nav = (n) => setTab(n);

  useEffect(() => {
    if (!auth.accessToken) return;
    client("/api/v1/auth/me")
      .then((user) => {
        const cur = loadAuth();
        saveAuth({ access_token: cur.accessToken, refresh_token: cur.refreshToken, user });
        setAuth(loadAuth());
      })
      .catch(() => {});
  }, [auth.accessToken, config.url]);

  useEffect(() => {
    if (!auth.accessToken) return;
    return subscribeEvents(config.url, auth.accessToken, (ev) => {
      if (ev?.error_line || ev?.error) {
        setReports((prev) => [{ ...ev, error: ev.error || ev.error_line }, ...prev].slice(0, 20));
      }
    });
  }, [auth.accessToken, config.url]);
  useEffect(() => {
    const c = gsap.context(
      () =>
        gsap.from(".app-header>* ,.metric,.panel", {
          opacity: 0,
          y: 18,
          duration: 0.55,
          stagger: 0.07,
          ease: "power3.out",
        }),
      root,
    );
    return () => c.revert();
  }, []);
  useEffect(() => {
    gsap.fromTo(
      ".view",
      { opacity: 0, y: 9 },
      { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" },
    );
  }, [tab]);
  const load = async () => {
    if (!auth.accessToken) return;
    try {
      setHistory(await client("/api/v1/keys/reports?limit=20"));
    } catch (e) {
      setNotice(`Could not load history: ${e.message}`);
    }
  };
  useEffect(() => {
    if (tab === "history") load();
  }, [tab, auth.accessToken]);
  const stats = useMemo(() => {
    const all = [...reports, ...history];
    return [
      ["Issues detected", all.length, "Signals in this workspace"],
      [
        "AI explanations",
        all.filter((r) => isAI(r.summary)).length,
        "Investigation-ready summaries",
      ],
      [
        "Warnings",
        all.filter((r) => r.level === "warning").length,
        "Worth reviewing soon",
      ],
      [
        "Fatal errors",
        all.filter((r) => r.level === "fatal").length,
        "Require immediate attention",
      ],
    ];
  }, [reports, history]);
  const analyze = async () => {
    if (!auth.accessToken) return navigate("/login");
    if (!text.trim())
      return setNotice("Paste log lines or load a log file first.");
    setBusy(true);
    setNotice("");
    try {
      const out = await client("/api/v1/logs/stream", {
        method: "POST",
        body: {
          source: "dashboard.log",
          lines: text.split(/\r?\n/),
          groq_api_key: config.groqKey || undefined,
        },
      });
      setReports(out.reports);
      setLast(out);
      nav("overview");
      setNotice(
        out.errors_found
          ? `${out.errors_found} issue${out.errors_found === 1 ? "" : "s"} analyzed.`
          : "No errors found in this batch.",
      );
      if (auth.accessToken) load();
    } catch (e) {
      setNotice(`Analysis failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  const file = async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setText(await f.text());
      setNotice(`${f.name} is ready to analyze.`);
    }
  };
  const logout = async () => {
    await logoutApi(config.url);
    setAuth(loadAuth());
    setHistory([]);
    navigate("/");
  };
  const save = () => {
    localStorage.setItem("relog-settings", JSON.stringify(draft));
    setConfig(draft);
    setSettingsOpen(false);
    setNotice("Connection settings saved.");
  };
  return (
    <div className="shell" ref={root}>
      <aside>
        <div className="brand">
          <b>R</b> relog
        </div>
        <Link to="/" className="back-home">
          ← Home
        </Link>
        <p className="nav-label">WORKSPACE</p>
        {[
          ["overview", "▦", "Overview"],
          ["analyze", "◫", "Analyze logs"],
          ["history", "◷", "History"],
          ["keys", "⚷", "API keys"],
        ].map(([id, i, l]) => (
          <button
            key={id}
            onClick={() => nav(id)}
            className={tab === id ? "nav active" : "nav"}
          >
            <i>{i}</i>
            {l}
          </button>
        ))}
        <div className="bottom">
          {auth.user ? (
            <div className="user">
              {auth.user.avatar_url && (
                <img src={auth.user.avatar_url} alt="" className="avatar" />
              )}
              <b>{auth.user.name || "User"}</b>
              <small>{auth.user.email}</small>
              <button onClick={logout}>Sign out</button>
            </div>
          ) : (
            <button className="signin" onClick={() => navigate("/login")}>
              Sign in to save reports →
            </button>
          )}
          <button
            className="settings"
            onClick={() => {
              setDraft(config);
              setSettingsOpen(true);
            }}
          >
            ⚙ Connection settings
          </button>
        </div>
      </aside>
      <main>
        <header className="app-header">
          <div>
            <p className="eyebrow">LOG INTELLIGENCE</p>
            <h1>
              {tab === "overview"
                ? "Your logs, clearly explained."
                : tab === "analyze"
                  ? "Analyze a log batch"
                  : tab === "history"
                  ? "Analysis history"
                  : tab === "keys"
                    ? "API keys"
                    : "Your logs, clearly explained."}
            </h1>
          </div>
          <div className="actions">
            {auth.user ? (
              <span className="identity">
                ● {auth.user.name || auth.user.email}
              </span>
            ) : (
              <button className="quiet" onClick={() => navigate("/login")}>
                Sign in
              </button>
            )}
            <button
              className="quiet"
              onClick={() => {
                setText(DEMO);
                nav("analyze");
              }}
            >
              Load sample
            </button>
            <button className="primary" onClick={() => nav("analyze")}>
              Analyze logs →
            </button>
          </div>
        </header>
        {notice && (
          <div className="notice">
            ● {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        <div className="view">
          {tab === "overview" && (
            <Overview
              stats={stats}
              reports={reports}
              last={last}
              go={() => nav("analyze")}
            />
          )}{" "}
          {tab === "analyze" && (
            <Analyze
              text={text}
              setText={setText}
              file={file}
              busy={busy}
              analyze={analyze}
              logged={!!auth.accessToken}
              login={() => navigate("/login")}
            />
          )}{" "}
          {tab === "history" && (
            <History
              logged={!!auth.accessToken}
              reports={history}
              load={load}
              login={() => navigate("/login")}
            />
          )}
          {tab === "keys" && (
            <ApiKeys
              client={client}
              logged={!!auth.accessToken}
              login={() => navigate("/login")}
            />
          )}
        </div>
      </main>
      {settingsOpen && (
        <Settings
          draft={draft}
          setDraft={setDraft}
          close={() => setSettingsOpen(false)}
          save={save}
          client={client}
        />
      )}
    </div>
  );
}
function Header({ eye, title, action, go }) {
  return (
    <div className="panel-head">
      <div>
        <p className="eyebrow">{eye}</p>
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text" onClick={go}>
          {action}
        </button>
      )}
    </div>
  );
}
function Overview({ stats, reports, last, go }) {
  return (
    <>
      <section className="metrics">
        {stats.map(([n, v, c], i) => (
          <article className="metric" key={n}>
            <span>0{i + 1}</span>
            <p>{n}</p>
            <strong>{v}</strong>
            <small>{c}</small>
          </article>
        ))}
      </section>
      <section className="grid">
        <article className="panel">
          <Header
            eye="LATEST SIGNALS"
            title="Recent findings"
            action="Analyze new batch →"
            go={go}
          />
          {reports.length ? (
            <div className="reports">
              {reports.slice(0, 4).map((r, i) => (
                <Report report={r} key={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No findings yet"
              text="Run an analysis or connect the agent to see failures here."
              action="Analyze your first log"
              onAction={go}
            />
          )}
        </article>
        <article className="panel agent">
          <p className="eyebrow">CONTINUOUS MONITORING</p>
          <h2>Monitor without noise.</h2>
          <p className="muted">
            Run the lightweight agent beside your service. It batches fresh
            entries and sends only likely errors for analysis.
          </p>
          <pre>
            <span>$</span> relog-agent --log ./logs/app.log
            <br /> --api-key relog_••••••
          </pre>
          <p className="subtle">
            <b>◇ Built for your workflow</b>
            <br />
            Keep files on your machine and control where batches are sent.
          </p>
        </article>
      </section>
      {last && (
        <p className="last">
          Last run scanned <b>{last.total_lines}</b> lines from{" "}
          <b>{last.source}</b>.
        </p>
      )}
    </>
  );
}
function Analyze({ text, setText, file, busy, analyze, logged, login }) {
  return (
    <section className="grid analyze">
      <article className="panel editor">
        <Header eye="INPUT" title="Paste logs or upload a file" />
        {!logged && (
          <p className="notice inline">
            Sign in to analyze logs.{" "}
            <button className="text" onClick={login}>
              Sign in →
            </button>
          </p>
        )}
        <label className="upload">
          ↑ Upload .log or .txt
          <input type="file" accept=".log,.txt" onChange={file} />
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck="false"
          placeholder={
            "2026-09-05 15:40:02 ERROR Connection refused\nTraceback (most recent call last):\n..."
          }
        />
        <div className="editor-foot">
          <span>
            {text
              ? `${text.split(/\r?\n/).length} lines loaded`
              : "Nothing loaded yet"}
          </span>
          <button className="primary" disabled={busy || !logged} onClick={analyze}>
            {busy ? "Analyzing…" : "Analyze batch →"}
          </button>
        </div>
      </article>
      <article className="panel flow">
        <p className="eyebrow">THE FLOW</p>
        <h2>Fast rules. Focused AI.</h2>
        <ol>
          <li>
            <b>01</b>Relog identifies failure signals, exceptions, and warnings.
          </li>
          <li>
            <b>02</b>It includes preceding context for every relevant error.
          </li>
          <li>
            <b>03</b>Groq translates the result into a likely cause and next
            step.
          </li>
        </ol>
        <p className="subtle">
          AI is optional. Rule-based detection continues without a Groq key.
        </p>
      </article>
    </section>
  );
}
function History({ logged, reports, load, login }) {
  return (
    <article className="panel history">
      <Header
        eye="SAVED REPORTS"
        title="Past analyses"
        action={logged ? "Refresh ↻" : null}
        go={load}
      />
      {!logged ? (
        <EmptyState
          title="You are browsing as a guest"
          text="Sign in to view your saved reports."
          action="Sign in"
          onAction={login}
        />
      ) : reports.length ? (
        <div className="reports">
          {reports.map((r, i) => (
            <Report
              report={{ ...r, error: r.error || r.error_line }}
              key={r.id || i}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No saved reports"
          text="Reports from signed-in analyses appear here."
        />
      )}
    </article>
  );
}
function Settings({ draft, setDraft, close, save, client }) {
  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const [keyMsg, setKeyMsg] = useState("");
  const testGroq = async () => {
    if (!draft.groqKey) return setKeyMsg("Enter a key first.");
    try {
      const r = await client("/api/v1/ai/check-key", {
        method: "POST",
        body: { api_key: draft.groqKey },
        auth: false,
      });
      setKeyMsg(r.valid ? "Key is valid." : r.message);
    } catch (e) {
      setKeyMsg(e.message);
    }
  };
  return (
    <div className="overlay">
      <section className="dialog">
        <button className="close" onClick={close}>
          ×
        </button>
        <p className="eyebrow">CONNECTION</p>
        <h2>Workspace settings</h2>
        <p className="muted">
          Set the server URL and optional AI key for this browser.
        </p>
        <label>
          Relog server URL
          <input
            value={draft.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://relog.fastapicloud.dev"
          />
        </label>
        <label>
          Groq API key <small>optional</small>
          <input
            type="password"
            value={draft.groqKey}
            onChange={(e) => set("groqKey", e.target.value)}
            placeholder="gsk_..."
          />
        </label>
        <button type="button" className="quiet" onClick={testGroq}>
          Test Groq key
        </button>
        {keyMsg && <p className="subtle">{keyMsg}</p>}
        <p className="subtle">
          Settings are stored locally in this browser for development
          convenience.
        </p>
        <div className="dialog-actions">
          <button className="quiet" onClick={close}>
            Cancel
          </button>
          <button className="primary" onClick={save}>
            Save settings
          </button>
        </div>
      </section>
    </div>
  );
}
