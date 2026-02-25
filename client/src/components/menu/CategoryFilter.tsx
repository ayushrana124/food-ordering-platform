interface CategoryFilterProps {
    categories: string[];
    selected: string;
    onSelect: (cat: string) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
    const all = ['All', ...categories];

    return (
        <div className="scroll-x-hide" style={{ display: 'flex', gap: '0.5rem', paddingBottom: '0.25rem' }}>
            {all.map((cat) => (
                <button
                    key={cat}
                    className={`pill${selected === cat ? ' active' : ''}`}
                    onClick={() => onSelect(cat)}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}
