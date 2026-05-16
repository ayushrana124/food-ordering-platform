import type { ReactNode } from 'react';

interface AdminCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    padding?: boolean;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export default function AdminCard({ children, className = '', hover = false, padding = true, onClick, style }: AdminCardProps) {
    return (
        <div
            onClick={onClick}
            style={style}
            className={`
                bg-white/90 backdrop-blur-xl border border-[#EEEEEE]/80 rounded-2xl
                shadow-[0_2px_16px_rgba(0,0,0,0.04)]
                ${hover ? 'hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer' : ''}
                transition-all duration-300
                ${padding ? 'p-6' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
}
