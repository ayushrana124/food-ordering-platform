import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function AdminPagination({ currentPage, totalPages, onPageChange }: AdminPaginationProps) {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push('ellipsis');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push('ellipsis');
        pages.push(totalPages);
    }

    const btn = (disabled: boolean) =>
        `w-9 h-9 rounded-xl border border-[#EEEEEE] flex items-center justify-center cursor-pointer transition-all duration-200 ${
            disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#F5F5F3] hover:border-[#D4D4D0]'
        } bg-white`;

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0F0EE]">
            <p className="text-[0.8rem] text-[#8E8E8E]">
                Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
                <button
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className={btn(currentPage <= 1)}
                >
                    <ChevronLeft size={16} />
                </button>

                {pages.map((p, i) =>
                    p === 'ellipsis' ? (
                        <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-[#8E8E8E] text-[0.8rem]">
                            ...
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`w-9 h-9 rounded-xl text-[0.82rem] font-semibold border cursor-pointer transition-all duration-200 ${
                                currentPage === p
                                    ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                                    : 'bg-white text-[#4A4A4A] border-[#EEEEEE] hover:bg-[#F5F5F3]'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className={btn(currentPage >= totalPages)}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
