import { useMemo } from 'react';
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
    hardResetCart,
    guestAdd,
    guestSetQuantity,
    guestRemove,
    guestClear,
    type ServerCartItem,
} from '@/redux/slices/cartSlice';

/**
 * One cart API for the whole app, whichever side of sign-in the customer is on.
 *
 * Signed in, every operation goes to the server, which is the only thing that
 * may decide a price. Signed out, the basket is held locally and priced by
 * joining against the menu already in the store — the same numbers the server
 * would produce, but never trusted: the merge on login re-resolves every line.
 */
export const useCart = () => {
    const dispatch = useAppDispatch();
    const cart = useAppSelector((s) => s.cart);
    const menuItems = useAppSelector((s) => s.menu.items);
    const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

    const guestView = useMemo(() => {
        if (isAuthenticated) return null;

        const byId = new Map(menuItems.map((m) => [m._id, m]));
        const items: ServerCartItem[] = [];
        let subtotal = 0;
        let itemCount = 0;

        for (const line of cart.guestLines) {
            const menu = byId.get(line.menuItemId);
            // The menu may not have loaded yet, or the dish may be gone. Either
            // way it is not renderable, so leave it out of the view. The line is
            // kept in state — the server decides its fate at merge time.
            if (!menu) continue;

            let unitPrice = menu.price;
            const selectedCustomizations = line.selectedCustomizations.map((c) => {
                const group = menu.customizations?.find((g) => g.name === c.groupName);
                const option = group?.options?.find((o) => o.name === c.optionName);
                const price = option?.price ?? 0;
                unitPrice += price;
                return { groupName: c.groupName, optionName: c.optionName, price };
            });

            const itemTotal = unitPrice * line.quantity;
            subtotal += itemTotal;
            itemCount += line.quantity;

            items.push({
                cartItemId: line.lineId,
                menuItemId: menu._id,
                name: menu.name,
                image: menu.image,
                isVeg: menu.isVeg,
                price: menu.price,
                quantity: line.quantity,
                selectedCustomizations,
                itemTotal,
                isAvailable: menu.isAvailable,
            });
        }

        return { items, subtotal, itemCount, total: subtotal };
    }, [isAuthenticated, cart.guestLines, menuItems]);

    const view = guestView ?? cart;

    return {
        items: view.items,
        subtotal: view.subtotal,
        total: view.total,
        itemCount: view.itemCount,
        // Coupons are validated and applied server-side, so they only exist once
        // the customer has signed in.
        discount: isAuthenticated ? cart.discount : null,
        appliedCoupon: isAuthenticated ? cart.appliedCoupon : null,
        loading: cart.loading,
        merging: cart.merging,
        error: cart.error,
        isGuest: !isAuthenticated,

        fetch: () => dispatch(fetchCart()),

        addItem: (payload: { menuItemId: string; quantity?: number; selectedCustomizations?: { groupName: string; optionName: string }[] }) =>
            isAuthenticated ? dispatch(addToCart(payload)) : dispatch(guestAdd(payload)),

        setQuantity: (cartItemId: string, quantity: number) =>
            isAuthenticated
                ? dispatch(updateCartItem({ cartItemId, quantity }))
                : dispatch(guestSetQuantity({ lineId: cartItemId, quantity })),

        removeItem: (cartItemId: string) =>
            isAuthenticated ? dispatch(removeCartItem(cartItemId)) : dispatch(guestRemove(cartItemId)),

        clear: () => (isAuthenticated ? dispatch(clearCartThunk()) : dispatch(guestClear())),

        applyCoupon: (code: string) => dispatch(applyCoupon(code)),
        removeCoupon: () => dispatch(removeCoupon()),
        reset: () => dispatch(resetCart()),
        hardReset: () => dispatch(hardResetCart()),

        /** Total quantity of one dish across all its option combinations. */
        getItemCount: (menuItemId: string): number =>
            view.items
                .filter((i) => i.menuItemId === menuItemId)
                .reduce((sum, i) => sum + i.quantity, 0),

        /** The single line for a dish, when it has exactly one — lets a card step quantity directly. */
        getSoleLine: (menuItemId: string): ServerCartItem | null => {
            const lines = view.items.filter((i) => i.menuItemId === menuItemId);
            return lines.length === 1 ? lines[0] : null;
        },
    };
};
