import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, defaultBaseUrl, loadAuth, saveAuth } from "../lib/api";
import AuthForm from "../components/AuthForm";

const settings = () => {
  try {
    return {
      url: defaultBaseUrl(),
      ...JSON.parse(localStorage.getItem("relog-settings") || "{}"),
    };
  } catch {
    return { url: defaultBaseUrl() };
  }
};

export default function Register() {
  const navigate = useNavigate();
  const config = useMemo(settings, []);
  const client = (p, o) => api(p, o, { baseUrl: config.url });

  if (loadAuth().accessToken) return <Navigate to="/app" replace />;

  const done = (payload) => {
    saveAuth(payload);
    navigate("/app", { replace: true });
  };

  return (
    <AuthForm mode="register" page onAuthenticated={done} client={client} baseUrl={config.url} />
  );
}
