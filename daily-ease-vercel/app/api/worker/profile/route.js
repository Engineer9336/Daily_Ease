import { route, body } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { saveWorkerProfile, getWorkerByUser } from "@/lib/services";
import { AppError } from "@/lib/errors";
export const dynamic = 'force-dynamic';
export const GET = route(async () => {
  const u = await currentUser();
  if (!u || u.role !== "worker") throw new AppError("err_not_allowed", 403);
  return { profile: await getWorkerByUser(u.id) };
});
export const PUT = route(async (req) => {
  const u = await currentUser();
  await saveWorkerProfile(u, await body(req));
  return { profile: await getWorkerByUser(u.id) };
});
