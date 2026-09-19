import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { useAppDispatch } from '@/redux/hooks';
import { updateUser } from '@/redux/slices/authSlice';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from '@/config/firebase';
import Sheet from '@/components/ui/Sheet';
import { useT } from '@/i18n';
import toast from 'react-hot-toast';

interface LoginModalProps {
    onClose: () => void;
}

type Step = 'phone' | 'otp' | 'profile';

/**
 * Phone sign-in, as a bottom sheet.
 *
 * This is now the only gate in the customer flow — browsing, the basket and
 * quantity changes all work signed out, and this appears at checkout. That
 * makes it the single highest-stakes screen in the app, so it asks for as
 * little as possible: a number, a code, and a name. Email is optional; it was
 * previously mandatory, which is real friction at the worst possible moment.
 *
 * The Firebase reCAPTCHA and OTP handling below is unchanged.
 */
export default function LoginModal({ onClose }: LoginModalProps) {
    const { login } = useAuth();
    const dispatch = useAppDispatch();
    const t = useT();

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

    // Focus the field once the sheet has finished rising.
    useEffect(() => {
        const id = setTimeout(() => {
            const ref = step === 'phone' ? phoneInputRef : otpInputRef;
            ref.current?.focus({ preventScroll: true });
        }, 350);
        return () => clearTimeout(id);
    }, [step]);

    useEffect(() => () => {
        if (recaptchaVerifierRef.current) {
            try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
            recaptchaVerifierRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
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
            const container = document.getElementById('recaptcha-container');
            if (!container) throw new Error('reCAPTCHA container missing from DOM');

            try {
                const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
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
            toast.error(t('auth.invalidPhone'));
            return;
        }
        setLoading(true);
        try {
            const appVerifier = await setupRecaptcha();
            const confirmationResult = await signInWithPhoneNumber(auth, `+91${phone}`, appVerifier);
            confirmationResultRef.current = confirmationResult;

            toast.success('OTP sent! Check your SMS.');
            setStep('otp');
            startCountdown();
        } catch (err: unknown) {
            console.error('Firebase OTP Error:', err);
            // The verifier is deliberately kept alive — Firebase reuses the stable
            // instance on retry, and clearing it makes the next attempt fail too.
            const firebaseError = err as { code?: string };
            let msg = 'Failed to send OTP. Please try again.';
            switch (firebaseError.code) {
                case 'auth/too-many-requests': msg = 'Too many attempts. Please try again after some time.'; break;
                case 'auth/invalid-phone-number': msg = 'Invalid phone number. Please check and try again.'; break;
                case 'auth/captcha-check-failed':
                case 'auth/recaptcha-not-enabled':
                case 'auth/invalid-app-credential': msg = 'Security verification failed. Please refresh the page and try again.'; break;
                case 'auth/quota-exceeded': msg = 'SMS quota exceeded. Please try again later.'; break;
                case 'auth/operation-not-allowed': msg = 'Phone authentication is not enabled. Please contact support.'; break;
                case 'auth/network-request-failed': msg = 'Network error. Please check your connection and try again.'; break;
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
            const userCredential = await confirmationResultRef.current.confirm(otp);
            const idToken = await userCredential.user.getIdToken(true);

            const res = await authService.verifyFirebaseToken(idToken);
            login(res.user, res.token);

            // We manage the session with our own JWT from here.
            await auth.signOut();

            if (!res.user.name) {
                setStep('profile');
            } else {
                toast.success(t('auth.signedIn'));
                onClose();
            }
        } catch (err: unknown) {
            console.error('OTP Verification Error:', err);
            const firebaseError = err as { code?: string; response?: { data?: { message?: string } } };
            let msg = 'Verification failed. Please try again.';
            switch (firebaseError.code) {
                case 'auth/invalid-verification-code': msg = 'Invalid OTP. Please check and try again.'; break;
                case 'auth/code-expired': msg = 'OTP has expired. Please request a new one.'; break;
                case 'auth/session-expired': msg = 'Session expired. Please request a new OTP.'; break;
                default:
                    if (firebaseError.response?.data?.message) msg = firebaseError.response.data.message;
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
            toast.error(t('account.name'));
            return;
        }
        // Email is optional. If given it still has to be valid.
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error(t('account.email'));
            return;
        }

        setLoading(true);
        try {
            const updatedUser = await userService.updateProfile({
                name: name.trim(),
                ...(email.trim() ? { email: email.trim() } : {}),
            });
            dispatch(updateUser(updatedUser));
            toast.success(t('auth.signedIn'));
            onClose();
        } catch (err: unknown) {
            console.error('Update Profile Error:', err);
            toast.error(t('common.somethingWrong'));
        } finally {
            setLoading(false);
        }
    };

    // ── Presentation ─────────────────────────────────────────────────────────

    const heading =
        step === 'phone' ? t('auth.title') :
        step === 'otp' ? t('auth.otpTitle') :
        t('account.name');

    const sub =
        step === 'phone' ? t('auth.subtitle') :
        step === 'otp' ? t('auth.otpSubtitle', { phone: `+91 ${phone}` }) :
        '';

    return (
        <Sheet open onClose={onClose} title={heading}>
            <div className="c-wrap" style={{ paddingBottom: 24 }}>
                {sub && (
                    <p style={{ marginTop: -4, marginBottom: 18, font: '400 .86rem/1.5 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}>
                        {sub}
                    </p>
                )}

                {step === 'phone' && (
                    <form onSubmit={handleSendOTP}>
                        <div style={{ position: 'relative' }}>
                            <span
                                style={{
                                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    font: '700 .95rem/1 "DM Sans", sans-serif', color: 'var(--c-ink-2)',
                                    pointerEvents: 'none',
                                }}
                            >
                                <Smartphone size={16} />
                                +91
                            </span>
                            <input
                                ref={phoneInputRef}
                                className="c-field"
                                style={{ paddingLeft: 76, fontSize: '1.05rem', letterSpacing: '.06em', minHeight: 54 }}
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                placeholder="98765 43210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                aria-label={t('auth.phone')}
                            />
                        </div>

                        <button
                            type="submit"
                            className="c-btn c-btn--primary c-btn--block c-btn--lg"
                            style={{ marginTop: 14 }}
                            disabled={loading || phone.length !== 10}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <>{t('auth.sendCode')} <ArrowRight size={17} /></>}
                        </button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleVerifyOTP}>
                        <input
                            ref={otpInputRef}
                            className="c-field"
                            style={{
                                textAlign: 'center', fontSize: '1.5rem', fontWeight: 800,
                                letterSpacing: '.5em', paddingLeft: '.5em', minHeight: 60,
                                fontFamily: 'Outfit, sans-serif',
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="••••••"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            aria-label={t('auth.otpTitle')}
                        />

                        <button
                            type="submit"
                            className="c-btn c-btn--primary c-btn--block c-btn--lg"
                            style={{ marginTop: 14 }}
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : t('auth.verify')}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                            <button
                                type="button"
                                onClick={() => { setStep('phone'); setOtp(''); }}
                                style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, font: '600 .82rem/1 "DM Sans", sans-serif', color: 'var(--c-ink-3)' }}
                            >
                                {t('auth.changeNumber')}
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={countdown > 0 || loading}
                                style={{
                                    border: 0, background: 'none', padding: 0,
                                    cursor: countdown > 0 ? 'default' : 'pointer',
                                    font: '700 .82rem/1 "DM Sans", sans-serif',
                                    color: countdown > 0 ? 'var(--c-ink-3)' : 'var(--c-brand-deep)',
                                }}
                            >
                                {countdown > 0 ? t('auth.resendIn', { s: countdown }) : t('auth.resend')}
                            </button>
                        </div>
                    </form>
                )}

                {step === 'profile' && (
                    <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: 12 }}>
                        <input
                            className="c-field"
                            style={{ minHeight: 52 }}
                            placeholder={t('account.name')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={60}
                            autoFocus
                        />
                        <input
                            className="c-field"
                            style={{ minHeight: 52 }}
                            type="email"
                            placeholder={`${t('account.email')} (${t('common.optional')})`}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            maxLength={120}
                        />
                        <button
                            type="submit"
                            className="c-btn c-btn--primary c-btn--block c-btn--lg"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : t('common.save')}
                        </button>
                    </form>
                )}

                {/* Firebase renders the invisible reCAPTCHA here. It must stay mounted
                    across steps so a resend can reuse the same verifier. */}
                <div id="recaptcha-container" />
            </div>
        </Sheet>
    );
}
