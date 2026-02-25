import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { addToCart, removeFromCart, updateQuantity, clearCart } from '@/redux/slices/cartSlice';
import type { ICartItem, IMenuItemCustomization } from '@/types';

interface AddPayload {
    menuItemId: string;
    name: string;
    price: number;
    image?: string;
    isVeg: boolean;
    selectedCustomizations: IMenuItemCustomization[];
}

export const useCart = () => {
    const dispatch = useAppDispatch();
    const { items, subtotal, itemCount } = useAppSelector((s) => s.cart);

    return {
        items,
        subtotal,
        itemCount,
        addItem: (payload: AddPayload) => dispatch(addToCart(payload)),
        removeItem: (cartId: string) => dispatch(removeFromCart(cartId)),
        setQuantity: (cartId: string, quantity: number) => dispatch(updateQuantity({ cartId, quantity })),
        clear: () => dispatch(clearCart()),
        getItemCount: (menuItemId: string): number =>
            items
                .filter((i: ICartItem) => i.menuItemId === menuItemId)
                .reduce((sum: number, i: ICartItem) => sum + i.quantity, 0),
    };
};
