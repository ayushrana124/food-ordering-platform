import { useState } from 'react';
import { Phone, MapPin, Loader2, Check, ChefHat, Bike, PackageCheck, MessageSquare, Banknote, CreditCard } from 'lucide-react';
import { acceptOrder, updateOrderStatus, rejectOrder, type IAdminOrder } from '@/services/adminApi';
import { money } from '@/i18n';
import { ticketCode } from '@/utils/orderCode';
import toast from 'react-hot-toast';

/** Matches the server's VALID_PREP_TIMES. */
const PREP_TIMES = [20, 30, 45, 60, 90];

/** How long a new order may sit before the card starts shouting, in minutes. */
const LATE_AFTER_MIN = 5;

/** The single next step for each stage, mirroring the server's transitions. */
const NEXT: Record<string, { to: string; label: string; icon: typeof ChefHat } | undefined> = {
    ACCEPTED: { to: 'PREPARING', label: 'Start cooking', icon: ChefHat },
    PREPARING: { to: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Bike },
    OUT_FOR_DELIVERY: { to: 'DELIVERED', label: 'Delivered', icon: PackageCheck },
};

const minutesSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

const ago = (mins: number) => (mins < 1 ? 'just now' : mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`);

interface OrderCardProps {
    order: IAdminOrder;
    /** Called after any action that changed the order, so the board can refetch. */
    onChanged: () => void;
    /** Shows the customer's phone and address. Off for finished orders. */
    detailed?: boolean;
}

/**
 * One order, as a card the kitchen can act on without opening anything.
 *
 * The previous screen put every action behind a detail modal, so accepting an
 * order — the most repeated action in the shop — cost two taps and covered the
 * rest of the queue. Here the next step is a single oversized button on the
 * card itself, and choosing a prep time happens inline.
 */
export default function OrderCard({ order, onChanged, detailed = true }: OrderCardProps) {
    const [prep, setPrep] = useState(30);
    const [busy, setBusy] = useState<string | null>(null);
    const [confirmReject, setConfirmReject] = useState(false);

    const isNew = order.orderStatus === 'PENDING';
    const age = minutesSince(order.createdAt);
    const late = isNew && age >= LATE_AFTER_MIN;

    const customer = typeof order.userId === 'object' && order.userId ? order.userId : null;
    const next = NEXT[order.orderStatus];

    const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
        setBusy(key);
        try {
            await fn();
            toast.success(done);
            onChanged();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Could not update the order');
        } finally {
            setBusy(null);
        }
    };

    return (
        <article className={`a-card${isNew ? (late ? ' a-card--late' : ' a-card--new') : ''}`}>
            {/* ── Header ── */}
            <div className="a-card__top">
                <span className="a-card__id a-grow a-trunc" title={order.orderId}>
                    #{ticketCode(order.orderId)}
                </span>
                <span className="a-card__age" data-late={late}>{ago(age)}</span>
            </div>

            {/* ── Items ── */}
            <div className="a-card__body">
                {order.items.map((item, i) => (
                    <div className="a-line" key={`${item.menuItemId}-${i}`}>
                        <span className="a-line__q">{item.quantity}×</span>
                        <span className="a-line__n">
                            {item.name}
                            {item.customizations?.length > 0 && (
                                <span className="a-line__o">
                                    {item.customizations
                                        .map((c) => (c as { optionName?: string; name?: string }).optionName ?? (c as { name?: string }).name)
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            )}
                        </span>
                    </div>
                ))}

                {order.specialInstructions && (
                    <div
                        style={{
                            display: 'flex', gap: 7, marginTop: 9, padding: '8px 10px',
                            borderRadius: 'var(--c-r-sm)', background: 'var(--c-brand-wash)',
                            color: 'var(--c-brand-deep)',
                            font: '600 .78rem/1.4 "DM Sans", sans-serif',
                        }}
                    >
                        <MessageSquare size={14} style={{ flex: 'none', marginTop: 1 }} />
                        {order.specialInstructions}
                    </div>
                )}

                {detailed && customer && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 5 }}>
                        <a
                            href={`tel:${customer.phone}`}
                            className="a-row"
                            style={{ textDecoration: 'none', color: 'var(--c-ink-2)', font: '600 .8rem/1.3 "DM Sans", sans-serif' }}
                        >
                            <Phone size={13} style={{ flex: 'none' }} />
                            <span className="a-trunc">{customer.name || 'Customer'} · {customer.phone}</span>
                        </a>
                        {order.deliveryAddress?.addressLine && (
                            <span
                                className="a-row"
                                style={{ color: 'var(--c-ink-3)', font: '400 .78rem/1.35 "DM Sans", sans-serif', alignItems: 'flex-start' }}
                            >
                                <MapPin size={13} style={{ flex: 'none', marginTop: 2 }} />
                                <span>
                                    {order.deliveryAddress.addressLine}
                                    {order.deliveryAddress.landmark ? ` · ${order.deliveryAddress.landmark}` : ''}
                                    {typeof order.distance === 'number' ? ` · ${order.distance} km` : ''}
                                </span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Money ── */}
            <div className="a-card__foot">
                <span className="a-card__total a-grow">{money(order.total)}</span>
                <span className={`a-pill ${order.paymentMethod === 'COD' ? 'a-pill--quiet' : 'a-pill--ok'}`} style={{ cursor: 'default' }}>
                    {order.paymentMethod === 'COD' ? <Banknote size={13} /> : <CreditCard size={13} />}
                    {order.paymentMethod === 'COD' ? 'Cash' : 'Paid'}
                </span>
            </div>

            {/* ── Action ── */}
            {isNew && (
                <div className="a-card__act">
                    <div className="a-prep" role="group" aria-label="Preparation time">
                        {PREP_TIMES.map((t) => (
                            <button
                                key={t}
                                type="button"
                                className="a-prep__b"
                                data-on={prep === t}
                                onClick={() => setPrep(t)}
                            >
                                {t}m
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="a-do a-do--go"
                        disabled={busy !== null}
                        onClick={() => run('accept', () => acceptOrder(order._id, prep), `Accepted · ${prep} min`)}
                    >
                        {busy === 'accept' ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        Accept · {prep} min
                    </button>

                    {confirmReject ? (
                        <div className="a-row" style={{ gap: 6 }}>
                            <button type="button" className="a-undo a-grow" onClick={() => setConfirmReject(false)}>
                                Keep it
                            </button>
                            <button
                                type="button"
                                className="a-undo a-grow"
                                style={{ background: 'var(--c-danger)', color: '#fff', boxShadow: 'none' }}
                                disabled={busy !== null}
                                onClick={() => run('reject', () => rejectOrder(order._id), 'Order rejected')}
                            >
                                {busy === 'reject' ? <Loader2 size={15} className="animate-spin" /> : 'Reject order'}
                            </button>
                        </div>
                    ) : (
                        <button type="button" className="a-undo" onClick={() => setConfirmReject(true)}>
                            Reject
                        </button>
                    )}
                </div>
            )}

            {!isNew && next && (
                <div className="a-card__act">
                    <button
                        type="button"
                        className="a-do"
                        disabled={busy !== null}
                        onClick={() => run('next', () => updateOrderStatus(order._id, next.to), next.label)}
                    >
                        {busy === 'next' ? <Loader2 size={18} className="animate-spin" /> : <next.icon size={18} />}
                        {next.label}
                    </button>
                </div>
            )}
        </article>
    );
}
