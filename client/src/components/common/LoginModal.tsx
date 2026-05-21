import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, X, ArrowRight, CheckCircle2, Timer, Smartphone, User as UserIcon, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { useAppDispatch } from '@/redux/hooks';
import { updateUser } from '@/redux/slices/authSlice';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from '@/config/firebase';
import toast from 'react-hot-toast';

interface LoginModalProps {
    onClose: () => void;
}

type Step = 'phone' | 'otp' | 'profile';

export default function LoginModal({ onClose }: LoginModalProps) {
    const { login } = useAuth();
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const otpInputRef = useRef<HTMLInputElement>(null);
    const confirmationResultRef = useRef<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Focus input after sheet animation completes, without scrolling
    useEffect(() => {
        const id = setTimeout(() => {
            const ref = step === 'phone' ? phoneInputRef : otpInputRef;
            ref.current?.focus({ preventScroll: true });
        }, 350);
        return () => clearTimeout(id);
    }, [step]);

    // Cleanup reCAPTCHA verifier and countdown timer on unmount
    useEffect(() => {
        return () => {
            if (recaptchaVerifierRef.current) {
                try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
                recaptchaVerifierRef.current = null;
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const startCountdown = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setCountdown(30);
        timerRef.current = setInterval(() => {
            setCountdown((p) => {
                if (p <= 1) { clearInterval(timerRef.current!); return 0; }
                return p - 1;
            });
        }, 1000);
    };

    /**
     * Sets up an invisible reCAPTCHA v2 verifier.
     * Creates one stable verifier instance and keeps its DOM anchor mounted for resends.
     */
    const setupRecaptcha = useCallback(async () => {
        if (!recaptchaVerifierRef.current) {
            // Guard: ensure container exists in the DOM
            const container = document.getElementById('recaptcha-container');
            if (!container) throw new Error('reCAPTCHA container missing from DOM');

            try {
                const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible',
                });

                await verifier.render();
                recaptchaVerifierRef.current = verifier;
            } catch (err) {
                console.error('reCAPTCHA init failed:', err);
                throw new Error('Failed to initialize security check. Please refresh the page.');
            }
        }

        return recaptchaVerifierRef.current;
    }, []);

    const handleSendOTP = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (loading) return;
        if (!/^[6-9]\d{9}$/.test(phone)) {
            toast.error('Enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        try {
            const appVerifier = await setupRecaptcha();
            const fullPhone = `+91${phone}`;

            // Per official Firebase docs:
            // signInWithPhoneNumber(auth, phoneNumber, appVerifier)
            const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
            confirmationResultRef.current = confirmationResult;

            toast.success('OTP sent! Check your SMS.');
            setStep('otp');
            startCountdown();
        } catch (err: unknown) {
            console.error('Firebase OTP Error:', err);

            // Keep reCAPTCHA verifier alive — Firebase reuses the stable instance on retry.
            // Clearing it forces a new verifier each attempt which often fails again.

            const firebaseError = err as { code?: string; message?: string };
            let msg = 'Failed to send OTP. Please try again.';
            switch (firebaseError.code) {
                case 'auth/too-many-requests':
                    msg = 'Too many attempts. Please try again after some time.';
                    break;
                case 'auth/invalid-phone-number':
                    msg = 'Invalid phone number. Please check and try again.';
                    break;
                case 'auth/captcha-check-failed':
                case 'auth/recaptcha-not-enabled':
                case 'auth/invalid-app-credential':
                    msg = 'Security verification failed. Please refresh the page and try again.';
                    break;
                case 'auth/quota-exceeded':
                    msg = 'SMS quota exceeded. Please try again later.';
                    break;
                case 'auth/operation-not-allowed':
                    msg = 'Phone authentication is not enabled. Please contact support.';
                    break;
                case 'auth/network-request-failed':
                    msg = 'Network error. Please check your connection and try again.';
                    break;
            }
            toast.error(msg);
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

        if (!confirmationResultRef.current) {
            toast.error('Session expired. Please request a new OTP.');
            setStep('phone');
            setOtp('');
            return;
        }

        setLoading(true);
        try {
            // Verify OTP with Firebase
            const userCredential = await confirmationResultRef.current.confirm(otp);
            const firebaseUser = userCredential.user;

            // Get the Firebase ID token (force refresh to get a fresh one)
            const idToken = await firebaseUser.getIdToken(true);

            // Send ID token to our backend for JWT exchange
            const res = await authService.verifyFirebaseToken(idToken);
            login(res.user, res.token);

            // Sign out from Firebase — we use our own JWT for session management
            await auth.signOut();

            if (!res.user.name || !res.user.email) {
                setStep('profile');
            } else {
                toast.success(`Welcome${res.user.name ? `, ${res.user.name}` : ''}!`);
                onClose();
            }
        } catch (err: unknown) {
            console.error('OTP Verification Error:', err);
            const firebaseError = err as { code?: string; response?: { data?: { message?: string } } };
            let msg = 'Verification failed. Please try again.';
            switch (firebaseError.code) {
                case 'auth/invalid-verification-code':
                    msg = 'Invalid OTP. Please check and try again.';
                    break;
                case 'auth/code-expired':
                    msg = 'OTP has expired. Please request a new one.';
                    break;
                case 'auth/session-expired':
                    msg = 'Session expired. Please request a new OTP.';
                    break;
                default:
                    // Check for backend error response
                    if (firebaseError.response?.data?.message) {
                        msg = firebaseError.response.data.message;
                    }
            }
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (loading || countdown > 0) return;
        confirmationResultRef.current = null;
        await handleSendOTP();
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Valid email is required');
            return;
        }
        setLoading(true);
        try {
            const updatedUser = await userService.updateProfile({ name, email });
            dispatch(updateUser(updatedUser));
            toast.success(`Welcome, ${updatedUser.name}!`);
            onClose();
        } catch (err: unknown) {
            console.error('Update Profile Error:', err);
            toast.error('Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const modal = (
        <div
            className="login-modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                background: 'rgba(15,15,15,0.5)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                animation: 'fadeIn 0.2s ease',
            }}
        >


            <div
                className="login-modal-panel"
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 480,
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    padding: '24px 32px 32px',
                }}
            >
                {/* Top bar: drag handle + close */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ width: 32 }} />
                    <div style={{ width: 40, height: 4, borderRadius: 9999, background: '#DDDDDD' }} />
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-white cursor-pointer flex items-center justify-center text-[#4A4A4A] transition-colors hover:bg-[#F7F7F5] shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Header */}
                <div className="text-center mb-7">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4"
                        style={{
                            background: 'linear-gradient(135deg, #E8A317 0%, #F0B429 100%)',
                            boxShadow: '0 4px 16px rgba(232,163,23,0.25)',
                        }}
                    >
                        <ChefHat size={30} />
                    </div>
                    <h2 className="font-outfit text-[1.5rem] font-extrabold mb-1 text-[#0F0F0F] tracking-[-0.02em]">
                        {step === 'phone' ? 'Welcome back!' : step === 'otp' ? 'Verify OTP' : 'Complete Profile'}
                    </h2>
                    <p className="text-[#8E8E8E] text-[0.9rem]">
                        {step === 'phone'
                            ? 'Login with your phone number to order pizza'
                            : step === 'otp'
                            ? `OTP sent to +91 ${phone}`
                            : 'Please enter your details to continue'}
                    </p>
                </div>

                {/* Phone step */}
                {step === 'phone' ? (
                    <form onSubmit={handleSendOTP}>
                        <label className="block text-[0.875rem] font-semibold mb-[0.4rem] text-[#0F0F0F]">
                            Phone Number
                        </label>
                        <div className="relative mb-5">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#4A4A4A] text-[0.95rem] flex items-center gap-1.5 border-r border-[#EEEEEE] pr-3">
                                <Smartphone size={16} className="text-[#8E8E8E]" />
                                +91
                            </span>
                            <input
                                ref={phoneInputRef}
                                className="input"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="98765 43210"
                                style={{ paddingLeft: '4.5rem' }}
                                inputMode="numeric"
                                required
                                id="phone-input"
                            />
                        </div>
                        <button
                            type="submit"
                            id="send-otp-btn"
                            className="btn-primary w-full justify-center flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <Timer size={20} className="animate-spin" />
                            ) : (
                                <>Send OTP <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP}>
                        <label className="block text-[0.875rem] font-semibold mb-[0.4rem] text-[#0F0F0F]">
                            Enter 6-digit OTP
                        </label>
                        <input
                            ref={otpInputRef}
                            className="input text-center tracking-[0.5rem] text-[1.25rem] mb-5"
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="------"
                            inputMode="numeric"
                            required
                            id="otp-input"
                        />
                        <button type="submit" className="btn-primary w-full justify-center mb-4 flex items-center gap-2" disabled={loading}>
                            {loading ? (
                                <Timer size={20} className="animate-spin" />
                            ) : (
                                <>Verify & Login <CheckCircle2 size={18} /></>
                            )}
                        </button>

                        <div className="text-center">
                            {countdown > 0 ? (
                                <p className="text-[0.85rem] text-[#8E8E8E] flex items-center justify-center gap-1">
                                    <Timer size={14} /> Resend OTP in <strong>{countdown}s</strong>
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResendOTP}
                                    className="bg-none border-none text-[#E8A317] font-semibold cursor-pointer text-[0.9rem] hover:underline"
                                    disabled={loading}
                                >
                                    Resend OTP
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => { setStep('phone'); setOtp(''); confirmationResultRef.current = null; }}
                                className="block mx-auto mt-3 bg-none border-none text-[#4A4A4A] cursor-pointer text-[0.85rem] hover:text-[#0F0F0F] transition-colors"
                            >
                                Change phone number
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleSaveProfile}>
                        <label className="block text-[0.875rem] font-semibold mb-[0.4rem] text-[#0F0F0F]">
                            Full Name
                        </label>
                        <div className="relative mb-4">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E8E]">
                                <UserIcon size={16} />
                            </span>
                            <input
                                className="input"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                style={{ paddingLeft: '2.5rem' }}
                                required
                            />
                        </div>

                        <label className="block text-[0.875rem] font-semibold mb-[0.4rem] text-[#0F0F0F]">
                            Email Address
                        </label>
                        <div className="relative mb-5">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E8E]">
                                <Mail size={16} />
                            </span>
                            <input
                                className="input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@example.com"
                                style={{ paddingLeft: '2.5rem' }}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary w-full justify-center mb-2 flex items-center gap-2" disabled={loading}>
                            {loading ? (
                                <Timer size={20} className="animate-spin" />
                            ) : (
                                <>Save Profile <CheckCircle2 size={18} /></>
                            )}
                        </button>
                    </form>
                )}
                <div
                    id="recaptcha-container"
                    style={{
                        position: 'absolute',
                        width: 1,
                        height: 1,
                        overflow: 'hidden',
                        opacity: 0,
                        pointerEvents: 'none',
                    }}
                />
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
