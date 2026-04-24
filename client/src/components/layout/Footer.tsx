import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, ChefHat, ShieldCheck, FileText, RefreshCw } from 'lucide-react';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-[#F7F7F5] border-t border-[#EEEEEE] text-[#4A4A4A] pt-16">
            <div className="container">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-10 pb-12 border-b border-[#EEEEEE]">

                    {/* Brand */}
                    <div>
                        <Link to="/" className="flex items-center gap-[0.5rem] no-underline mb-4 group">
                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8A317] to-[#F0B429] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110" style={{ boxShadow: '0 2px 8px rgba(232,163,23,0.2)' }}>
                                <ChefHat size={16} />
                            </span>
                            <span className="font-outfit font-extrabold text-[1.1rem] text-[#0F0F0F] tracking-[-0.02em]">
                                Diamond<span className="text-[#E8A317]">Pizza</span>
                            </span>
                        </Link>
                        <p className="text-[0.85rem] leading-[1.8] text-[#8E8E8E] max-w-[240px]">
                            Crafted with love, delivered with speed. Your favourite pizza, always fresh.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-outfit font-bold text-[#0F0F0F] text-[0.72rem] mb-5 tracking-[0.14em] uppercase">
                            Quick Links
                        </h4>
                        <div className="flex flex-col gap-[0.65rem]">
                            {[{ to: '/', l: 'Home' }, { to: '/menu', l: 'Menu' }, { to: '/cart', l: 'Cart' }, { to: '/profile', l: 'My Account' }].map((i) => (
                                <Link
                                    key={i.to}
                                    to={i.to}
                                    className="text-[#4A4A4A] text-[0.85rem] no-underline font-medium hover:text-[#E8A317] transition-colors duration-200"
                                >
                                    {i.l}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-outfit font-bold text-[#0F0F0F] text-[0.72rem] mb-5 tracking-[0.14em] uppercase">
                            Contact
                        </h4>
                        <div className="flex flex-col gap-[0.7rem] text-[0.85rem] text-[#4A4A4A]">
                            {[
                                { Icon: Phone, text: '+91 98765 43210' },
                                { Icon: Mail, text: 'hello@buntypizza.com' },
                                { Icon: MapPin, text: 'Near IndianOil Petrol Pump, Mooradabad Road, Noorpur' },
                            ].map((c) => (
                                 <div key={c.text} className="flex items-center gap-[0.6rem]">
                                    <span className="w-7 h-7 rounded-lg bg-[#FFFBF0] flex items-center justify-center text-[#E8A317] flex-shrink-0">
                                        <c.Icon size={13} />
                                    </span>
                                    {c.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hours */}
                    <div>
                        <h4 className="font-outfit font-bold text-[#0F0F0F] text-[0.72rem] mb-5 tracking-[0.14em] uppercase">
                            Hours
                        </h4>
                        <div className="flex flex-col gap-[0.6rem] text-[0.85rem] text-[#4A4A4A]">
                            {[
                                { day: 'Mon - Sun', time: '10am - 10pm' },
                            ].map((h) => (
                                <div key={h.day} className="flex items-center gap-[0.5rem]">
                                    <span className="w-7 h-7 rounded-lg bg-[#FFFBF0] flex items-center justify-center text-[#E8A317] flex-shrink-0">
                                        <Clock size={13} />
                                    </span>
                                    <span className="flex-1">{h.day}</span>
                                    <span className="text-[#0F0F0F] font-bold">{h.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="py-5 flex justify-between items-center flex-wrap gap-3">
                    <p className="text-[0.75rem] text-[#8E8E8E]">
                        &copy; {year} DiamondPizza. All rights reserved.
                    </p>
                    <div className="flex gap-5">
                        {[
                            { label: 'Privacy', Icon: ShieldCheck },
                            { label: 'Terms', Icon: FileText },
                            { label: 'Refund', Icon: RefreshCw },
                        ].map((t) => (
                            <span
                                key={t.label}
                                className="flex items-center gap-[0.35rem] text-[0.75rem] text-[#8E8E8E] cursor-pointer hover:text-[#E8A317] transition-colors duration-200"
                            >
                                <t.Icon size={12} /> {t.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
