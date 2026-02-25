interface EmptyStateProps {
    emoji?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export default function EmptyState({ emoji = '🍕', title, description, action }: EmptyStateProps) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center',
        }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{emoji}</div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                {title}
            </h3>
            {description && (
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: 360 }}>
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
