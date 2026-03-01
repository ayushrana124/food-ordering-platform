import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { adminLogin } from '@/services/adminApi';
import toast from 'react-hot-toast';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 50%, #2D2208 100%)' }}
        >
            <div
                className="bg-white rounded-[24px] p-10 w-full max-w-[430px]"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div
                        className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white mx-auto mb-5"
                        style={{
                            background: 'linear-gradient(135deg, #E8A317 0%, #F0B429 100%)',
                            boxShadow: '0 6px 20px rgba(232,163,23,0.3)',
                        }}
                    >
                        <ChefHat size={34} />
                    </div>
                    <h1 className="font-outfit font-extrabold text-[1.6rem] text-[#0F0F0F] tracking-[-0.02em] mb-1">
                        Admin Panel
                    </h1>
                    <p className="text-[#8E8E8E] text-[0.9rem]">Sign in to manage your restaurant</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Email */}
                    <div>
                        <label className="block font-semibold text-[0.85rem] mb-[0.35rem] text-[#0F0F0F]">Email</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E8E]" />
                            <input
                                className="input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@buntypizza.com"
                                style={{ paddingLeft: '2.8rem' }}
                                autoFocus
                                required
                                id="admin-email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block font-semibold text-[0.85rem] mb-[0.35rem] text-[#0F0F0F]">Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E8E]" />
                            <input
                                className="input"
                                type={showPwd ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                style={{ paddingLeft: '2.8rem', paddingRight: '2.8rem' }}
                                required
                                id="admin-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#8E8E8E] hover:text-[#4A4A4A] p-1"
                            >
                                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full justify-center py-[0.85rem] text-[0.95rem] flex items-center gap-2 mt-1"
                    >
                        {loading ? 'Signing in...' : (
                            <>Sign In <ArrowRight size={18} /></>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
