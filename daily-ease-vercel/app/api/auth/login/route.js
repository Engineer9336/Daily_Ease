import { route, body } from "@/lib/http";
import { login } from "@/lib/services";
import { createSession } from "@/lib/session";
export const dynamic = 'force-dynamic';
export const POST = route(async (req) => {
  const b = await body(req);
  const user = await login(b.email, b.password);
  await createSession(user);
  return { user };
});
