# Relog Dashboard

Web frontend for **Relog** — a log intelligence platform that detects errors in application logs and explains them with optional AI-powered summaries.

Built with React, Vite, React Router, and GSAP.

## Features

- **Landing page** — animated marketing site with product overview, features, and how-it-works sections
- **Authentication** — email/password register & login, Google OAuth, GitHub OAuth
- **Log analysis** — paste or upload `.log` / `.txt` files and analyze batches
- **Dashboard** — overview metrics, recent findings, analysis history
- **API keys** — create and revoke keys for the `relog-agent` CLI
- **Live feed** — Server-Sent Events (SSE) for real-time reports when signed in
- **Settings** — configure backend URL and optional Groq API key

## Tech stack

| Tool | Purpose |
|------|---------|
| [React](https://react.dev/) | UI |
| [Vite](https://vitejs.dev/) | Dev server & build |
| [React Router](https://reactrouter.com/) | Client-side routing |
| [GSAP](https://gsap.com/) | Landing page animations |

## Routes

| Path | Page |
|------|------|
| `/` | Landing page |
| `/login` | Sign in |
| `/register` | Create account |
| `/app` | Analytics dashboard |
| `*` | Redirects to `/` |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

### Install & run

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview
```

## Environment variables

Create a `.env` file in the project root:

```env
VITE_API_URL=https://relog.fastapicloud.dev
```

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | FastAPI backend base URL |

During development, Vite proxies `/api` and `/health` to this URL (or `http://localhost:8000` if unset).

You can also set the backend URL in the app under **⚙ Connection settings** (stored in `localStorage`).

## Backend

Default API: **https://relog.fastapicloud.dev**

- Swagger docs: https://relog.fastapicloud.dev/docs
- Health check: https://relog.fastapicloud.dev/health

The dashboard talks to these main endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/auth/login` | Email login |
| `POST /api/v1/auth/register` | Register |
| `POST /api/v1/auth/google` | Google OAuth |
| `GET /api/v1/auth/github/start` | GitHub OAuth popup |
| `GET /api/v1/auth/me` | Current user |
| `POST /api/v1/logs/stream` | Analyze log batch |
| `GET /api/v1/keys/reports` | Saved report history |
| `GET /api/v1/logs/events` | Live SSE feed |
| `GET/POST/DELETE /api/v1/keys` | API key management |
| `POST /api/v1/ai/check-key` | Validate Groq key |

## Authentication

1. **Email/password** — use `/register` or `/login`
2. **Google** — enabled when the backend has `GOOGLE_CLIENT_ID` configured
3. **GitHub** — enabled when the backend has GitHub OAuth configured

Check what's available:

```
GET https://relog.fastapicloud.dev/api/v1/auth/config
```

After sign-in, tokens are stored in `localStorage` under `relog-auth`. The client auto-refreshes access tokens and revokes refresh tokens on logout.

## Using the dashboard

1. Visit `/` and click **Get started** or go to `/app`
2. Sign in at `/login` (required to analyze logs)
3. Open **Analyze logs**, paste content or upload a file, then **Analyze batch**
4. View results on **Overview** and saved runs under **History**
5. Create an **API key** for the agent:

```bash
relog-agent --log ./logs/app.log --api-key relog_xxxx
```

## Project structure

```
frontend/
├── index.html
├── vite.config.js
├── .env
└── src/
    ├── main.jsx           # App entry
    ├── Shell.jsx          # React Router setup
    ├── App.jsx            # Dashboard (analytics UI)
    ├── landing.css        # Landing page styles
    ├── styles.css         # Dashboard & auth styles
    ├── lib/
    │   └── api.js         # HTTP client, auth, SSE
    ├── pages/
    │   ├── Landing.jsx    # Marketing landing page
    │   ├── Login.jsx
    │   └── Register.jsx
    └── components/
        ├── AuthForm.jsx   # Shared auth UI
        ├── AuthDialog.jsx # Modal wrapper (optional)
        ├── ApiKeys.jsx
        └── Reports.jsx
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Add your frontend origin to backend `CORS_ORIGINS` |
| OAuth buttons disabled | Backend OAuth not configured — use email login |
| 401 on analyze | Sign in at `/login` first |
| GitHub popup blocked | Allow popups for localhost |
| Wrong backend | Set `VITE_API_URL` or update Connection settings |

## License

Private project — Relog © 2026
