import { CODES_ORIGIN } from "@/lib/codes";

// Places in a class booked on the site, kept by rūsc admin (deploy/admin,
// /api/places). Cal books the booker's own place; the extra places they ask
// for (friends) are added here, within the class's seats. Places waiting in
// the cart are held for 30 minutes, then freed unless paid; removing a class
// from the cart frees its places at once. The booker's seat reference (from
// Cal's bookingSuccessful event) identifies the group. Open studio goes by
// the hour: asked for several, rūsc admin books the following hours too, the
// same people in each, while the studio is open and has room.

export type PlaceState = {
  ok: boolean;
  // gone: freed (ran out, removed in another tab) or cancelled; past; error.
  reason?: string;
  // full: fewer places than asked were free; last: the booker's own place
  // can only be removed with the whole line.
  note?: string;
  seat?: string;
  offer?: string | null;
  start?: string;
  end?: string;
  // People in the group (per hour), the hours it spans (open studio), and its
  // unpaid places in all, one per person and hour: what the cart charges.
  places?: number;
  hours?: number;
  unpaid?: number;
  left?: number;
  expiresAt?: string | null;
  extras?: string[];
};

async function post(path: string, body: unknown): Promise<PlaceState> {
  try {
    const res = await fetch(`${CODES_ORIGIN}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as PlaceState;
  } catch {
    return { ok: false, reason: "error" };
  }
}

// Holds the group, with `places` places in all (the booker's included), for
// `hours` hours in a row from the one booked (open studio only).
export const holdPlaces = (seat: string, places: number, hours = 1) => post("/api/places", { seat, op: "hold", places, hours });
export const addPlace = (seat: string) => post("/api/places", { seat, op: "add" });
export const removePlace = (seat: string) => post("/api/places", { seat, op: "remove" });
export const releasePlaces = (seat: string) => post("/api/places", { seat, op: "release" });

// The cart's class lines as they stand (null if rūsc admin can't be reached).
export async function placesState(seats: string[]): Promise<PlaceState[] | null> {
  if (!seats.length) return [];
  try {
    const res = await fetch(`${CODES_ORIGIN}/api/places?seats=${seats.map(encodeURIComponent).join(",")}`);
    if (!res.ok) return null;
    return ((await res.json()) as { places: PlaceState[] }).places;
  } catch {
    return null;
  }
}

// For the checkout route (server side): the class and number of unpaid places
// of each line, from Cal, and their hold extended while the person pays.
export async function placesForCheckout(seats: string[]): Promise<PlaceState[] | null> {
  if (!seats.length) return [];
  try {
    const res = await fetch(`${CODES_ORIGIN}/api/places/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seats }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { places: PlaceState[] }).places;
  } catch {
    return null;
  }
}
