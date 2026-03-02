# Focus App

AI-powered work session tracker — MVP 1 (core timer + dashboard).

**Repo:** [github.com/shanizeeshi/Focus-App](https://github.com/shanizeeshi/Focus-App)

## Setup

- Supabase: project configured via `.env.local` (not committed).
- Next.js app will be added in Step 1.

## MVP 1 progress

- [x] Step 0.1 — App name: Focus App
- [x] Step 0.2 — Supabase project created
- [x] Step 0.3 — GitHub repo linked
- [x] Step 1 — Next.js project + .cursorrules
- [x] Step 2 — Database schema in Supabase
- [x] Step 3 — Auth (login/signup)
- [x] Step 4 — Projects CRUD
- [x] Step 5 — Session engine + timer
- [x] Step 6 — Session timer UI
- [x] Step 7 — Dashboard + resume hero
- [x] Step 8 — Deploy to Vercel

## Deploy to Vercel

1. **Vercel** → Add New → Project → Import **shanizeeshi/Focus-App**.
2. Set **Root Directory** to **`focus-app`**.
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. Then in **Supabase** → Authentication → URL Configuration, add your Vercel URL to **Redirect URLs**.

See **focus-app/DEPLOY.md** for the full step-by-step.

## Run the app

```bash
cd focus-app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
