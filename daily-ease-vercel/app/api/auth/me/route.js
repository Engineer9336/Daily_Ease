import { route } from "@/lib/http";
import { currentUser } from "@/lib/session";
export const dynamic = 'force-dynamic';
export const GET = route(async () => ({ user: await currentUser() }));
