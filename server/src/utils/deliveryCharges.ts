// Calculate delivery charges based on distance
export const calculateDeliveryCharges = (distance: number): number | null => {
    if (distance <= 2) return 20;
    if (distance <= 5) return 40;
    if (distance <= 10) return 60;
    return null; // Beyond delivery range
};
