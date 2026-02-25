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

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const startCountdown = () => {
        setCountdown(30);
        timerRef.current = setInterval(() => {
            setCountdown((p) => {
                if (p <= 1) { clearInterval(timerRef.current!); return 0; }
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
            className="fixed inset-0 z-[1000] bg-[rgba(28,28,30,0.6)] backdrop-blur-[4px] flex items-center justify-center p-4"
            style={{ animation: 'fadeIn 0.2s ease' }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            <div
                ref={modalRef}
                className="bg-white rounded-[22px] p-8 w-full max-w-[420px] shadow-[0_12px_36px_rgba(0,0,0,0.12)] relative"
                style={{ animation: 'slideUp 0.25s ease' }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full border-[1.5px] border-[#D0CFC9] bg-white cursor-pointer flex items-center justify-center text-base text-[#555]"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="text-center mb-7">
                    <div className="text-[2.5rem] mb-2">🍕</div>
                    <h2 className="font-outfit text-[1.5rem] font-extrabold mb-1 text-[#111]">
                        {step === 'phone' ? 'Welcome back!' : 'Verify OTP'}
                    </h2>
                    <p className="text-[#555] text-[0.9rem]">
                        {step === 'phone'
                            ? 'Login with your phone number to order pizza'
                            : `OTP sent to +91 ${phone}`}
                    </p>
                </div>

                {/* Phone step */}
                {step === 'phone' ? (
                    <form onSubmit={handleSendOTP}>
                        <label className="block text-[0.875rem] font-semibold mb-[0.4rem] text-[#111]">
                            Phone Number
                        </label>
                        <div className="relative mb-5">
                            <span className="absolute left-[0.875rem] top-1/2 -translate-y-1/2 font-semibold text-[#555] text-[0.95rem]">
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
                        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                            {loading ? '⏳ Sending...' : 'Send OTP →'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP}>
                        <label className="block text-[0.875rem] font-semibold mb-[0.4rem] text-[#111]">
                            Enter 6-digit OTP
                        </label>
                        <input
                            className="input text-center tracking-[0.5rem] text-[1.25rem] mb-5"
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="• • • • • •"
                            autoFocus
                            inputMode="numeric"
                            required
                            id="otp-input"
                        />
                        <button type="submit" className="btn-primary w-full justify-center mb-3" disabled={loading}>
                            {loading ? '⏳ Verifying...' : 'Verify & Login ✓'}
                        </button>

                        <div className="text-center">
                            {countdown > 0 ? (
                                <p className="text-[0.85rem] text-[#9B9B9B]">
                                    Resend OTP in <strong>{countdown}s</strong>
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    className="bg-none border-none text-[#D4920A] font-semibold cursor-pointer text-[0.9rem]"
                                >
                                    Resend OTP
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => { setStep('phone'); setOtp(''); }}
                                className="block mx-auto mt-[0.4rem] bg-none border-none text-[#555] cursor-pointer text-[0.85rem]"
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
