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
        <footer style={{ background: 'var(--dark)', color: 'rgba(255,255,255,0.65)', paddingTop: '3.5rem' }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

                    {/* Brand */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12l10 10 10-10" />
                            </svg>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: '1.15rem', color: '#fff', letterSpacing: '-0.02em' }}>
                                Bunty<span style={{ color: 'var(--amber)' }}>Pizza</span>
                            </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.4)', maxWidth: 240 }}>
                            Crafted with love, delivered with speed. Your favourite pizza, always fresh.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'var(--amber)', fontSize: '0.72rem', marginBottom: '1.1rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                            Quick Links
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                            {[{ to: '/', l: 'Home' }, { to: '/menu', l: 'Menu' }, { to: '/cart', l: 'Cart' }, { to: '/profile', l: 'My Account' }].map((i) => (
                                <Link key={i.to} to={i.to} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', transition: 'color 0.18s', textDecoration: 'none', fontFamily: "'Inter', sans-serif" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--amber)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
                                    {i.l}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'var(--amber)', fontSize: '0.72rem', marginBottom: '1.1rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                            Contact
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}>
                            {[
                                { Icon: PhoneIcon, text: '+91 98765 43210' },
                                { Icon: MailIcon, text: 'hello@buntypizza.com' },
                                { Icon: MapPinIcon, text: '123 Pizza Lane, Mumbai' },
                            ].map((c) => (
                                <div key={c.text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ opacity: 0.6, flexShrink: 0 }}><c.Icon /></span> {c.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hours */}
                    <div>
                        <h4 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'var(--amber)', fontSize: '0.72rem', marginBottom: '1.1rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                            Hours
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}>
                            {[
                                { day: 'Mon – Fri', time: '11am – 11pm' },
                                { day: 'Sat – Sun', time: '10am – 12am' },
                            ].map((h) => (
                                <div key={h.day} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ opacity: .6 }}><ClockIcon /></span>
                                    <span style={{ flex: 1 }}>{h.day}</span>
                                    <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{h.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div style={{ padding: '1.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', sans-serif" }}>
                        &copy; {year} BuntyPizza. All rights reserved.
                    </p>
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                        {['Privacy', 'Terms', 'Refund'].map((t) => (
                            <span key={t} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'color 0.18s' }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
