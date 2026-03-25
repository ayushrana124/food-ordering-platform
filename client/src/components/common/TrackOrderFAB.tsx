import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bike, UtensilsCrossed, Clock, CheckCircle2, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { orderService } from '@/services/orderService';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; pulse: boolean }> = {
    PENDING: { label: 'Order Placed', color: '#D97706', bg: '#FFFBF0', icon: Clock, pulse: true },
    ACCEPTED: { label: 'Accepted', color: '#2563EB', bg: '#EFF6FF', icon: CheckCircle2, pulse: true },
    PREPARING: { label: 'Preparing...', color: '#7C3AED', bg: '#F5F3FF', icon: UtensilsCrossed, pulse: true },
    OUT_FOR_DELIVERY: { label: 'On the way!', color: '#EA580C', bg: '#FFF7ED', icon: Bike, pulse: true },
};

interface ActiveOrder {
    _id: string;
    orderId: string;
    orderStatus: string;
}

export default function TrackOrderFAB() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);

    useSocket(user?._id);

    const fetchActiveOrder = useCallback(async () => {
        if (!isAuthenticated) { setActiveOrder(null); return; }
        try {
            const data = await orderService.getUserOrders(1, 5);
            const active = data.orders.find((o) =>
                !['DELIVERED', 'CANCELLED'].includes(o.orderStatus)
            );
            if (active) {
                setActiveOrder({ _id: active._id, orderId: active.orderId, orderStatus: active.orderStatus });
            } else {
                setActiveOrder(null);
            }
        } catch {
            setActiveOrder(null);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchActiveOrder();
        const interval = setInterval(fetchActiveOrder, 30000);
        return () => clearInterval(interval);
    }, [fetchActiveOrder]);

    // Listen to redux order updates via a simpler approach - poll when socket may have updated
    useEffect(() => {
        const handler = () => fetchActiveOrder();
        window.addEventListener('focus', handler);
        return () => window.removeEventListener('focus', handler);
    }, [fetchActiveOrder]);

    if (!activeOrder) return null;

    const config = STATUS_CONFIG[activeOrder.orderStatus];
    if (!config) return null;

    const Icon = config.icon;

    return createPortal(
        <button
            onClick={() => navigate(`/order/${activeOrder._id}`)}
            style={{
                position: 'fixed',
                bottom: 'clamp(1rem, 3vw, 1.5rem)',
                left: 'clamp(0.75rem, 2.5vw, 1.25rem)',
                zIndex: 9999,
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                background: config.bg,
                border: `1.5px solid ${config.color}30`,
                borderRadius: 14,
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${config.color}20, 0 2px 8px rgba(0,0,0,0.08)`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                animation: 'fabSlideIn 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 24px ${config.color}30, 0 4px 12px rgba(0,0,0,0.1)`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 20px ${config.color}20, 0 2px 8px rgba(0,0,0,0.08)`;
            }}
        >
            {/* Pulse indicator */}
            {config.pulse && (
                <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 8, height: 8, borderRadius: '50%',
                    background: config.color,
                    animation: 'fabPulse 2s ease-in-out infinite',
                }} />
            )}

            <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${config.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: config.color, flexShrink: 0,
            }}>
                <Icon size={14} />
            </span>

            <div style={{ textAlign: 'left' }}>
                <p style={{
                    fontSize: '0.6rem', fontWeight: 700, color: config.color,
                    margin: 0, lineHeight: 1, letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                }}>
                    Track Order
                </p>
                <p style={{
                    fontSize: '0.52rem', fontWeight: 600, color: `${config.color}B0`,
                    margin: '1px 0 0', lineHeight: 1,
                    whiteSpace: 'nowrap',
                }}>
                    {config.label}
                </p>
            </div>

            <style>{`
                @keyframes fabSlideIn {
                    from { opacity: 0; transform: translateX(-20px) scale(0.9); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes fabPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }
            `}</style>
        </button>,
        document.body,
    );
}
