import { route, body } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { updateBookingStatus } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const PATCH = route(async (req, { params }) => {
  await updateBookingStatus(await currentUser(), params.id, (await body(req)).status);
  return { ok: true };
});
