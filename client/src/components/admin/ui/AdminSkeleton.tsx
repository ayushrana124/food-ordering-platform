interface AdminSkeletonProps {
    className?: string;
    count?: number;
    type?: 'card' | 'row' | 'text' | 'circle';
}

function SkeletonPulse({ className = '' }: { className?: string }) {
    return (
        <div
            className={`bg-gradient-to-r from-[#F0F0EE] via-[#E8E8E6] to-[#F0F0EE] rounded-lg animate-pulse ${className}`}
            style={{ backgroundSize: '200% 100%' }}
        />
    );
}

export default function AdminSkeleton({ className = '', count = 1, type = 'card' }: AdminSkeletonProps) {
    const items = Array.from({ length: count });

    if (type === 'text') {
        return (
            <div className={`flex flex-col gap-2 ${className}`}>
                {items.map((_, i) => (
                    <SkeletonPulse key={i} className="h-4 rounded" />
                ))}
            </div>
        );
    }

    if (type === 'row') {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                {items.map((_, i) => (
                    <SkeletonPulse key={i} className="h-14 rounded-xl" />
                ))}
            </div>
        );
    }

    if (type === 'circle') {
        return (
            <div className={`flex gap-3 ${className}`}>
                {items.map((_, i) => (
                    <SkeletonPulse key={i} className="w-12 h-12 rounded-full" />
                ))}
            </div>
        );
    }

    // card
    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}>
            {items.map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
                    <SkeletonPulse className="h-32 rounded-xl mb-4" />
                    <SkeletonPulse className="h-5 w-3/4 rounded mb-2" />
                    <SkeletonPulse className="h-4 w-1/2 rounded" />
                </div>
            ))}
        </div>
    );
}
