const { NextResponse } = require("next/server");
const { AppError } = require("./errors");

const json = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Wrap a route handler: CSRF guard on mutations + uniform error responses. */
function route(fn) {
  return async (req, ctx) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        if (!(req.headers.get("content-type") || "").includes("application/json")) throw new AppError("err_server", 415);
        const origin = req.headers.get("origin");
        if (origin && new URL(origin).host !== req.headers.get("host")) throw new AppError("err_not_allowed", 403);
      }
      return json(await fn(req, ctx));
    } catch (e) {
      if (e instanceof AppError) return json({ error: e.key }, e.status);
      console.error("API error:", e);
      return json({ error: "err_server" }, 500);
    }
  };
}

async function body(req) {
  try { const b = await req.json(); return b && typeof b === "object" ? b : {}; } catch { return {}; }
}

module.exports = { route, body, json };
