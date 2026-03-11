import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Pizza, Trash2, Truck, ArrowRight, MapPin } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EmptyState from '@/components/common/EmptyState';
import { useCart } from '@/hooks/useCart';
import type { ICartItem } from '@/types';

export default function CartPage() {
    const navigate = useNavigate();
    const { items, subtotal, itemCount, removeItem, setQuantity } = useCart();

    const TAX = Math.round(subtotal * 0.05);
    // Delivery charges are distance-based (server-side), so we show an estimate
    const ESTIMATED_TOTAL_MIN = subtotal + TAX + 20; // min delivery ₹20
    const ESTIMATED_TOTAL_MAX = subtotal + TAX + 60; // max delivery ₹60

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-white">
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
        <div className="min-h-screen bg-white page-enter">
            <Navbar />
            <div className="container py-8 px-4 pb-16">
                <h1 className="font-outfit font-extrabold text-[clamp(1.6rem,4vw,2.2rem)] mb-8 flex items-center gap-3 tracking-[-0.02em]">
                    <span className="w-11 h-11 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-[#E8A317]">
                        <ShoppingBag size={22} />
                    </span>
                    Your Cart
                    <span className="text-[0.9rem] font-medium text-[#8E8E8E] ml-1">({itemCount} items)</span>
                </h1>

                {/* 2-col layout on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-7">

                    {/* Items */}
                    <div className="flex flex-col gap-4">
                        {items.map((item: ICartItem) => {
                            const itemTotal = (item.price + item.selectedCustomizations.reduce((s, c) => s + c.price, 0)) * item.quantity;
                            return (
                                <div key={item.cartId} className="card p-5 flex gap-4 items-center">
                                    {/* Image */}
                                    <div className="w-[76px] h-[76px] rounded-xl overflow-hidden shrink-0 bg-[#F7F7F5]">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-[#D4D4D0]">
                                                <Pizza size={30} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-[0.4rem] mb-[0.2rem]">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ background: item.isVeg ? '#16A34A' : '#DC2626' }}
                                            />
                                            <h4 className="font-outfit font-bold text-[0.95rem] truncate">{item.name}</h4>
                                        </div>
                                        {item.selectedCustomizations.length > 0 && (
                                            <p className="text-[0.75rem] text-[#8E8E8E]">
                                                + {item.selectedCustomizations.map((c) => c.optionName).join(', ')}
                                            </p>
                                        )}
                                        <p className="font-bold text-[#E8A317] mt-1">₹{itemTotal}</p>
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
                                        className="p-2 border-none bg-[#FEF2F2] rounded-xl cursor-pointer text-[#DC2626] shrink-0 hover:bg-[#FEE2E2] transition-colors duration-200"
                                        title="Remove"
                                    >
                                        <Trash2 size={17} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Order Summary */}
                    <div className="card p-7 h-fit sticky top-20">
                        <h3 className="font-outfit font-bold text-[1.15rem] mb-5">Order Summary</h3>

                        <div className="flex flex-col gap-3 mb-4">
                            <div className="flex justify-between text-[0.9rem]">
                                <span className="text-[#4A4A4A]">Subtotal</span>
                                <span className="font-semibold">₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between text-[0.9rem]">
                                <span className="text-[#4A4A4A]">Delivery</span>
                                <span className="font-semibold text-[#8E8E8E] flex items-center gap-1">
                                    <MapPin size={13} /> Based on distance
                                </span>
                            </div>
                            <div className="flex justify-between text-[0.9rem]">
                                <span className="text-[#4A4A4A]">Taxes (5%)</span>
                                <span className="font-semibold">₹{TAX}</span>
                            </div>
                        </div>

                        <div className="divider" />

                        <div className="flex justify-between mb-6 mt-3">
                            <span className="font-outfit font-extrabold text-[1.15rem]">Estimated Total</span>
                            <span className="font-outfit font-extrabold text-[1.15rem] text-[#E8A317]">₹{ESTIMATED_TOTAL_MIN} – ₹{ESTIMATED_TOTAL_MAX}</span>
                        </div>

                        <div className="bg-[#FFFBF0] rounded-xl px-4 py-3 mb-5 text-[0.8rem] text-[#D97706] font-medium flex items-center gap-2">
                            <Truck size={15} />
                            Delivery charges (₹20–₹60) calculated based on your location at checkout
                        </div>

                        <button
                            className="btn-primary w-full justify-center text-base py-[0.9rem] flex items-center gap-2 group"
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
