import { route, body } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { adminSetVerified } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const PATCH = route(async (req, { params }) => {
  await adminSetVerified(await currentUser(), params.id, (await body(req)).verified);
  return { ok: true };
});
