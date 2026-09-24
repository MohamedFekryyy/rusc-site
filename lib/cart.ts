import { useSyncExternalStore } from "react";
import { offerByKey, type OfferKey } from "@/lib/cal";

// The visitor's cart, kept in this browser (localStorage) and shared across
// its tabs. Prices shown from it are for display only: the checkout API
// recomputes every price from OFFERS.

// A dated booking made in the Cal booker, waiting to be paid in the cart.
// uid is Cal's booking, shared by everyone in the same class; seat is this
// person's place in it (Cal's seat reference), which the payment is for.
export type CartBooking = { uid: string; seat?: string; start: string; end?: string };

export type CartItem = { id: string; key: OfferKey; qty: number; booking?: CartBooking };

const STORAGE_KEY = "rusc-cart-v1";
const MAX_QTY = 20;
const EMPTY: CartItem[] = [];

let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter((i): i is CartItem => !!i && !!offerByKey(i.key) && Number(i.qty) > 0);
  } catch {
    return EMPTY;
  }
}

function load() {
  if (!loaded && typeof window !== "undefined") {
    items = read();
    loaded = true;
  }
}

function write(next: CartItem[]) {
  items = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage blocked: the cart still works for this page.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  // Another tab changed the cart.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    items = read();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return items;
}

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export const cart = {
  items: getSnapshot,
  // Cards, membership, gift vouchers: one line per offer, with a quantity.
  add(key: OfferKey) {
    load();
    const line = items.find((i) => i.key === key && !i.booking);
    write(
      line
        ? items.map((i) => (i === line ? { ...i, qty: Math.min(i.qty + 1, MAX_QTY) } : i))
        : [...items, { id: `${key}-${Date.now()}`, key, qty: 1 }],
    );
  },
  // A dated booking: one line per place booked (two people in the same class
  // are two seats of the same Cal booking).
  addBooking(key: OfferKey, booking: CartBooking) {
    load();
    const id = booking.seat ?? booking.uid;
    if (items.some((i) => i.id === id)) return;
    write([...items, { id, key, qty: 1, booking }]);
  },
  setQty(id: string, qty: number) {
    load();
    write(items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, MAX_QTY)) } : i)));
  },
  remove(id: string) {
    load();
    write(items.filter((i) => i.id !== id));
  },
  clear() {
    write(EMPTY);
  },
};

export function cartCount(list: CartItem[]) {
  return list.reduce((n, i) => n + i.qty, 0);
}

export function cartTotal(list: CartItem[]) {
  return list.reduce((sum, i) => sum + (offerByKey(i.key)?.price ?? 0) * i.qty, 0);
}
