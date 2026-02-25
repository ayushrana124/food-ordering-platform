import type { LucideIcon } from 'lucide-react';
import { Pizza } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    emoji?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, emoji, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="text-[4.5rem] mb-6 flex items-center justify-center text-[#D4920A] opacity-80">
                {Icon ? <Icon size={64} strokeWidth={1.5} /> : emoji ? emoji : <Pizza size={64} strokeWidth={1.5} />}
            </div>
            <h3 className="font-outfit text-2xl font-bold mb-2 text-[#111]">
                {title}
            </h3>
            {description && (
                <p className="text-[#555] mb-6 max-w-[360px] text-[0.95rem] leading-relaxed">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
