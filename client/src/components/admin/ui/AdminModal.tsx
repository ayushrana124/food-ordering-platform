import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
    onClose: () => void;
    maxWidth?: string;
    slideOver?: boolean;
}

export default function AdminModal({
    children, title, subtitle, onClose, maxWidth = '600px', slideOver = false,
}: AdminModalProps) {
    if (slideOver) {
        return (
            <div
                className="fixed inset-0 z-[100] flex justify-end"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                <div
                    className="bg-white h-full w-full flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.12)]"
                    style={{
                        maxWidth,
                        animation: 'slideInRight 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
                    }}
                >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE] shrink-0">
                        <div>
                            <h2 className="font-outfit font-bold text-[1.1rem] text-[#0F0F0F]">{title}</h2>
                            {subtitle && <p className="text-[0.78rem] text-[#8E8E8E] mt-0.5">{subtitle}</p>}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">{children}</div>
                </div>
                <style>{`
                    @keyframes slideInRight {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white rounded-2xl w-full flex flex-col max-h-[90vh] overflow-hidden"
                style={{
                    maxWidth,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
                    animation: 'modalIn 0.25s cubic-bezier(0.22, 0.61, 0.36, 1)',
                }}
            >
                <div className="flex items-center justify-between px-7 py-5 border-b border-[#EEEEEE] shrink-0">
                    <div>
                        <h2 className="font-outfit font-bold text-[1.1rem] text-[#0F0F0F]">{title}</h2>
                        {subtitle && <p className="text-[0.78rem] text-[#8E8E8E] mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl border border-[#EEEEEE] flex items-center justify-center bg-white cursor-pointer text-[#4A4A4A] hover:bg-[#F5F5F3] transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
