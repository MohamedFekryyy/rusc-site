import { useSyncExternalStore } from "react";
import { amountBounds, isMadeClass, offerByKey, rememberClassOffer, toClassOffer, validAmount, type ClassOffer, type OfferKey } from "@/lib/cal";

export { amountBounds, validAmount };

// The visitor's cart, kept in this browser (localStorage) and shared across
// its tabs. Prices shown from it are for display only: the checkout API
// recomputes every price from OFFERS.

// A dated booking made in the Cal booker, waiting to be paid in the cart.
// uid is Cal's booking, shared by everyone in the same class; seat is this
// person's place in it (Cal's seat reference), which the payment is for.
// hours: open studio booked for several hours in a row (end is the last one's).
export type CartBooking = { uid: string; seat?: string; start: string; end?: string; hours?: number };

// amount: what the buyer chose for a gift voucher of any amount (euro cents).
// offer: a class made in rūsc admin, kept with its line so the cart can name
// and price it on any page, before the classes load (display only).
export type CartItem = { id: string; key: OfferKey; qty: number; amount?: number; booking?: CartBooking; offer?: ClassOffer };

// A line's unit price in euro cents.
export function linePrice(item: CartItem) {
  return item.amount ?? offerByKey(item.key)?.price ?? 0;
}

const STORAGE_KEY = "rusc-cart-v1";
const CODE_KEY = "rusc-cart-code-v1";
const MAX_QTY = 20;
const EMPTY: CartItem[] = [];

let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

// The code applied to the cart (W3): a euro-valued code that pays for part of
// the total. Persisted so it survives a reload; cleared when the cart empties.
let appliedCode: string = "";
const codeListeners = new Set<() => void>();

function readCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function read(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return EMPTY;
    for (const line of parsed) {
      const made = toClassOffer((line as CartItem | null)?.offer);
      if (made) rememberClassOffer(made);
    }
    return parsed.filter(
      (i): i is CartItem => !!i && !!offerByKey(i.key) && Number(i.qty) > 0 && (!amountBounds(i.key) || validAmount(i.key, i.amount) !== null),
    );
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

// The code applied to the cart (W3). A euro-valued code that covers part of
// the total at checkout. Kept in localStorage, cleared with the cart.
function subscribeCode(listener: () => void) {
  codeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    codeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useAppliedCode() {
  return useSyncExternalStore<string>(
    subscribeCode,
    () => {
      if (typeof window !== "undefined") appliedCode = readCode();
      return appliedCode;
    },
    () => "",
  );
}

function setAppliedCode(code: string) {
  appliedCode = code;
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    // ignore
  }
  codeListeners.forEach((l) => l());
}

export const applyCode = (code: string) => setAppliedCode((code ?? "").trim());
export const clearAppliedCode = () => setAppliedCode("");

export const cart = {
  items: getSnapshot,
  // Cards, membership, gift vouchers: one line per offer, with a quantity.
  add(key: OfferKey) {
    load();
    const line = items.find((i) => i.key === key && !i.booking);
    // A membership is one per cart, never a quantity: cap at 1.
    if (key === "adhesion" && (line || items.some((i) => i.key === "adhesion"))) return;
    write(
      line
        ? items.map((i) => (i === line ? { ...i, qty: Math.min(i.qty + 1, MAX_QTY) } : i))
        : [...items, { id: `${key}-${Date.now()}`, key, qty: 1 }],
    );
  },
  // A gift voucher of any amount: one line per amount chosen.
  addAmount(key: OfferKey, cents: number) {
    load();
    const amount = validAmount(key, cents);
    if (amount === null) return;
    const id = `${key}-${amount}`;
    const line = items.find((i) => i.id === id);
    write(
      line
        ? items.map((i) => (i === line ? { ...i, qty: Math.min(i.qty + 1, MAX_QTY) } : i))
        : [...items, { id, key, qty: 1, amount }],
    );
  },
  // A dated booking: one line per person who booked, with the places they
  // hold (theirs and their friends', lib/places.ts). Two people booking the
  // same class are two seats of the same Cal booking, so two lines.
  addBooking(key: OfferKey, booking: CartBooking, places = 1) {
    load();
    const id = booking.seat ?? booking.uid;
    if (items.some((i) => i.id === id)) return;
    const offer = offerByKey(key);
    write([...items, { id, key, qty: Math.max(1, Math.min(places, MAX_QTY)), booking, ...(isMadeClass(offer) ? { offer } : {}) }]);
  },
  setQty(id: string, qty: number) {
    load();
    write(
      items.map((i) => {
        if (i.id !== id) return i;
        // A membership is one per cart, never a quantity.
        const cap = i.key === "adhesion" ? 1 : MAX_QTY;
        return { ...i, qty: Math.max(1, Math.min(qty, cap)) };
      }),
    );
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
  return list.reduce((sum, i) => sum + linePrice(i) * i.qty, 0);
}
