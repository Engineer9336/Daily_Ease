// Full end-to-end test against a real `next start` production server (embedded Postgres).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

const PORT = 3457, BASE = `http://localhost:${PORT}`;
let server;
const jar = {};
async function call(who, path, method = "GET", body) {
  const res = await fetch(BASE + "/api/" + path, {
    method, redirect: "manual",
    headers: { ...(method !== "GET" ? { "Content-Type": "application/json" } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) },
    body: body ? JSON.stringify(body) : method !== "GET" ? "{}" : undefined,
  });
  const sc = res.headers.get("set-cookie");
  if (sc) jar[who] = sc.split(";")[0];
  return { status: res.status, data: await res.json().catch(() => ({})), headers: res.headers };
}

before(async () => {
  server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", String(PORT)], {
    env: { ...process.env, ALLOW_EMBEDDED_DB: "1", AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-123456",
      ADMIN_EMAIL: "admin@e2e.com", ADMIN_PASSWORD: "AdminPass123" }, stdio: "pipe" });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + "/api/auth/me")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start");
});
after(() => server && server.kill());

test("pages render (HTTP 200)", async () => {
  for (const p of ["/", "/find", "/login", "/register", "/assistant", "/bookings", "/worker", "/admin"])
    assert.equal((await fetch(BASE + p)).status, 200, p);
});

test("full flow: register → login → profile → search → book → accept → complete → review → admin", async () => {
  assert.equal((await call("g", "auth/me")).data.user, null);
  assert.equal((await call("g", "bookings")).status, 401);
  assert.equal((await call("g", "admin/stats")).status, 403);

  assert.equal((await call("w", "auth/register", "POST", { name: "Raju", email: "raju@e2e.com", password: "password123", role: "worker", language: "hi" })).status, 200);
  assert.equal((await call("w", "auth/register", "POST", { name: "Raju", email: "RAJU@e2e.com", password: "password123", role: "worker" })).data.error, "err_email_exists");
  const lw = await call("w", "auth/login", "POST", { email: "raju@e2e.com", password: "password123" });
  assert.equal(lw.status, 200); assert.equal(lw.data.user.language, "hi");
  assert.match(lw.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal((await call("w", "worker/profile", "PUT", { category: "electrician", city: "Lucknow", skills: "fans, wiring", hourly_rate: 400, experience_years: 6 })).status, 200);

  await call("c", "auth/register", "POST", { name: "Asha", email: "asha@e2e.com", password: "password123", role: "customer" });
  await call("c", "auth/login", "POST", { email: "asha@e2e.com", password: "password123" });
  const found = (await call("c", "workers?category=electrician&city=luck")).data.workers;
  assert.equal(found.length, 1);
  assert.equal((await call("c", "worker/profile")).status, 403); // customer cannot touch worker profile

  const when = new Date(Date.now() + 86400e3).toISOString();
  const bk = await call("c", "bookings", "POST", { worker_id: found[0].id, description: "Fix fan", address: "12 MG Road", scheduled_for: when });
  assert.equal(bk.status, 200);
  assert.equal((await call("c", "bookings", "POST", { worker_id: found[0].id, description: "x", address: "y", scheduled_for: "2001-01-01T00:00:00Z" })).data.error, "err_past");
  assert.equal((await call("w", `bookings/${bk.data.id}`, "PATCH", { status: "accepted" })).status, 200);
  assert.equal((await call("c", `bookings/${bk.data.id}`, "PATCH", { status: "accepted" })).status, 403);
  await call("w", `bookings/${bk.data.id}`, "PATCH", { status: "completed" });
  assert.equal((await call("c", `bookings/${bk.data.id}/review`, "POST", { rating: 5, review: "Great" })).status, 200);
  const mine = (await call("c", "bookings")).data.bookings[0];
  assert.equal(mine.rating, 5); assert.ok(mine.worker_phone === "" || mine.worker_phone === null || typeof mine.worker_phone === "string");

  // security: CSRF guards & role isolation
  const bad = await fetch(BASE + "/api/auth/logout", { method: "POST", headers: { cookie: jar.c, "content-type": "text/plain" }, body: "x" });
  assert.equal(bad.status, 415);
  const xo = await fetch(BASE + "/api/auth/logout", { method: "POST", headers: { cookie: jar.c, "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
  assert.equal(xo.status, 403);
  assert.equal((await call("c", "admin/users")).status, 403);
  jar.forged = "de_session=" + "a.b.c";
  assert.equal((await call("forged", "auth/me")).data.user, null);

  // admin
  assert.equal((await call("a", "auth/login", "POST", { email: "admin@e2e.com", password: "AdminPass123" })).status, 200);
  const st = (await call("a", "admin/stats")).data.stats;
  assert.deepEqual([st.m_users, st.m_workers, st.m_bookings], [1, 1, 1]);
  assert.equal((await call("a", "admin/workers/" + found[0].id, "PATCH", { verified: true })).status, 200);
  assert.equal((await call("a", "admin/demo", "POST")).data.added, 8);
  const uid = (await call("a", "admin/users")).data.users.find((u) => u.email === "asha@e2e.com").id;
  await call("a", "admin/users/" + uid, "PATCH", { active: false });
  assert.equal((await call("c", "auth/me")).data.user, null); // disabled user is locked out immediately
  await call("a", "auth/logout", "POST");
  assert.equal((await call("a", "auth/me")).data.user, null);
});
