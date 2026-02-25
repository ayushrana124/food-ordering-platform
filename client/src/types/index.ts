// ─── Shared Domain Types ───────────────────────────────────────────────────

export interface IAddress {
    _id: string;
    label: 'Home' | 'Work' | 'Other';
    addressLine: string;
    landmark?: string;
    coordinates: { lat: number; lng: number };
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

export interface IMenuItemCustomization {
    name: string;
    price: number;
}

export interface IMenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image?: string;
    isVeg: boolean;
    isAvailable: boolean;
    customizations: IMenuItemCustomization[];
}

export interface IRestaurant {
    _id: string;
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
    banner?: string;
    coordinates: { lat: number; lng: number };
    deliveryRadius: number;
    minOrderAmount: number;
    deliveryTime: number;
    isOpen: boolean;
    openingHours: {
        open: string;
        close: string;
    };
    rating?: number;
}

export interface IOffer {
    _id: string;
    title: string;
    description: string;
    discountType: 'percentage' | 'flat';
    discountValue: number;
    minOrderAmount: number;
    code?: string;
    validTill: string;
    banner?: string;
}

export interface IOrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    customizations: IMenuItemCustomization[];
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
    taxes: number;
    total: number;
    status: OrderStatus;
    specialInstructions?: string;
    estimatedDelivery?: number;
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
    selectedCustomizations: IMenuItemCustomization[];
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
    categories: string[];
    loading: boolean;
    error: string | null;
}

export interface OrderState {
    currentOrder: IOrder | null;
    orders: IOrder[];
    loading: boolean;
    error: string | null;
}
