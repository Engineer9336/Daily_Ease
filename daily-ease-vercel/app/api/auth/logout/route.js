import { route } from "@/lib/http";
import { clearSession } from "@/lib/session";
export const dynamic = 'force-dynamic';
export const POST = route(async () => { clearSession(); return { ok: true }; });
