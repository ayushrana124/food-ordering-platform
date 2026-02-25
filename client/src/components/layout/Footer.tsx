import { Link } from 'react-router-dom';

const PhoneIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);
const MailIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);
const MapPinIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-[#111] text-[rgba(255,255,255,0.65)] pt-14">
            <div className="container">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-10 pb-10 border-b border-[rgba(255,255,255,0.07)]">

                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2 mb-[0.9rem]">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4920A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12l10 10 10-10" />
                            </svg>
                            <span className="font-ui font-extrabold text-[1.15rem] text-white tracking-[-0.02em]">
                                Bunty<span className="text-[#D4920A]">Pizza</span>
                            </span>
                        </div>
                        <p className="text-[0.82rem] leading-[1.8] text-[rgba(255,255,255,0.4)] max-w-[240px]">
                            Crafted with love, delivered with speed. Your favourite pizza, always fresh.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-ui font-bold text-[#D4920A] text-[0.72rem] mb-[1.1rem] tracking-[0.16em] uppercase">
                            Quick Links
                        </h4>
                        <div className="flex flex-col gap-[0.55rem]">
                            {[{ to: '/', l: 'Home' }, { to: '/menu', l: 'Menu' }, { to: '/cart', l: 'Cart' }, { to: '/profile', l: 'My Account' }].map((i) => (
                                <Link
                                    key={i.to}
                                    to={i.to}
                                    className="text-[rgba(255,255,255,0.45)] text-[0.85rem] no-underline font-ui hover:text-[#D4920A] transition-colors duration-[180ms]"
                                >
                                    {i.l}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-ui font-bold text-[#D4920A] text-[0.72rem] mb-[1.1rem] tracking-[0.16em] uppercase">
                            Contact
                        </h4>
                        <div className="flex flex-col gap-[0.6rem] text-[0.82rem] text-[rgba(255,255,255,0.45)] font-ui">
                            {[
                                { Icon: PhoneIcon, text: '+91 98765 43210' },
                                { Icon: MailIcon, text: 'hello@buntypizza.com' },
                                { Icon: MapPinIcon, text: '123 Pizza Lane, Mumbai' },
                            ].map((c) => (
                                <div key={c.text} className="flex items-center gap-2">
                                    <span className="opacity-60 flex-shrink-0"><c.Icon /></span> {c.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hours */}
                    <div>
                        <h4 className="font-ui font-bold text-[#D4920A] text-[0.72rem] mb-[1.1rem] tracking-[0.16em] uppercase">
                            Hours
                        </h4>
                        <div className="flex flex-col gap-2 text-[0.82rem] text-[rgba(255,255,255,0.45)] font-ui">
                            {[
                                { day: 'Mon – Fri', time: '11am – 11pm' },
                                { day: 'Sat – Sun', time: '10am – 12am' },
                            ].map((h) => (
                                <div key={h.day} className="flex items-center gap-[0.4rem]">
                                    <span className="opacity-60"><ClockIcon /></span>
                                    <span className="flex-1">{h.day}</span>
                                    <span className="text-[#D4920A] font-semibold">{h.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="py-5 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-[0.75rem] text-[rgba(255,255,255,0.25)] font-ui">
                        &copy; {year} BuntyPizza. All rights reserved.
                    </p>
                    <div className="flex gap-5">
                        {['Privacy', 'Terms', 'Refund'].map((t) => (
                            <span
                                key={t}
                                className="text-[0.75rem] text-[rgba(255,255,255,0.25)] cursor-pointer font-ui hover:text-[rgba(255,255,255,0.6)] transition-colors duration-[180ms]"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
