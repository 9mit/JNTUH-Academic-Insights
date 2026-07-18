# JNTUH Academic Insights

Unofficial academic companion for JNTUH students (CGPA, credits, backlog, notes, updates).  
**Not affiliated with JNTUH.**

**Live:** [https://jntuh-results.duckdns.org/](https://jntuh-results.duckdns.org/)

## Quick start

```bash
# Frontend
npm install
npm run dev          # http://127.0.0.1:5173

# Backend (separate terminal)
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:5173** (not `:8000` for the UI in local dev).

## Environment variables

1. Copy `.env.example` → `.env` in the project root.
2. Fill only what you need (see table below).
3. Restart Vite after changing any `VITE_*` variable.
4. For the API, set backend vars in the same `.env` **or** in your host’s dashboard (Render / Railway / VPS). On Windows PowerShell you can also:

```powershell
$env:JNTUH_RESULTS_API_KEY="your-key"
$env:SHARE_TOKEN_SECRET="your-secret"
uvicorn server:app --host 127.0.0.1 --port 8000
```

| Variable | Required? | Where to get it |
|----------|-----------|-----------------|
| `VITE_API_URL` | No (local) | Leave **empty** locally. Set to your API URL only if frontend and API are on different domains. |
| `VITE_SUPABASE_URL` | Optional | [supabase.com](https://supabase.com) → your project → **Settings → API → Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Optional | Same page → **anon public** key. Run `supabase/migrations/001_rls_policies.sql` in the SQL editor. |
| `JNTUH_RESULTS_API_KEY` | Prod yes | Key for `jntuhresults.dhethi.com` (unofficial). Local code already has a default. If auto-fetch fails, inspect Network on [jntuhconnect.dhethi.com](https://jntuhconnect.dhethi.com/) for `X-Api-Key`. **PDF upload works without this.** |
| `SHARE_TOKEN_SECRET` | Prod yes | **You create it:** `openssl rand -hex 32` |
| `CORS_ORIGINS` | Prod yes | Live site: `https://jntuh-results.duckdns.org` |
| `ENVIRONMENT` | Prod | Set to `production` on deploy |
| `RENDER_EXTERNAL_URL` | Optional | Live site: `https://jntuh-results.duckdns.org` |

### Local minimum

Most features work with an **empty** `.env`. Add Supabase only if you use cloud Notes Hub uploads.

### Production checklist (VPS / duckdns)

On the host that serves [jntuh-results.duckdns.org](https://jntuh-results.duckdns.org/):

1. `npm run build`
2. Set in `.env` (or systemd/Docker env):
   - `ENVIRONMENT=production`
   - `CORS_ORIGINS=https://jntuh-results.duckdns.org`
   - `SHARE_TOKEN_SECRET=<strong random hex>`
   - `JNTUH_RESULTS_API_KEY=<dhethi key>`
   - `RENDER_EXTERNAL_URL=https://jntuh-results.duckdns.org` (optional keep-alive)
3. Serve with `uvicorn server:app` (serves `dist/` when present)
4. `/docs` is disabled automatically in production

## Main features

- Hall-ticket fetch / PDF upload / manual grades  
- Dashboard, credit tracker, backlog + grace check  
- Goal planner, transcript export, share links  
- Study library, live updates (JNTU Fast Updates)

## License

MIT
