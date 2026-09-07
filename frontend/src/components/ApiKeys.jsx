import { useEffect, useState } from "react";
import { EmptyState } from "./Reports";

export default function ApiKeys({ client, logged, login }) {
  const [keys, setKeys] = useState([]);
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    if (!logged) return;
    setBusy(true);
    setErr("");
    try {
      setKeys(await client("/api/v1/keys"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [logged]);

  const create = async () => {
    setBusy(true);
    setErr("");
    try {
      const out = await client("/api/v1/keys", {
        method: "POST",
        body: { name: "dashboard" },
      });
      setCreated(out.api_key);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    setBusy(true);
    try {
      await client(`/api/v1/keys/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!logged)
    return (
      <article className="panel history">
        <EmptyState
          title="Sign in required"
          text="API keys are tied to your account."
          action="Sign in"
          onAction={login}
        />
      </article>
    );

  return (
    <article className="panel history">
      <div className="panel-head">
        <div>
          <p className="eyebrow">AGENT</p>
          <h2>API keys</h2>
        </div>
        <button className="text" disabled={busy} onClick={create}>
          Create key →
        </button>
      </div>
      {created && (
        <div className="notice key-once">
          ● Copy now — shown once: <code>{created}</code>
          <button onClick={() => setCreated(null)}>×</button>
        </div>
      )}
      {err && <p className="form-error">{err}</p>}
      {keys.length ? (
        <ul className="key-list">
          {keys.map((k) => (
            <li key={k.id}>
              <span>
                <b>{k.name || "key"}</b> · {k.prefix}…
              </span>
              <button className="quiet" disabled={busy} onClick={() => revoke(k.id)}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No keys yet" text="Create a key for the relog-agent CLI." />
      )}
    </article>
  );
}
