import { route, body } from "@/lib/http";
import { register } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const POST = route(async (req) => ({ user: await register(await body(req)) }));
