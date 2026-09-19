// ─── Shared Domain Types ───────────────────────────────────────────────────

export interface IAddress {
    _id: string;
    label: 'Home' | 'Work' | 'Other';
    addressLine: string;
    landmark?: string;
    coordinates?: { lat: number; lng: number };
    isDefault: boolean;
}

export interface IUser {
    _id: string;
    phone: string;
    name?: string;
    email?: string;
    addresses: IAddress[];
    isBlocked: boolean;
    isCODBlocked: boolean;
    createdAt: string;
    lastLogin: string;
}

// ─── Customization Types ──────────────────────────────────────────────────────

/** A single option within a customization group (e.g. "Large" +₹150) */
export interface ICustomizationOption {
    name: string;
    price: number;
}

/** A customization group on a menu item (e.g. "Size" with options) */
export interface ICustomizationGroup {
    name: string;
    options: ICustomizationOption[];
    required: boolean;
}

/** What ends up in the cart / order after user picks options */
export interface ISelectedCustomization {
    groupName: string;
    optionName: string;
    price: number;
}

// Legacy alias — kept for backward compatibility in a few places
export type IMenuItemCustomization = ICustomizationOption;

export interface IMenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image?: string;
    isVeg: boolean;
    isAvailable: boolean;
    isDeleted?: boolean;
    deletedAt?: string;
    customizations: ICustomizationGroup[];
}



/**
 * Mirrors the Restaurant document the API actually returns.
 *
 * This previously declared `address` as a string and `coordinates` as a
 * top-level field, neither of which the server sends — callers were casting
 * through `any` to reach `address.addressLine`. Checkout needs the real
 * coordinates to compute distance, so the shape is now honest.
 */
export interface IRestaurant {
    _id: string;
    name: string;
    description?: string;
    logo?: string;
    banner?: string;
    address: {
        addressLine: string;
        coordinates: { lat: number; lng: number };
    };
    phone?: string;
    email?: string;
    openingHours: Record<string, { open: string; close: string; isOpen: boolean }>;
    isOpen: boolean;
    deliveryRadius: number;
    minOrderAmount: number;
    /** Minutes. */
    avgPreparationTime: number;
    categories?: string[];
}

export interface IOffer {
    _id: string;
    title: string;
    description: string;
    /** Uppercase to match the server's enum — lowercase never matched anything. */
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    minOrderAmount: number;
    code?: string;
    validTill: string;
    banner?: string;
    // Landing-page display fields
    label?: string;
    headline?: string;
    ctaText?: string;
    colorTheme?: string;
}

export interface ICategory {
    _id: string;
    name: string;
    icon: string;
    colorScheme: {
        bg: string;
        border: string;
        color: string;
        iconBg: string;
    };
    displayOrder: number;
    isActive: boolean;
}

export interface IOrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    customizations: ISelectedCustomization[];
}

export type OrderStatus =
    | 'PENDING'
    | 'ACCEPTED'
    | 'PREPARING'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED';

export type PaymentMethod = 'COD' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface IOrder {
    _id: string;
    orderId: string;
    userId: string;
    items: IOrderItem[];
    deliveryAddress: IAddress;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    razorpayOrderId?: string;
    subtotal: number;
    deliveryCharges: number;
    discount?: number;
    total: number;
    orderStatus: OrderStatus;
    specialInstructions?: string;
    preparationTime?: number;
    estimatedDeliveryTime?: string;
    rejectionReason?: string;
    cancelledBy?: 'CUSTOMER' | 'RESTAURANT';
    statusHistory?: Array<{ status: string; timestamp: string; note?: string }>;
    createdAt: string;
    updatedAt: string;
}

// ─── Cart Types ───────────────────────────────────────────────────────────────

export interface ICartItem {
    cartId: string;
    menuItemId: string;
    name: string;
    price: number;
    image?: string;
    quantity: number;
    isVeg: boolean;
    selectedCustomizations: ISelectedCustomization[];
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
    message: string;
    data?: T;
}

export interface AuthResponse {
    message: string;
    token: string;
    user: IUser;
}

export interface PaginatedOrders {
    orders: IOrder[];
    total: number;
    page: number;
    pages: number;
}

// ─── Redux State Types ────────────────────────────────────────────────────────

export interface AuthState {
    user: IUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
}

export interface CartState {
    items: ICartItem[];
    subtotal: number;
    itemCount: number;
}

export interface MenuState {
    items: IMenuItem[];
    restaurant: IRestaurant | null;
    offers: IOffer[];
    categories: ICategory[];
    loading: boolean;
    error: string | null;
}

export interface OrderState {
    currentOrder: IOrder | null;
    orders: IOrder[];
    loading: boolean;
    error: string | null;
}
