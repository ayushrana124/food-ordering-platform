import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Pizza, ShieldCheck, FileText, RefreshCw } from 'lucide-react';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-[#FAFAF8] border-t border-[#EBEBEB] text-[#555] pt-14">
            <div className="container">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-10 pb-10 border-b border-[#EBEBEB]">

                    {/* Brand */}
                    <div>
                        <Link to="/" className="flex items-center gap-[0.55rem] no-underline mb-[0.9rem]">
                            <span className="text-[#D4920A] flex items-center">
                                <Pizza size={22} />
                            </span>
                            <span className="font-outfit font-extrabold text-[1.15rem] text-[#111] tracking-[-0.02em]">
                                Bunty<span className="text-[#D4920A]">Pizza</span>
                            </span>
                        </Link>
                        <p className="text-[0.85rem] leading-[1.8] text-[#9B9B9B] max-w-[240px]">
                            Crafted with love, delivered with speed. Your favourite pizza, always fresh. soul
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-outfit font-bold text-[#111] text-[0.72rem] mb-[1.1rem] tracking-[0.16em] uppercase">
                            Quick Links
                        </h4>
                        <div className="flex flex-col gap-[0.55rem]">
                            {[{ to: '/', l: 'Home' }, { to: '/menu', l: 'Menu' }, { to: '/cart', l: 'Cart' }, { to: '/profile', l: 'My Account' }].map((i) => (
                                <Link
                                    key={i.to}
                                    to={i.to}
                                    className="text-[#555] text-[0.85rem] no-underline font-medium hover:text-[#D4920A] transition-colors duration-[180ms]"
                                >
                                    {i.l}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-outfit font-bold text-[#111] text-[0.72rem] mb-[1.1rem] tracking-[0.16em] uppercase">
                            Contact
                        </h4>
                        <div className="flex flex-col gap-[0.6rem] text-[0.85rem] text-[#555]">
                            {[
                                { Icon: Phone, text: '+91 98765 43210' },
                                { Icon: Mail, text: 'hello@buntypizza.com' },
                                { Icon: MapPin, text: '123 Pizza Lane, Mumbai' },
                            ].map((c) => (
                                <div key={c.text} className="flex items-center gap-2">
                                    <span className="text-[#D4920A] opacity-80 flex-shrink-0"><c.Icon size={14} /></span> {c.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hours */}
                    <div>
                        <h4 className="font-outfit font-bold text-[#111] text-[0.72rem] mb-[1.1rem] tracking-[0.16em] uppercase">
                            Hours
                        </h4>
                        <div className="flex flex-col gap-2 text-[0.85rem] text-[#555]">
                            {[
                                { day: 'Mon – Fri', time: '11am – 11pm' },
                                { day: 'Sat – Sun', time: '10am – 12am' },
                            ].map((h) => (
                                <div key={h.day} className="flex items-center gap-[0.4rem]">
                                    <span className="text-[#D4920A] opacity-80"><Clock size={14} /></span>
                                    <span className="flex-1">{h.day}</span>
                                    <span className="text-[#111] font-bold">{h.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="py-5 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-[0.75rem] text-[#9B9B9B]">
                        &copy; {year} BuntyPizza. All rights reserved. soul
                    </p>
                    <div className="flex gap-4">
                        {[
                            { label: 'Privacy', Icon: ShieldCheck },
                            { label: 'Terms', Icon: FileText },
                            { label: 'Refund', Icon: RefreshCw },
                        ].map((t) => (
                            <span
                                key={t.label}
                                className="flex items-center gap-1 text-[0.75rem] text-[#9B9B9B] cursor-pointer hover:text-[#D4920A] transition-colors duration-[180ms]"
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
