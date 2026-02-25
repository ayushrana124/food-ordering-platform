import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

interface LoginModalProps {
    onClose: () => void;
}

type Step = 'phone' | 'otp';

export default function LoginModal({ onClose }: LoginModalProps) {
    const { login } = useAuth();
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Prevent background scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const startCountdown = () => {
        setCountdown(30);
        timerRef.current = setInterval(() => {
            setCountdown((p) => {
                if (p <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return p - 1;
            });
        }, 1000);
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[6-9]\d{9}$/.test(phone)) {
            toast.error('Enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        try {
            await authService.sendOTP(phone);
            toast.success('OTP sent! Check your SMS.');
            setStep('otp');
            startCountdown();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Failed to send OTP';
            toast.error(msg ?? 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(otp)) {
            toast.error('Enter the 6-digit OTP');
            return;
        }
        setLoading(true);
        try {
            const res = await authService.verifyOTP(phone, otp);
            login(res.user, res.token);
            toast.success(`Welcome${res.user.name ? `, ${res.user.name}` : ''}! 🍕`);
            onClose();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Invalid OTP';
            toast.error(msg ?? 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(28,28,30,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
                animation: 'fadeIn 0.2s ease',
            }}
        >
            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

            <div
                ref={modalRef}
                style={{
                    background: 'white',
                    borderRadius: 'var(--radius-xl)',
                    padding: '2rem',
                    width: '100%',
                    maxWidth: 420,
                    boxShadow: 'var(--shadow-lg)',
                    animation: 'slideUp 0.25s ease',
                    position: 'relative',
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        width: 32, height: 32, borderRadius: '50%',
                        border: '1.5px solid var(--color-border-strong)',
                        background: 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', color: 'var(--color-text-secondary)',
                    }}
                >
                    ✕
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍕</div>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                        {step === 'phone' ? 'Welcome back!' : 'Verify OTP'}
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        {step === 'phone'
                            ? 'Login with your phone number to order pizza'
                            : `OTP sent to +91 ${phone}`}
                    </p>
                </div>

                {/* Phone step */}
                {step === 'phone' ? (
                    <form onSubmit={handleSendOTP}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text-primary)' }}>
                            Phone Number
                        </label>
                        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                            <span style={{
                                position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                                fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.95rem',
                            }}>
                                +91
                            </span>
                            <input
                                className="input"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="98765 43210"
                                style={{ paddingLeft: '3rem' }}
                                autoFocus
                                inputMode="numeric"
                                required
                                id="phone-input"
                            />
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                            {loading ? '⏳ Sending...' : 'Send OTP →'}
                        </button>
                    </form>
                ) : (
                    // OTP step
                    <form onSubmit={handleVerifyOTP}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text-primary)' }}>
                            Enter 6-digit OTP
                        </label>
                        <input
                            className="input"
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="• • • • • •"
                            style={{ letterSpacing: '0.5rem', fontSize: '1.25rem', textAlign: 'center', marginBottom: '1.25rem' }}
                            autoFocus
                            inputMode="numeric"
                            required
                            id="otp-input"
                        />
                        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: '0.75rem' }} disabled={loading}>
                            {loading ? '⏳ Verifying...' : 'Verify & Login ✓'}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            {countdown > 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                    Resend OTP in <strong>{countdown}s</strong>
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                                >
                                    Resend OTP
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => { setStep('phone'); setOtp(''); }}
                                style={{ display: 'block', margin: '0.4rem auto 0', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                ← Change number
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
