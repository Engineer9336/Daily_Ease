# Daily Ease — Vercel edition
Home-services marketplace on **Next.js 14 (App Router) + Postgres**, built for **Vercel** serverless.
UI in **English, हिन्दी and Hinglish**.

## Features
Customer & worker registration/login · protected admin dashboard (enforced server-side in every API route) ·
worker profiles with photo upload (resized in-browser) or generated avatar · search by keyword / service / city ·
booking lifecycle (pending → accepted/rejected → completed, or cancelled) · ratings & reviews ·
phone numbers revealed only after acceptance · FAQ assistant in 3 languages · responsive layout · Postgres persistence.

## Local development (no database setup needed)
```bash
npm install
cp .env.example .env.local      # optional; without DATABASE_URL an embedded Postgres (PGlite) is used
npm run dev                     # http://localhost:3000
```
Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` to get an admin account (created on first request). Set `PGLITE_DIR=.data/pg` to keep dev data between restarts.

## Tests
```bash
ALLOW_EMBEDDED_DB=1 npm run test:all     # builds, then runs 12 tests
```
* `i18n.test.js` – every key/placeholder present in all 3 languages; assistant answers.
* `services.test.js` – validation, lockout, booking rules & permissions, phone privacy, search/SQL-injection safety, photo validation, admin permissions.
* `e2e.test.js` – starts the real production server and drives the whole HTTP API (register → login → profile → search → book → accept → complete → review → admin, plus CSRF, forged-cookie and disabled-user checks).

## Structure
```
app/            pages (/, /find, /login, /register, /bookings, /worker, /admin, /assistant) + app/api/* route handlers
components/     AppProvider (language + session), Nav, WorkerCard, BookingCard
lib/            db.js (pg / PGlite + schema) · services.js (all business rules) · session.js (signed cookie) · http.js · i18n.json · faqs.json
tests/          node:test suites
```

## Security notes
bcrypt password hashing · HttpOnly + SameSite=Lax signed JWT cookie, user re-checked in DB on each request (disabling an account is immediate) ·
5-failures/15-min login lockout per email · JSON-only mutations + Origin check (CSRF) · parameterised SQL everywhere · photo data-URL whitelist · security headers.

## Known limits
No payments, email/SMS or self-service password reset (assistant says so) · lockout is per-email, there is no per-IP rate limiting ·
assistant is rule-based keyword matching · demo workers are fake · the `pg` (real Postgres) driver path is exercised only by Vercel/Neon at deploy time — local tests use embedded Postgres.
