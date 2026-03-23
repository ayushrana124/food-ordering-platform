interface AdminToggleProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
    activeColor?: string;
}

export default function AdminToggle({
    checked, onChange, disabled = false, size = 'md', activeColor = '#16A34A'
}: AdminToggleProps) {
    const w = size === 'sm' ? 'w-10 h-[22px]' : 'w-12 h-7';
    const dot = size === 'sm' ? 'w-[16px] h-[16px]' : 'w-[21px] h-[21px]';
    const left = size === 'sm'
        ? (checked ? 'left-[21px]' : 'left-[3px]')
        : (checked ? 'left-[25px]' : 'left-[3px]');
    const top = size === 'sm' ? 'top-[3px]' : 'top-[3px]';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            disabled={disabled}
            className={`relative ${w} rounded-full cursor-pointer border-none transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ background: checked ? activeColor : '#D4D4D0' }}
        >
            <span
                className={`absolute ${top} ${dot} rounded-full bg-white transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.2)]`}
                style={{ left: checked ? (size === 'sm' ? 21 : 25) : 3 }}
            />
        </button>
    );
}
