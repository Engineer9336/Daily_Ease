// Signed, HttpOnly session cookie (JWT/HS256). The user row is re-read on every request,
// so deactivating an account takes effect immediately.
const { SignJWT, jwtVerify } = require("jose");
const { cookies } = require("next/headers");
const { userById } = require("./services");

const NAME = "de_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_EMBEDDED_DB)
      throw new Error("AUTH_SECRET (32+ chars) is required in production.");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-0123456789");
  }
  return new TextEncoder().encode(s);
}

async function createSession(user) {
  const token = await new SignJWT({ uid: user.id }).setProtectedHeader({ alg: "HS256" })
    .setIssuedAt().setExpirationTime(MAX_AGE + "s").sign(secret());
  cookies().set(NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production" });
}

function clearSession() { cookies().set(NAME, "", { httpOnly: true, path: "/", maxAge: 0 }); }

async function currentUser() {
  const t = cookies().get(NAME)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret(), { algorithms: ["HS256"] });
    return await userById(payload.uid);
  } catch { return null; }
}

module.exports = { createSession, clearSession, currentUser };
