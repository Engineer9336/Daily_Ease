process.env.ADMIN_EMAIL = "admin@test.com";
process.env.ADMIN_PASSWORD = "AdminPass123";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../lib/services");

const rej = (p, key) => assert.rejects(p, (e) => (assert.equal(e.key, key), true));
let n = 0;
const mk = (role = "customer") => S.register({ name: "T User", email: `u${++n}@x.com`, phone: "9876543210", password: "password123", role });
const future = (h = 24) => new Date(Date.now() + h * 3600e3).toISOString();
async function worker() {
  const u = await mk("worker");
  const id = await S.saveWorkerProfile(u, { category: "plumber", city: "Lucknow", skills: "pipes", hourly_rate: 300, experience_years: 4 });
  return { u, id };
}

test("register validation + login + lockout", async () => {
  await rej(S.register({ name: "", email: "a@b.com", password: "password123", role: "customer" }), "err_fill_all");
  await rej(S.register({ name: "N", email: "bad", password: "password123", role: "customer" }), "err_email");
  await rej(S.register({ name: "N", email: "a@b.com", phone: "12", password: "password123", role: "customer" }), "err_phone");
  await rej(S.register({ name: "N", email: "a@b.com", password: "short", role: "customer" }), "err_password_short");
  await rej(S.register({ name: "N", email: "a@b.com", password: "password123", role: "admin" }), "err_fill_all");
  const u = await mk();
  await rej(S.register({ name: "N", email: u.email.toUpperCase(), password: "password123", role: "customer" }), "err_email_exists");
  assert.equal((await S.login(u.email, "password123")).id, u.id);
  for (let i = 0; i < 5; i++) await rej(S.login(u.email, "wrong"), "err_invalid_credentials");
  await rej(S.login(u.email, "password123"), "err_locked");
});

test("admin bootstrapped from env", async () => {
  const a = await S.login("admin@test.com", "AdminPass123");
  assert.equal(a.role, "admin");
});

test("booking lifecycle, phone privacy, review", async () => {
  const c = await mk(), { u: w, id } = await worker();
  const bid = await S.createBooking(c, { worker_id: id, description: "Fix tap", address: "A 1", scheduled_for: future() });
  assert.equal((await S.listBookings(c))[0].worker_phone, null);
  await S.updateBookingStatus(w, bid, "accepted");
  assert.ok((await S.listBookings(c))[0].worker_phone);
  await rej(S.addReview(c, bid, 5, "x"), "err_not_allowed"); // not completed yet
  await S.updateBookingStatus(w, bid, "completed");
  await S.addReview(c, bid, 4, "good");
  await rej(S.addReview(c, bid, 5, "again"), "err_not_allowed");
  assert.equal((await S.getWorkerByUser(w.id)).avg_rating, 4);
});

test("booking rules & permissions", async () => {
  const c = await mk(), other = await mk(), { u: w, id } = await worker();
  await rej(S.createBooking(c, { worker_id: id, description: "x", address: "y", scheduled_for: future(-1) }), "err_past");
  await rej(S.createBooking(c, { worker_id: id, description: " ", address: "y", scheduled_for: future() }), "err_fill_all");
  await rej(S.createBooking(w, { worker_id: id, description: "x", address: "y", scheduled_for: future() }), "err_not_allowed");
  const bid = await S.createBooking(c, { worker_id: id, description: "x", address: "y", scheduled_for: future() });
  await rej(S.updateBookingStatus(other, bid, "cancelled"), "err_not_allowed");
  await rej(S.updateBookingStatus(c, bid, "accepted"), "err_not_allowed");
  await rej(S.updateBookingStatus(other, bid, "accepted"), "err_not_allowed");
  await S.updateBookingStatus(c, bid, "cancelled");
  await rej(S.updateBookingStatus(w, bid, "accepted"), "err_not_allowed");
  await S.saveWorkerProfile(w, { category: "plumber", city: "Lucknow", available: false });
  await rej(S.createBooking(c, { worker_id: id, description: "x", address: "y", scheduled_for: future() }), "err_unavailable");
});

test("search filters and wildcard escaping", async () => {
  const { id } = await worker();
  assert.ok((await S.searchWorkers({ category: "plumber", all: true })).some((w) => w.id === id));
  assert.equal((await S.searchWorkers({ category: "cook" })).length, 0);
  assert.ok((await S.searchWorkers({ q: "pipes", city: "luck", all: true })).length >= 1);
  assert.equal((await S.searchWorkers({ q: "%", all: true })).length, 0);
  assert.equal((await S.searchWorkers({ q: "'; DROP TABLE users;--", all: true })).length, 0);
});

test("worker photo validation", async () => {
  const u = await mk("worker");
  const base = { category: "cook", city: "Kanpur" };
  await rej(S.saveWorkerProfile(u, { ...base, photo: "data:text/html;base64,PHNjcmlwdD4=" }), "err_photo");
  await rej(S.saveWorkerProfile(u, { ...base, photo: "javascript:alert(1)" }), "err_photo");
  await S.saveWorkerProfile(u, { ...base, photo: "data:image/jpeg;base64,/9j/4AAQ" });
  assert.equal((await S.getWorkerByUser(u.id)).photo, "data:image/jpeg;base64,/9j/4AAQ");
  await rej(S.saveWorkerProfile(await mk(), base), "err_not_allowed"); // customers can't have profiles
});

test("admin permissions", async () => {
  const admin = await S.login("admin@test.com", "AdminPass123"), c = await mk();
  for (const fn of [() => S.adminStats(c), () => S.adminUsers(null), () => S.adminSetActive(c, c.id, false), () => S.adminLoadDemo(c)])
    await rej(fn(), "need_admin");
  await rej(S.adminSetActive(admin, admin.id, false), "err_not_allowed");
  assert.ok((await S.adminStats(admin)).m_users >= 1);
  assert.equal(await S.adminLoadDemo(admin), S.DEMO.length);
  assert.equal(await S.adminLoadDemo(admin), 0);
  await S.adminSetActive(admin, c.id, false);
  assert.equal(await S.userById(c.id), null);
  await rej(S.login(c.email, "password123"), "err_inactive");
});
