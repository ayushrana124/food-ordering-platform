/**
 * Client-side mirror of the server's delivery pricing and radius rules
 * (server/src/utils/deliveryCharges.ts and distanceCalculator.ts).
 *
 * This exists so checkout can show the fee before the order is submitted rather
 * than revealing it only in the confirmation. The server still recomputes both
 * the distance and the fee when the order is created and is the only authority
 * on what is charged — these functions must never be the basis for a total that
 * is trusted.
 */

/** Haversine distance in kilometres, rounded to 2dp like the server. */
export const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
};

/** Returns null beyond the delivery range, matching the server's contract. */
export const deliveryFee = (km: number): number | null => {
    if (km <= 2) return 20;
    if (km <= 5) return 40;
    if (km <= 10) return 60;
    return null;
};
