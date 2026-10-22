// Business logic. Every function enforces its own permissions (never trust the route alone).
const bcrypt = require("bcryptjs");
const { db } = require("./db");
const { AppError } = require("./errors");
const CATEGORIES = require("./categories");

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9]{10,13}$/;
const COLORS = ["#0F766E","#B45309","#7C3AED","#BE123C","#1D4ED8","#15803D","#C2410C"];
const MAX_FAILS = 5, WINDOW_MIN = 15;
const str = (v, n) => String(v ?? "").trim().slice(0, n);
const int = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const like = (s) => "%" + s.replace(/[\\%_]/g, "\\$&") + "%";
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, language: u.language });

// ---------------- auth ----------------
async function register({ name, email, phone, password, role, language }) {
  name = str(name, 80); email = str(email, 120).toLowerCase(); phone = str(phone, 20).replace(/\s/g, "");
  password = String(password ?? "");
  if (!["customer", "worker"].includes(role)) throw new AppError("err_fill_all");
  if (!name || !email || !password) throw new AppError("err_fill_all");
  if (!EMAIL_RE.test(email)) throw new AppError("err_email");
  if (phone && !PHONE_RE.test(phone)) throw new AppError("err_phone");
  if (password.length < 8 || password.length > 72) throw new AppError("err_password_short");
  const d = await db();
  try {
    const r = await d.query(
      "INSERT INTO users(name,email,phone,pw_hash,role,language) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, email, phone, await bcrypt.hash(password, 10), role, ["en", "hi", "hinglish"].includes(language) ? language : "en"]);
    return pub(r[0]);
  } catch (e) {
    if (e.code === "23505" || /unique|duplicate/i.test(e.message)) throw new AppError("err_email_exists", 409);
    throw e;
  }
}

async function login(email, password) {
  email = str(email, 120).toLowerCase();
  const d = await db();
  await d.query("DELETE FROM login_failures WHERE ts < now() - interval '" + WINDOW_MIN + " minutes'");
  const n = (await d.query("SELECT COUNT(*)::int AS n FROM login_failures WHERE email=$1", [email]))[0].n;
  if (n >= MAX_FAILS) throw new AppError("err_locked", 429);
  const u = (await d.query("SELECT * FROM users WHERE email=$1", [email]))[0];
  const ok = u ? await bcrypt.compare(String(password ?? ""), u.pw_hash) : (await bcrypt.compare("x", "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012"), false);
  if (!ok) { await d.query("INSERT INTO login_failures(email) VALUES($1)", [email]); throw new AppError("err_invalid_credentials", 401); }
  if (!u.active) throw new AppError("err_inactive", 403);
  await d.query("DELETE FROM login_failures WHERE email=$1", [email]);
  return pub(u);
}

async function userById(id) {
  const r = await (await db()).query("SELECT * FROM users WHERE id=$1 AND active", [id]);
  return r[0] ? pub(r[0]) : null;
}

// ---------------- workers ----------------
const WSEL = `SELECT w.id, w.user_id, w.category, w.skills, w.city, w.hourly_rate, w.experience_years, w.bio,
  w.photo, w.avatar_color, w.available, w.verified, u.name,
  (SELECT ROUND(AVG(rating)::numeric,1)::float FROM bookings b WHERE b.worker_id=w.id AND b.rating IS NOT NULL) AS avg_rating,
  (SELECT COUNT(rating)::int FROM bookings b WHERE b.worker_id=w.id) AS review_count
  FROM workers w JOIN users u ON u.id=w.user_id`;

async function saveWorkerProfile(user, p) {
  if (!user || user.role !== "worker") throw new AppError("err_not_allowed", 403);
  const category = str(p.category, 30), city = str(p.city, 60);
  if (!CATEGORIES.includes(category) || !city) throw new AppError("err_fill_all");
  let photo = p.photo === undefined ? undefined : p.photo;
  if (photo !== undefined && photo !== null) {
    if (typeof photo !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo) || photo.length > 200000)
      throw new AppError("err_photo");
  }
  const v = [category, str(p.skills, 200), city, int(p.hourly_rate, 50, 20000, 300),
    int(p.experience_years, 0, 60, 0), str(p.bio, 500), p.available !== false];
  const d = await db();
  const ex = await d.query("SELECT id FROM workers WHERE user_id=$1", [user.id]);
  if (ex.length) {
    await d.query("UPDATE workers SET category=$1,skills=$2,city=$3,hourly_rate=$4,experience_years=$5,bio=$6,available=$7 WHERE user_id=$8", [...v, user.id]);
    if (photo !== undefined) await d.query("UPDATE workers SET photo=$1 WHERE user_id=$2", [photo, user.id]);
    return ex[0].id;
  }
  return (await d.query(
    "INSERT INTO workers(category,skills,city,hourly_rate,experience_years,bio,available,user_id,photo,avatar_color) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
    [...v, user.id, photo || null, COLORS[user.id % COLORS.length]]))[0].id;
}

async function getWorkerByUser(userId) {
  return (await (await db()).query(WSEL + " WHERE w.user_id=$1", [userId]))[0] || null;
}

async function searchWorkers({ q = "", category = "", city = "", all = false } = {}) {
  const args = []; let sql = WSEL + " WHERE u.active";
  const arg = (v) => { args.push(v); return "$" + args.length; };
  if (category) sql += " AND w.category=" + arg(String(category));
  if (!all) sql += " AND w.available";
  if (str(city, 60)) sql += " AND w.city ILIKE " + arg(like(str(city, 60))) + " ESCAPE '\\'";
  if (str(q, 60)) {
    const p = arg(like(str(q, 60)));
    sql += ` AND (u.name ILIKE ${p} ESCAPE '\\' OR w.skills ILIKE ${p} ESCAPE '\\' OR w.bio ILIKE ${p} ESCAPE '\\' OR w.category ILIKE ${p} ESCAPE '\\')`;
  }
  sql += " ORDER BY w.verified DESC, COALESCE((SELECT AVG(rating) FROM bookings b WHERE b.worker_id=w.id),0) DESC, w.experience_years DESC LIMIT 60";
  return (await db()).query(sql, args);
}

// ---------------- bookings ----------------
async function createBooking(user, { worker_id, description, address, scheduled_for }) {
  if (!user || user.role !== "customer") throw new AppError("err_not_allowed", 403);
  description = str(description, 500); address = str(address, 300);
  if (!description || !address) throw new AppError("err_fill_all");
  const when = new Date(scheduled_for);
  if (isNaN(when) || when <= new Date()) throw new AppError("err_past");
  const d = await db();
  const w = (await d.query("SELECT w.id, w.category FROM workers w JOIN users u ON u.id=w.user_id WHERE w.id=$1 AND w.available AND u.active", [int(worker_id, 1, 2147483647, 0)]))[0];
  if (!w) throw new AppError("err_unavailable", 409);
  return (await d.query(
    "INSERT INTO bookings(customer_id,worker_id,category,description,address,scheduled_for) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
    [user.id, w.id, w.category, description, address, when.toISOString()]))[0].id;
}

const TRANSITIONS = {
  worker: { pending: ["accepted", "rejected"], accepted: ["completed"] },
  customer: { pending: ["cancelled"], accepted: ["cancelled"] },
  admin: { pending: ["cancelled"], accepted: ["cancelled"] },
};

async function updateBookingStatus(user, bookingId, next) {
  if (!user) throw new AppError("need_login", 401);
  const d = await db();
  const b = (await d.query("SELECT b.*, w.user_id AS worker_user FROM bookings b JOIN workers w ON w.id=b.worker_id WHERE b.id=$1", [int(bookingId, 1, 2147483647, 0)]))[0];
  const owner = b && ((user.role === "worker" && b.worker_user === user.id) ||
    (user.role === "customer" && b.customer_id === user.id) || user.role === "admin");
  if (!owner || !(TRANSITIONS[user.role]?.[b.status] || []).includes(next)) throw new AppError("err_not_allowed", 403);
  await d.query("UPDATE bookings SET status=$1, updated_at=now() WHERE id=$2", [next, b.id]);
}

async function addReview(user, bookingId, rating, review) {
  rating = Math.round(Number(rating));
  if (!(rating >= 1 && rating <= 5)) throw new AppError("err_fill_all");
  const d = await db();
  const r = await d.query(
    "UPDATE bookings SET rating=$1, review=$2, updated_at=now() WHERE id=$3 AND customer_id=$4 AND status='completed' AND rating IS NULL RETURNING id",
    [rating, str(review, 300), int(bookingId, 1, 2147483647, 0), user?.role === "customer" ? user.id : -1]);
  if (!r.length) throw new AppError("err_not_allowed", 403);
}

async function listBookings(user) {
  if (!user) throw new AppError("need_login", 401);
  const where = { customer: "b.customer_id=$1", worker: "w.user_id=$1", admin: "$1::int IS NOT NULL" }[user.role];
  const rows = await (await db()).query(
    `SELECT b.id, b.category, b.description, b.address, b.scheduled_for, b.status, b.rating, b.review, b.created_at,
       cu.name AS customer_name, cu.phone AS customer_phone, wu.name AS worker_name, wu.phone AS worker_phone
     FROM bookings b JOIN workers w ON w.id=b.worker_id JOIN users wu ON wu.id=w.user_id JOIN users cu ON cu.id=b.customer_id
     WHERE ${where} ORDER BY b.id DESC LIMIT 200`, [user.id]);
  if (user.role !== "admin") // contact numbers are shared only once a worker has accepted
    for (const r of rows) if (!["accepted", "completed"].includes(r.status)) r.customer_phone = r.worker_phone = null;
  return rows;
}

// ---------------- admin ----------------
const admin = (u) => { if (!u || u.role !== "admin") throw new AppError("need_admin", 403); };

async function adminStats(u) {
  admin(u);
  const r = (await (await db()).query(`SELECT
    (SELECT COUNT(*)::int FROM users WHERE role='customer') AS m_users,
    (SELECT COUNT(*)::int FROM workers) AS m_workers,
    (SELECT COUNT(*)::int FROM bookings) AS m_bookings,
    (SELECT COUNT(*)::int FROM bookings WHERE status='pending') AS m_pending`))[0];
  return r;
}
async function adminUsers(u) {
  admin(u);
  return (await db()).query("SELECT id,name,email,phone,role,active,created_at FROM users ORDER BY id DESC LIMIT 300");
}
async function adminSetActive(u, id, active) {
  admin(u);
  if (Number(id) === u.id) throw new AppError("err_not_allowed", 403);
  await (await db()).query("UPDATE users SET active=$1 WHERE id=$2", [!!active, int(id, 1, 2147483647, 0)]);
}
async function adminSetVerified(u, id, verified) {
  admin(u);
  await (await db()).query("UPDATE workers SET verified=$1 WHERE id=$2", [!!verified, int(id, 1, 2147483647, 0)]);
}

const DEMO = [
  ["Ramesh Kumar", "plumber", "Lucknow", "Pipe fitting, leak repair, bathroom fittings", 350, 8],
  ["Sunita Devi", "cleaner", "Lucknow", "Deep cleaning, kitchen, bathroom", 250, 5],
  ["Imran Ali", "electrician", "Gorakhpur", "Wiring, fans, inverter, MCB", 400, 10],
  ["Pooja Sharma", "tutor", "Gorakhpur", "Maths, Science, Class 6-10", 500, 6],
  ["Vikas Yadav", "carpenter", "Lucknow", "Furniture repair, doors, modular work", 450, 12],
  ["Anita Singh", "cook", "Kanpur", "North Indian, daily meals, parties", 300, 7],
  ["Mohd. Arif", "ac_repair", "Lucknow", "AC servicing, gas refill, installation", 600, 9],
  ["Deepak Verma", "painter", "Gorakhpur", "Interior, exterior, waterproofing", 380, 11],
];
async function adminLoadDemo(u) {
  admin(u);
  const d = await db(); let added = 0;
  for (const [name, cat, city, skills, rate, yrs] of DEMO) {
    const email = name.toLowerCase().replace(/[^a-z]+/g, ".") + "@demo.dailyease.local";
    if ((await d.query("SELECT 1 FROM users WHERE email=$1", [email])).length) continue;
    const r = await d.query("INSERT INTO users(name,email,pw_hash,role) VALUES($1,$2,$3,'worker') RETURNING *",
      [name, email, await bcrypt.hash(require("crypto").randomBytes(18).toString("hex"), 8)]);
    await saveWorkerProfile(pub(r[0]), { category: cat, city, skills, hourly_rate: rate, experience_years: yrs, bio: "Demo profile for " + name + "." });
    added++;
  }
  return added;
}

module.exports = { register, login, userById, saveWorkerProfile, getWorkerByUser, searchWorkers, createBooking,
  updateBookingStatus, addReview, listBookings, adminStats, adminUsers, adminSetActive, adminSetVerified, adminLoadDemo, DEMO };
