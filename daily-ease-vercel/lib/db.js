// Database access. Production/Vercel: Postgres via DATABASE_URL (Neon, Vercel Postgres, Supabase...).
// Local dev & tests without DATABASE_URL: embedded Postgres (PGlite) — refused on Vercel.
const g = globalThis;

async function open() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10000 });
    return {
      query: async (text, params = []) => (await pool.query(text, params)).rows,
      exec: async (sql) => { await pool.query(sql); },
    };
  }
  if (process.env.VERCEL || process.env.NODE_ENV === "production" && !process.env.ALLOW_EMBEDDED_DB) {
    throw new Error("DATABASE_URL is required in production (Vercel has no persistent disk).");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(process.env.PGLITE_DIR || "memory://");
  return {
    query: async (text, params = []) => (await pg.query(text, params)).rows,
    exec: async (sql) => { await pg.exec(sql); },
  };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  pw_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','worker','admin')),
  language TEXT NOT NULL DEFAULT 'en',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workers(
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  hourly_rate INT NOT NULL DEFAULT 300,
  experience_years INT NOT NULL DEFAULT 0,
  bio TEXT NOT NULL DEFAULT '',
  photo TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#0F766E',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  verified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS bookings(
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES users(id),
  worker_id INT NOT NULL REFERENCES workers(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','accepted','rejected','completed','cancelled')),
  rating SMALLINT CHECK(rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS login_failures(email TEXT NOT NULL, ts TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_workers_cat ON workers(category);
CREATE INDEX IF NOT EXISTS idx_book_cust ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_book_work ON bookings(worker_id);
`;

/** Returns {query, exec}; creates schema + first admin once per server instance. */
async function db() {
  if (!g.__de_ready) {
    g.__de_ready = (async () => {
      const impl = await open();
      await impl.exec(SCHEMA);
      await ensureAdmin(impl);
      return impl;
    })();
    g.__de_ready.catch(() => { g.__de_ready = null; });
  }
  return g.__de_ready;
}

async function ensureAdmin(impl) {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) return; // no admin is created unless both are configured
  const have = await impl.query("SELECT 1 FROM users WHERE role='admin' LIMIT 1");
  if (have.length) return;
  const bcrypt = require("bcryptjs");
  await impl.query(
    "INSERT INTO users(name,email,pw_hash,role) VALUES('Administrator',$1,$2,'admin') ON CONFLICT (email) DO NOTHING",
    [email, bcrypt.hashSync(pw, 10)]
  );
}

function resetForTests() { g.__de_ready = null; }

module.exports = { db, resetForTests };
