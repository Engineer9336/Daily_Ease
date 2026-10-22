import { route } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { adminLoadDemo } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const POST = route(async () => ({ added: await adminLoadDemo(await currentUser()) }));
