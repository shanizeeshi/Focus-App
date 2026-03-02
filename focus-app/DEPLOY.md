# Deploy Focus App to Vercel

## 1. Connect the repo

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub).
2. Click **Add New…** → **Project**.
3. Import **shanizeeshi/Focus-App** from GitHub.
4. Set **Root Directory** to **`focus-app`** (click Edit, enter `focus-app`, confirm).  
   The Next.js app lives in this folder.

## 2. Environment variables

In the Vercel project, go to **Settings** → **Environment Variables** and add:

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/publishable key | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Keep secret; from same API page |

Add them for **Production** (and Preview if you want).

## 3. Deploy

Click **Deploy**. Vercel will run `npm run build` in the root directory (`focus-app`).  
When the build finishes, you’ll get a URL like `https://focus-app-xxx.vercel.app`.

## 4. Supabase redirect URL

So login/signup and email confirmation work from the live app:

1. Open **Supabase Dashboard** → your project → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add your Vercel URL, for example:
   - `https://your-app.vercel.app/**`
   - `https://your-app-*.vercel.app/**` (covers preview URLs)
3. Save.

## 5. Test

Open your Vercel URL, sign up or sign in, and run through: create project, start session, pause, stop.  
Today’s dashboard and “Resume last project” will work once you have at least one stopped session.
