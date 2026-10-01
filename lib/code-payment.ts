// Code payment for cart products — single source of truth for the toggle.
//
// A euro-valued code (a gift voucher worth an amount) can pay for part of a
// cart (a carnet, the membership, another voucher). The checkout route
// resolves the coverage server-side against rusc-admin (/api/cover), then
// issues a Stripe coupon for the covered amount; the customer pays the
// remainder by card. The code is debited only when Stripe confirms payment
// (a pending "hold" is finalized/rolled back server-side).
//
// Toggle this feature off by setting CODE_PAYMENT_ENABLED=false here and
// redeploying. When off, the cart shows no code field and the checkout
// ignores any code, leaving the card-only path untouched.
export const CODE_PAYMENT_ENABLED = true;
