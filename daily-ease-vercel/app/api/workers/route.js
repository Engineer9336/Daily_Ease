import { route } from "@/lib/http";
import { searchWorkers } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const GET = route(async (req) => {
  const p = new URL(req.url).searchParams;
  return { workers: await searchWorkers({ q: p.get("q") || "", category: p.get("category") || "", city: p.get("city") || "", all: p.get("all") === "1" }) };
});
