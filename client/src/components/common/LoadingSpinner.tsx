interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
}

export default function LoadingSpinner({ size = 'md', color = '#E8A317' }: LoadingSpinnerProps) {
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
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke={color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="90 30"
                    opacity="0.85"
                />
            </svg>
        </div>
    );
}
