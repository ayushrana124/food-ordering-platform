interface EmptyStateProps {
    emoji?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export default function EmptyState({ emoji = '🍕', title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="text-[4rem] mb-4">{emoji}</div>
            <h3 className="font-outfit text-2xl font-bold mb-2 text-[#111]">
                {title}
            </h3>
            {description && (
                <p className="text-[#555] mb-6 max-w-[360px]">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
