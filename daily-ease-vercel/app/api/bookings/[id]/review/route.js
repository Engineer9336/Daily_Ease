import { route, body } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { addReview } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const POST = route(async (req, { params }) => {
  const b = await body(req);
  await addReview(await currentUser(), params.id, b.rating, b.review);
  return { ok: true };
});
