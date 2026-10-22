import { route } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { adminStats } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const GET = route(async () => ({ stats: await adminStats(await currentUser()) }));
