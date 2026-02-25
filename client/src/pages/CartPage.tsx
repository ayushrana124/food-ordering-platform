import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Pizza, Trash2, PartyPopper, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EmptyState from '@/components/common/EmptyState';
import { useCart } from '@/hooks/useCart';
import type { ICartItem } from '@/types';

export default function CartPage() {
    const navigate = useNavigate();
    const { items, subtotal, itemCount, removeItem, setQuantity } = useCart();

    const DELIVERY_CHARGE = subtotal >= 499 ? 0 : subtotal >= 299 ? 40 : 60;
    const TAX = Math.round(subtotal * 0.05);
    const TOTAL = subtotal + DELIVERY_CHARGE + TAX;

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-bg">
                <Navbar />
                <div className="py-16">
                    <EmptyState
                        icon={ShoppingBag}
                        title="Your cart is empty"
                        description="Add some delicious items from our menu!"
                        action={
                            <button
                                className="btn-primary text-base px-8 py-3 flex items-center gap-2"
                                onClick={() => navigate('/menu')}
                            >
                                Browse Menu <Pizza size={18} />
                            </button>
                        }
                    />
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg page-enter">
            <Navbar />
            <div className="container py-8 px-4 pb-16">
                <h1 className="font-outfit font-extrabold text-[clamp(1.5rem,4vw,2rem)] mb-7 flex items-center gap-3">
                    <ShoppingBag size={28} className="text-amber" />
                    Your Cart
                    <span className="text-base font-medium text-[#555] ml-1">({itemCount} items)</span>
                </h1>

                {/* 2-col layout on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6">

                    {/* Items */}
                    <div className="flex flex-col gap-[0.875rem]">
                        {items.map((item: ICartItem) => {
                            const itemTotal = (item.price + item.selectedCustomizations.reduce((s, c) => s + c.price, 0)) * item.quantity;
                            return (
                                <div key={item.cartId} className="card p-4 flex gap-4 items-center">
                                    {/* Image */}
                                    <div className="w-[72px] h-[72px] rounded-[10px] overflow-hidden shrink-0 bg-surface-alt">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-[#D0CFC9]">
                                                <Pizza size={32} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-[0.4rem] mb-[0.15rem]">
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ background: item.isVeg ? '#15803D' : '#B91C1C' }}
                                            />
                                            <h4 className="font-outfit font-bold text-[0.95rem] truncate">{item.name}</h4>
                                        </div>
                                        {item.selectedCustomizations.length > 0 && (
                                            <p className="text-[0.75rem] text-text-muted">
                                                + {item.selectedCustomizations.map((c) => c.name).join(', ')}
                                            </p>
                                        )}
                                        <p className="font-bold text-amber mt-1">₹{itemTotal}</p>
                                    </div>

                                    {/* Quantity */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button className="qty-btn" onClick={() => setQuantity(item.cartId, item.quantity - 1)}>−</button>
                                        <span className="font-bold min-w-[20px] text-center">{item.quantity}</span>
                                        <button className="qty-btn" onClick={() => setQuantity(item.cartId, item.quantity + 1)}>+</button>
                                    </div>

                                    {/* Remove */}
                                    <button
                                        onClick={() => removeItem(item.cartId)}
                                        className="p-[0.35rem] border-none bg-[#FEF2F2] rounded-[10px] cursor-pointer text-[#DC2626] text-base shrink-0 hover:bg-[#FEE2E2] transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Order Summary */}
                    <div className="card p-6 h-fit sticky top-20">
                        <h3 className="font-outfit font-bold text-[1.15rem] mb-5">Order Summary</h3>

                        <div className="flex flex-col gap-3 mb-4">
                            <div className="flex justify-between text-[0.9rem]">
                                <span className="text-[#555]">Subtotal</span>
                                <span className="font-semibold">₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between text-[0.9rem]">
                                <span className="text-[#555]">Delivery</span>
                                <span className={`font-semibold flex items-center gap-1 ${DELIVERY_CHARGE === 0 ? 'text-[#15803D]' : ''}`}>
                                    {DELIVERY_CHARGE === 0 ? (
                                        <>FREE <PartyPopper size={14} /></>
                                    ) : `₹${DELIVERY_CHARGE}`}
                                </span>
                            </div>
                            <div className="flex justify-between text-[0.9rem]">
                                <span className="text-[#555]">Taxes (5%)</span>
                                <span className="font-semibold">₹{TAX}</span>
                            </div>
                        </div>

                        <div className="divider" />

                        <div className="flex justify-between mb-6 mt-3">
                            <span className="font-outfit font-extrabold text-[1.1rem]">Total</span>
                            <span className="font-outfit font-extrabold text-[1.1rem] text-amber">₹{TOTAL}</span>
                        </div>

                        {subtotal < 499 && (
                            <div className="bg-[#FFFBEB] rounded-[10px] px-[0.875rem] py-[0.625rem] mb-4 text-[0.8rem] text-[#B45309] font-medium">
                                Add ₹{499 - subtotal} more for free delivery!
                            </div>
                        )}

                        <button
                            className="btn-primary w-full justify-center text-base py-[0.875rem] flex items-center gap-2 group"
                            onClick={() => navigate('/checkout')}
                        >
                            Proceed to Checkout <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
