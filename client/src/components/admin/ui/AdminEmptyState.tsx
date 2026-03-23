import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface AdminEmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

export default function AdminEmptyState({
    icon: Icon = Inbox,
    title = 'Nothing here yet',
    description = 'Get started by adding your first item.',
    action,
}: AdminEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F5F5F3] flex items-center justify-center text-[#C4C4C0] mb-4">
                <Icon size={28} />
            </div>
            <h3 className="font-outfit font-bold text-[1.05rem] text-[#0F0F0F] mb-1">{title}</h3>
            <p className="text-[0.82rem] text-[#8E8E8E] max-w-[300px] leading-relaxed">{description}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-[#E8A317] text-white font-bold text-[0.85rem] border-none cursor-pointer hover:bg-[#D49516] transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
