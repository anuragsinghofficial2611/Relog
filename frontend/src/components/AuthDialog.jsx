import AuthForm from "./AuthForm";

export default function AuthDialog({ close, onAuthenticated, client, baseUrl = "" }) {
  return (
    <div className="overlay">
      <AuthForm
        mode="signin"
        onAuthenticated={onAuthenticated}
        client={client}
        baseUrl={baseUrl}
      />
      <button className="close auth-dialog-close" onClick={close} aria-label="Close">
        ×
      </button>
    </div>
  );
}
