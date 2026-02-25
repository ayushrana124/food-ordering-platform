interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
}

export default function LoadingSpinner({ size = 'md', color = '#D4920A' }: LoadingSpinnerProps) {
    const sizes = { sm: 20, md: 36, lg: 56 };
    const px = sizes[size];

    return (
        <div className="inline-flex items-center justify-center">
            <svg
                width={px}
                height={px}
                viewBox="0 0 50 50"
                style={{ animation: 'spin 0.8s linear infinite' }}
            >
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="90 30"
                />
            </svg>
        </div>
    );
}
