/**
 * Short, speakable reference for an order.
 *
 * Order ids look like `ORD-MU9Y2YYW-7AZ0C` — a timestamp and a random tail.
 * Nobody can read that down a phone line, and the kitchen has to match orders
 * against customers constantly. The random tail alone is short enough to say
 * aloud and write on a bag, and both sides of the app show the same thing so
 * they always agree.
 *
 * The full id is still what the API uses; this is only ever for display.
 */
export const ticketCode = (orderId?: string | null): string => {
    if (!orderId) return '—';
    const parts = orderId.split('-').filter(Boolean);
    // `ORD-<time>-<random>` → the random tail; anything else → the last chunk.
    const tail = parts.length > 1 ? parts[parts.length - 1] : orderId;
    return tail.toUpperCase();
};
