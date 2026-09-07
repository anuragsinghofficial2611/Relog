export function Report({ report }) {
  return (
    <article className="report">
      <div className="report-meta">
        <span className={`badge ${report.level || "error"}`}>
          {report.level || "error"}
        </span>
        <small>
          LINE {report.line_no ?? "—"}
          {report.source && ` · ${report.source}`}
        </small>
      </div>
      <code>{report.error || report.error_line}</code>
      <p>{report.summary}</p>
    </article>
  );
}
export function EmptyState({ title, text, action, onAction }) {
  return (
    <div className="empty">
      <b>◌</b>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="quiet" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
