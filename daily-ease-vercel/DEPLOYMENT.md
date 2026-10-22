# Deploying to Vercel

> Status: **not yet deployed.** These steps are prepared but have not been run against a real Vercel/Neon account by the author.

Vercel has no persistent disk, so the app needs a hosted Postgres. Neon (via the Vercel Marketplace) has a free tier.

1. **Push** this folder to a GitHub/GitLab repo.
2. **Vercel → Add New → Project** → import the repo (framework auto-detected: Next.js).
3. **Storage / Marketplace → Neon (Postgres)** → connect it to the project. Choose a region close to `bom1` (Mumbai, see `vercel.json`; edit `regions` if you prefer another).
   The integration injects `DATABASE_URL`. If it only sets `POSTGRES_URL`, add `DATABASE_URL` with the same value.
4. **Environment Variables** (Production): 
   * `AUTH_SECRET` – `openssl rand -hex 32` (required; the app refuses to start without it)
   * `ADMIN_EMAIL`, `ADMIN_PASSWORD` – first admin, created automatically on the first request if no admin exists
5. **Deploy.** Tables are created automatically on first request (`CREATE TABLE IF NOT EXISTS`).
6. **Verify:** `https://<your-app>.vercel.app/api/auth/me` → `{"user":null}`; log in at `/login` with the admin account; open *Admin → Workers → Load demo workers* (optional, fake data).

## Troubleshooting
* Every API call returns `err_server` → check Function Logs: usually missing `DATABASE_URL`/`AUTH_SECRET`.
* Change the admin password: update the row in Postgres (hash with bcrypt) or delete the admin row and redeploy with new env values.
* Back up: use Neon's branching/point-in-time restore.
