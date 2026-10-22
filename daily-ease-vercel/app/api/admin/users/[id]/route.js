import { route, body } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { adminSetActive } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const PATCH = route(async (req, { params }) => {
  await adminSetActive(await currentUser(), params.id, (await body(req)).active);
  return { ok: true };
});
