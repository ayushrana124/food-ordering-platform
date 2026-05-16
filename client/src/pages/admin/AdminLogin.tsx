import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Mail, Lock, ArrowRight, Eye, EyeOff, Pizza, Coffee, Cake } from 'lucide-react';
import { adminLogin } from '@/services/adminApi';
import toast from 'react-hot-toast';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { toast.error('Please fill all fields'); return; }

        setLoading(true);
        try {
            const res = await adminLogin(email, password);
            localStorage.setItem('bp_admin_token', res.token);
            localStorage.setItem('bp_admin', JSON.stringify(res.admin));
            toast.success(`Welcome, ${res.admin.name}!`);
            navigate('/admin/dashboard', { replace: true });
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Login failed';
            toast.error(msg ?? 'Login failed');
            setShake(true);
            setTimeout(() => setShake(false), 600);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ background: '#0F0F0F' }}>
            {/* Left side - Brand */}
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1A1714 0%, #2D2208 50%, #0F0F0F 100%)' }}
            >
                {/* Decorative dots */}
                <div className="absolute inset-0 opacity-[0.04]" style={{
                    backgroundImage: 'radial-gradient(circle, #E8A317 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                }} />

                {/* Floating icons */}
                <div className="absolute top-[15%] left-[15%] w-14 h-14 rounded-2xl bg-[#E8A317]/10 flex items-center justify-center text-[#E8A317]/40 animate-bounce" style={{ animationDuration: '3s' }}>
                    <Pizza size={28} />
                </div>
                <div className="absolute bottom-[20%] right-[20%] w-12 h-12 rounded-xl bg-[#E8A317]/8 flex items-center justify-center text-[#E8A317]/30 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                    <Coffee size={24} />
                </div>
                <div className="absolute top-[40%] right-[12%] w-10 h-10 rounded-lg bg-[#E8A317]/6 flex items-center justify-center text-[#E8A317]/25 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
                    <Cake size={20} />
                </div>

                <div className="relative z-10 text-center px-12 max-w-md">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E8A317] to-[#F0B429] flex items-center justify-center text-white mx-auto mb-8 shadow-[0_8px_32px_rgba(232,163,23,0.3)]">
                        <ChefHat size={40} />
                    </div>
                    <h2 className="font-outfit font-extrabold text-[2.2rem] text-white tracking-[-0.03em] leading-[1.15] mb-4">
                        Manage Your<br />
                        <span className="text-[#E8A317]">Restaurant</span>
                    </h2>
                    <p className="text-white/40 text-[0.95rem] leading-relaxed">
                        Control orders, menu items, delivery zones, and everything in between from one powerful dashboard.
                    </p>
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="flex-1 lg:max-w-[520px] flex items-center justify-center p-6 sm:p-10" style={{ background: '#FAFAF8' }}>
                <div className={`w-full max-w-[400px] ${shake ? 'animate-[shakeX_0.5s_ease-in-out]' : ''}`}>
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8A317] to-[#F0B429] flex items-center justify-center text-white mx-auto mb-4 shadow-[0_6px_20px_rgba(232,163,23,0.3)]">
                            <ChefHat size={32} />
                        </div>
                    </div>

                    <div className="mb-8">
                        <h1 className="font-outfit font-extrabold text-[1.8rem] text-[#0F0F0F] tracking-[-0.03em] mb-2">
                            Welcome back
                        </h1>
                        <p className="text-[#8E8E8E] text-[0.9rem]">Sign in to your admin dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {/* Email */}
                        <div>
                            <label className="block font-semibold text-[0.82rem] mb-2 text-[#4A4A4A]" htmlFor="admin-email">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C4C4C0]" />
                                <input
                                    className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-[#EEEEEE] bg-white text-[0.88rem] text-[#0F0F0F] font-medium outline-none focus:border-[#E8A317] transition-colors duration-200"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@diamondpizza.com"
                                    autoFocus
                                    required
                                    id="admin-email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block font-semibold text-[0.82rem] mb-2 text-[#4A4A4A]" htmlFor="admin-password">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C4C4C0]" />
                                <input
                                    className="w-full h-12 pl-11 pr-12 rounded-xl border-2 border-[#EEEEEE] bg-white text-[0.88rem] text-[#0F0F0F] font-medium outline-none focus:border-[#E8A317] transition-colors duration-200"
                                    type={showPwd ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    id="admin-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(!showPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#C4C4C0] hover:text-[#4A4A4A] p-1.5 rounded-lg transition-colors"
                                >
                                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-[#0F0F0F] text-white font-bold text-[0.92rem] border-none cursor-pointer flex items-center justify-center gap-2 hover:bg-[#2A2A2A] disabled:opacity-50 transition-all duration-200 mt-2"
                            style={{ boxShadow: '0 4px 16px rgba(15,15,15,0.2)' }}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-[0.75rem] text-[#C4C4C0] mt-8">
                        Diamond Pizza & Restaurant Admin Panel
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes shakeX {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
            `}</style>
        </div>
    );
}
