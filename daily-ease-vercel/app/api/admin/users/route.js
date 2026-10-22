import { route } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { adminUsers } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const GET = route(async () => ({ users: await adminUsers(await currentUser()) }));
