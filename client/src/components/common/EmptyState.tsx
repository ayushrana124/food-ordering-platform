import type { LucideIcon } from 'lucide-react';
import { Pizza } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
                style={{
                    background: '#F7F7F5',
                    color: '#E8A317',
                }}
            >
                {Icon ? <Icon size={42} strokeWidth={1.5} /> : <Pizza size={42} strokeWidth={1.5} />}
            </div>
            <h3 className="font-outfit text-[1.4rem] font-bold mb-2 text-[#0F0F0F] tracking-[-0.02em]">
                {title}
            </h3>
            {description && (
                <p className="text-[#8E8E8E] mb-6 max-w-[360px] text-[0.95rem] leading-relaxed">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
