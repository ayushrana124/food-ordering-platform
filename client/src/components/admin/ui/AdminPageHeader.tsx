import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface AdminPageHeaderProps {
    title?: string;
    subtitle?: string;
    icon?: LucideIcon;
    iconBg?: string;
    iconColor?: string;
    actions?: ReactNode;
}

export default function AdminPageHeader({
    subtitle, actions
}: AdminPageHeaderProps) {
    // Title & icon are now shown in the top navbar via AdminLayout.
    // This component only renders subtitle + action buttons.
    if (!subtitle && !actions) return null;

    return (
        <div className="flex items-center justify-between mb-5 gap-3">
            {subtitle && (
                <p className="text-[0.8rem] text-[#8E8E8E]">{subtitle}</p>
            )}
            {!subtitle && <div />}
            {actions && <div className="flex items-center gap-2 flex-wrap ml-auto">{actions}</div>}
        </div>
    );
}
