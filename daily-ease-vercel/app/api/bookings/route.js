import { route, body } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { createBooking, listBookings } from "@/lib/services";
export const dynamic = 'force-dynamic';
export const GET = route(async () => ({ bookings: await listBookings(await currentUser()) }));
export const POST = route(async (req) => ({ id: await createBooking(await currentUser(), await body(req)) }));
