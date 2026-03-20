import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
    fetchCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCartThunk,
    applyCoupon,
    removeCoupon,
    resetCart,
} from '@/redux/slices/cartSlice';

export const useCart = () => {
    const dispatch = useAppDispatch();
    const cart = useAppSelector((s) => s.cart);

    return {
        items: cart.items,
        subtotal: cart.subtotal,
        total: cart.total,
        itemCount: cart.itemCount,
        discount: cart.discount,
        appliedCoupon: cart.appliedCoupon,
        loading: cart.loading,
        error: cart.error,

        fetch: () => dispatch(fetchCart()),
        addItem: (payload: { menuItemId: string; quantity?: number; selectedCustomizations?: { groupName: string; optionName: string }[] }) =>
            dispatch(addToCart(payload)),
        setQuantity: (cartItemId: string, quantity: number) =>
            dispatch(updateCartItem({ cartItemId, quantity })),
        removeItem: (cartItemId: string) => dispatch(removeCartItem(cartItemId)),
        clear: () => dispatch(clearCartThunk()),
        applyCoupon: (code: string) => dispatch(applyCoupon(code)),
        removeCoupon: () => dispatch(removeCoupon()),
        reset: () => dispatch(resetCart()),

        getItemCount: (menuItemId: string): number =>
            cart.items
                .filter((i) => i.menuItemId === menuItemId)
                .reduce((sum, i) => sum + i.quantity, 0),
    };
};
